// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.setHeaderColor('#121212');
tg.setBackgroundColor('#121212');

// ===== ДАННЫЕ МЕНЮ =====
const menuData = {
    pizza: [
        {
            id: 1,
            name: 'Пицца с сыром буррата',
            weight: '650 г',
            description: 'Томатный соус, сыр моцарелла, сыр буррата, помидоры, соус песто, руккола',
            price: 850,
            image: 'https://images.unsplash.com/photo-1574126154517-d1e0d89e7344?w=600'
        },
        {
            id: 2,
            name: 'Маргарита',
            weight: '500 г',
            description: 'Томатный соус, моцарелла, пармезан, базилик, оливковое масло',
            price: 550,
            image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600'
        },
        {
            id: 3,
            name: 'Пепперони',
            weight: '600 г',
            description: 'Томатный соус, моцарелла, пепперони, острый перец, орегано',
            price: 720,
            image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600'
        }
    ],
    rolls: [
        {
            id: 4,
            name: 'Филадельфия',
            weight: '280 г',
            description: 'Лосось, сливочный сыр, огурец, авокадо, рис, нори',
            price: 620,
            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600'
        },
        {
            id: 5,
            name: 'Калифорния',
            weight: '260 г',
            description: 'Краб, икра тобико, огурец, авокадо, майонез, рис, нори',
            price: 580,
            image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600'
        }
    ],
    soups: [
        {
            id: 6,
            name: 'Минестроне',
            weight: '350 г',
            description: 'Овощной суп с фасолью, цуккини, томатами и базиликом',
            price: 380,
            image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600'
        }
    ],
    salads: [
        {
            id: 7,
            name: 'Салат Фури ди Мари',
            weight: '220 г',
            description: 'Морепродукты, микс салатов, томаты черри, оливковое масло',
            price: 690,
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600'
        },
        {
            id: 8,
            name: 'Цезарь с курицей',
            weight: '300 г',
            description: 'Салат ромэн, куриная грудка, пармезан, сухарики, соус цезарь',
            price: 490,
            image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600'
        }
    ],
    pasta: [
        {
            id: 9,
            name: 'Карбонара',
            weight: '320 г',
            description: 'Спагетти, гуанчиале, яйца, пекорино романо, чёрный перец',
            price: 580,
            image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600'
        }
    ]
};

// ===== СОСТОЯНИЕ =====
let cart = {};
let favorites = JSON.parse(localStorage.getItem('vincenzo_favorites')) || [];
let currentCategory = 'pizza';
let deliveryMode = 'delivery';

// ===== НАВИГАЦИЯ =====
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === pageId);
    });

    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'cart') renderCart();
    
    window.scrollTo(0, 0);
}

