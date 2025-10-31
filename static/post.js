import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, collection, onSnapshot, getDoc, setDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 取得主要容器的參考
const articleWrapperEl = document.getElementById('article-wrapper');
const sidebarContentEl = document.getElementById('sidebar-content');

// 解析 URL 中的 slug
const params = new URLSearchParams(location.search);
const slug = params.get('slug');

let isLikedThisSession = false;
let postData = null;
let currentUser = null;
let displayedLikesList = [];

function waitForAuthState() {
    return new Promise((resolve) => {
        // onAuthStateChanged 會在狀態確定時觸發一次
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // 不論 user 是物件還是 null，都代表狀態已確定，可以 resolve Promise
            resolve(user);
            // 完成一次性檢查後，取消這個監聽器
            unsubscribe();
        });
    });
}
/**
 * 主要執行函式
 */
async function main() {
  if (!slug) { /* ... 錯誤處理 ... */ return; }

  try {
    articleWrapperEl.innerHTML = '<div class="text-blue-200">載入中…</div>';
    
    // 【核心修正】在執行任何操作前，先等待登入狀態確認
    console.log("正在等待 Firebase 身份驗證...");
    currentUser = await waitForAuthState();
    if (currentUser) {
        console.log("驗證完成，使用者已登入:", currentUser.uid);
    } else {
        console.log("驗證完成，使用者未登入。");
    }

    // 現在 currentUser 已經是正確的值了，我們可以安全地繼續執行
    const [postRes, likesRes, commentsRes] = await Promise.all([
      axios.get(`/api/posts/${slug}`),
      axios.get(`/api/posts/${slug}/likes`),
      axios.get(`/api/posts/${slug}/comments`)
    ]);

    const post = postRes.data;
    const likes = likesRes.data;
    const comments = commentsRes.data;

    displayedLikesList = likes || [];

    postData = post;
    document.title = post.title || '文章';

    renderArticle(post, likes, comments);
    bindInteractionEvents(likes, comments);
    
    // 現在呼叫 loadCommentsSidebar 時，currentUser 絕對是正確的
    loadCommentsSidebar(comments);

  } catch (err) {
    document.title = '找不到文章';
    articleWrapperEl.innerHTML = `<div class="text-rose-600">載入失敗或找不到文章：${err.message}</div>`;
    console.error('main: 載入文章時發生嚴重錯誤', err);
  }
}

/**
 * 渲染文章的靜態骨架和互動按鈕
 */
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
                class="group flex items-center justify-center h-12 w-12 rounded-full bg-gray-700 text-pink-400 hover:bg-pink-500 hover:text-white transition-all duration-300 transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-6 h-6"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.47 6.47 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/></svg>
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

/**
 * 為互動元素綁定點擊事件
 */
function bindInteractionEvents(likes, comments) {
    document.getElementById('like-action-btn').addEventListener('click', handleLikeClick);
    document.getElementById('show-likes-trigger').addEventListener('click', loadLikesSidebar);
    document.getElementById('show-comments-trigger').addEventListener('click', () => loadCommentsSidebar(comments));
}


// --- 側邊欄 (Sidebar) 相關函式 ---

/**
 * 在側邊欄載入按讚列表 (現在資料是直接傳入的)
 */
