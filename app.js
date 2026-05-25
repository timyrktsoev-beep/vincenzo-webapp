// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP =====
// Это самый важный момент! Без этого приложение не будет работать в Telegram

const tg = window.Telegram.WebApp;

// Сообщаем Telegram, что приложение готово
tg.ready();

// Разворачиваем приложение на весь экран
tg.expand();

// Устанавливаем цвета под тему Telegram (опционально)
tg.setHeaderColor('#C41E3A'); // Красный цвет шапки
tg.setBackgroundColor('#FFFBF0'); // Кремовый фон

// ===== ДАННЫЕ МЕНЮ (в реальном проекте это будет API) =====
const menuData = {
  pizza: [
    {
      id: 1,
      name: 'Пицца с сыром буррата',
      weight: '650 г',
      description: 'Томатный соус, сыр моцарелла, сыр буррата, помидоры, соус песто, руккола',
      price: 850,
      image: 'https://images.unsplash.com/photo-1574126154517-d1e0d89e7344?w=400'
    },
    {
      id: 2,
      name: 'Маргарита',
      weight: '500 г',
      description: 'Томатный соус, моцарелла, пармезан, базилик, оливковое масло',
      price: 550,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400'
    },
    {
      id: 3,
      name: 'Пепперони',
      weight: '600 г',
      description: 'Томатный соус, моцарелла, пепперони, острый перец, орегано',
      price: 720,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400'
    }
  ],
  rolls: [
    {
      id: 4,
      name: 'Филадельфия',
      weight: '280 г',
      description: 'Лосось, сливочный сыр, огурец, авокадо, рис, нори',
      price: 620,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400'
    }
  ],
  soups: [
    {
      id: 5,
      name: 'Минестроне',
      weight: '350 г',
      description: 'Овощной суп с фасолью, цуккини, томатами и базиликом',
      price: 380,
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
    }
  ],
  salads: [
    {
      id: 6,
      name: 'Цезарь с курицей',
      weight: '300 г',
      description: 'Салат ромэн, куриная грудка, пармезан, сухарики, соус цезарь',
      price: 490,
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400'
    }
  ],
  pasta: [
    {
      id: 7,
      name: 'Карбонара',
      weight: '320 г',
      description: 'Спагетти, гуанчиале, яйца, пекорино романо, чёрный перец',
      price: 580,
      image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400'
    }
  ],
  drinks: [
    {
      id: 8,
      name: 'Лимонад домашний',
      weight: '400 мл',
      description: 'Свежевыжатый лимонад с мятой и лимоном',
      price: 250,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400'
    }
  ]
};

// ===== СОСТОЯНИЕ ПРИЛОЖЕНИЯ =====
let cart = {}; // Объект для хранения корзины { productId: quantity }
let currentCategory = 'pizza';
let deliveryMode = 'delivery';

// ===== DOM ЭЛЕМЕНТЫ =====
const menuGrid = document.getElementById('menuGrid');
const cartCountEl = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartPanel = document.getElementById('cartPanel');
const addressInput = document.getElementById('addressInput');
const addressBlock = document.getElementById('addressBlock');

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
  renderMenu();
  setupEventListeners();
  updateCartUI();
  
  // Показываем главную кнопку Telegram (опционально)
  if (tg.MainButton) {
    tg.MainButton.setText('ОФОРМИТЬ ЗАКАЗ');
    tg.MainButton.onClick(() => submitOrder());
  }
}

// ===== ОТРИСОВКА МЕНЮ =====
function renderMenu() {
  const items = menuData[currentCategory] || [];
  
  menuGrid.innerHTML = items.map(item => {
    const quantity = cart[item.id] || 0;
    
    return `
      <div class="product-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" class="product-image" 
             onerror="this.src='https://via.placeholder.com/400x220?text=${encodeURIComponent(item.name)}'">
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
      </div>
    `;
  }).join('');
}

// ===== УПРАВЛЕНИЕ КОРЗИНОЙ =====
function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  renderMenu();
  updateCartUI();
  
  // Вибрация (если поддерживается)
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
  updateCartUI();
  
  if (tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
  }
}

function updateCartUI() {
  let totalCount = 0;
  let totalPrice = 0;
  
  // Считаем общую сумму
  for (const productId in cart) {
    const quantity = cart[productId];
    const product = findProduct(productId);
    
    if (product) {
      totalCount += quantity;
      totalPrice += product.price * quantity;
    }
  }
  
  // Обновляем UI
  cartCountEl.textContent = `${totalCount} ${getCountWord(totalCount)}`;
  cartTotalEl.textContent = `${totalPrice} ₽`;
  
  // Показываем/скрываем панель корзины
  if (totalCount > 0) {
    cartPanel.style.display = 'block';
    checkoutBtn.disabled = false;
    if (tg.MainButton) tg.MainButton.show();
  } else {
    cartPanel.style.display = 'none';
    checkoutBtn.disabled = true;
    if (tg.MainButton) tg.MainButton.hide();
  }
}

function findProduct(productId) {
  for (const category in menuData) {
    const product = menuData[category].find(p => p.id == productId);
    if (product) return product;
  }
  return null;
}

function getCountWord(count) {
  if (count === 1) return 'позиция';
  if (count >= 2 && count <= 4) return 'позиции';
  return 'позиций';
}

// ===== ОТПРАВКА ЗАКАЗА =====
function submitOrder() {
  const address = addressInput.value.trim();
  
  // Валидация
  if (deliveryMode === 'delivery' && !address) {
    tg.showAlert('Пожалуйста, укажите адрес доставки');
    addressInput.focus();
    return;
  }
  
  if (Object.keys(cart).length === 0) {
    tg.showAlert('Ваша корзина пуста');
    return;
  }
  
  // Формируем данные заказа
  const orderItems = [];
  let total = 0;
  
  for (const productId in cart) {
    const product = findProduct(productId);
    const quantity = cart[productId];
    
    orderItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity
    });
    
    total += product.price * quantity;
  }
  
  const orderData = {
    userId: tg.initDataUnsafe?.user?.id,
    username: tg.initDataUnsafe?.user?.username,
    firstName: tg.initDataUnsafe?.user?.first_name,
    mode: deliveryMode,
    address: address,
    items: orderItems,
    total: total,
    timestamp: new Date().toISOString()
  };
  
  // Отправляем данные боту
  tg.sendData(JSON.stringify(orderData));
  
  // Закрываем приложение
  tg.close();
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
  // Переключение категорий
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      renderMenu();
    });
  });
  
  // Переключение режима доставки/самовывоз
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      deliveryMode = e.target.dataset.mode;
      
      // Показываем/скрываем поле адреса
      if (deliveryMode === 'pickup') {
        addressBlock.style.opacity = '0.5';
        addressInput.disabled = true;
      } else {
        addressBlock.style.opacity = '1';
        addressInput.disabled = false;
      }
    });
  });
  
  // Кнопка оформления заказа
  checkoutBtn.addEventListener('click', submitOrder);
}

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
init();