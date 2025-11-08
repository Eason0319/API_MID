# schemas/posts.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# --- Author Schemas ---
class AuthorBase(BaseModel):
    name: str
    profilePic: Optional[str] = None

class Author(AuthorBase):
    id: int
    name: str
    profilePic: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- Comment Schemas ---
class Comment(BaseModel):
    id: int
    text: str
    author: Author # 巢狀顯示作者資訊
    model_config = ConfigDict(from_attributes=True)

# --- Like Schemas ---
class Like(BaseModel):
    id: int
    author: Author # 巢狀顯示作者資訊
    model_config = ConfigDict(from_attributes=True)

# --- Post Schemas ---
class PostBase(BaseModel):
    slug: str
    title: str
    content: str

class Post(PostBase):
    id: int
    author: Author # 巢狀顯示作者資訊
    model_config = ConfigDict(from_attributes=True)

class PostDetail(Post):
    comments: List[Comment] = []
    likes: List[Like] = []

class CommentCreate(BaseModel):
    """ 用於接收新留言的 Schema """
    text: str
    author_name: str

class LikeCreate(BaseModel):
    """ 用於接收新按讚的 Schema """
    author_name: str
    profilePic: Optional[str] = None