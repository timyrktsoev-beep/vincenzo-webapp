import asyncio
import json
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.enums import ParseMode
from sqlalchemy import select
from database import init_db, async_session
from models import User, Order, OrderItem

# Вставь сюда токен от @BotFather
TOKEN = "8647862770:AAHodPcg8mavTmwlMf1X65Z_pj3Tt_D0R5s"
# Ссылка на твой WebApp (заменит на GitHub Pages позже, пока можно локально через ngrok или просто тест)
# Для теста без хостинга просто нажми кнопку "Запустить" в боте, он откроет заглушку,
# но чтобы работало полноценно - нужно загрузить файлы на GitHub Pages.
WEBAPP_URL = "https://timyrktsoev-beep.github.io/vincenzo-webapp/" 

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    # Кнопка, которая открывает наше WebApp
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🍕 Открыть меню Vincenzo", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer("Добро пожаловать в Vincenzo! Выберите блюда через приложение:", reply_markup=kb)

@dp.message(Command("my_role"))
async def check_role(message: types.Message):
    async with async_session() as session:
        res = await session.execute(select(User).where(User.telegram_id == str(message.from_user.id)))
        user = res.scalar_one_or_none()
        if user:
            await message.answer(f"Ваша роль: {user.role}")
        else:
            await message.answer("Вы еще не делали заказов.")

# ГЛАВНАЯ МАГИЯ: Прием данных от WebApp
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ... (твой импорт и инициализация) ...

# Замени старый обработчик на этот:
@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    logging.info(f"📩 Получены данные WebApp от {message.from_user.id}")
    
    try:
        data = json.loads(message.web_app_data.data)
        logging.info(f"📦 Данные: {data}")
        
        async with async_session() as session:
            # 1. Пользователь
            from sqlalchemy import select
            res = await session.execute(select(User).where(User.telegram_id == str(message.from_user.id)))
            user = res.scalar_one_or_none()
            
            if not user:
                user = User(
                    telegram_id=str(message.from_user.id),
                    name=message.from_user.full_name or "Гость",
                    role="client"
                )
                session.add(user)
                await session.flush()

            # 2. Заказ
            new_order = Order(
                user_id=user.id,
                total_amount=data['total'],
                delivery_address=data.get('address', 'Самовывоз'),
                status="new"
            )
            session.add(new_order)
            await session.flush()

            # 3. Позиции
            for item in data['items']:
                session.add(OrderItem(
                    order_id=new_order.id,
                    product_name=item['name'],
                    price=item['price'],
                    quantity=item['qty']
                ))
            
            await session.commit()
            logging.info(f"✅ Заказ #{new_order.id} сохранён в БД")

        # 4. Ответ пользователю
        items_text = "\n".join([f"• {i['name']} x{i['qty']} = {i['price'] * i['qty']}₽" for i in data['items']])
        await message.answer(
            f"✅ <b>Заказ #{new_order.id} принят!</b>\n\n📝 Состав:\n{items_text}\n\n💰 Итого: {data['total']}₽\n📍 {data.get('address', 'Самовывоз')}",
            parse_mode="HTML"
        )
    except Exception as e:
        logging.error(f"❌ Ошибка обработки заказа: {e}", exc_info=True)
        await message.answer(f"️ Не удалось оформить заказ. Попробуйте снова.\n<code>{str(e)}</code>", parse_mode="HTML")
    await message.answer(
        f"✅ Заказ #{new_order.id} принят!\n\n"
        f"📝 Состав:\n{items_text}\n\n"
        f"💰 Итого: {data['total']}₽\n"
        f"📍 {data.get('address', 'Самовывоз')}",
        parse_mode=ParseMode.HTML
    )
    await message.answer("Официант/Повар уже начал готовить! 🍕")

async def main():
    await init_db()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
