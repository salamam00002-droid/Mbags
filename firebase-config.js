// ========= إعدادات Firebase =========
// 1) ادخل على console.firebase.google.com وأنشئ مشروع
// 2) Project settings > Your apps > Web app (</>) وانسخ القيم هنا
// لو سيبتها كما هي، التطبيق هيشتغل في "وضع تجريبي" ويحفظ في المتصفح بس.
window.APP_CONFIG = {
 firebaseConfig: {
  apiKey: "AIzaSyBG1NXieFu_BHLlS5kY2nAd7v3l7EYR9MI",
  authDomain: "mbags-55804.firebaseapp.com",
  projectId: "mbags-55804",
  storageBucket: "mbags-55804.firebasestorage.app",
  messagingSenderId: "13708174069",
  appId: "1:13708174069:web:87f0ebfb75ddd84766dbbc"
 },

// إيميل حسابك كأدمن (نفس الإيميل اللي هتنشئه في Firebase Authentication)
ADMIN_EMAIL: "salama.m@gmail.com",

// تصنيفات الشنط (بتظهر في المتجر وفي صفحة إضافة المنتجات)
CATEGORIES: ["كابينة", "متوسطة", "كبيرة", "حقائب ظهر", "أطقم"],

// بيانات المتجر
STORE: {
  name: "Maivel Bags",
  currency: "ج.م",
  whatsapp: "201208630099" // رقمك بصيغة دولية بدون + أو أصفار
}
};
