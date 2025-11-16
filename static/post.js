// static/post.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, collection, onSnapshot, getDoc, setDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ... (檔案上半部保持不變) ...

const articleWrapperEl = document.getElementById('article-wrapper');
const sidebarContentEl = document.getElementById('sidebar-content');
const params = new URLSearchParams(location.search);
const slug = params.get('slug');
let isLikedByCurrentUser = false;
let postData = null;
let currentUser = null;
let displayedLikesList = [];
let displayedCommentsList = [];

function waitForAuthState() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            resolve(user);
            unsubscribe();
        });
    });
}

async function main() {
  if (!slug) {
    articleWrapperEl.innerHTML = '<div class="text-rose-600">錯誤：缺少文章 slug。</div>';
    return;
  }
  try {
    articleWrapperEl.innerHTML = '<div class="text-blue-200">載入中…</div>';
    console.log("正在等待 Firebase 身份驗證...");
    currentUser = await waitForAuthState();
    if (currentUser) {
        console.log("驗證完成，使用者已登入:", currentUser.uid);
    } else {
        console.log("驗證完成，使用者未登入。");
    }
    const [postRes, likesRes, commentsRes] = await Promise.all([
      axios.get(`/api/posts/${slug}`),
      axios.get(`/api/posts/${slug}/likes`),
      axios.get(`/api/posts/${slug}/comments`)
    ]);
    postData = postRes.data;
    displayedLikesList = likesRes.data || [];
    displayedCommentsList = commentsRes.data || [];
    document.title = postData.title || '文章';
    if (currentUser) {
        const userName = currentUser.displayName || currentUser.email;
        isLikedByCurrentUser = displayedLikesList.some(like => like.author.name === userName);
    }
    renderArticle(postData, displayedLikesList, displayedCommentsList);
    updateLikeUI(isLikedByCurrentUser, displayedLikesList.length);
    bindInteractionEvents();
    loadCommentsSidebar();
  } catch (err) {
    document.title = '找不到文章';
    articleWrapperEl.innerHTML = `<div class="text-rose-600">載入失敗或找不到文章：${err.message}</div>`;
    console.error('main: 載入文章時發生嚴重錯誤', err);
  }
}

function renderArticle(post, likes, comments) {
  const author = post.author.name ?? '匿名';
  const title = post.title ?? '無標題';
  const body = post.content || '';
  const likesCount = Array.isArray(likes) ? likes.length : 0;
  const commentsCount = Array.isArray(comments) ? comments.length : 0;
  articleWrapperEl.innerHTML = `
    <article>
      <h1 class="text-3xl md:text-4xl font-black text-white mb-2">${title}</h1>
      <p class="text-blue-200 text-sm mb-6">作者：${author}</p>
      <div class="prose prose-invert max-w-none text-slate-200 leading-relaxed mb-8">${body}</div>
      <div id="interaction-area" class="flex items-center gap-4 mt-6 border-t border-white/20 pt-6">
        <button id="like-action-btn" title="按讚"
                class="group flex items-center justify-center h-12 w-12 rounded-full bg-gray-700 text-gray-400 
                       transition-all duration-300 transform 
                       hover:scale-110 hover:bg-pink-500 hover:text-white
                       disabled:opacity-50 disabled:cursor-not-allowed">
            <svg id="like-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6"><path stroke="currentColor" stroke-width="2" d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.47 6.47 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/></svg>
        </button>
        <div id="show-likes-trigger" class="text-blue-200 cursor-pointer hover:underline">
            <span id="likes-count" class="font-bold">${likesCount}</span> 人說讚
        </div>
        <div class="flex-grow"></div>
        <button id="show-comments-trigger" data-action="comments"
            class="sidebar-btn group relative flex items-center justify-center gap-2 pl-4 pr-5 h-12 rounded-full border-2 
                   bg-blue-800 text-white border-blue-600 
                   hover:bg-blue-700 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/50
                   transition-all duration-300
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
             class="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M21 15a2 2 0 0 1 -2 2h-11l-4 4v-16a2 2 0 0 1 2 -2h13a2 2 0 0 1 2 2v10z" />
        </svg>
        <span id="comments-count" class="font-bold text-lg">${commentsCount}</span>
    </button>
      </div>
    </article>
  `;
}

