import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// مفتاح الـ API الخاص بك لموقع ImgBB
const IMGBB_API_KEY = "d4153c26566671cd622f560fa7986321";

// تمسيك عناصر الواجهة (DOM Elements)
const shopTitleDisplay = document.getElementById("shop-title-display");
const btnLogout = document.getElementById("btn-logout");
const productModal = document.getElementById("product-modal");
const btnOpenModal = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const addProductForm = document.getElementById("add-product-form");

let currentVendorId = null;

// ==========================================================================
// 1. التحقق من حالة تسجيل الدخول وجلب اسم المحل
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentVendorId = user.uid;
        try {
            // جلب بيانات التاجر من Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "vendor") {
                shopTitleDisplay.textContent = `🏪 متجر: ${userDoc.data().shopName}`;
            } else {
                // لو الحساب مو بائع (مثلاً زبون حاول يدخل هون بالرابط) بنطرده للرئيسية
                alert("عذراً، هذه الصفحة مخصصة للتجار فقط!");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المتجر:", error);
        }
    } else {
        // لو ما في مستخدم مسجل دخول أصلاً بنرجعه لصفحة تسجيل الدخول
        window.location.href = "login.html";
    }
});

// ==========================================================================
// 2. تشغيل الـ Modal (الفتح والإغلاق)
// ==========================================================================
btnOpenModal.addEventListener("click", () => productModal.classList.add("show"));
btnCloseModal.addEventListener("click", () => productModal.classList.remove("show"));

// إغلاق المودال لو كبس براته
window.addEventListener("click", (e) => {
    if (e.target === productModal) productModal.classList.remove("show");
});

// ==========================================================================
// 3. معالجة فورم إضافة المنتج والرفع لـ ImgBB ثم Firestore
// ==========================================================================
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // جلب البيانات النصية من الحقول
    const name = document.getElementById("prod-name").value;
    const price = document.getElementById("prod-price").value;
    const city = document.getElementById("prod-city").value;
    const category = document.getElementById("prod-category").value;
    const desc = document.getElementById("prod-desc").value;
    const imageFile = document.getElementById("prod-image").files[0];

    if (!imageFile) {
        alert("الرجاء اختيار صورة للمنتج!");
        return;
    }

    // تغيير نص زر الإرسال ليعرف التاجر أن الرفع جاري حالياً
    const submitBtn = addProductForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "جاري رفع الصورة والنشر... ⏳";
    submitBtn.disabled = true;

    try {
        // أ) تجهيز الصورة لإرسالها لـ ImgBB عبر الـ FormData
        const formData = new FormData();
        formData.append("image", imageFile);

        // ب) إرسال طلب الرفع (Fetch API Request) إلى سيرفر ImgBB
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });

        const imgbbData = await imgbbResponse.json();

        if (!imgbbData.success) {
            throw new Error("فشل رفع الصورة إلى سيرفر الصور.");
        }

        // جـ) استخراج الرابط المباشر للصورة (Direct URL)
        const imageUrl = imgbbData.data.url;

        // د) حفظ المنتج بالكامل في Firestore بقسم (products)
        await addDoc(collection(db, "products"), {
            name: name,
            price: Number(price),
            city: city,
            category: category,
            description: desc,
            imageUrl: imageUrl, // الرابط اللي أخدناه من ImgBB
            vendorId: currentVendorId, // ربط المنتج بالتاجر الحالي
            createdAt: new Date()
        });

        alert("تم نشر منتجك بنجاح في السوق السوري المفتوح! 🎉");
        addProductForm.reset(); // تنظيف الحقول
        productModal.classList.remove("show"); // إغلاق النافذة

    } catch (error) {
        console.error("خطأ أثناء النشر:", error);
        alert("حدث خطأ أثناء نشر المنتج، الرجاء المحاولة مجدداً.");
    } finally {
        // إعادة الزر لوضعه الطبيعي
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ==========================================================================
// 4. تسجيل الخروج
// ==========================================================================
btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    }).catch((err) => alert("خطأ في تسجيل الخروج: " + err.message));
});
