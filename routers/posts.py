# routers/posts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db.engine import get_db
from models import posts as post_model, comments as comment_model, likes as like_model
from schemas import posts as post_schema

router = APIRouter()

@router.get("/api/posts", response_model=List[post_schema.Post])
def get_all_posts(db: Session = Depends(get_db)):
    """ 取得所有文章列表 """
    all_posts = db.query(post_model.Post).all()
    return all_posts

@router.get("/api/posts/{slug}", response_model=post_schema.Post)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    """ 根據 slug 取得單篇文章 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.get("/api/posts/{slug}/comments", response_model=List[post_schema.Comment])
def get_comments_for_post(slug: str, db: Session = Depends(get_db)):
    """ 取得文章的所有留言 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post.comments

@router.get("/api/posts/{slug}/likes", response_model=List[post_schema.Like])
def get_likes_for_post(slug: str, db: Session = Depends(get_db)):
    """ 取得文章的所有按讚者 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post.likes