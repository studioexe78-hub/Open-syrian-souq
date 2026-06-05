import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputUser = document.getElementById("login-email").value.trim();
        const passwordUser = document.getElementById("login-password").value;
        let finalEmail = inputUser;

        // ذكاء تسجيل الدخول: التحقق إذا المدخل رقم موبايل أو إيميل
        if (!inputUser.includes("@")) {
            // إذا ما في @ يعني هاد تاجر دخل رقم موبايله، بنحوله للإيميل الافتراضي اللي سجلنا فيه
            finalEmail = `${inputUser}@souq.com`;
        }

        try {
            // 1. تسجيل الدخول في Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, finalEmail, passwordUser);
            const user = userCredential.user;

            // 2. جلب بيانات المستخدم من Firestore لمعرفة نوع الحساب (زبون أم تاجر)
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;
                const name = userData.fullname;

                if (role === "customer") {
                    alert(`أهلاً بك مجدداً يا ${name} (زبون)`);
                    window.location.href = "market.html"; // مؤقتاً للرئيسية لحين بناء صفحة التصفح
                } else if (role === "vendor") {
                    alert(`أهلاً بعودتك يا سيد ${name} (صاحب متجر: ${userData.shopName})`);
                    window.location.href = "vendor-dashboard.html"; // سنبني لوحة تحكم التاجر لاحقاً
                }
            } else {
                alert("لم يتم العثور على بيانات هذا الحساب في قاعدة البيانات.");
            }

        } catch (error) {
            console.error("خطأ في تسجيل الدخول:", error.message);
            // أخطاء شائعة
            if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                alert("البريد الإلكتروني/رقم الموبايل أو كلمة السر غير صحيحة!");
            } else {
                alert("حدث خطأ أثناء الدخول: " + error.message);
            }
        }
    });
}
