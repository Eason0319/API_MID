# auth_firebase.py
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# 依賴 PPT P.25
security = HTTPBearer()
_firebase_app = None # 用來快取 app

def init_firebase():
    """
    初始化 Firebase Admin SDK (依據 PPT P.24)
    """
    global _firebase_app
    if _firebase_app:
        return _firebase_app

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path:
        raise ValueError("FIREBASE_CREDENTIALS_PATH 環境變量未設置")
    if not os.path.exists(cred_path):
        raise FileNotFoundError(f"Firebase 憑證文件不存在: {cred_path}")

    try:
        cred = credentials.Certificate(cred_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        return _firebase_app
    except Exception as e:
        print(f"初始化 Firebase Admin 失敗: {e}")
        raise

def verify_firebase_token(id_token: str):
    """
    驗證Firebase ID Token並返回解碼後的token資訊 (依據 PPT P.25)
    """
    try:
        # 初始化 app (如果尚未初始化的話)
        init_firebase()
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"無效的Firebase token: {str(e)}")

def require_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI 依賴項，用於驗證 Firebase Token (依據 PPT P.26)
    """
    token = credentials.credentials
    try:
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )