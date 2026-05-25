// ===== НАВИГАЦИЯ ПО ВКЛАДКАМ =====
function navigateTo(pageId) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Показываем нужную
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    // Обновляем активную кнопку в навигации
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Рендерим контент при переходе
    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'cart') renderCart();
    
    // Скролл наверх
    window.scrollTo(0, 0);
}

function goBack() {
    navigateTo('menu');
}

// ===== ИЗБРАННОЕ =====
let favorites = JSON.parse(localStorage.getItem('vincenzo_favorites')) || [];

function toggleFavorite(productId, btn) {
    const idx = favorites.indexOf(productId);
    if (idx > -1) {
        favorites.splice(idx, 1);
        btn.classList.remove('active');
        btn.innerHTML = '<i class="far fa-heart"></i>';
    } else {
        favorites.push(productId);
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
    }
    localStorage.setItem('vincenzo_favorites', JSON.stringify(favorites));
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const empty = document.getElementById('favoritesEmpty');
    
    const favProducts = products.filter(p => favorites.includes(p.id));
    
    if (favProducts.length === 0) {
        empty.style.display = 'block';
        grid.innerHTML = '';
        return;
    }
    empty.style.display = 'none';
    
    grid.innerHTML = favProducts.map(p => `
        <div class="fav-card" onclick="openProduct(${p.id})">
            <img src="${p.img}" alt="${p.name}">
            <div class="fav-card-info">
                <div class="fav-card-name">${p.name}</div>
                <div class="fav-card-price">${p.price} ₽</div>
            </div>
            <button class="fav-remove" onclick="event.stopPropagation(); removeFavorite(${p.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeFavorite(productId) {
    favorites = favorites.filter(id => id !== productId);
    localStorage.setItem('vincenzo_favorites', JSON.stringify(favorites));
    renderFavorites();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// ===== ОБНОВЛЕНИЕ КНОПОК "ИЗБРАННОЕ" В МЕНЮ =====
function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        const productId = parseInt(card?.dataset?.id);
        if (productId && favorites.includes(productId)) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        }
    });
}

// ===== ПЕРЕЗАПИСЬ renderMenu С УЧЁТОМ ИЗБРАННОГО =====
function renderMenu(category = 'pizza') {
    const container = document.getElementById('menuContainer');
    const items = (menuData[category] || []).map(item => ({
        ...item,
        category: category // добавляем категорию для фильтрации
    }));
    
    container.innerHTML = items.map(item => {
        const quantity = cart[item.id] || 0;
        const isFav = favorites.includes(item.id);
        
        return `
        <div class="product-card" data-id="${item.id}">
            <div class="product-image-wrapper">
                <img src="${item.image}" alt="${item.name}" class="product-image"
                     onerror="this.src='https://via.placeholder.com/400x220?text=${encodeURIComponent(item.name)}'">
                <button class="favorite-btn ${isFav ? 'active' : ''}" 
                        onclick="toggleFavorite(${item.id}, this)">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${item.name}</h3>
                    <span class="product-weight">${item.weight}</span>
                </div>
                <p class="product-description">${item.description}</p>
                <div class="product-footer">
                    <span class="product-price">${item.price} ₽</span>
                    <div class="product-controls">
                        ${quantity > 0 ? `
                            <button class="qty-btn minus" onclick="updateQuantity(${item.id}, -1)">−</button>
                            <span class="qty-value">${quantity}</span>
                            <button class="qty-btn plus" onclick="updateQuantity(${item.id}, 1)">+</button>
                        ` : `
                            <button class="qty-btn add" onclick="addToCart(${item.id})">В корзину</button>
                        `}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ===== ИНИЦИАЛИЗАЦИЯ НАВИГАЦИИ =====
document.addEventListener('DOMContentLoaded', () => {
    // Обработчики нижней навигации
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
        });
    });
    
    // Инициализация
    renderMenu();
    updateCartUI();
    updateFavoriteButtons();
});
