# routers/posts.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db.engine import get_db
from models import posts as post_model, comments as comment_model, likes as like_model,  authors as author_model
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

# --- ▼▼▼ 新增的路由 (處理資料庫寫入) ▼▼▼ ---

@router.post("/api/posts/{slug}/comments", response_model=post_schema.Comment, status_code=status.HTTP_201_CREATED)
def create_comment_for_post(slug: str, comment_data: post_schema.CommentCreate, db: Session = Depends(get_db)):
    """ 為特定文章建立新留言 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 尋找或建立留言的作者
    db_author = get_or_create_author(db, author_name=comment_data.author_name)
    
    # 建立新留言
    new_comment = comment_model.Comment(
        text=comment_data.text,
        post=post,          # 使用 SQLAlchemy 關聯
        author=db_author    # 使用 SQLAlchemy 關聯
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return new_comment

@router.post("/api/posts/{slug}/like", response_model=post_schema.Like, status_code=status.HTTP_201_CREATED)
def like_post(slug: str, like_data: post_schema.LikeCreate, db: Session = Depends(get_db)):
    """ 為特定文章按讚 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 尋找或建立按讚的作者
    db_author = get_or_create_author(db, author_name=like_data.author_name, profile_pic=like_data.profilePic)

    # 檢查是否已經按過讚
    existing_like = db.query(like_model.Like).filter(
        like_model.Like.post_id == post.id,
        like_model.Like.author_id == db_author.id
    ).first()
    
    if existing_like:
        # 如果已經按過了，就直接返回
        return existing_like

    new_like = like_model.Like(
        post=post,          # 使用 SQLAlchemy 關聯
        author=db_author    # 使用 SQLAlchemy 關聯
    )
    db.add(new_like)
    db.commit()
    db.refresh(new_like)
    return new_like

@router.delete("/api/posts/{slug}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(slug: str, like_data: post_schema.LikeCreate, db: Session = Depends(get_db)):
    """ 為特定文章取消讚 """
    post = db.query(post_model.Post).filter(post_model.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 尋找作者 (如果作者不存在，那也不可能按過讚)
    db_author = db.query(author_model.Author).filter(author_model.Author.name == like_data.author_name).first()
    if not db_author:
        # 找不到作者，直接返回成功 (因為本來就沒讚)
        return

    # 尋找按讚紀錄
    existing_like = db.query(like_model.Like).filter(
        like_model.Like.post_id == post.id,
        like_model.Like.author_id == db_author.id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        db.commit()
        
    # 無論如何都返回 204 (代表操作完成)
    return