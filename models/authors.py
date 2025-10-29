# models/authors.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db.engine import Base

class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    profilePic = Column(String, nullable=True) # 允許頭像 URL 為空

    # 建立與 Post, Comment, Like 的物件關聯
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    likes = relationship("Like", back_populates="author")