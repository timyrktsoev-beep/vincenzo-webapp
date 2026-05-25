const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.setHeaderColor('#121212');
tg.setBackgroundColor('#121212');

// Данные (имитация БД)
const products = [
    { id: 1, name: 'Пицца Цезарь с курицей', price: 650, weight: '580 г', category: 'pizza', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', desc: 'Соус цезарь, сыр пармезан, сыр моцарелла, куриное филе, салат романо' },
    { id: 2, name: 'Пицца Буррата', price: 850, weight: '650 г', category: 'pizza', img: 'https://images.unsplash.com/photo-1574126154517-d1e0d89e7344?w=400', desc: 'Томатный соус, моцарелла, буррата, томаты черри, базилик' },
    { id: 3, name: 'Ролл Филадельфия', price: 620, weight: '280 г', category: 'rolls', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400', desc: 'Лосось, сливочный сыр, огурец, рис' },
    { id: 4, name: 'Салат Фури ди Мари', price: 690, weight: '220 г', category: 'salads', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', desc: 'Морепродукты, микс салатов, томаты, оливковое масло' },
    { id: 5, name: 'Сырные шарики', price: 450, weight: '250 г', category: 'appetizers', img: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400', desc: 'Моцарелла в панировке, ягодный соус' }
];

const options = [
    'одновременно с японкой', 'без яиц', 'для Даурова', 'рубленный', 'без болгарского перца', 'Без газа'
];

let cart = [];
let favorites = [];
let currentQty = 1;
let selectedProduct = null;

// === НАВИГАЦИЯ ===
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[onclick="navigateTo('${pageId}')"]`);
    if(navBtn) navBtn.classList.add('active');

    // Header logic
    const backBtn = document.getElementById('backBtn');
    const title = document.getElementById('pageTitle');
    
    if (['profile', 'menu', 'qr', 'favorites', 'cart'].includes(pageId)) {
        backBtn.style.display = 'none';
        title.textContent = pageId === 'menu' ? 'Меню' : 
                            pageId === 'profile' ? 'Профиль' : 
                            pageId === 'favorites' ? 'Любимые' : 
                            pageId === 'cart' ? 'Корзина' : 'VINCENZO';
    } else {
        backBtn.style.display = 'block';
    }

    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'cart') renderCart();
    window.scrollTo(0,0);
}

function goBack() {
    navigateTo('menu');
}

// === РЕНДЕР МЕНЮ ===
function renderMenu(category = 'pizza') {
    const container = document.getElementById('menuContainer');
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    
    container.innerHTML = filtered.map(p => `
        <div class="menu-item-card" onclick="openProduct(${p.id})">
            <img src="${p.img}" alt="${p.name}">
            <div class="item-info">
                <div class="item-name">${p.name}</div>
                <div class="item-price">${p.price} ₽</div>
            </div>
            <button class="add-btn-small" onclick="event.stopPropagation(); quickAdd(${p.id})">+</button>
        </div>
    `).join('');
}

function filterMenu(cat, btn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu(cat);
}

// === ДЕТАЛИ ТОВАРА ===
function openProduct(id) {
    selectedProduct = products.find(p => p.id === id);
    currentQty = 1;
    
    document.getElementById('detailImg').src = selectedProduct.img;
    document.getElementById('detailName').textContent = selectedProduct.name;
    document.getElementById('detailPrice').textContent = `${selectedProduct.price} ₽`;
    document.getElementById('detailWeight').textContent = selectedProduct.weight;
    document.getElementById('detailDesc').textContent = selectedProduct.desc;
    document.getElementById('qtyVal').textContent = currentQty;
    
    const optList = document.getElementById('optionsList');
    optList.innerHTML = options.map(o => `
        <div class="option-item">
            <div class="option-label">
                <div class="custom-checkbox" onclick="this.classList.toggle('checked')"></div>
                <span>${o}</span>
            </div>
            <span style="color:var(--text-sec)">0 ₽</span>
        </div>
    `).join('');
    
    updateCartBtnPrice();
    navigateTo('product');
}

function changeQty(delta) {
    currentQty += delta;
    if (currentQty < 1) currentQty = 1;
    document.getElementById('qtyVal').textContent = currentQty;
    updateCartBtnPrice();
}

function updateCartBtnPrice() {
    if(!selectedProduct) return;
    const total = selectedProduct.price * currentQty;
    document.getElementById('cartBtnPrice').textContent = `${total} ₽`;
}

function addToCartFromDetail() {
    if(!selectedProduct) return;
    const existing = cart.find(i => i.id === selectedProduct.id);
    if(existing) {
        existing.qty += currentQty;
    } else {
        cart.push({...selectedProduct, qty: currentQty});
    }
    updateBadge();
    tg.HapticFeedback.notificationOccurred('success');
    navigateTo('menu');
}

function quickAdd(id) {
    const p = products.find(i => i.id === id);
    const existing = cart.find(i => i.id === id);
    if(existing) existing.qty++;
    else cart.push({...p, qty: 1});
    updateBadge();
    tg.HapticFeedback.impactOccurred('light');
}

// === ИЗБРАННОЕ ===
function toggleFav(btn) {
    btn.classList.toggle('active');
    if(!selectedProduct) return;
    const idx = favorites.indexOf(selectedProduct.id);
    if(idx > -1) favorites.splice(idx, 1);
    else favorites.push(selectedProduct.id);
}

function renderFavorites() {
    const container = document.getElementById('favoritesContainer');
    const favProds = products.filter(p => favorites.includes(p.id));
    
    if(favProds.length === 0) {
        document.getElementById('emptyFav').style.display = 'block';
        container.innerHTML = '';
        return;
    }
    document.getElementById('emptyFav').style.display = 'none';
    
    container.innerHTML = favProds.map(p => `
        <div class="fav-item" onclick="openProduct(${p.id})">
            <img src="${p.img}">
            <div class="fav-info">
                <div class="fav-name">${p.name}</div>
                <div class="fav-price">${p.price} ₽</div>
            </div>
        </div>
    `).join('');
}

// === КОРЗИНА ===
function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    if(cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-sec)">Корзина пуста</div>';
        document.querySelector('.checkout-btn').style.display = 'none';
        updateSummary();
        return;
    }
    
    document.querySelector('.checkout-btn').style.display = 'block';
    container.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <img src="${item.img}">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty(${idx}, -1)">−</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${idx}, 1)">+</button>
                </div>
            </div>
            <div style="font-weight:600">${item.price * item.qty} ₽</div>
        </div>
    `).join('');
    updateSummary();
}

function updateCartQty(idx, delta) {
    cart[idx].qty += delta;
    if(cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCart();
    updateBadge();
}

function updateSummary() {
    const count = cart.reduce((a,b) => a + b.qty, 0);
    const sum = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    document.getElementById('cartCount').textContent = `${count} шт.`;
    document.getElementById('cartSum').textContent = `${sum} ₽`;
    document.getElementById('cartTotal').textContent = `${sum} ₽`;
}

function updateBadge() {
    const count = cart.reduce((a,b) => a + b.qty, 0);
    document.getElementById('navBadge').textContent = count;
    document.getElementById('navBadge').style.display = count > 0 ? 'flex' : 'none';
}

function checkout() {
    if(cart.length === 0) return;
    const data = {
        items: cart,
        total: cart.reduce((a,b) => a + (b.price * b.qty), 0),
        address: 'Владикавказ, ул. Революц...'
    };
    tg.sendData(JSON.stringify(data));
}

// Init
renderMenu();
