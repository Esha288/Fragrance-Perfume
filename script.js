/* Admin catalog override: allow the local admin panel to manage the catalog. */
(function(){
  try {
    const saved = JSON.parse(localStorage.getItem("elegance-admin-products") || "null");
    if (Array.isArray(saved) && window.ELEGANCE_PRODUCTS) window.ELEGANCE_PRODUCTS.products = saved;
  } catch(e) {}
})();

/* SEARCH */

const searchToggle = document.querySelector(".search-toggle");
const searchBox = document.querySelector(".search-box");
const closeSearch = document.querySelector(".close-search");
const searchInput = document.querySelector("#searchInput");

searchToggle && searchToggle.addEventListener("click", function () {
    searchBox.classList.toggle("active");

    if (searchBox.classList.contains("active")) {
        searchInput.focus();
    }
});

closeSearch && closeSearch.addEventListener("click", function () {
    searchBox.classList.remove("active");
    searchInput.value = "";
});


/* MOBILE MENU (slide-in) */

const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const mobileNav = document.querySelector(".mobile-nav");
const mobileNavOverlay = document.querySelector(".mobile-nav-overlay");
const mobileNavClose = document.querySelector(".mobile-nav-close");

function openMobileNav() {
    mobileNav.classList.add("active");
    mobileNavOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    const icon = mobileMenuBtn.querySelector("i");
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-xmark");
}

function closeMobileNav() {
    mobileNav.classList.remove("active");
    mobileNavOverlay.classList.remove("active");
    document.body.style.overflow = "";

    const icon = mobileMenuBtn.querySelector("i");
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
}

mobileMenuBtn && mobileMenuBtn.addEventListener("click", function () {
    if (mobileNav.classList.contains("active")) {
        closeMobileNav();
    } else {
        openMobileNav();
    }
});

mobileNavClose && mobileNavClose.addEventListener("click", closeMobileNav);
mobileNavOverlay && mobileNavOverlay.addEventListener("click", closeMobileNav);


/* MOBILE COLLECTION */

const mobileCollectionBtn = document.querySelector(".mobile-collection-btn");
const mobileDropdown = document.querySelector(".mobile-dropdown");

mobileCollectionBtn && mobileCollectionBtn.addEventListener("click", function () {
    mobileDropdown.classList.toggle("active");

    const icon = mobileCollectionBtn.querySelector("i");

    if (mobileDropdown.classList.contains("active")) {
        icon.style.transform = "rotate(180deg)";
    } else {
        icon.style.transform = "rotate(0deg)";
    }
});


/* CLOSE MOBILE MENU AFTER LINK CLICK */

const mobileLinks = document.querySelectorAll(".mobile-nav a:not(.mobile-collection-btn)");

mobileLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        closeMobileNav();
    });
});


/* ESCAPE KEY */

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        searchBox.classList.remove("active");
        closeMobileNav();
        if (typeof closeProductModal === "function") closeProductModal();
    }
});


/* HERO SLIDER */

const heroSection = document.querySelector(".hero");
const heroSlides = document.querySelectorAll(".hero-slide");
const heroDots = document.querySelectorAll(".hero-dot");
const heroPrevBtn = document.querySelector(".hero-arrow-prev");
const heroNextBtn = document.querySelector(".hero-arrow-next");
const heroIndexCurrent = document.querySelector(".hero-index-current");

const HERO_INTERVAL = 6000;
let heroCurrentIndex = 0;
let heroTimer = null;

function goToHeroSlide(targetIndex) {
    if (!heroSlides.length) return;

    heroSlides[heroCurrentIndex].classList.remove("active");
    if (heroDots[heroCurrentIndex]) heroDots[heroCurrentIndex].classList.remove("active");

    heroCurrentIndex = (targetIndex + heroSlides.length) % heroSlides.length;

    heroSlides[heroCurrentIndex].classList.add("active");
    if (heroDots[heroCurrentIndex]) heroDots[heroCurrentIndex].classList.add("active");

    if (heroIndexCurrent) {
        heroIndexCurrent.textContent = String(heroCurrentIndex + 1).padStart(2, "0");
    }
}

function heroNextSlide() {
    goToHeroSlide(heroCurrentIndex + 1);
}

function heroPrevSlide() {
    goToHeroSlide(heroCurrentIndex - 1);
}

function startHeroAutoplay() {
    clearInterval(heroTimer);
    heroTimer = setInterval(heroNextSlide, HERO_INTERVAL);
}

if (heroSlides.length) {
    startHeroAutoplay();

    heroNextBtn && heroNextBtn.addEventListener("click", function () {
        heroNextSlide();
        startHeroAutoplay();
    });

    heroPrevBtn && heroPrevBtn.addEventListener("click", function () {
        heroPrevSlide();
        startHeroAutoplay();
    });

    heroDots.forEach(function (dot, i) {
        dot.addEventListener("click", function () {
            goToHeroSlide(i);
            startHeroAutoplay();
        });
    });

    if (heroSection) {
        heroSection.addEventListener("mouseenter", function () {
            clearInterval(heroTimer);
        });

        heroSection.addEventListener("mouseleave", startHeroAutoplay);
    }
}


