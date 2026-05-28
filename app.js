const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- ДАННЫЕ (в реальности подтягиваются с БД через fetch) ---
const products = [
  { id: 1, name: "Пицца с сыром буррата", weight: "650 г", desc: "Томатный соус, сыр моцарелла, сыр буррата, помидоры, соус песто, руккола", price: 850, cat: "pizza", img: "pizza1.jpg" },
  { id: 2, name: "Пицца Цезарь с курицей", weight: "580 г", desc: "Соус цезарь, сыр пармезан, сыр моцарелла, куриное филе, салат романо", price: 650, cat: "pizza", img: "pizza2.jpg" },
  { id: 3, name: "Ролл жареный с креветкой", weight: "260 г", desc: "Тигровая креветка, икра тобико, майонез, темпура", price: 440, cat: "rolls", img: "roll1.jpg" },
  { id: 4, name: "Ролл Филадельфия", weight: "280 г", desc: "Сёмга, сливочный сыр, огурец, рис, нори", price: 520, cat: "rolls", img: "roll2.jpg" },
  { id: 5, name: "Том Ям", weight: "350 г", desc: "Кокосовое молоко, креветки, грибы, лемонграсс, лайм", price: 480, cat: "soups", img: "soup1.jpg" }
];

let cart = [];
let favorites = new Set();

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
  renderProducts('all');
  setupNavigation();
  setupCategories();
  setupToggles();
  
  // Подставляем данные из Telegram
  const user = tg.initDataUnsafe?.user;
  if (user) {
    document.getElementById('user-phone').textContent = user.phone_number || `@${user.username || 'user'}`;
    document.getElementById('qr-phone-display').textContent = user.id || '79888314751';
  }
});

// --- РЕНДЕР ТОВАРОВ ---
function renderProducts(category) {
  const container = document.getElementById('products-list');
  container.innerHTML = '';
  
  const filtered = category === 'all' ? products : products.filter(p => p.cat === category);
  
  filtered.forEach(p => {
    const isFav = favorites.has(p.id);
    container.innerHTML += `
      <div class="product-card">
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(${p.id}, this)">♡</button>
        <div class="product-img" style="background:url('${p.img}') center/cover"></div>
        <div class="product-info">
          <div class="product-title">${p.name} <span class="product-weight">${p.weight}</span></div>
          <div class="product-desc">${p.desc}</div>
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
