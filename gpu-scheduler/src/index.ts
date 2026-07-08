import { Hono } from 'hono';

type Bindings = {
  MIAOCUT_BUCKET: R2Bucket;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  KAGGLE_USERNAME: string;
  KAGGLE_KEY: string;
  KAGGLE_KERNEL_REF: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 工具函数：向 Upstash Redis 推送批量任务
async function pushTaskToRedis(env: Bindings, taskId: string, inputKeys: string[]) {
  const url = `${env.UPSTASH_REDIS_REST_URL}/lpush/miaocut_tasks`;
  const task = JSON.stringify({ id: taskId, input_keys: inputKeys });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });

  if (!response.ok) {
    throw new Error(`Failed to push task to Redis: ${await response.text()}`);
  }
}

// 接收前端上传的文件 (支持单文件和多文件批量上传)
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    let filesRaw = body['file'];

    if (!filesRaw) {
      return c.json({ error: 'No files provided' }, 400);
    }

    // 将单文件或多文件都转化为数组处理
    const files = Array.isArray(filesRaw) ? filesRaw as File[] : [filesRaw as File];

    // 生成当前批次的唯一任务标识符
    const taskId = crypto.randomUUID();
    const inputKeys: string[] = [];
    const uploadPromises = [];

    for (const file of files) {
      const fileUuid = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const inputKey = `${fileUuid}.${ext}`;
      inputKeys.push(inputKey);

      const arrayBuffer = await file.arrayBuffer();
      // 收集并发上传的 Promise
      uploadPromises.push(
        c.env.MIAOCUT_BUCKET.put(inputKey, arrayBuffer, {
          httpMetadata: { contentType: file.type }
        })
      );
    }

    // 等待所有文件并行存入 R2
    await Promise.all(uploadPromises);

    // 一次性把这批文件的 keys 压入 Upstash Redis 队列 (1条消息)
    await pushTaskToRedis(c.env, taskId, inputKeys);

    // 检查心跳并决定是否唤醒 (异步执行，不阻塞返回)
    const active = await isKaggleActive(c.env);
    if (!active) {
      console.log("Kaggle is offline, sending wake up signal...");
      c.executionCtx.waitUntil(wakeUpKaggle(c.env).catch(e => console.error(e)));
    } else {
      console.log("Kaggle is already active, task queued.");
    }

    return c.json({ 
      success: true, 
      task_id: taskId,
      input_keys: inputKeys,
      message: `Batch task queued successfully with ${inputKeys.length} images`
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 新增函数：检查 Kaggle 心跳
async function isKaggleActive(env: Bindings): Promise<boolean> {
  const url = `${env.UPSTASH_REDIS_REST_URL}/get/kaggle_active`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  if (!response.ok) return false;
  const data = await response.json() as { result: string | null };
  return data.result !== null;
}

// 提取的独立唤醒 Kaggle 函数
async function wakeUpKaggle(env: Bindings) {
  console.log("Waking up Kaggle GPU machine...");
  const authString = btoa(`${env.KAGGLE_USERNAME}:${env.KAGGLE_KEY}`);
  const kaggleApiUrl = 'https://www.kaggle.com/api/v1/kernels/push';
  
  const response = await fetch(kaggleApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
       "id": env.KAGGLE_KERNEL_REF,
       "title": "miaocut-worker", 
       "code_file": "", 
       "language": "python", 
       "kernel_type": "script", 
       "is_private": "true", 
       "enable_gpu": "true", 
       "enable_internet": "true"
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to wake up Kaggle: ${await response.text()}`);
  }
  return true;
}

// 暴露 HTTP 手动唤醒接口 (便于调试)
app.get('/wakeup', async (c) => {
  try {
    await wakeUpKaggle(c.env);
    return c.json({ success: true, message: "Kaggle wake-up signal sent successfully!" });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// 提供一个极简的测试网页
app.get('/', (c) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>GPU Scheduler Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; background: #fafafa; }
      .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      button { background: #18181b; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; margin-top: 10px; }
      input { margin-bottom: 10px; }
      pre { background: #f4f4f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>1. Upload Images to R2 & Redis Queue</h2>
      <input type="file" id="file" accept="image/*" multiple />
      <button onclick="upload()">Upload & Queue</button>
      <pre id="upload-res">Waiting...</pre>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

      <h2>2. Manually Wake Up Kaggle GPU</h2>
      <button onclick="wakeup()">Wake Up Now</button>
      <pre id="wakeup-res">Waiting...</pre>
    </div>

    <script>
      async function upload() {
        const fileInput = document.getElementById('file');
        const files = fileInput.files;
        if(files.length === 0) return alert('Select files first');
        
        const fd = new FormData();
        // Hono parseBody() 会将多个同名的 FormData 键转为数组
        for (let i = 0; i < files.length; i++) {
          fd.append('file', files[i]);
        }
        
        document.getElementById('upload-res').innerText = 'Uploading...';
        const res = await fetch('/upload', { method: 'POST', body: fd });
        document.getElementById('upload-res').innerText = JSON.stringify(await res.json(), null, 2);
      }
      async function wakeup() {
        document.getElementById('wakeup-res').innerText = 'Sending wake-up signal...';
        const res = await fetch('/wakeup');
        document.getElementById('wakeup-res').innerText = JSON.stringify(await res.json(), null, 2);
      }
    </script>
  </body>
  </html>
  `;
  return c.html(html);
});

export default {
  // 处理普通的 HTTP 请求
  fetch: app.fetch,

  // 处理定时任务，唤醒 Kaggle
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log("Cron triggered, waking up Kaggle GPU machine...");
    try {
      await wakeUpKaggle(env);
      console.log('Successfully triggered Kaggle run via Cron');
    } catch (e) {
      console.error('Error during scheduled wake-up:', e);
    }
  }
};
