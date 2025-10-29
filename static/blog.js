// index.js （ES Module + Top-Level Await）
const listEl = document.getElementById('list');

function cardHTML(p) {
  const author = p.author.name ?? '';
  const title = p.title ?? '無標題';
  const href = `/post.html?slug=${encodeURIComponent(p.slug || '')}`;

  return `
    <a href="${href}"
       class="group block rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-lg 
              hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      
      <h3 class="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors duration-300">
        ${title}
      </h3>
      
      <p class="text-blue-200 text-sm mb-3">作者：${author}</p>
      
      <div class="h-1 w-16 bg-yellow-400 rounded-full mb-3 group-hover:w-24 transition-all duration-300"></div>

    </a>
  `;
}

try {
  listEl.textContent = '載入中…';
  const res = await axios.get('/api/posts', { timeout: 10000 });
  const posts = res.data;

  if (!Array.isArray(posts) || posts.length === 0) {
    listEl.innerHTML = '<div class="text-slate-500">目前沒有文章。</div>';
  } else {
    listEl.innerHTML = posts.map(p => cardHTML(p)).join('');
  }
} catch (err) {
  listEl.innerHTML = `<div class="text-rose-600">讀取失敗：${err.message}</div>`;
  console.error('列表載入錯誤', err);
}