/* HERO FRAGRANCE-MIST PARTICLES */

const heroParticlesContainer = document.querySelector(".hero-particles");

if (heroParticlesContainer) {
    const PARTICLE_COUNT = 16;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = document.createElement("span");
        particle.className = "hero-particle";

        const size = (Math.random() * 3 + 2).toFixed(1);
        particle.style.left = Math.random() * 100 + "%";
        particle.style.width = size + "px";
        particle.style.height = size + "px";
        particle.style.animationDuration = (Math.random() * 6 + 8) + "s";
        particle.style.animationDelay = (Math.random() * 9) + "s";

        heroParticlesContainer.appendChild(particle);
    }
}


/* Keep mobile navigation closed whenever viewport becomes desktop-sized. */
function enforceDesktopMenuState() {
    if (window.innerWidth > 850 && typeof closeMobileNav === "function") {
        closeMobileNav();
    }
}
window.addEventListener("resize", enforceDesktopMenuState);
enforceDesktopMenuState();


/* ==========================================================
   CART (persisted via localStorage, shared across all pages)
   ========================================================== */

const CART_STORAGE_KEY = "elegance-cart";

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.querySelector(".cart-count");
    if (!badge) return;

    const cart = getCart();
    const totalItems = cart.reduce(function (sum, item) {
        return sum + item.qty;
    }, 0);

    badge.textContent = totalItems;
}

let cartToastTimer = null;

function showCartToast(name) {
    const toast = document.querySelector(".cart-toast");
    if (!toast) return;

    toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + name + " added to bag";
    toast.classList.add("active");

    clearTimeout(cartToastTimer);
    cartToastTimer = setTimeout(function () {
        toast.classList.remove("active");
    }, 2600);
}

function addToCart(product, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    if (!product || !product.name) return;

    const cart = getCart();
    const existing = cart.find(function (item) {
        return item.name === product.name;
    });

    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: product.id || "",
            name: product.name,
            price: product.price,
            salePrice: product.salePrice || "",
            img: product.img,
            notes: product.notes || "",
            qty: qty
        });
    }

    saveCart(cart);
    updateCartBadge();
    showCartToast(product.name);
}

updateCartBadge();


/* ==========================================================
   PRODUCT "VIEW DETAILS" MODAL (shared across collection pages)
   ========================================================== */

const productModalOverlay = document.querySelector(".product-modal-overlay");
const productModal = document.querySelector(".product-modal");
const productModalCloseBtn = document.querySelector(".product-modal-close");
const productModalAddBtn = document.querySelector(".product-modal-add");

function openProductModal(product) {
    if (!productModal) return;

    productModal.querySelector(".product-modal-name").textContent = product.name;
    productModal.querySelector(".product-modal-notes").textContent = product.notes;
    productModal.querySelector(".product-modal-price").textContent = product.price;

    const modalImg = productModal.querySelector(".product-modal-image img");
    modalImg.src = product.img;
    modalImg.alt = product.name;

    const modalFullLink = productModal.querySelector(".product-modal-full-link");
    if (modalFullLink && product.id) {
        modalFullLink.href = `product.html?id=${encodeURIComponent(product.id)}`;
    }

    productModal.dataset.id = product.id || "";
    productModal.dataset.name = product.name;
    productModal.dataset.price = product.price;
    productModal.dataset.img = product.img;

    productModal.classList.add("active");
    if (productModalOverlay) productModalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeProductModal() {
    if (!productModal) return;

    productModal.classList.remove("active");
    if (productModalOverlay) productModalOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

let PRODUCTS = [];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, function (char) {
        return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char];
    });
}

/* ==========================================================
   PRODUCT FAVORITES / WISHLIST
   Shared across every page with localStorage.
   ========================================================== */
const FAVORITES_STORAGE_KEY = "eloraFavoriteProducts";

