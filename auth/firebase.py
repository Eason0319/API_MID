# auth/firebase.py
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- Firebase Admin SDK 初始化 ---

# 1. 設定金鑰檔案的路徑 (我們直接指向根目錄的 serviceAccountKey.json)
#    請確保你已經從 Firebase 下載了這個檔案
SERVICE_ACCOUNT_KEY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")

def init_firebase():
    """初始化 Firebase Admin SDK"""
    print("--- 正在初始化 Firebase Admin SDK ---")
    if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
        print(f"警告：Firebase 憑證文件不存在於: {SERVICE_ACCOUNT_KEY_PATH}")
        print("後端 Auth 功能將無法運作，請下載 serviceAccountKey.json")
        return

    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("--- Firebase Admin SDK 初始化成功 ---")
    except ValueError as e:
        # 避免重複初始化
        print(f"Firebase Admin SDK 已初始化或發生錯誤: {e}")
    except Exception as e:
        print(f"初始化 Firebase Admin SDK 時發生未知錯誤: {e}")


# --- FastAPI 依賴項 (Dependency) ---

security = HTTPBearer()

def verify_firebase_token(id_token: str) -> dict:
    """
    驗證 Firebase ID Token 並返回解碼後的 token 資訊
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        # 這裡的 print 僅用於伺服器端除錯
        print(f"驗證 Token 失敗: {e}") 
        raise ValueError(f"無效的 Firebase token: {e}")

def require_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    一個 FastAPI 依賴項，用來從 Header 取得 Token 並進行驗證。
    如果驗證成功，返回解碼後的 payload。
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供身份驗證憑證",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    try:
        payload = verify_firebase_token(token)
        return payload
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )