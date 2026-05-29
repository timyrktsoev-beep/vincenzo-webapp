import asyncio
import json
import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select
from database import init_db, async_session
from models import User, Order, OrderItem, Product

# aiohttp для веб-сервера
from aiohttp import web

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

TOKEN = "8647862770:AAHodPcg8mavTmwlMf1X65Z_pj3Tt_D0R5s

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Путь к папке с фронтендом
WEBAPP_DIR = os.path.join(os.path.dirname(__file__), '..', 'webapp')

# ================= API: Отдача меню из БД =================
async def handle_products(request):
    async with async_session() as session:
        res = await session.execute(select(Product))
        products = res.scalars().all()
        data = [
            {
                "id": p.id,
                "name": p.name,
                "price": p.price,
                "weight": p.weight,
                "description": p.description,
                "category": p.category,
                "image_url": p.image_url or "https://via.placeholder.com/400x200?text=Vincenzo"
            } for p in products
        ]
        resp = web.json_response(data)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp

# ================= TELEGRAM BOT =================
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🍕 Открыть меню Vincenzo", web_app=WebAppInfo(url="http://localhost:8080"))]
    ])
    await message.answer("Добро пожаловать в Vincenzo! Нажмите кнопку ниже:", reply_markup=kb)

@dp.message(F.web_app_data)
async def receive_order(message: types.Message):
    logging.info(f"📩 Получены данные от WebApp от {message.from_user.id}")
    try:
        data = json.loads(message.web_app_data.data)
        items = data.get("items", [])
        total = data.get("total", 0)
        address = data.get("address", "Самовывоз")

        async with async_session() as session:
            res = await session.execute(select(User).where(User.telegram_id == str(message.from_user.id)))
            user = res.scalar_one_or_none()
            if not user:
                user = User(telegram_id=str(message.from_user.id), name=message.from_user.full_name or "Гость", role="client")
                session.add(user)
                await session.flush()

            new_order = Order(user_id=user.id, total_amount=total, delivery_address=address, status="new")
            session.add(new_order)
            await session.flush()

            for item in items:
                session.add(OrderItem(order_id=new_order.id, product_name=item["name"], price=item["price"], quantity=item["qty"]))
            await session.commit()
            logging.info(f"✅ Заказ #{new_order.id} сохранён в БД")

        items_text = "\n".join([f"• {i['name']} x{i['qty']} = {i['price']*i['qty']}₽" for i in items])
        await message.answer(f"✅ <b>Заказ #{new_order.id} принят!</b>\n\n📝 Состав:\n{items_text}\n\n💰 Итого: {total}₽\n📍 {address}", parse_mode="HTML")
    except Exception as e:
        logging.error(f"❌ Ошибка: {e}")
        await message.answer(f"⚠️ Ошибка оформления: {e}")

# ================= ЗАПУСК ВСЕХ СЕРВИСОВ =================
async def main():
    await init_db()
    
    # 1. Веб-сервер (API + статика)
    web_app = web.Application()
    web_app.router.add_get('/api/products', handle_products)
    web_app.router.add_static('/', WEBAPP_DIR, show_index=True)
    runner = web.AppRunner(web_app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print("🌐 Веб-сервер запущен: http://localhost:8080")
    print("📦 API меню доступен: http://localhost:8080/api/products")

    # 2. Telegram Bot (блокирующий вызов, но веб-сервер уже работает в том же event loop)
    print("🤖 Запуск бота...")
    await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    asyncio.run(main())
