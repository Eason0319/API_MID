// post.js

// 取得主要容器的參考
const articleWrapperEl = document.getElementById('article-wrapper');
const sidebarContentEl = document.getElementById('sidebar-content');

// 解析 URL 中的 slug
const params = new URLSearchParams(location.search);
const slug = params.get('slug');

// 追蹤目前側邊欄顯示的內容 ('comments' or 'likes')
let currentSidebarView = '';

// --- 函式定義 ---

/**
 * 渲染文章內容到左側區塊
 */
function renderArticle(post, likesCount = 0, commentsCount = 0) {
  const author = post.author.name ?? '';
  const title = post.title ?? '無標題';
  const body = post.content || '';

  articleWrapperEl.innerHTML = `
    <article>
      <h1 class="text-3xl md:text-4xl font-black text-white mb-2">${title}</h1>
      <p class="text-blue-200 text-sm mb-6">作者：${author}</p>
      <div class="prose prose-invert max-w-none text-slate-200 leading-relaxed mb-8">${body}</div>

      <div class="flex items-center gap-4 mt-6">
        <div class="tooltip-container">
          <button id="show-likes-btn" data-action="likes"
                  class="sidebar-btn group relative flex items-center justify-center gap-2 pl-4 pr-5 h-12 rounded-full border-2 border-pink-400 
                         text-pink-400 hover:bg-pink-500 hover:text-white shadow-lg transition-all duration-300
                         hover:shadow-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" 
                 class="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 
                       3.41.81 4.5 2.09A6.47 6.47 0 0 1 16.5 3C19.58 3 22 5.42 
                       22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/>
            </svg>
            <span id="likes-count" class="font-bold text-lg">${likesCount}</span>
          </button>
          <span class="tooltip-text">顯示按讚列表</span>
        </div>

        <div class="tooltip-container">
          <button id="show-comments-btn" data-action="comments"
                  class="sidebar-btn group relative flex items-center justify-center gap-2 pl-4 pr-5 h-12 rounded-full border-2 border-blue-400 
                         text-blue-400 hover:bg-blue-500 hover:text-white shadow-lg transition-all duration-300
                         hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
                 class="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M21 15a2 2 0 0 1 -2 2h-11l-4 4v-16a2 2 0 0 1 2 -2h13a2 2 0 0 1 2 2v10z" />
            </svg>
            <span id="comments-count" class="font-bold text-lg">${commentsCount}</span>
          </button>
          <span class="tooltip-text">顯示留言</span>
        </div>
      </div>
    </article>
  `;
}

/**
 * 更新按鈕的啟用狀態
 */
