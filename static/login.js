// 匯入 Firebase Authentication 服務 和 登入函式
import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById('login-form');
const errorMessageEl = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessageEl.textContent = '';

  const email = form.username.value; // 在 Firebase 中，帳號就是 Email
  const password = form.password.value;

  try {
    // 使用 Firebase 的 signInWithEmailAndPassword 函式進行登入
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 登入成功
    const user = userCredential.user;
    console.log('登入成功:', user);
    
    // 將使用者的 email 存到 localStorage
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userNickname', user.displayName || '');
    
    // 登入成功後，你可以透過 user.getIdToken() 來取得 Firebase 的 JWT Token
    // 如果未來你需要跟自己的後端 API 溝通，可以傳遞這個 token
    const idToken = await user.getIdToken();
    localStorage.setItem('firebaseIdToken', idToken);


    // 跳轉回首頁
    window.location.href = '/'; 

  } catch (error) {
    // 登入失敗
    console.error('登入失敗:', error.code, error.message);
    
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      errorMessageEl.textContent = '帳號或密碼錯誤！';
    } else {
      errorMessageEl.textContent = '發生未知錯誤，請稍後再試。';
    }
  }
});