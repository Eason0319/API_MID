import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import pathlib

load_dotenv()

DATABASE_URL = os.getenv("POSTGRES_URL")

if DATABASE_URL is None:
    cwd = pathlib.Path.cwd()
    db_file_path = cwd / "blog.db"
    print("="*50)
    print("DEBUG: 未找到 POSTGRES_URL，將使用本地 SQLite。")
    print(f"DEBUG: 當前工作目錄 (CWD): {cwd}")
    print(f"DEBUG: 預計建立的資料庫檔案路徑: {db_file_path}")
    print("="*50)
    DATABASE_URL = f"sqlite:///{db_file_path}"

engine = create_engine(
    DATABASE_URL,
    **({"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {})
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()