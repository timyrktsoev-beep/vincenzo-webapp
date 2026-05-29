const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let products = [];
let cart = [];
let favorites = new Set();

// 📥 Загрузка меню из БД через API
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch');
    products = await res.json();
    renderProducts('all');
  } catch (e) {
    console.error("Ошибка загрузки меню:", e);
    tg.showAlert("Не удалось загрузить меню. Убедитесь, что сервер запущен.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts(); // Загружаем из БД вместо захардкоженного массива
  const user = tg.initDataUnsafe?.user;
  if (user) {
    document.getElementById('user-phone').textContent = user.first_name || 'Гость';
    document.getElementById('qr-phone-display').textContent = user.id || '79888314751';
  }
});

// ... (остальной код app.js остаётся БЕЗ ИЗМЕНЕНИЙ: renderProducts, addToCart, checkout и т.д.)
// Рендер товаров (исправлены поля под models.py)
function renderProducts(category) {
  const container = document.getElementById('products-list');
  container.innerHTML = '';
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);
  
  filtered.forEach(p => {
    const isFav = favorites.has(p.id);
    container.innerHTML += `
      <div class="product-card">
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(${p.id}, this)">
           <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
        <div class="product-img" style="background:url('${p.image_url || 'https://via.placeholder.com/400x200/3a352e/fff?text=Vincenzo'}') center/cover"></div>
        <div class="product-info">
          <div class="product-title">${p.name} <span class="product-weight">${p.weight}</span></div>
          <div class="product-desc">${p.description}</div>
          <div class="product-footer">
            <div class="price">${p.price} ₽</div>
            <button class="add-btn" onclick="addToCart(${p.id})">+</button>
          </div>
        </div>
      </div>
    `;
  });
}

// --- ЛОГИКА ---
function addToCart(id) {
  const item = products.find(p => p.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  
  tg.HapticFeedback.impactOccurred('light');
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  document.getElementById('cart-count').textContent = `${count} шт`;
  document.getElementById('cart-sum').textContent = `${sum} ₽`;
  document.getElementById('nav-cart-sum').textContent = `${sum} ₽`;
  document.getElementById('cart-badge').textContent = count;
  document.getElementById('nav-cart-btn').querySelector('.nav-icon').textContent = count > 0 ? '🛒' : '';
  
  const floating = document.getElementById('floating-cart');
  cart.length ? floating.classList.remove('hidden') : floating.classList.add('hidden');
}

function toggleFav(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
    btn.classList.remove('active');
  } else {
    favorites.add(id);
    btn.classList.add('active');
    tg.HapticFeedback.selectionChanged();
  }
  renderFavorites();
}

function checkout() {
  // Собираем данные в объект
  const orderData = {
    items: cart,
    total: cart.reduce((s, i) => s + i.price * i.qty, 0),
    address: document.getElementById('address-text').textContent,
    date: new Date().toISOString()
  };

  // ОТПРАВКА ДАННЫХ БОТУ
  Telegram.WebApp.sendData(JSON.stringify(orderData));
  
  // Опционально: закрыть окно после заказа
  // Telegram.WebApp.close(); 
}

function renderFavorites() {
  const list = document.getElementById('favorites-list');
  const msg = document.getElementById('no-fav-msg');
  list.innerHTML = '';
  
  if (favorites.size === 0) {
    msg.style.display = 'block';
    return;
  }
  msg.style.display = 'none';
  
  products.filter(p => favorites.has(p.id)).forEach(p => {
    list.innerHTML += `
      <div class="product-card">
        <button class="fav-btn active" onclick="toggleFav(${p.id}, this); setTimeout(()=>renderFavorites(), 100)">♡</button>
        <div class="product-img" style="background:url('${p.img}') center/cover"></div>
        <div class="product-info">
          <div class="product-title">${p.name} <span class="product-weight">${p.weight}</span></div>
          <div class="product-footer">
            <div class="price">${p.price} ₽</div>
            <button class="add-btn"
