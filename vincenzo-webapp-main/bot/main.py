import asyncio
import json
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select
from database import init_db, async_session
from models import User, Order, OrderItem

# Включаем логирование
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# ️ ТВОЙ ТОКЕН
TOKEN = "8647862770:AAHodPcg8mavTmwlMf1X65Z_pj3Tt_D0R5s"

# ️ ССЫЛКА НА ТВОЙ WEBAPP (GitHub Pages)
WEBAPP_URL = "https://timyrktsoev-beep.github.io/vincenzo-webapp/"

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🍕 Открыть меню Vincenzo", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer(
        "Добро пожаловать в Vincenzo! \nНажмите кнопку ниже, чтобы сделать заказ:",
        reply_markup=kb
    )

@dp.message(F.web_app_data)
async def receive_order(message: types.Message):
    logging.info(f"📩 Получены данные от WebApp от {message.from_user.id}")
    
    try:
        # 1. Парсим JSON от WebApp
        data = json.loads(message.web_app_data.data)
        items = data.get("items", [])
        total = data.get("total", 0)
        address = data.get("address", "Самовывоз")

        async with async_session() as session:
            # 2. Находим или создаем пользователя
            res = await session.execute(select(User).where(User.telegram_id == str(message.from_user.id)))
            user = res.scalar_one_or_none()
            
            if not user:
                user = User(
                    telegram_id=str(message.from_user.id),
                    name=message.from_user.full_name or "Гость",
                    role="client"
                )
                session.add(user)
                await session.flush() # Получаем user.id

            # 3. Создаем заказ
            new_order = Order(
                user_id=user.id,
                total_amount=total,
                delivery_address=address,
                status="new" # Статус: Новый
            )
            session.add(new_order)
            await session.flush() # Получаем order.id

            # 4. Сохраняем товары
            for item in items:
                session.add(OrderItem(
                    order_id=new_order.id,
                    product_name=item["name"],
                    price=item["price"],
                    quantity=item["qty"]
                ))
            
            await session.commit()
            logging.info(f"✅ Заказ #{new_order.id} сохранен в БД")

        # 5. Отправляем подтверждение пользователю
        items_text = "\n".join([f"• {i['name']} x{i['qty']} = {i['price']*i['qty']}₽" for i in items])
        
        await message.answer(
            f"✅ <b>Заказ #{new_order.id} принят!</b>\n\n"
            f"📝 Состав:\n{items_text}\n\n"
            f"💰 Итого: {total}₽\n"
            f"📍 {address}",
            parse_mode="HTML"
        )

    except Exception as e:
        logging.error(f"❌ Ошибка: {e}")
        await message.answer(f"️ Ошибка оформления: {e}")

# 🏃 ЗАПУСК
async def main():
    await init_db()
    print("✅ Бот запущен. Жду заказы...")
    # skip_updates=True очищает очередь старых событий, чтобы избежать Conflict
    await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    asyncio.run(main())