function getFavoriteProducts() {
    try {
        const saved = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (e) {
        return [];
    }
}

function saveFavoriteProducts(favorites) {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

function isProductFavorite(productId) {
    return getFavoriteProducts().some(function (item) { return item.id === productId; });
}

function updateFavoriteCount() {
    // Favorites count is for saved products only.
    const total = getFavoriteProducts().length;
    document.querySelectorAll(".favorite-count").forEach(function (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? "inline-flex" : "none";
    });
}

function updateFavoriteButtons() {
    const ids = new Set(getFavoriteProducts().map(function (item) { return item.id; }));
    document.querySelectorAll(".product-favorite[data-product-id]").forEach(function (button) {
        const active = ids.has(button.dataset.productId);
        button.classList.toggle("is-favorite", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", active ? "Remove from favorites" : "Add to favorites");
        const icon = button.querySelector("i");
        if (icon) {
            icon.classList.toggle("fa-solid", active);
            icon.classList.toggle("fa-regular", !active);
        }
    });
}

function showFavoriteToast(message) {
    let toast = document.querySelector(".favorite-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "favorite-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__favoriteToastTimer);
    window.__favoriteToastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
}

function toggleFavorite(product) {
    if (!product || !product.id) return false;
    const favorites = getFavoriteProducts();
    const index = favorites.findIndex(function (item) { return item.id === product.id; });
    let active;

    if (index >= 0) {
        favorites.splice(index, 1);
        active = false;
        showFavoriteToast(product.name + " removed from favorites");
    } else {
        favorites.push({ id: product.id, name: product.name, price: product.price, img: product.img, notes: product.notes });
        active = true;
        showFavoriteToast(product.name + " added to favorites");
    }

    saveFavoriteProducts(favorites);
    updateFavoriteCount();
    updateFavoriteButtons();
    if (typeof window.renderFavoritesPage === "function") window.renderFavoritesPage();
    return active;
}

function createFavoritesNav() {
    if (document.querySelector(".favorite-nav-btn")) return;
    const actions = document.querySelector(".nav-actions");
    if (!actions) return;
    const btn = document.createElement("a");
    btn.href = "favorites.html";
    btn.className = "icon-btn favorite-nav-btn";
    btn.setAttribute("aria-label", "Favorites");
    btn.title = "Favorites";
    btn.innerHTML = '<i class="fa-regular fa-heart"></i><span class="favorite-count">0</span>';
    const cart = actions.querySelector('a[href="#cart"]');
    if (cart) actions.insertBefore(btn, cart);
    else actions.prepend(btn);

    const mobileNav = document.querySelector(".mobile-nav");
    if (mobileNav && !mobileNav.querySelector(".mobile-favorites-link")) {
        const mobileLink = document.createElement("a");
        mobileLink.href = "favorites.html";
        mobileLink.className = "mobile-favorites-link";
        mobileLink.innerHTML = '<i class="fa-solid fa-heart"></i> Favorites (<span class="favorite-count">0</span>)';
        const shoppingLink = Array.from(mobileNav.querySelectorAll("a")).find(function (a) { return (a.getAttribute("href") || "").includes("#cart"); });
        if (shoppingLink) mobileNav.insertBefore(mobileLink, shoppingLink);
        else mobileNav.appendChild(mobileLink);
    }
}

function initProductFavorites() {
    createFavoritesNav();
    updateFavoriteCount();
    updateFavoriteButtons();
}

function productCardMarkup(product) {
    const detailsUrl = `product.html?id=${encodeURIComponent(product.id)}`;
    return `
        <article class="product-card" data-product-id="${escapeHtml(product.id)}">
            <button class="product-favorite" type="button" data-product-id="${escapeHtml(product.id)}" aria-label="Add to favorites" aria-pressed="false" title="Add to favorites"><i class="fa-regular fa-heart"></i></button>
            <a class="product-card-image" href="${escapeHtml(detailsUrl)}" aria-label="View details for ${escapeHtml(product.name)}">
                <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}" loading="lazy">
            </a>
            <div class="product-card-body">
                <h3 class="product-name">
                    <a href="${escapeHtml(detailsUrl)}">${escapeHtml(product.name)}</a>
                </h3>
                <p class="product-notes">${escapeHtml(product.notes)}</p>
                <div class="product-price">${escapeHtml(product.price)}</div>
                <div class="product-actions">
                    <button class="btn-quick-view" type="button">Quick View</button>
                    <button class="btn-add-cart" type="button">Add to Cart</button>
                </div>
            </div>
        </article>`;
}
function bindProductCard(card, product) {
    const quickViewBtn = card.querySelector(".btn-quick-view");
    const addBtn = card.querySelector(".btn-add-cart");
    if (quickViewBtn) quickViewBtn.addEventListener("click", function () { openProductModal(product); });
    if (addBtn) addBtn.addEventListener("click", function () { addToCart(product); });
}

function renderProducts(products, container) {
    container.innerHTML = products.length
        ? products.map(productCardMarkup).join("")
        : '<p class="products-empty">No products found.</p>';
    container.querySelectorAll(".product-card").forEach(function (card) {
        const product = products.find(function (item) { return item.id === card.dataset.productId; });
        if (product) bindProductCard(card, product);
    });
    updateFavoriteButtons();
}

async function loadProducts() {
    const containers = document.querySelectorAll(".product-grid[data-collection], .product-grid[data-featured-products]");
    if (!containers.length) return;

    try {
        // Product data is embedded via products-data.js (loaded as a plain <script>
        // tag before this file) rather than fetched, so pages also work when
        // opened directly by double-clicking (file://), with no local server needed.
        const data = window.ELEGANCE_PRODUCTS;

        if (!data) {
            throw new Error("Product data not found. Make sure products-data.js is included before script.js.");
        }

        PRODUCTS = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);

        if (!PRODUCTS.length) {
            throw new Error("products-data.js contains no products");
        }

        document.querySelectorAll(".product-grid[data-collection]").forEach(function (container) {
            const collection = container.dataset.collection;
            renderProducts(PRODUCTS.filter(function (product) {
                return Array.isArray(product.collections) && product.collections.includes(collection);
            }), container);
        });

        document.querySelectorAll(".product-grid[data-featured-products]").forEach(function (container) {
            renderProducts(PRODUCTS.filter(function (product) { return product.featured === true; }), container);
        });

        setupProductSearch();
        console.info(`ÉLÉGANCE: ${PRODUCTS.length} products loaded`);
    } catch (error) {
        console.error("ÉLÉGANCE product data error:", error);
        containers.forEach(function (container) {
            container.innerHTML = `
                <div class="products-load-error">
                    <strong>Products could not be loaded.</strong>
                    <span>${escapeHtml(error.message)}</span>
                    <small>Make sure <b>products-data.js</b> is in the same folder and included in this page before <b>script.js</b>.</small>
                </div>`;
        });
    }
}

function productInCollection(product, collection) {
    return Array.isArray(product.collections) && product.collections.includes(collection);
}

function runProductSearch() {
    const query = searchInput.value.trim().toLowerCase();

    document.querySelectorAll(".product-grid[data-collection]").forEach(function (container) {
        const collection = container.dataset.collection;
        const matches = PRODUCTS.filter(function (product) {
            if (!productInCollection(product, collection)) return false;
            if (!query) return true;
            return [product.name, product.notes, product.category]
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
        renderProducts(matches, container);
    });

    document.querySelectorAll(".product-grid[data-featured-products]").forEach(function (container) {
        const matches = PRODUCTS.filter(function (product) {
            if (product.featured !== true) return false;
            if (!query) return true;
            return [product.name, product.notes, product.category]
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
        renderProducts(matches, container);
    });
}

function debounce(fn, wait) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(null, args); }, wait);
    };
}

function setupProductSearch() {
    if (!searchInput) return;
    searchInput.addEventListener("input", debounce(runProductSearch, 150));
}

document.addEventListener("click", function (event) {
    const button = event.target.closest && event.target.closest(".product-favorite");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const productId = button.dataset.productId;
    const allProducts = (Array.isArray(PRODUCTS) && PRODUCTS.length)
        ? PRODUCTS
        : (Array.isArray(window.ELEGANCE_PRODUCTS)
            ? window.ELEGANCE_PRODUCTS
            : (window.ELEGANCE_PRODUCTS && Array.isArray(window.ELEGANCE_PRODUCTS.products) ? window.ELEGANCE_PRODUCTS.products : []));
    const product = allProducts.find(function (item) { return String(item.id) === String(productId); });
    if (product) toggleFavorite(product);
});

initProductFavorites();

loadProducts();

if (productModalCloseBtn) {
    productModalCloseBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeProductModal();
    });
}
if (productModalOverlay) productModalOverlay.addEventListener("click", closeProductModal);

