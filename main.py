import os
import sqlite3
import asyncio
import logging
import json
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, F
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

# Настройки
logging.basicConfig(level=logging.INFO)
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

if not BOT_TOKEN:
    raise ValueError(" Не указан BOT_TOKEN в файле .env")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- Работа с Базой Данных (SQLite) ---
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER,
            total_amount REAL,
            address TEXT,
            data_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_order(telegram_id, total, address, items_json):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO orders (telegram_id, total_amount, address, data_json)
        VALUES (?, ?, ?, ?)
    ''', (telegram_id, total, address, items_json))
    conn.commit()
    order_id = cursor.lastrowid
    conn.close()
    return order_id

# --- Хендлеры (Логика) ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    markup = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🍕 Открыть меню Vincenzo", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    
    await message.answer(
        "Добро пожаловать в **Vincenzo**! 🇮🇹\n\n"
        "Нажмите кнопку ниже, чтобы оформить заказ:",
        reply_markup=markup,
        parse_mode="Markdown"
    )

@dp.message(F.web_app_data)
async def web_app_data_handler(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)
        
        telegram_id = data.get('userId')
        total = data.get('total')
        address = data.get('address')
        items = data.get('items', [])
        
        items_str = json.dumps(items, ensure_ascii=False)
        order_id = save_order(telegram_id, total, address, items_str)
        
        items_list = "\n".join([f"• {i['name']} x{i['quantity']}" for i in items])
        
        response_text = (
            f"✅ **Заказ #{order_id} принят!**\n\n"
            f"{items_list}\n\n"
            f"💰 Сумма: {total} ₽\n"
            f"📍 Адрес: {address}"
        )
        
        await message.answer(response_text, parse_mode="Markdown")
    except Exception as e:
        logging.error(f"Ошибка обработки WebApp данных: {e}")
        await message.answer("⚠️ Произошла ошибка при оформлении заказа. Попробуйте ещё раз.")

# --- Запуск ---
async def main():
    init_db()
    print("🚀 Бот запущен. Жду команды...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