// ===== РЕНДЕР МЕНЮ =====
function renderMenu() {
    const container = document.getElementById('menuContainer');
    const items = menuData[currentCategory] || [];
    
    container.innerHTML = items.map(item => {
        const quantity = cart[item.id] || 0;
        const isFav = favorites.includes(item.id);
        
        return `
            <div class="product-card" data-id="${item.id}">
                <div class="product-image-wrapper">
                    <img src="${item.image}" alt="${item.name}" class="product-image">
                    <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${item.id}, this)">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${item.name} <span class="product-weight">${item.weight}</span></h3>
                    <p class="product-description">${item.description}</p>
                    <div class="product-footer">
                        <span class="product-price">${item.price} ₽</span>
                        ${quantity > 0 ? `
                            <div class="quantity-controls">
                                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                                <span class="qty-value">${quantity}</span>
                                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                            </div>
                        ` : `
                            <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                                <i class="fas fa-plus"></i>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== КОРЗИНА =====
function addToCart(productId) {
    cart[productId] = (cart[productId] || 0) + 1;
    renderMenu();
    updateCartBadge();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function updateQuantity(productId, delta) {
    cart[productId] = (cart[productId] || 0) + delta;
    if (cart[productId] <= 0) {
        delete cart[productId];
    }
    renderMenu();
    updateCartBadge();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const items = Object.keys(cart).map(id => ({
        ...menuData[Object.keys(menuData).find(cat => 
            menuData[cat].find(p => p.id == id)
        )].find(p => p.id == id),
        quantity: cart[id]
    })).filter(item => item);
    
    if (items.length === 0) {
        container.innerHTML = '<div class="favorites-empty"><i class="fas fa-shopping-bag"></i><p>Корзина пуста</p></div>';
        document.querySelector('.checkout-btn').style.display = 'none';
        updateCartSummary();
        return;
    }
    
    document.querySelector('.checkout-btn').style.display = 'block';
    
    container.innerHTML = items.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-weight">${item.weight}</div>
                <div class="cart-item-footer">
                    <span class="cart-item-price">${item.price} ₽</span>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    updateCartSummary();
}

function updateCartQuantity(productId, delta) {
    cart[productId] = (cart[productId] || 0) + delta;
    if (cart[productId] <= 0) {
        delete cart[productId];
    }
    renderCart();
    updateCartBadge();
}

function updateCartSummary() {
    let total = 0;
    let count = 0;
    
    Object.keys(cart).forEach(id => {
        const product = findProduct(id);
        if (product) {
            total += product.price * cart[id];
            count += cart[id];
        }
    });
    
    document.getElementById('cartItemsTotal').textContent = `${total} ₽`;
    document.getElementById('cartTotal').textContent = `${total} ₽`;
    document.querySelector('.items-count').textContent = `${count} шт.`;
}

function updateCartBadge() {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
}

function findProduct(productId) {
    for (const category of Object.values(menuData)) {
        const product = category.find(p => p.id == productId);
        if (product) return product;
    }
    return null;
}

// ===== ИЗБРАННОЕ =====
function toggleFavorite(productId, btn) {
    const index = favorites.indexOf(productId);
    
    if (index > -1) {
        favorites.splice(index, 1);
        btn.classList.remove('active');
        btn.innerHTML = '<i class="far fa-heart"></i>';
    } else {
        favorites.push(productId);
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
    }
    
    localStorage.setItem('vincenzo_favorites', JSON.stringify(favorites));
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function renderFavorites() {
    const container = document.getElementById('favoritesContainer');
    const favItems = [];
    
    Object.values(menuData).forEach(category => {
        category.forEach(item => {
            if (favorites.includes(item.id)) {
                favItems.push(item);
            }
        });
    });
    
    if (favItems.length === 0) {
        container.innerHTML = `
            <div class="favorites-empty">
                <i class="far fa-heart"></i>
                <p>Здесь будут ваши избранные блюда</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = favItems.map(item => `
        <div class="product-card" data-id="${item.id}">
            <div class="product-image-wrapper">
                <img src="${item.image}" alt="${item.name}" class="product-image">
                <button class="favorite-btn active" onclick="toggleFavorite(${item.id}, this)">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${item.name} <span class="product-weight">${item.weight}</span></h3>
                <p class="product-description">${item.description}</p>
                <div class="product-footer">
                    <span class="product-price">${item.price} ₽</span>
                    <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== УВЕДОМЛЕНИЯ =====
function toggleNotifications(element) {
    element.classList.toggle('active');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
function checkout() {
    const address = document.getElementById('addressInput')?.value || 'Владикавказ, ул.Революц...';
    
    const orderData = {
        userId: tg.initDataUnsafe?.user?.id,
        username: tg.initDataUnsafe?.user?.username,
        firstName: tg.initDataUnsafe?.user?.first_name,
        mode: deliveryMode,
        address: address,
        items: Object.keys(cart).map(id => ({
            ...findProduct(id),
            quantity: cart[id]
        })),
        total: Object.keys(cart).reduce((sum, id) => {
            const product = findProduct(id);
            return sum + (product.price * cart[id]);
        }, 0),
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(orderData));
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Категории
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderMenu();
        });
    });
    
    // Режим доставки
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            deliveryMode = e.target.dataset.mode;
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    renderMenu();
    setupEventListeners();
    updateCartBadge();
}

init();
