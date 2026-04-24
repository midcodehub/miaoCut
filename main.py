from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Request
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import io
import uvicorn
from rembg import remove
from PIL import Image

# Initialize SlowAPI Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="miaoCut API", description="1秒纯净抠图后端 API")

# Register the RateLimiter and its custom exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Serve the index.html on the root URL
@app.get("/")
async def root():
    return FileResponse("index.html")

# Define allowed MIME types
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

@app.post("/api/remove-background")
@limiter.limit("5/minute;50/day") # Rate Limiting Rule: 5 per minute, 50 per day
async def remove_background(request: Request, file: UploadFile = File(...)):
    # 1. 验证文件类型
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件格式: {file.content_type}。仅支持 JPG, PNG, WebP。"
        )
    
    try:
        # 2. 读取文件进内存，绝不落盘
        input_data = await file.read()
        
        # 3. 验证文件是否真的是图片
        try:
            input_image = Image.open(io.BytesIO(input_data))
            input_image.verify()  
        except Exception:
            raise HTTPException(status_code=400, detail="无效的图片文件。")

        # 4. 调用 rembg 处理内存中的图像数据
        output_data = remove(input_data)
        
        # 5. 返回处理后的 PNG 图片流
        return Response(
            content=output_data, 
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename={file.filename.split('.')[0]}_nobg.png"
            }
        )
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="图片处理失败，可能图片过于复杂，请重试。")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
