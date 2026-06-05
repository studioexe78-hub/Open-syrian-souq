import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const IMGBB_API_KEY = "d4153c26566671cd622f560fa7986321";

// تمسيك العناصر
const shopTitleDisplay = document.getElementById("shop-title-display");
const btnLogout = document.getElementById("btn-logout");
const productModal = document.getElementById("product-modal");
const btnOpenModal = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const addProductForm = document.getElementById("add-product-form");

// عناصر الإحصائيات والشبكة الجديدة
const statCount = document.getElementById("stat-count");
const statTotalValue = document.getElementById("stat-total-value");
const noProductsMsg = document.getElementById("no-products-msg");
const productsGrid = document.getElementById("products-grid");

let currentVendorId = null;

// 1. التحقق من الدخول وتشغيل جلب المنتجات
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentVendorId = user.uid;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "vendor") {
                shopTitleDisplay.textContent = `🏪 متجر: ${userDoc.data().shopName}`;
                // جلب منتجات هذا التاجر فوراً عند فتح الصفحة
                loadVendorProducts();
            } else {
                alert("عذراً، هذه الصفحة مخصصة للتجار فقط!");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error(error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// 2. دالة جلب وعرض منتجات التاجر وحساب الإحصائيات
async function loadVendorProducts() {
    if (!currentVendorId) return;

    try {
        // عمل استعلام (Query) لجلب المنتجات اللي بملكها هاد الـ vendorId فقط
        const q = query(collection(db, "products"), where("vendorId", "==", currentVendorId));
        const querySnapshot = await getDocs(q);

        // تنظيف الشبكة قبل العرض لمنع التكرار
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
            totalValue += product.price;

            // بناء كرت المنتج برمجياً (HTML Dynamic Component)
            const cardHtml = `
                <div class="product-card" id="prod-${prodId}">
                    <img src="${product.imageUrl}" class="prod-card-img" alt="${product.name}">
                    <div class="prod-card-body">
                        <span class="prod-card-tag">${product.category}</span>
                        <h4 class="prod-card-title">${product.name}</h4>
                        <p class="prod-card-price">${product.price.toLocaleString()} ل.س</p>
                        <p class="prod-card-meta">📍 موقع المنتج: ${product.city}</p>
                        <button class="btn-delete-prod" data-id="${prodId}">🗑️ حذف المنتج</button>
                    </div>
                </div>
            `;
            productsGrid.insertAdjacentHTML("beforeend", cardHtml);
        });

        // تحديث كروت الإحصائيات بالأرقام الحقيقية
        statCount.textContent = totalCount;
        statTotalValue.textContent = `${totalValue.toLocaleString()} ل.س`;

        // تفعيل أزرار الحذف بعد حقنها بالصفحة
        activateDeleteButtons();

    } catch (error) {
        console.error("خطأ في تحميل المنتجات:", error);
    }
}

// 3. دالة تفعيل كبسات الحذف
function activateDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".btn-delete-prod");
    deleteButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            
            if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المول؟")) {
                try {
                    // حذف من الـ Firestore
                    await deleteDoc(doc(db, "products", id));
                    alert("تم حذف المنتج بنجاح.");
                    // إعادة تحميل المنتجات لتحديث الأرقام والكروت فوراً
                    loadVendorProducts();
                } catch (err) {
                    alert("فشل الحذف: " + err.message);
                }
            }
        });
    });
}

// 4. الـ Modal (الفتح والإغلاق)
btnOpenModal.addEventListener("click", () => productModal.classList.add("show"));
btnCloseModal.addEventListener("click", () => productModal.classList.remove("show"));
window.addEventListener("click", (e) => { if (e.target === productModal) productModal.classList.remove("show"); });

// 5. فورم إضافة المنتج
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("prod-name").value;
    const price = document.getElementById("prod-price").value;
    const city = document.getElementById("prod-city").value;
    const category = document.getElementById("prod-category").value;
    const desc = document.getElementById("prod-desc").value;
    const imageFile = document.getElementById("prod-image").files[0];

    if (!imageFile) return alert("الرجاء اختيار صورة!");

    const submitBtn = addProductForm.querySelector("button[type='submit']");
    submitBtn.textContent = "جاري رفع الصورة والنشر... ⏳";
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", imageFile);

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const imgbbData = await imgbbResponse.json();
        if (!imgbbData.success) throw new Error("فشل الرفع");

        const imageUrl = imgbbData.data.url;

        await addDoc(collection(db, "products"), {
            name: name,
            price: Number(price),
            city: city,
            category: category,
            description: desc,
            imageUrl: imageUrl,
            vendorId: currentVendorId,
            createdAt: new Date()
        });

        alert("تم النشر بنجاح! 🎉");
        addProductForm.reset();
        productModal.classList.remove("show");
        
        // سحر التحديث: إعادة التحميل فوراً لتظهر الإحصائيات والكرت الجديد بدون تحديث يدوي للمتصفح!
        loadVendorProducts();

    } catch (error) {
        alert("حدث خطأ: " + error.message);
    } finally {
        submitBtn.textContent = "نشر المنتج في السوق";
        submitBtn.disabled = false;
    }
});

// 6. تسجيل الخروج
btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "login.html"; });
});
