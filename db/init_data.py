# db/init_data.py

from sqlalchemy.orm import Session
from db.engine import engine, Base 
from data.init_posts import posts as initial_posts_data
from models import authors, posts, comments, likes 

def create_tables():
    print("db.init_data: 正在執行 Base.metadata.create_all()...")
    Base.metadata.create_all(bind=engine)
    print("db.init_data: Base.metadata.create_all() 執行完畢。")

def init_db(db: Session):
    if db.query(posts.Post).first():
        print("db.init_data: 資料庫已有文章，跳過初始化。")
        return

    print("db.init_data: 資料庫為空，開始寫入初始資料...")
    author_cache = {}

    try:
        for post_data in initial_posts_data:
            author_name = post_data.get("author")
            db_author = author_cache.get(author_name)
            if not db_author:
                db_author = db.query(authors.Author).filter(authors.Author.name == author_name).first()
                if not db_author:
                    db_author = authors.Author(name=author_name)
                    db.add(db_author)
                author_cache[author_name] = db_author

            # ▼▼▼ 核心修正 ▼▼▼
            # 之前是 author_id=db_author.id (錯誤，此時 id 可能為 None)
            # 現在直接關聯整個物件，讓 SQLAlchemy 處理 ID
            new_post = posts.Post(
                slug=post_data.get("slug"),
                title=post_data.get("title"),
                content=post_data.get("content"),
                author=db_author  # <--- 使用物件關聯，而不是 ID
            )
            db.add(new_post)

            for comment_data in post_data.get("comments", []):
                comment_author_name = comment_data.get("author")
                db_comment_author = author_cache.get(comment_author_name)
                if not db_comment_author:
                    db_comment_author = db.query(authors.Author).filter(authors.Author.name == comment_author_name).first()
                    if not db_comment_author:
                        db_comment_author = authors.Author(name=comment_author_name)
                        db.add(db_comment_author)
                    author_cache[comment_author_name] = db_comment_author
                
                # 同樣使用物件關聯
                new_comment = comments.Comment(
                    text=comment_data.get("text"),
                    post=new_post,            # <--- 使用物件關聯
                    author=db_comment_author  # <--- 使用物件關聯
                )
                db.add(new_comment)

            for like_data in post_data.get("likes", []):
                like_author_name = like_data.get("name")
                db_like_author = author_cache.get(like_author_name)
                if not db_like_author:
                    db_like_author = db.query(authors.Author).filter(authors.Author.name == like_author_name).first()
                    if not db_like_author:
                        db_like_author = authors.Author(
                            name=like_author_name, 
                            profilePic=like_data.get("profilePic")
                        )
                        db.add(db_like_author)
                    author_cache[like_author_name] = db_like_author

                # 同樣使用物件關聯
                new_like = likes.Like(
                    post=new_post,          # <--- 使用物件關聯
                    author=db_like_author   # <--- 使用物件關聯
                )
                db.add(new_like)

        db.commit() # 在所有資料都 add 進 session 後，一次性提交
        print("db.init_data: 初始資料寫入成功！")

    except Exception as e:
        print(f"db.init_data: 資料初始化過程中發生錯誤: {e}")
        db.rollback()