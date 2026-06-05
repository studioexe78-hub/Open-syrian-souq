import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// تمسيك الفورم من صفحة الـ HTML
const registerForm = document.getElementById("customer-register-form");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // منع الصفحة من التحديث التلقائي

        // جلب البيانات من الحقول
        const fullname = document.getElementById("fullname").value;
        const email = document.getElementById("email").value;
        const city = document.getElementById("city").value;
        const password = document.getElementById("password").value;

        try {
            // 1. إنشاء الحساب في قسم الـ Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. تخزين باقي البيانات (الاسم والمحافظة والنوع) في قاعدة البيانات Firestore
            await setDoc(doc(db, "users", user.uid), {
                fullname: fullname,
                email: email,
                city: city,
                role: "customer", // تمييز الحساب كزبون
                createdAt: new Date()
            });

            alert("تم إنشاء حساب الزبون بنجاح! أهلاً بك.");
            window.location.href = "login.html"; // توجيهه لصفحة تسجيل الدخول

        } catch (error) {
            console.error("حدث خطأ أثناء التسجيل:", error.message);
            // ترجمة الأخطاء الشائعة لتظهر بشكل مفهوم للمستخدم السوري
            if (error.code === "auth/email-already-in-use") {
                alert("هذا البريد الإلكتروني مستخدم بالفعل!");
            } else if (error.code === "auth/weak-password") {
                alert("كلمة السر ضعيفة جداً، يجب أن تكون من 6 خانات على الأقل.");
            } else {
                alert("حدث خطأ: " + error.message);
            }
        }
    });
}
