function checkLoginStatus() {
  console.log("auth.js: 開始檢查登入狀態...");

  // 從 localStorage 取得資料
  const userEmail = localStorage.getItem('userEmail');
  const userNickname = localStorage.getItem('userNickname');
  const token = localStorage.getItem('firebaseIdToken');
  
  console.log("auth.js: 讀取到的 Token:", token ? "有" : "沒有");
  console.log("auth.js: 讀取到的 Email:", userEmail);

  // 取得頁面上的元素
  const authLinks = document.getElementById('auth-links');
  const userInfo = document.getElementById('user-info');
  const welcomeMessage = document.getElementById('welcome-message');
  const logoutBtn = document.getElementById('logout-btn');

  // 防呆：確保所有需要的 HTML 元素都存在
  if (!authLinks || !userInfo || !welcomeMessage || !logoutBtn) {
    console.error("auth.js: 錯誤！頁面缺少必要的登入/使用者資訊元素。");
    return;
  }

  if (token && userEmail) {
    // === 判斷為「已登入」 ===
    console.log("auth.js: 判斷為已登入，正在更新 UI...");
    authLinks.classList.add('hidden');
    
    userInfo.classList.remove('hidden');
    userInfo.classList.add('flex'); // 確保 userInfo 區塊是 flex 佈局
    
    const displayName = userNickname || userEmail;
    welcomeMessage.textContent = `歡迎，${displayName}`;

    logoutBtn.addEventListener('click', () => {
      console.log("auth.js: 使用者點擊登出。");
      // 執行登出
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userNickname');
      localStorage.removeItem('firebaseIdToken');
      // 登出後跳轉到登入頁
      window.location.href = '/index.html'; 
    });

  } else {
    // === 判斷為「未登入」 ===
    console.log("auth.js: 判斷為未登入，顯示登入/註冊按鈕。");
    authLinks.classList.remove('hidden');
    authLinks.classList.add('flex'); // 確保 authLinks 區塊是 flex 佈局

    userInfo.classList.add('hidden');
  }
}

// 確保在整個 DOM 載入完成後才執行檢查
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkLoginStatus);
} else {
  // 如果 DOM 已經載入，則直接執行
  checkLoginStatus();
}