import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// تمسيك عناصر الواجهة
const customerNameDisplay = document.getElementById("customer-name-display");
const btnLogout = document.getElementById("btn-market-logout");
const sliderWrapper = document.getElementById("slider-wrapper");
const newProductsGrid = document.getElementById("new-products-grid");
const marketProductsGrid = document.getElementById("market-products-grid");
const searchInput = document.getElementById("search-input");
const filterCity = document.getElementById("filter-city");
const filterCategory = document.getElementById("filter-category");
const marketNoResults = document.getElementById("market-no-results");

// مصفوفات تخزين البيانات لتقليل سحب الداتا من السيرفر وتسريع البحث
let allProducts = [];
let allVendors = {}; // لحفظ أسماء المتاجر وأرقام هواتفهم

// 1. التحقق من الدخول وجلب البيانات الأساسية
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // جلب اسم الزبون الحالي للترحيب به
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                customerNameDisplay.textContent = `👋 أهلاً، ${userDoc.data().fullName || userDoc.data().shopName}`;
            }
            
            // انطلاق سحب البيانات الضخمة
            await loadMarketData();
        } catch (error) {
            console.error(error);
        }
    } else {
        window.location.href = "login.html";
    }
});

// 2. دالة جلب البيانات الشاملة من الفايربيس (تجار + منتجات)
async function loadMarketData() {
    try {
        // أ) جلب كل الحسابات لمعرفة من هم التجار وتخزين هواتفهم ومتاجرهم بالذاكرة
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.role === "vendor") {
                allVendors[docSnap.id] = {
                    shopName: data.shopName,
                    phone: data.phone
                };
            }
        });

        // ب) جلب كل المنتجات المتوفرة بالسوق
        const productsSnapshot = await getDocs(collection(db, "products"));
        allProducts = [];
        productsSnapshot.forEach(docSnap => {
            allProducts.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // ترتيب المنتجات حسب الأحدث (حسب تاريخ الرفع)
        allProducts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // جـ) تشغيل ميزات الواجهة العالمية
        buildHeroSlider();
        renderNewArrivals();
        renderProductsGrid(allProducts); // عرض الكل في البداية

    } catch (err) {
        console.error("خطأ في تحميل بيانات المول:", err);
    }
}

// 3. بناء السلايدر الدوار العشوائي (10 منتجات)
function buildHeroSlider() {
    if (allProducts.length === 0) return;

    // خلط المنتجات عشوائياً واختيار أول 10 منها
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    const sliderProducts = shuffled.slice(0, 10);

    sliderWrapper.innerHTML = "";

    sliderProducts.forEach(prod => {
        const vendorInfo = allVendors[prod.vendorId] || { shopName: "متجر غير معروف", phone: "" };
        
        const slideHtml = `
            <div class="swiper-slide" data-id="${prod.id}">
                <img src="${prod.imageUrl}" class="slide-img" alt="${prod.name}">
                <div class="slide-overlay">
                    <h3>${prod.name}</h3>
                    <p>${Number(prod.price).toLocaleString()} ل.س</p>
                    <span style="font-size:0.85rem; color:#cbd5e1;">🏪 ${vendorInfo.shopName} | 📍 ${prod.city}</span>
                </div>
            </div>
        `;
        sliderWrapper.insertAdjacentHTML("beforeend", slideHtml);
    });

    // تشغيل السلايدر عبر مكتبة Swiper.js
    const swiper = new Swiper('.hero-swiper', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    });

    // جعل السلايدات قابلة للضغط لفتح تفاصيل المنتج
    document.querySelectorAll(".hero-swiper .swiper-slide").forEach(slide => {
        slide.addEventListener("click", () => {
            const prodId = slide.getAttribute("data-id");
            if (prodId) openProductDetails(prodId);
        });
    });
}

// 4. عرض قسم "وصل حديثاً" (أحدث 4 منتجات)
function renderNewArrivals() {
    newProductsGrid.innerHTML = "";
    const latest = allProducts.slice(0, 4); // قطع أول 4 منتجات مرتبة تنازلياً

    latest.forEach(prod => {
        newProductsGrid.insertAdjacentHTML("beforeend", createProductCardTemplate(prod));
    });
    activateCardClicks();
}

// 5. دالة عرض شبكة المنتجات العامة والمفلترة
function renderProductsGrid(productsArray) {
    marketProductsGrid.innerHTML = "";

    if (productsArray.length === 0) {
        marketNoResults.style.display = "block";
        return;
    }
    marketNoResults.style.display = "none";

    productsArray.forEach(prod => {
        marketProductsGrid.insertAdjacentHTML("beforeend", createProductCardTemplate(prod));
    });

    activateCardClicks();
}

// 6. قالب كرت المنتج الموحد والعالمي (Template Creator)
function createProductCardTemplate(prod) {
    const vendorInfo = allVendors[prod.vendorId] || { shopName: "متجر افتراضي", phone: "" };
    return `
        <div class="product-card" data-id="${prod.id}" style="cursor:pointer;">
            <img src="${prod.imageUrl}" class="prod-card-img" alt="${prod.name}">
            <div class="prod-card-body">
                <span class="prod-card-tag">${prod.category}</span>
                <p class="prod-card-vendor">🏪 ${vendorInfo.shopName}</p>
                <h4 class="prod-card-title">${prod.name}</h4>
                <p class="prod-card-price">${Number(prod.price).toLocaleString()} ل.س</p>
                <p class="prod-card-meta">📍 ${prod.city}</p>
                <button class="btn-whatsapp-style" data-id="${prod.id}">💬 تواصل واتساب</button>
            </div>
        </div>
    `;
}

