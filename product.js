/* ==========================================================
   PRODUCT DETAILS PAGE LOGIC (product.html)
   Relies on globals already defined in script.js:
   escapeHtml, addToCart, renderProducts, bindProductCard
   ========================================================== */

const COLLECTION_META = {
    "men": { label: "Men", href: "collections.html?collection=men" },
    "women": { label: "Women", href: "collections.html?collection=women" },
    "unisex": { label: "Unisex", href: "collections.html?collection=unisex" },
    "oud-attar": { label: "Oud & Attar", href: "collections.html?collection=oud-attar" },
    "gift-sets": { label: "Gift Sets", href: "collections.html?collection=gift-sets" },
    "new-arrivals": { label: "New Arrivals", href: "collections.html?collection=new-arrivals" },
    "best-sellers": { label: "Best Sellers", href: "collections.html?collection=best-sellers" },
    "limited-edition": { label: "Limited Edition", href: "collections.html?collection=limited-edition" }
};

function getAllProducts() {
    const data = window.ELEGANCE_PRODUCTS;
    if (!data) return [];
    return Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
}

function getRequestedProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/* Most notes follow "Top: ... · Heart: ... · Base: ..." — parse that into a
   3-part grid when possible, and fall back to a plain paragraph otherwise
   (e.g. gift sets, which describe set contents instead of fragrance notes). */
function parseFragranceNotes(notes) {
    if (!notes) return null;
    const match = String(notes).match(/^Top:\s*(.+?)\s*·\s*Heart:\s*(.+?)\s*·\s*Base:\s*(.+)$/i);
    if (!match) return null;
    return { top: match[1].trim(), heart: match[2].trim(), base: match[3].trim() };
}

function renderNotFound() {
    const root = document.getElementById("productDetailRoot");
    root.innerHTML = `
        <div class="product-not-found">
            <h1>Product Not Found</h1>
            <p>We couldn't find the fragrance you're looking for. It may have been moved or the link is out of date.</p>
            <a href="index.html#products"><i class="fa-solid fa-arrow-left"></i> Back to All Collections</a>
        </div>`;

    const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = "Not Found";

    const breadcrumbCollectionLink = document.getElementById("breadcrumbCollectionLink");
    if (breadcrumbCollectionLink) breadcrumbCollectionLink.textContent = "Shop";
}

function renderProductDetail(product) {
    document.title = `${product.name} | ÉLÉGANCE`;

    const meta = COLLECTION_META[product.category] || null;

    const breadcrumbCollectionLink = document.getElementById("breadcrumbCollectionLink");
    if (breadcrumbCollectionLink && meta) {
        breadcrumbCollectionLink.textContent = meta.label;
        breadcrumbCollectionLink.href = meta.href;
    }

    const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    const parsedNotes = parseFragranceNotes(product.notes);

    const notesMarkup = parsedNotes
        ? `
            <div class="product-detail-notes-grid">
                <div class="product-detail-note-card"><span>Top</span><p>${escapeHtml(parsedNotes.top)}</p></div>
                <div class="product-detail-note-card"><span>Heart</span><p>${escapeHtml(parsedNotes.heart)}</p></div>
                <div class="product-detail-note-card"><span>Base</span><p>${escapeHtml(parsedNotes.base)}</p></div>
            </div>`
        : `<p class="product-detail-summary">${escapeHtml(product.notes)}</p>`;

    const root = document.getElementById("productDetailRoot");
    root.innerHTML = `
        <section class="product-detail-section">
            <div class="section-container">
                <div class="product-detail">
                    <div class="product-detail-gallery">
                        <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}">
                    </div>
                    <div class="product-detail-info">
                        <span class="product-detail-eyebrow">${meta ? escapeHtml(meta.label) : "Fragrance"}</span>
                        <div class="product-detail-title-row">
                            <h1 class="product-detail-name">${escapeHtml(product.name)}</h1>
                            <button type="button" class="product-detail-favorite" id="productDetailFavorite" aria-label="Add to favorites" aria-pressed="false" title="Add to favorites"><i class="fa-regular fa-heart"></i></button>
                        </div>
                        <div class="product-detail-price">${escapeHtml(product.price)}</div>
                        ${notesMarkup}
                        <div class="product-detail-actions">
                            <div class="qty-selector">
                                <button type="button" class="qty-btn" id="qtyMinus" aria-label="Decrease quantity">&minus;</button>
                                <span class="qty-value" id="qtyValue">1</span>
                                <button type="button" class="qty-btn" id="qtyPlus" aria-label="Increase quantity">&plus;</button>
                            </div>
                            <button type="button" class="btn-detail-add-cart" id="addToCartDetailBtn">Add to Cart</button>
                        </div>
                        <div class="product-detail-meta">
                            <strong>Collection:</strong> ${meta ? escapeHtml(meta.label) : escapeHtml(product.category)}
                        </div>
                    </div>
                </div>
            </div>
        </section>`;

    let qty = 1;
    const qtyValueEl = document.getElementById("qtyValue");
    const qtyMinusBtn = document.getElementById("qtyMinus");
    const qtyPlusBtn = document.getElementById("qtyPlus");
    const addToCartDetailBtn = document.getElementById("addToCartDetailBtn");
    const favoriteBtn = document.getElementById("productDetailFavorite");
    if (favoriteBtn) {
        const syncFavorite = function () {
            const active = typeof isProductFavorite === "function" && isProductFavorite(product.id);
            favoriteBtn.classList.toggle("is-favorite", active);
            favoriteBtn.setAttribute("aria-pressed", String(active));
            favoriteBtn.setAttribute("aria-label", active ? "Remove from favorites" : "Add to favorites");
            favoriteBtn.title = active ? "Remove from favorites" : "Add to favorites";
            const icon = favoriteBtn.querySelector("i");
            if (icon) { icon.classList.toggle("fa-solid", active); icon.classList.toggle("fa-regular", !active); }
        };
        syncFavorite();
        favoriteBtn.addEventListener("click", function () {
            if (typeof toggleFavorite === "function") toggleFavorite(product);
            syncFavorite();
        });
    }

    qtyMinusBtn.addEventListener("click", function () {
        qty = Math.max(1, qty - 1);
        qtyValueEl.textContent = qty;
    });

    qtyPlusBtn.addEventListener("click", function () {
        qty = Math.min(99, qty + 1);
        qtyValueEl.textContent = qty;
    });

    addToCartDetailBtn.addEventListener("click", function () {
        addToCart(product, qty);
    });

    renderRelatedProducts(product);
}

function renderRelatedProducts(product) {
    const section = document.getElementById("relatedProductsSection");
    const grid = document.getElementById("relatedProductsGrid");
    if (!section || !grid) return;

    const related = getAllProducts()
        .filter(function (item) {
            return item.id !== product.id && item.category === product.category;
        })
        .slice(0, 4);

    if (!related.length) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    renderProducts(related, grid);
}

function initProductDetailPage() {
    const id = getRequestedProductId();
    const product = id ? getAllProducts().find(function (item) { return item.id === id; }) : null;

    if (!product) {
        renderNotFound();
        return;
    }

    renderProductDetail(product);
}

initProductDetailPage();
