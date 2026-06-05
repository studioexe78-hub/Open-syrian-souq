import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// مفتاح الـ API الخاص بك لموقع ImgBB
const IMGBB_API_KEY = "d4153c26566671cd622f560fa7986321";

// ==========================================================================
// تمسيك العناصر من واجهة الـ HTML (DOM Elements)
// ==========================================================================
const shopTitleDisplay = document.getElementById("shop-title-display");
const btnLogout = document.getElementById("btn-logout");
const productModal = document.getElementById("product-modal");
const btnOpenModal = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const addProductForm = document.getElementById("add-product-form");

// عناصر الإحصائيات وشبكة عرض كروت المنتجات
const statCount = document.getElementById("stat-count");
const statTotalValue = document.getElementById("stat-total-value");
const noProductsMsg = document.getElementById("no-products-msg");
const productsGrid = document.getElementById("products-grid");

// عناصر نافذة قص الصور (Cropper Modal)
const cropperModal = document.getElementById("cropper-modal");
const imageToCrop = document.getElementById("image-to-crop");
const btnCropDone = document.getElementById("btn-crop-done");
const btnCropCancel = document.getElementById("btn-crop-cancel");
const inputFile = document.getElementById("prod-image");

let currentVendorId = null;
let cropper = null;
let croppedBlob = null; // المتغير الذي سنخزن به الصورة المقصوصة النهائية للرفع

// ==========================================================================
// 1. التحقق من حالة الدخول وجلب بيانات المتجر والمنتجات تلقائياً
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentVendorId = user.uid;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "vendor") {
                shopTitleDisplay.textContent = `🏪 متجر: ${userDoc.data().shopName}`;
                // جلب المنتجات المعروضة الخاصة بالتاجر فوراً
                loadVendorProducts();
            } else {
                alert("عذراً، هذه الصفحة مخصصة للتجار فقط!");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات التاجر:", error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// ==========================================================================
// 2. دالة جلب وعرض منتجات التاجر الحالي وحساب الإحصائيات
// ==========================================================================
async function loadVendorProducts() {
    if (!currentVendorId) return;

    try {
        // استعلام لجلب المنتجات التي يملكها هذا التاجر فقط (مقارنة بـ ==)
        const q = query(collection(db, "products"), where("vendorId", "==", currentVendorId));
        const querySnapshot = await getDocs(q);

        // تنظيف الشبكة تماماً قبل حقن البيانات لمنع تكرار الكروت
        productsGrid.innerHTML = "";
        
        let totalCount = 0;
        let totalValue = 0;

        if (querySnapshot.empty) {
            noProductsMsg.style.display = "block";
            statCount.textContent = "0";
            statTotalValue.textContent = "0 ل.س";
            return;
        }

        noProductsMsg.style.display = "none";

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const prodId = docSnap.id;

            totalCount++;
            totalValue += Number(product.price) || 0;

            // بناء كرت المنتج برمجياً بحجم موحد متناسق مع مظهر المنصات العالمية
            const cardHtml = `
                <div class="product-card" id="prod-${prodId}">
                    <img src="${product.imageUrl}" class="prod-card-img" alt="${product.name}">
                    <div class="prod-card-body">
                        <span class="prod-card-tag">${product.category}</span>
                        <h4 class="prod-card-title">${product.name}</h4>
                        <p class="prod-card-price">${Number(product.price).toLocaleString()} ل.س</p>
                        <p class="prod-card-meta">📍 موقع المنتج: ${product.city}</p>
                        <button class="btn-delete-prod" data-id="${prodId}">🗑️ حذف المنتج</button>
                    </div>
                </div>
            `;
            productsGrid.insertAdjacentHTML("beforeend", cardHtml);
        });

        // تحديث كروت الإحصائيات العلوية بالأرقام الحقيقية فوراً
        statCount.textContent = totalCount;
        statTotalValue.textContent = `${totalValue.toLocaleString()} ل.س`;

        // تفعيل عمل أزرار الحذف المرفقة بالكروت
        activateDeleteButtons();

    } catch (error) {
        console.error("خطأ في تحميل المنتجات:", error);
    }
}

// ==========================================================================
// 3. دالة تفعيل كبسات حذف المنتجات من السيرفر والواجهة
// ==========================================================================
function activateDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".btn-delete-prod");
    deleteButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            
            if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المول؟")) {
                try {
                    await deleteDoc(doc(db, "products", id));
                    alert("تم حذف المنتج بنجاح. 👍");
                    // إعادة جلب المنتجات لتحديث الإحصائيات والشبكة تلقائياً
                    loadVendorProducts();
                } catch (err) {
                    alert("فشل حذف المنتج: " + err.message);
                }
            }
        });
    });
}