function bindInteractionEvents() {
    document.getElementById('like-action-btn').addEventListener('click', handleLikeClick);
    document.getElementById('show-likes-trigger').addEventListener('click', loadLikesSidebar);
    document.getElementById('show-comments-trigger').addEventListener('click', loadCommentsSidebar);
}

function updateLikeUI(isLiked, count) {
    const likeBtn = document.getElementById('like-action-btn');
    const likeIcon = document.getElementById('like-icon');
    const likesCountEl = document.getElementById('likes-count');
    if (likesCountEl) {
        likesCountEl.textContent = count;
    }
    if (likeBtn && likeIcon) {
        if (isLiked) {
            likeBtn.classList.remove('bg-gray-700', 'text-gray-400');
            likeBtn.classList.add('bg-pink-600', 'text-white');
            likeIcon.setAttribute('fill', 'currentColor');
        } else {
            likeBtn.classList.add('bg-gray-700', 'text-gray-400');
            likeBtn.classList.remove('bg-pink-600', 'text-white');
            likeIcon.setAttribute('fill', 'none');
        }
    }
}

function loadLikesSidebar() { 
  sidebarContentEl.innerHTML = ''; 
  const currentCount = displayedLikesList.length;
  if (currentCount === 0) {
      sidebarContentEl.innerHTML = '<div class="text-blue-200">還沒有人按讚。</div>';
      return;
  }
  const likesHTML = displayedLikesList.map(like => {
      const authorName = like.author.name || '匿名';
      const imageUrl = like.author.profilePic || `https://i.pravatar.cc/50?u=${encodeURIComponent(authorName)}`; 
      return `
        <div class="flex items-center gap-3 mb-4 last:mb-0">
          <img src="${imageUrl}" alt="${authorName}" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50">
          <p class="font-semibold text-slate-200">${authorName}</p>
        </div>
      `;
  }).join('');
  sidebarContentEl.innerHTML = `
    <div>
      <h4 class="text-xl font-bold text-white border-b border-white/20 pb-2 mb-4">按讚的用戶 (${currentCount})</h4>
      ${likesHTML}
    </div>
  `;
}