function updateButtonActiveState(activeAction) {
    const buttons = document.querySelectorAll('.sidebar-btn');
    buttons.forEach(button => {
        if (button.dataset.action === activeAction) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * 載入並渲染留言到右側區塊
 */
async function loadComments() {
  sidebarContentEl.innerHTML = '<div class="text-blue-200">留言載入中…</div>';
  try {
    const res = await axios.get(`/api/posts/${slug}/comments`);
    const comments = res.data;
    const commentsCount = Array.isArray(comments) ? comments.length : 0;
    const commentsCountEl = document.getElementById('comments-count');
    if (commentsCountEl) commentsCountEl.textContent = commentsCount;
    if (commentsCount === 0) {
      sidebarContentEl.innerHTML = '<div class="text-blue-200">這篇文章目前沒有留言。</div>';
    } else {
      const commentsHTML = comments.map(comment => `
        <div class="mb-4 last:mb-0">
          <p class="font-semibold text-yellow-400">${comment.author.name ?? '匿名'}</p>
          <p class="text-slate-200 text-sm">${comment.text ?? ''}</p>
        </div>
      `).join('');
      sidebarContentEl.innerHTML = `
        <div>
          <h4 class="text-xl font-bold text-white border-b border-white/20 pb-2 mb-4">留言 (${commentsCount})</h4>
          ${commentsHTML}
        </div>
      `;
    }
  } catch (err) {
    sidebarContentEl.innerHTML = `<div class="p-4 bg-rose-900/50 text-rose-300 border border-rose-400/50 rounded-xl">留言讀取失敗：${err.message}</div>`;
  }
}

/**
 * 載入並渲染按讚列表到右側區塊
 */
async function loadLikes() {
  sidebarContentEl.innerHTML = '<div class="text-blue-200">按讚列表載入中…</div>';
  try {
    const res = await axios.get(`/api/posts/${slug}/likes`);
    const likes = res.data;
    const likesCount = Array.isArray(likes) ? likes.length : 0;
    const likesCountEl = document.getElementById('likes-count');
    if (likesCountEl) likesCountEl.textContent = likesCount;
    if (likesCount === 0) {
      sidebarContentEl.innerHTML = '<div class="text-blue-200">這篇文章目前沒有人按讚。</div>';
    } else {
      const likesHTML = likes.map(like => {
        // 1. 從 like.author 中取得名字和頭像
        const authorName = like.author.name ?? '匿名';
        // 2. 如果頭像(profilePic)是 null，就使用後面的 Picsum 網址當作預設值
        const imageUrl = like.author.profilePic;
        
        return `
          <div class="flex items-center gap-3 mb-4 last:mb-0">
            <img src="${imageUrl}" alt="${authorName}" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50">
            <p class="font-semibold text-slate-200">${authorName}</p>
          </div>
        `;
      }).join('');

      sidebarContentEl.innerHTML = `
        <div>
          <h4 class="text-xl font-bold text-white border-b border-white/20 pb-2 mb-4">按讚的用戶 (${likesCount})</h4>
          ${likesHTML}
        </div>
      `;
    }
  } catch (err) {
    sidebarContentEl.innerHTML = `<div class="p-4 bg-rose-900/50 text-rose-300 border border-rose-400/50 rounded-xl">按讚列表讀取失敗：${err.message}</div>`;
  }
}

/**
 * 處理側邊欄按鈕點擊事件的總管函式
 */
async function handleSidebarAction(action) {
  if (action === currentSidebarView) return;
  currentSidebarView = action;
  updateButtonActiveState(action);
  if (action === 'comments') {
    await loadComments();
  } else if (action === 'likes') {
    await loadLikes();
  }
}

// --- 主要執行邏輯 ---
if (!slug) {
  document.title = '參數缺失';
  articleWrapperEl.innerHTML = '<div class="text-rose-600">缺少 slug </div>';
} else {
  (async () => {
    try {
      articleWrapperEl.innerHTML = '<div class="text-blue-200">載入中…</div>';
      const [postRes, likesRes, commentsRes] = await Promise.all([
        axios.get(`/api/posts/${encodeURIComponent(slug)}`),
        axios.get(`/api/posts/${slug}/likes`),
        axios.get(`/api/posts/${slug}/comments`)
      ]);
      const post = postRes.data;
      if (post.error) throw new Error(post.error);
      const likesCount = Array.isArray(likesRes.data) ? likesRes.data.length : 0;
      const commentsCount = Array.isArray(commentsRes.data) ? commentsRes.data.length : 0;
      document.title = post.title || '文章';
      renderArticle(post, likesCount, commentsCount);
      const showCommentsBtn = document.getElementById('show-comments-btn');
      const showLikesBtn = document.getElementById('show-likes-btn');
      if (showCommentsBtn) {
        showCommentsBtn.addEventListener('click', () => handleSidebarAction('comments'));
      }
      if (showLikesBtn) {
        showLikesBtn.addEventListener('click', () => handleSidebarAction('likes'));
      }
      await handleSidebarAction('comments');
    } catch (err) {
      document.title = '找不到文章';
      articleWrapperEl.innerHTML = `<div class="text-rose-600">載入失敗或找不到文章：${err.message}</div>`;
      console.error('單篇載入錯誤', err);
    }
  })();
}