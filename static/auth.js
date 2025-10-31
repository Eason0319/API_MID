// 【新增】從 firebase-init.js 匯入 auth 物件
import { auth } from './firebase-init.js';
// 【新增】從 Firebase SDK 匯入 onAuthStateChanged 和 signOut 函式
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * 根據傳入的 user 物件，更新導覽列的 UI
 * @param {object | null} user - Firebase 的 user 物件，或是在未登入時為 null
 */
function updateNavbar(user) {
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');

    if (!authLinks || !userInfo || !welcomeMessage || !logoutBtn) {
        console.error("auth.js: 找不到導覽列的必要元素！");
        return;
    }

    if (user) {
        // --- 使用者已登入 ---
        authLinks.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userInfo.classList.add('flex');
        
        // 優先使用 Firebase 的 displayName，若無則用 email
        const displayName = user.displayName || user.email;
        welcomeMessage.textContent = `歡迎，${displayName}`;

        // 為登出按鈕加上事件監聽 (並確保只加一次)
        if (!logoutBtn.dataset.listenerAttached) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    console.log("auth.js: 正在呼叫 Firebase signOut...");
                    await signOut(auth); // 【核心修正】呼叫真正的登出函式
                    
                    // 清除 localStorage 只是作為輔助和清理
                    localStorage.clear(); 
                    console.log("登出成功，將重新導向至首頁。");
                    window.location.href = '/index.html'; // 登出成功後跳轉
                } catch (error) {
                    console.error("登出時發生錯誤:", error);
                }
            });
            // 標記一下，避免重複綁定事件
            logoutBtn.dataset.listenerAttached = 'true';
        }
    } else {
        // --- 使用者未登入 ---
        authLinks.classList.remove('hidden');
        authLinks.classList.add('flex');
        userInfo.classList.add('hidden');
    }
}

// 【核心邏輯】
// 程式一開始就設定一個監聽器，只要 Firebase 的登入狀態有任何變化
// (例如：登入、登出、頁面刷新時的狀態確認)，就會觸發 updateNavbar 函式來更新畫面。
// 這確保了 UI 永遠和真實的登入狀態同步。
onAuthStateChanged(auth, (user) => {
    console.log("auth.js: 偵測到身份狀態改變，目前使用者:", user ? user.uid : '未登入');
    updateNavbar(user);
});