function loadCommentsSidebar() {
    sidebarContentEl.innerHTML = ''; 
    const commentsCount = displayedCommentsList.length;
    const commentsHTML = (commentsCount === 0)
        ? '<div id="no-comments-message" class="text-blue-200">這篇文章目前沒有留言。</div>'
        : displayedCommentsList.map(comment => `
            <div class="mb-4 last:mb-0">
                <p class="font-semibold text-yellow-400">${comment.author.name ?? '匿名'}</p>
                <p class="text-slate-200 text-sm">${comment.text ?? ''}</p>
            </div>
        `).join('');
    let commentFormHTML = '';
    if (currentUser) {
        const userNickname = currentUser.displayName || currentUser.email;
        commentFormHTML = `
            <div class="mt-6 pt-6 border-t border-white/20">
                <form id="new-comment-form">
                    <h5 class="text-lg font-bold text-white mb-1">發表你的看法</h5>
                    <p class="text-sm text-blue-200 mb-3">以 ${userNickname} 的身份留言</p>
                    <div>
                        <textarea id="comment-text" class="w-full bg-gray-900/50 border-blue-400/50 rounded-lg text-white p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" rows="3" placeholder="輸入留言..." required></textarea>
                        <div id="comment-error" class="text-red-400 text-sm h-4"></div>
                    </div>
                    <button type="submit" class="mt-2 w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-2 px-4 rounded-full transition-all duration-300 hover:scale-105">
                        送出留言
                    </button>
                </form>
            </div>
        `;
    } else {
        commentFormHTML = `
            <div class="mt-6 pt-6 border-t border-white/20 text-center">
                <h5 class="text-lg font-bold text-white mb-3">想加入討論嗎？</h5>
                <a href="/login.html" class="inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-all duration-300">
                    請登入以發表你的看法
                </a>
            </div>
        `;
    }
    sidebarContentEl.innerHTML = `
        <div>
            <h4 class="text-xl font-bold text-white border-b border-white/20 pb-2 mb-4">留言 (${commentsCount})</h4>
            <div id="comment-list-container">${commentsHTML}</div>
            ${commentFormHTML}
        </div>
    `;
    const commentForm = document.getElementById('new-comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
}

async function handleLikeClick() {
  if (!currentUser) {
    alert("請先登入才能按讚！");
    window.location.href = '/login.html';
    return;
  }
  const likeBtn = document.getElementById('like-action-btn');
  likeBtn.disabled = true;
  const authorName = currentUser.displayName || currentUser.email;
  const profilePic = currentUser.photoURL || `https://i.pravatar.cc/50?u=${encodeURIComponent(authorName)}`;
  
  try {
    // 【新增】取得 Token
    const token = await currentUser.getIdToken();
    const authHeader = { 'Authorization': `Bearer ${token}` };

    if (isLikedByCurrentUser) {
      // --- 取消讚 ---
      const payload = {};
      await axios.delete(`/api/posts/${slug}/like`, { data: payload, headers: authHeader });
      isLikedByCurrentUser = false;
      displayedLikesList = displayedLikesList.filter(like => like.author.name !== authorName);
    } else {
      // --- 按讚 ---
      const payload = { 
          profilePic: profilePic
      };
      const response = await axios.post(`/api/posts/${slug}/like`, payload, {headers: authHeader});
      isLikedByCurrentUser = true;
      displayedLikesList.unshift(response.data);
    }
    updateLikeUI(isLikedByCurrentUser, displayedLikesList.length);
    if (sidebarContentEl.querySelector('h4')?.textContent.includes('按讚的用戶')) {
        loadLikesSidebar();
    }
  } catch (err) {
    // ▼▼▼ 修正：顯示更詳細的錯誤 ▼▼▼
    console.error('按讚/取消讚失敗:', err.response ? err.response.data : err.message);
    alert('操作失敗！請查看 console 獲取詳細資訊。');
  } finally {
    likeBtn.disabled = false;
  }
}

async function handleCommentSubmit(event) {
    event.preventDefault(); 
    if (!currentUser) return;
    const commentErrorEl = document.getElementById('comment-error');
    const textarea = document.getElementById('comment-text');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const authorName = currentUser.displayName || currentUser.email;
    const commentText = textarea.value.trim();
    commentErrorEl.textContent = '';
    if (!commentText) {
        commentErrorEl.textContent = '留言內容不能為空！';
        return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '送出中...';
    try {
        const token = await currentUser.getIdToken();
        const payload = {
            text: commentText,
        };
        const response = await axios.post(`/api/posts/${slug}/comments`, payload,
        {headers: { 'Authorization': `Bearer ${token}` }}  );
        const newComment = response.data;
        displayedCommentsList.push(newComment);
        updateCommentUI(newComment);
        textarea.value = ''; 
    } catch (err) {
        // ▼▼▼ 修正：使用 alert 彈出錯誤 ▼▼▼
        console.error('留言失敗:', err.response ? err.response.data : err.message);
        alert('留言失敗！請查看 console 獲取詳細資訊。');
        commentErrorEl.textContent = '留言失敗，請稍後再試。';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '送出留言';
    }
}

function updateCommentUI(newComment) {
    const commentListContainer = document.getElementById('comment-list-container');
    const noCommentsMessage = document.getElementById('no-comments-message');
    const newCommentHTML = `
        <div class="mb-4 last:mb-0">
            <p class="font-semibold text-yellow-400">${newComment.author.name ?? '匿名'}</p>
            <p class="text-slate-200 text-sm">${newComment.text ?? ''}</p>
        </div>
    `;
    if (noCommentsMessage) {
        commentListContainer.innerHTML = newCommentHTML;
    } else {
        commentListContainer.innerHTML += newCommentHTML;
    }
    const commentsCount = displayedCommentsList.length;
    const sidebarTitle = sidebarContentEl.querySelector('h4');
    const commentsCountButton = document.getElementById('comments-count');
    if (sidebarTitle) {
        sidebarTitle.textContent = `留言 (${commentsCount})`;
    }
    if (commentsCountButton) {
        commentsCountButton.textContent = commentsCount;
    }
}

main();