// ==========================================================================
// 4. تشغيل فتح وإغلاق نافذة إضافة المنتج الرئيسية (Modal)
// ==========================================================================
btnOpenModal.addEventListener("click", () => productModal.classList.add("show"));
btnCloseModal.addEventListener("click", () => productModal.classList.remove("show"));
window.addEventListener("click", (e) => { 
    if (e.target === productModal) productModal.classList.remove("show"); 
});

// ==========================================================================
// 5. منظومة معالجة وقص صورة المنتج عبر (Cropper.js) قبل الرفع
// ==========================================================================

// أ) عندما يختار التاجر ملف صورة من جهازه: تفتح نافذة القص تلقائياً
inputFile.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            imageToCrop.src = event.target.result;
            cropperModal.classList.add("show"); // فتح مودال القص
            
            // تهيئة مكتبة القص وإجبارها على أبعاد مربعة 1:1 احترافية وموحدة
            if (cropper) cropper.destroy(); // تنظيف أي كروبر قديم
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1 / 1, 
                viewMode: 1,
                background: false,
                autoCropArea: 1
            });
        };
        reader.readAsDataURL(file);
    }
});

// ب) عند الضغط على "اعتماد وقص الصورة" داخل مودال القص
btnCropDone.addEventListener("click", () => {
    if (!cropper) return;
    
    // تحويل الجزء المقطوع من الصورة إلى ملف Blob في ذاكرة المتصفح
    cropper.getCropperCanvas().toBlob((blob) => {
        croppedBlob = blob; // حفظ النتيجة في المتغير العالمي للرفع لاحقاً
        cropperModal.classList.remove("show");
        alert("تم ضبط مقاسات الصورة بنجاح وهي جاهزة للنشر! 🎯");
    }, "image/jpeg", 0.9); // جودة ممتازة وصيغة خفيفة ومثالية للسيرفر
});

// جـ) في حال ضغط التاجر على "إلغاء" في نافذة القص
btnCropCancel.addEventListener("click", () => {
    cropperModal.classList.remove("show");
    inputFile.value = ""; // تفريغ حقل الصورة
    croppedBlob = null;
});

// د) معالجة فورم الإرسال النهائي ونشر الإعلان في الفايربيس
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("prod-name").value;
    const price = document.getElementById("prod-price").value;
    const city = document.getElementById("prod-city").value;
    const category = document.getElementById("prod-category").value;
    const desc = document.getElementById("prod-desc").value;

    // منع الإرسال إذا لم يتم قص وضبط الصورة أولاً
    if (!croppedBlob) {
        alert("الرجاء اختيار صورة للمنتج وضبط قصها أولاً!");
        return;
    }

    const submitBtn = addProductForm.querySelector("button[type='submit']");
    submitBtn.textContent = "جاري رفع الصورة والنشر... ⏳";
    submitBtn.disabled = true;

    try {
        // تجهيز الصورة المقصوصة لإرسالها لـ ImgBB
        const formData = new FormData();
        formData.append("image", croppedBlob, "product.jpg");

        // إرسال طلب الرفع إلى سيرفر ImgBB
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const imgbbData = await imgbbResponse.json();
        if (!imgbbData.success) throw new Error("فشل رفع الصورة إلى سيرفر الصور الخارجي.");

        // الرابط المباشر للمنتج الناتح من سيرفر الصور
        const imageUrl = imgbbData.data.url;

        // تخزين تفاصيل المنتج كاملة في جدول (products) داخل Firestore
        await addDoc(collection(db, "products"), {
            name: name,
            price: Number(price),
            city: city,
            category: category,
            description: desc,
            imageUrl: imageUrl,
            vendorId: currentVendorId, // ربط المنتج بالتاجر الحالي
            createdAt: new Date()
        });

        alert("تم نشر منتجك بالمقاس الاحترافي الموحد في المول الافتراضي! 🎉");
        addProductForm.reset();
        croppedBlob = null; // تصفير الصورة تمهيداً للمنتج التالي
        productModal.classList.remove("show"); // إغلاق نافذة الإضافة
        
        loadVendorProducts(); // تحديث فوري وسحري للوحة والإحصائيات بدون حاجة لعمل ريفريش للمتصفح

    } catch (error) {
        alert("حدث خطأ أثناء النشر: " + error.message);
    } finally {
        submitBtn.textContent = "نشر المنتج في السوق";
        submitBtn.disabled = false;
    }
});

// ==========================================================================
// 6. تسجيل الخروج والعودة للبوابة
// ==========================================================================
btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => { 
        window.location.href = "login.html"; 
    }).catch((err) => alert("خطأ في تسجيل الخروج: " + err.message));
});
