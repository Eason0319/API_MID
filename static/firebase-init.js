import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ▼▼▼ 把您剛剛從 Firebase 網站複製的 firebaseConfig 貼在這裡 ▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyBO8Xdo5AVrbO9vj5u47Ugg12CSz6vVtqQ",
  authDomain: "fubonfan-cb140.firebaseapp.com",
  projectId: "fubonfan-cb140",
  storageBucket: "fubonfan-cb140.firebasestorage.app",
  messagingSenderId: "453434921251",
  appId: "1:453434921251:web:b6cd6e49d3a8065e7c3c96",
  measurementId: "G-G40FLP7HYR"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 導出 Firebase Authentication 服務，讓其他 JS 檔案可以使用
export const auth = getAuth(app);