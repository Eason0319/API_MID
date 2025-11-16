# app.py (修正 import 路徑後)

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from db.init_data import create_tables, init_db
from db.engine import SessionLocal
from routers import posts as post_router
from auth.firebase import init_firebase

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- Lifespan event: startup ---")
    try:
        init_firebase()
        # 現在 create_tables() 會確保所有模型都已載入
        create_tables()
        
        db = SessionLocal()
        init_db(db)
        db.close()
    except Exception as e:
        print(f"啟動過程中發生嚴重錯誤: {e}")
    
    yield
    
    print("--- Lifespan event: shutdown ---")

app = FastAPI(lifespan=lifespan)

app.include_router(post_router.router)


# --- 靜態檔案服務 (以下不變) ---
@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/blog.html")
async def read_blog_html():
    return FileResponse('static/blog.html')

@app.get("/post.html")
async def read_post_html():
    return FileResponse('static/post.html')

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)