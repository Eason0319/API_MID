// 匯入 Firebase Authentication 服務 和 註冊函式
import { auth } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById('register-form');
const errorMessageEl = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessageEl.textContent = '';

  const email = form.email.value;
  const nickname = form.nickname.value;
  const password = form.password.value;
  const confirmPassword = form['confirm-password'].value;

  // 基本的前端驗證
  if (!nickname.trim()) {
    errorMessageEl.textContent = '請輸入您的暱稱！';
    return;
  }
  if (password !== confirmPassword) {
    errorMessageEl.textContent = '兩次輸入的密碼不一致！';
    return;
  }
  if (password.length < 6) {
    errorMessageEl.textContent = '密碼長度不能少於 6 個字元！';
    return;
  }

  try {
    // 使用 Firebase 的 createUserWithEmailAndPassword 函式建立新使用者
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 註冊成功
    const user = userCredential.user;
    console.log('註冊成功:', user);
    
    alert('註冊成功！將為您自動登入並跳轉至首頁。');

    // 註冊成功後，直接幫使用者登入
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userNickname', nickname);
    const idToken = await user.getIdToken();
    localStorage.setItem('firebaseIdToken', idToken);

    // 跳轉回首頁
    window.location.href = '/'; 

  } catch (error) {
    // 註冊失敗
    console.error('註冊失敗:', error.code, error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessageEl.textContent = '這個 Email 已經被註冊過了！';
    } else if (error.code === 'auth/invalid-email') {
      errorMessageEl.textContent = '請輸入有效的 Email 格式。';
    } else {
      errorMessageEl.textContent = '發生未知錯誤，請稍後再試。';
    }
  }
});