// Robust fallback: close the Quick View whenever its close button is clicked.
document.addEventListener("click", function (event) {
    const closeBtn = event.target.closest && event.target.closest(".product-modal-close");
    if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        closeProductModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeProductModal();
});

if (productModalAddBtn) {
    productModalAddBtn.addEventListener("click", function () {
        if (!productModal) return;
        addToCart({
            id: productModal.dataset.id || "",
            name: productModal.dataset.name,
            price: productModal.dataset.price,
            img: productModal.dataset.img
        });
    });
}


/* ==========================================================
   CURRENT-PAGE NAV HIGHLIGHTING (works across every page)
   ========================================================== */

const COLLECTION_PAGES = ["collections.html", "collection.html"];

function highlightActiveNav() {
    const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

    document.querySelectorAll(".nav-menu > a.nav-link, .mobile-nav > a").forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === page);
    });

    const onCollectionPage = COLLECTION_PAGES.includes(page);

    const dropdownBtn = document.querySelector(".dropdown-btn");
    const mobileCollectionBtn2 = document.querySelector(".mobile-collection-btn");
    if (dropdownBtn) dropdownBtn.classList.toggle("active", onCollectionPage);
    if (mobileCollectionBtn2) mobileCollectionBtn2.classList.toggle("active", onCollectionPage);

    document.querySelectorAll(".dropdown-item, .mobile-dropdown a").forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === page);
    });
}

highlightActiveNav();
