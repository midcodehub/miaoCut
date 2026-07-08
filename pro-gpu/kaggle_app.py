import os
import io
import time
import urllib.request
import torch
import torch.nn.functional as F
from torchvision import transforms
from transformers import AutoModelForImageSegmentation
from PIL import Image as PILImage
import numpy as np
import json
import sys
import boto3
import requests
# --- 环境变量配置 ---
os.environ["CUPY_CACHE_DIR"] = "/kaggle/working/cupy_cache"
os.makedirs(os.environ["CUPY_CACHE_DIR"], exist_ok=True)

# Kaggle 环境变量 & 配置 (支持 Kaggle Secrets 或本地 os.environ)
# 推荐在 Kaggle Notebook 右上角 Add-ons -> Secrets 中配置这些密钥，并打勾附加到当前 Notebook
try:
    from kaggle_secrets import UserSecretsClient
    _secrets = UserSecretsClient()
    def get_env(key, default=None):
        try:
            return _secrets.get_secret(key)
        except Exception:
            return os.environ.get(key, default)
except ImportError:
    def get_env(key, default=None):
        return os.environ.get(key, default)

R2_ENDPOINT_URL = get_env("R2_ENDPOINT_URL", "https://<ACCOUNT_ID>.r2.cloudflarestorage.com")
R2_ACCESS_KEY_ID = get_env("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = get_env("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = get_env("R2_BUCKET_NAME", "miaocut-images")

UPSTASH_REDIS_REST_URL = get_env("UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN = get_env("UPSTASH_REDIS_REST_TOKEN")
QUEUE_NAME = get_env("QUEUE_NAME", "miaocut_tasks")

# 确保 estimate_foreground_ml_cupy.py 被一起上传到了 /kaggle/working，
# 或者如果不需要去彩边，可以把 DECONTAMINATE 设为 False
DECONTAMINATE = True
DECONTAM_MAX_EDGE = 2048
PNG_COMPRESSION_LEVEL = 1

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

MODELS = {
    "fast": {"repo": "ZhengPeng7/BiRefNet-matting", "res": 1024},
    "fur": {"repo": "ZhengPeng7/BiRefNet_HR-matting", "res": 2048},
}

def _load_runner(repo, res):
    torch.set_float32_matmul_precision("high")
    torch.backends.cudnn.benchmark = True

    print(f"Loading {repo}...")
    model = AutoModelForImageSegmentation.from_pretrained(
        repo, trust_remote_code=True, dtype=torch.float16
    )
    model = model.half().eval().to("cuda")
    tf = transforms.Compose([
        transforms.Resize((res, res)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return {"model": model, "tf": tf, "res": res}

def load_models():
    print("Initializing CUDA...")
    torch.cuda.init()
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    
    r = _load_runner(MODELS["fast"]["repo"], MODELS["fast"]["res"])
    
    # 预热
    with torch.no_grad():
        x = torch.zeros(1, 3, r["res"], r["res"], dtype=torch.float16, device="cuda")
        r["model"](x)
    torch.cuda.synchronize()
    
    return {"fast": r}

def _decontaminate(rgb, a):
    try:
        import sys
        sys.path.append("/kaggle/working") # 确保能找到 estimate_foreground_ml_cupy
        from estimate_foreground_ml_cupy import estimate_foreground_ml_cupy
    except ImportError:
        print("Warning: estimate_foreground_ml_cupy module not found. Skipping decontamination.")
        return rgb
        
    if np.sum((a > 0.05) & (a < 0.95)) < 100:
        return rgb
        
    h, w = a.shape
    s = min(1.0, DECONTAM_MAX_EDGE / max(h, w))
    if s < 1.0:
        sw, sh = int(w * s), int(h * s)
        srgb = np.asarray(PILImage.fromarray((rgb * 255).astype(np.uint8)).resize((sw, sh)), np.float64) / 255.0
        sa = np.asarray(PILImage.fromarray((a * 255).astype(np.uint8)).resize((sw, sh)), np.float64) / 255.0
    else:
        srgb, sa = rgb, a
        
    F_img = np.clip(estimate_foreground_ml_cupy(srgb, sa), 0, 1)
    
    if s < 1.0:
        F_img = np.asarray(PILImage.fromarray((F_img * 255).astype(np.uint8)).resize((w, h)), np.float64) / 255.0
        
    return F_img

def run_cutout(runners, img_bytes, profile="fast"):
    t0 = time.perf_counter()
    pil = PILImage.open(io.BytesIO(img_bytes)).convert("RGB")
    t_decode = time.perf_counter()

    r = runners[profile]
    with torch.inference_mode():
        x = r["tf"](pil).unsqueeze(0).half().to("cuda")
        alpha_t = r["model"](x)[-1].sigmoid()
        a_full = F.interpolate(
            alpha_t.float(), size=(pil.height, pil.width), mode="bilinear", align_corners=False,
        ).squeeze().cpu().numpy()
    torch.cuda.synchronize()
    t_gpu = time.perf_counter()

    rgb = np.asarray(pil, np.float64) / 255.0
    if DECONTAMINATE:
        rgb = _decontaminate(rgb, a_full)
    t_decontam = time.perf_counter()

    out = np.dstack([np.clip(rgb, 0, 1), a_full])
    rgba = (out * 255).astype(np.uint8)

    transparent = rgba[:, :, 3] == 0
    if transparent.any():
        rgba[transparent, :3] = 0

    buf = io.BytesIO()
    PILImage.fromarray(rgba, "RGBA").save(buf, format="PNG", compress_level=PNG_COMPRESSION_LEVEL)
    t_encode = time.perf_counter()

    print(f"Timing: decode={int((t_decode-t0)*1000)}ms gpu={int((t_gpu-t_decode)*1000)}ms "
          f"decontam={int((t_decontam-t_gpu)*1000)}ms encode={int((t_encode-t_decontam)*1000)}ms "
          f"total={int((t_encode-t0)*1000)}ms")
    return buf.getvalue()

# ========== 核心消费者循环 ==========
IDLE_TIMEOUT_SECONDS = 900  # 优化：闲置 15 分钟就关机，不要浪费配额
MAX_UPTIME_SECONDS = 4 * 3600  # 绝对最长开机时间：4 小时强制关机

def worker_loop(runners):
    print("🚀 初始化 S3 (R2) 客户端...")
    s3_client = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto'  # R2 需要使用 auto 或者 weur 等
    )

    headers = {
        "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"
    }

    print("✅ 开始监听任务队列...")
    start_time = time.time()
    last_active_time = time.time()
    last_heartbeat = 0

    while True:
        try:
            # 0. 绝对防沉迷检查：开机满 4 小时强制下线
            if time.time() - start_time > MAX_UPTIME_SECONDS:
                print("🛑 已经连续开机 4 小时，为保护 Kaggle 每周 30 小时免费额度，强制下线！")
                sys.exit(0)

            # 1. 维持心跳 (告诉 Cloudflare Worker 我还活着)
            # 优化：不需要每秒都发，每 30 秒续期一次 60 秒的锁即可，极大节省 API 调用
            if time.time() - last_heartbeat > 30:
                requests.get(
                    f"{UPSTASH_REDIS_REST_URL}/set/kaggle_active/1/EX/60",
                    headers=headers
                )
                last_heartbeat = time.time()

            # 2. 原子拉取：使用 RPOP 从队列右侧弹出任务
            resp = requests.post(
                f"{UPSTASH_REDIS_REST_URL}/rpop/{QUEUE_NAME}", 
                headers=headers
            )
            resp.raise_for_status()
            result = resp.json()

            # 3. 任务为空时的保活与倒计时逻辑
            if result.get("result") is None:
                idle_duration = time.time() - last_active_time
                if idle_duration > IDLE_TIMEOUT_SECONDS:
                    print("🛑 已经摸鱼 15 分钟了，主动关机节省算力！")
                    sys.exit(0)
                
                # 动态休眠以节省 Upstash 调用额度（每日限额一万次）：
                # 刚闲下来 1 分钟内：轮询快一点（2秒），响应实时流量
                # 闲了超过 1 分钟：进入深度摸鱼，轮询慢一点（15秒）
                sleep_time = 2 if idle_duration < 60 else 15
                time.sleep(sleep_time)
                continue

            # 只要拿到任务，重置活跃时间
            last_active_time = time.time()

            # 解析任务 JSON (Upstash 存储的是序列化后的字符串)
            task_str = result["result"]
            task = json.loads(task_str)
            task_id = task["id"]
            
            # 兼容旧版单图和新版批量图
            input_keys = task.get("input_keys", [])
            if "input_key" in task:
                input_keys.append(task["input_key"])

            print(f"📦 领到批量任务: {task_id}, 共包含 {len(input_keys)} 张图片")

            for input_key in input_keys:
                # 使用原图的文件名(去掉后缀)作为输出基础，防止覆盖
                base_name = os.path.splitext(input_key)[0]
                output_key = f"no_bg_{base_name}.png"
                local_input_path = f"/kaggle/working/{input_key}"
                local_output_path = f"/kaggle/working/{output_key}"

                try:
                    # 1. 从 R2 下载原图
                    s3_client.download_file(R2_BUCKET_NAME, input_key, local_input_path)
                    
                    with open(local_input_path, "rb") as f:
                        img_bytes = f.read()

                    # 2. 执行抠图处理
                    print(f"✂️ 开始处理 {input_key}...")
                    png_bytes = run_cutout(runners, img_bytes, profile="fast")

                    # 3. 将处理后的透明背景图上传回 R2
                    s3_client.put_object(
                        Bucket=R2_BUCKET_NAME,
                        Key=output_key,
                        Body=png_bytes,
                        ContentType='image/png'
                    )
                    print(f"✅ 处理完成并上传成功: {output_key}")

                except Exception as img_err:
                    print(f"❌ 图片 {input_key} 处理失败: {img_err}，跳过处理下一张")
                    
                finally:
                    # 4. 清理本地缓存，防止磁盘打满
                    if os.path.exists(local_input_path):
                        os.remove(local_input_path)
                    if os.path.exists(local_output_path):
                        os.remove(local_output_path)

        except Exception as e:
            print(f"❌ 任务处理异常: {e}")
            # 出错暂停一下，避免死循环爆刷 API
            time.sleep(5)


# ========== 运行 ==========
if __name__ == "__main__":
    # 安装必要的依赖 (Kaggle 环境下可以直接在 Cell 里运行 `!pip install timm einops kornia cupy-cuda11x boto3 requests`)
    print("🚀 启动 GPU 工作节点...")
    # 提前加载好模型，避免每个任务都加载
    runners = load_models()
    print("✅ 模型加载完毕，进入消费者循环！")
    worker_loop(runners)
