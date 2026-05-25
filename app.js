// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Установка цветов темы
tg.setHeaderColor('#C41E3A');
tg.setBackgroundColor('#FAF7F2');

// Данные меню
const menuData = {
    pizza: [
        {
            id: 1,
            name: 'Пицца с сыром буррата',
            weight: '650 г',
            description: 'Томатный соус, сыр моцарелла, сыр буррата, помидоры, соус песто, руккола',
            price: 850,
            weightFull: '660 г',
            image: 'https://images.unsplash.com/photo-1574126154517-d1e0d89e7344?w=600',
            badge: 'Хит',
            isFavorite: false
        },
        {
            id: 2,
            name: 'Маргарита',
            weight: '500 г',
            description: 'Томатный соус, моцарелла, пармезан, базилик, оливковое масло',
            price: 550,
            weightFull: '520 г',
            image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
            badge: null,
            isFavorite: false
        },
        {
            id: 3,
            name: 'Пепперони',
            weight: '600 г',
            description: 'Томатный соус, моцарелла, пепперони, острый перец, орегано',
            price: 720,
            weightFull: '620 г',
            image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600',
            badge: 'Новинка',
            isFavorite: false
        }
    ],
    rolls: [],
    soups: [],
    salads: [],
    pasta: []
};

let cart = {};
let currentCategory = 'pizza';

// Инициализация
function init() {
    renderMenu();
    setupEventListeners();
}

// Отрисовка меню
function renderMenu() {
    const container = document.getElementById('menuContainer');
    const items = menuData[currentCategory] || [];
    
    container.innerHTML = items.map(item => `
        <div class="product-card" data-id="${item.id}">
            <div class="product-image-wrapper">
                <img src="${item.image}" alt="${item.name}" class="product-image" 
                     onerror="this.src='https://via.placeholder.com/600x400?text=${encodeURIComponent(item.name)}'">
                <button class="favorite-btn ${item.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${item.id})">
                    <i class="${item.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
                ${item.badge ? `<div class="product-badge">${item.badge}</div>` : ''}
            </div>
            
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${item.name}</h3>
                    <span class="product-weight">${item.weight}</span>
                </div>
                
                <p class="product-description">${item.description}</p>
                
                <div class="product-footer">
                    <div class="product-price-block">
                        <span class="product-price">${item.price} ₽</span>
                        <span class="product-weight-small">${item.weightFull}</span>
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Переключение избранного
function toggleFavorite(id) {
    const item = menuData[currentCategory].find(p => p.id === id);
    if (item) {
        item.isFavorite = !item.isFavorite;
        renderMenu();
        
        // Вибрация
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

// Добавление в корзину
function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    updateCartBadge();
    
    // Анимация кнопки
    const btn = document.querySelector(`[data-id="${id}"] .add-to-cart-btn`);
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
    }, 150);
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Обновление значка корзины
function updateCartBadge() {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// Обработчики событий
function setupEventListeners() {
    // Переключение категорий
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentCategory = e.currentTarget.dataset.category;
            renderMenu();
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
    
    // Переключение Доставка/Самовывоз
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
    
    // Нижняя навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
    
    // Поле адреса
    const addressInput = document.getElementById('addressInput');
    addressInput.addEventListener('focus', () => {
        // Можно открыть нативный выбор адреса Telegram
    });
}

// Запуск
init();

// Экспорт функций для глобального доступа
window.toggleFavorite = toggleFavorite;
window.addToCart = addToCart;
