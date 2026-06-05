import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// تمسيك فورم التاجر من الـ HTML
const vendorForm = document.getElementById("vendor-register-form");

if (vendorForm) {
    vendorForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // منع تحديث الصفحة

        // جلب البيانات من الحقول الخاصة بالتاجر
        const vendorName = document.getElementById("vendor-name").value;
        const shopName = document.getElementById("shop-name").value;
        const phone = document.getElementById("phone").value;
        const city = document.getElementById("vendor-city").value;
        const password = document.getElementById("vendor-password").value;

        // بما أن التاجر ما عنده حقل إيميل حقيقي بالفورم، رح نولد له إيميل افتراضي برقم موبايله
        // عشان الفايربيس يشغل الحساب (مثلاً: 0912345678@souq.com)
        const fakeEmail = `${phone}@souq.com`;

        try {
            // 1. إنشاء الحساب في Authentication باستخدام الإيميل الافتراضي ورقم الموبايل
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
            const user = userCredential.user;

            // 2. تخزين تفاصيل المتجر كاملة في Firestore
            await setDoc(doc(db, "users", user.uid), {
                fullname: vendorName,
                shopName: shopName,
                phone: phone,
                email: fakeEmail,
                city: city,
                role: "vendor", // تمييز الحساب كـ تاجر / بائع
                createdAt: new Date()
            });

            alert(`تم إنشاء متجر "${shopName}" بنجاح! يمكنك الآن تسجيل الدخول برقم موبايلك.`);
            window.location.href = "login.html";

        } catch (error) {
            console.error("خطأ في تسجيل التاجر:", error.message);
            if (error.code === "auth/email-already-in-use") {
                alert("رقم الموبايل هذا مسجل به متجر بالفعل!");
            } else {
                alert("حدث خطأ: " + error.message);
            }
        }
    });
}
