// 1. استيراد المكتبات من الروابط المباشرة (CDN) لتشتغل على المتصفح فوراً
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. كود الإعدادات الخاص بمشروعك (السوق السوري المفتوح)
const firebaseConfig = {
  apiKey: "AIzaSyCjYmif5DVeSy9bpjhe467zunPvyHPv5Gg",
  authDomain: "open-syrian-souq.firebaseapp.com",
  projectId: "open-syrian-souq",
  storageBucket: "open-syrian-souq.firebasestorage.app",
  messagingSenderId: "457705992518",
  appId: "1:457705992518:web:f3a1fc60e42d1c44d23547",
  measurementId: "G-KZGHFPPM91"
};

// 3. تشغيل الفايربيس وقاعدة البيانات ونظام الحسابات
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