// 7. تفعيل الضغط على الكروت وأزرار الواتساب
function activateCardClicks() {
    // الضغط على الكرت يفتح التفاصيل الكاملة
    document.querySelectorAll(".products-grid .product-card").forEach(card => {
        card.addEventListener("click", (e) => {
            // إذا ضغط على زر الواتساب لا تفتح المودال، دعه يذهب للواتساب
            if (e.target.classList.contains("btn-whatsapp-style")) {
                e.stopPropagation();
                const prodId = e.target.getAttribute("data-id");
                redirectToWhatsapp(prodId);
                return;
            }
            const prodId = card.getAttribute("data-id");
            openProductDetails(prodId);
        });
    });
}

// دالة مساعدة لتنسيق رقم الهاتف السوري
function formatSyrianPhoneNumber(phone) {
    if (!phone) return "";
    let cleanPhone = phone.toString().trim();
    // إذا كان يبدأ بـ 0، نحذفه
    if (cleanPhone.startsWith("0")) {
        cleanPhone = cleanPhone.substring(1);
    }
    // إضافة الكود الدولي السوري
    return "+963" + cleanPhone;
}

// 8. فتح نافذة تفاصيل المنتج (Modal)
const detailsModal = document.getElementById("details-modal");
const btnCloseDetails = document.getElementById("btn-close-details");

function openProductDetails(prodId) {
    const prod = allProducts.find(p => p.id === prodId);
    if (!prod) return;

    const vendorInfo = allVendors[prod.vendorId] || { shopName: "متجر افتراضي", phone: "" };

    document.getElementById("modal-prod-name").textContent = prod.name;
    document.getElementById("modal-prod-img").src = prod.imageUrl;
    document.getElementById("modal-prod-price").textContent = `${Number(prod.price).toLocaleString()} ل.س`;
    document.getElementById("modal-prod-vendor").textContent = vendorInfo.shopName;
    document.getElementById("modal-prod-city").textContent = prod.city;
    document.getElementById("modal-prod-cat").textContent = prod.category;
    document.getElementById("modal-prod-desc").textContent = prod.description;

    // تنسيق رقم الهاتف
    const formattedPhone = formatSyrianPhoneNumber(vendorInfo.phone);

    // زر الواتساب داخل المودال
    const whatsappBtn = document.getElementById("btn-modal-whatsapp");
    const message = encodeURIComponent(`مرحباً ${vendorInfo.shopName}، أنا مهتم بشراء منتجك المعروض في السوق المفتوح: (${prod.name}) بسعر ${prod.price.toLocaleString()} ل.س. هل هو متوفر؟`);
    whatsappBtn.href = `https://wa.me/${formattedPhone}?text=${message}`;

    detailsModal.classList.add("show");
}

btnCloseDetails.addEventListener("click", () => detailsModal.classList.remove("show"));
window.addEventListener("click", (e) => { if (e.target === detailsModal) detailsModal.classList.remove("show"); });

// 9. دالة التوجيه المباشر للواتساب من الكرت
function redirectToWhatsapp(prodId) {
    const prod = allProducts.find(p => p.id === prodId);
    if (!prod) return;
    const vendorInfo = allVendors[prod.vendorId];
    if (!vendorInfo || !vendorInfo.phone) return alert("عذراً، رقم هاتف هذا التاجر غير متوفر!");

    // تنسيق رقم الهاتف
    const formattedPhone = formatSyrianPhoneNumber(vendorInfo.phone);

    const message = encodeURIComponent(`مرحباً ${vendorInfo.shopName}، رأيت إعلان منتجك (${prod.name}) في السوق المفتوح وأود الاستفسار عنه.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
}

// ==========================================================================
// 10. محرك الفلترة والبحث الفوري الفائق السرعة
// ==========================================================================
function performFilter() {
    const keyword = searchInput.value.toLowerCase().trim();
    const city = filterCity.value;
    const category = filterCategory.value;

    // تصفية المصفوفة الأساسية بالذاكرة فوراً دون تواصل مع السيرفر (سرعة فائقة)
    const filtered = allProducts.filter(prod => {
        const matchesSearch = prod.name.toLowerCase().includes(keyword);
        const matchesCity = city === "" || prod.city === city;
        const matchesCategory = category === "" || prod.category === category;
        return matchesSearch && matchesCity && matchesCategory;
    });

    // تحديث العناوين والشبكة
    if (keyword !== "" || city !== "" || category !== "") {
        document.getElementById("grid-title").textContent = `🔍 نتائج البحث والفلترة (${filtered.length} منتج)`;
    } else {
        document.getElementById("grid-title").textContent = `🛒 كل المنتجات المتوفرة في السوق`;
    }

    renderProductsGrid(filtered);
}

// تشغيل الفلترة عند كل حرف يكتب أو خيار يتغير
searchInput.addEventListener("input", performFilter);
filterCity.addEventListener("change", performFilter);
filterCategory.addEventListener("change", performFilter);

// 11. تسجيل الخروج
btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "login.html"; });
});