function loadLikesSidebar() { 
  sidebarContentEl.innerHTML = ''; 
  const likesCountEl = document.getElementById('likes-count');
  const currentCount = likesCountEl ? likesCountEl.textContent : '0';

  if (parseInt(currentCount, 10) === 0) {
      sidebarContentEl.innerHTML = '<div class="text-blue-200">還沒有人按讚。</div>';
      return;
  }

  // 【核心修正】現在總是使用 displayedLikesList 這唯一的狀態來源來產生 HTML
  const likesHTML = displayedLikesList.map(like => {
      const authorName = like.author.name || '匿名';
      const imageUrl = like.author.profilePic || `https://i.pravatar.cc/50?u=${authorName}`; 
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

/**
 * 在側邊欄載入留言列表 (現在資料是直接傳入的)
 */
function loadCommentsSidebar(comments) {
    sidebarContentEl.innerHTML = ''; 

    const commentsHTML = (!Array.isArray(comments) || comments.length === 0)
        ? '<div id="no-comments-message" class="text-blue-200">這篇文章目前沒有留言。</div>'
        : comments.map(comment => `
            <div class="mb-4 last:mb-0">
                <p class="font-semibold text-yellow-400">${comment.author.name ?? '匿名'}</p>
                <p class="text-slate-200 text-sm">${comment.text ?? ''}</p>
            </div>
        `).join('');

    const commentsCount = Array.isArray(comments) ? comments.length : 0;
    
    let commentFormHTML = '';
    // 因為 main 函式已經等待過，所以這裡的 currentUser 是可靠的
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

function handleLikeClick() {
  if (!currentUser) { /* ... 登入檢查 ... */ return; }

  const likesCountEl = document.getElementById('likes-count');
  if (!likesCountEl) return;
  
  let currentCount = parseInt(likesCountEl.textContent, 10);

  // 取得原始資料，以便取消讚時可以還原
  const initialLikes = postData ? (postData.likes || []) : [];

  if (isLikedThisSession) {
    // --- 取消讚 ---
    currentCount -= 1;
    isLikedThisSession = false;
    // ... 更新按鈕樣式 ...
    
    // 【核心修正】直接從原始資料中過濾掉當前使用者，來更新「顯示用名單」
    displayedLikesList = displayedLikesList.filter(like => 
        like.author.name !== (currentUser.displayName || currentUser.email)
    );

  } else {
    // --- 按讚 ---
    currentCount += 1;
    isLikedThisSession = true;
    // ... 更新按鈕樣式 ...

    const currentUserLike = {
      author: {
        name: currentUser.displayName || currentUser.email,
        profilePic: 'https://i.pravatar.cc/50?u=fakeuser'
      }
    };
    // 【核心修正】直接在「顯示用名單」的最前面加上當前使用者
    displayedLikesList.unshift(currentUserLike);
  }

  likesCountEl.textContent = currentCount;
  
  // 如果側邊欄剛好在顯示按讚列表，就立即重新整理它
  if (sidebarContentEl.querySelector('h4')?.textContent.includes('按讚的用戶')) {
      loadLikesSidebar();
  }
}

/**
處理前端新留言提交的函式
 */
function handleCommentSubmit(event) {
    event.preventDefault(); 

    // 【核心修改】因為只有登入才能看到表單，所以這裡 currentUser 必定存在
    if (!currentUser) {
        alert("錯誤：請先登入！");
        return;
    }

    const commentErrorEl = document.getElementById('comment-error');
    const textarea = document.getElementById('comment-text');
    
    // 直接從 currentUser 物件獲取暱稱
    const authorName = currentUser.displayName || currentUser.email;
    const commentText = textarea.value.trim();

    commentErrorEl.textContent = '';

    if (!commentText) {
        commentErrorEl.textContent = '留言內容不能為空！';
        return;
    }
    
    const newCommentHTML = `
        <div class="mb-4 last:mb-0 p-3 bg-white/5 rounded-lg animate-pulse">
            <p class="font-semibold text-yellow-400">${authorName}</p>
            <p class="text-slate-200 text-sm">${commentText}</p>
        </div>
    `;

    const commentListContainer = document.getElementById('comment-list-container');
    const noCommentsMessage = document.getElementById('no-comments-message');

    if (noCommentsMessage) {
        commentListContainer.innerHTML = newCommentHTML;
    } else {
        commentListContainer.innerHTML += newCommentHTML;
    }
    
    const newCommentEl = commentListContainer.lastElementChild;
    setTimeout(() => {
        newCommentEl.classList.remove('animate-pulse');
    }, 500);

    textarea.value = '';
    
    // 更新留言計數
    const sidebarTitle = sidebarContentEl.querySelector('h4');
    const commentsCountButton = document.getElementById('comments-count');
    
    if (sidebarTitle && commentsCountButton) {
        let currentCount = parseInt(sidebarTitle.textContent.match(/\((\d+)\)/)[1], 10);
        let newCount = currentCount + 1;
        
        sidebarTitle.textContent = `留言 (${newCount})`;
        commentsCountButton.textContent = newCount;
    }
}
// 執行主函式
main();