import asyncio
import json
import logging
from aiogram import Bot, Dispatcher, types, F, Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select, func
from database import init_db, async_session
from models import User, Order, OrderItem, UserRole, CourierEarning, OrderStatus
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

TOKEN = "8647862770:AAHodPcg8mavTmwlMf1X65Z_pj3Tt_D0R5s"
WEBAPP_URL = "https://timyrktsoev-beep.github.io/vincenzo-webapp/"
MANAGER_CHAT_ID = "@BotCryptoInvest"  # ID менеджера для связи

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Роутеры
client_router = Router()
courier_router = Router()

# ==================== ОБЩИЙ СТАРТ ====================
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Выбор роли при старте"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒 Я Клиент", callback_data="role_client")],
        [InlineKeyboardButton(text="🚴 Я Курьер", callback_data="role_courier")]
    ])
    
    await message.answer(
        "<b>Добро пожаловать в Vincenzo!</b>\n\n"
        "Выберите вашу роль:",
        reply_markup=kb,
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "role_client")
async def choose_client(callback: types.CallbackQuery):
    """Клиент - открываем меню"""
    await callback.message.edit_text(
        "🍕 <b>Меню Vincenzo</b>\n\n"
        "Нажмите кнопку ниже, чтобы оформить заказ:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="Открыть меню", web_app=WebAppInfo(url=WEBAPP_URL))]
        ]),
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "role_courier")
async def choose_courier(callback: types.CallbackQuery):
    """Курьер - показываем меню курьера"""
    # Проверяем/регистрируем курьера
    async with async_session() as session:
        res = await session.execute(
            select(User).where(User.telegram_id == str(callback.from_user.id))
        )
        user = res.scalar_one_or_none()
        
        if not user:
            user = User(
                telegram_id=str(callback.from_user.id),
                full_name=callback.from_user.full_name,
                role=UserRole.COURIER
            )
            session.add(user)
            await session.commit()
        elif user.role != UserRole.COURIER:
            await callback.message.edit_text(
                "❌ У вас нет доступа к роли курьера.\n"
                "Обратитесь к менеджеру."
            )
            await callback.answer()
            return
    
    await show_courier_menu(callback.message)
    await callback.answer()

# ==================== МЕНЮ КУРЬЕРА ====================
async def show_courier_menu(message: types.Message):
    """Показать главное меню курьера"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📦 Мои активные заказы", callback_data="courier_active_orders")],
        [InlineKeyboardButton(text="📊 Мой заработок", callback_data="courier_earnings")],
        [InlineKeyboardButton(text="📜 История заказов", callback_data="courier_history")],
        [InlineKeyboardButton(text="💬 Связь с менеджером", callback_data="courier_manager")],
        [InlineKeyboardButton(text="🆘 SOS - Экстренная помощь", callback_data="courier_sos")]
    ])
    
    await message.answer(
        "🚴 <b>Панель курьера</b>\n\n"
        "Выберите действие:",
        reply_markup=kb,
        parse_mode="HTML"
    )

# ==================== АКТИВНЫЕ ЗАКАЗЫ ====================
@dp.callback_query(F.data == "courier_active_orders")
async def show_active_orders(callback: types.CallbackQuery):
    """Показать активные заказы курьера"""
    async with async_session() as session:
        # Получаем курьера
        res = await session.execute(
            select(User).where(User.telegram_id == str(callback.from_user.id))
        )
        courier = res.scalar_one_or_none()
        
        if not courier:
            await callback.answer("Курьер не найден", show_alert=True)
            return
        
        # Получаем активные заказы (готовые к доставке или в процессе)
        orders_res = await session.execute(
            select(Order)
            .where(Order.courier_id == courier.id)
            .where(Order.status.in_([
                OrderStatus.READY,
                OrderStatus.COURIER_ASSIGNED
            ]))
            .order_by(Order.created_at.desc())
        )
        orders = orders_res.scalars().all()
        
        if not orders:
            await callback.message.edit_text(
                "📭 <b>Нет активных заказов</b>\n\n"
                "Сейчас у вас нет заказов для доставки.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="◀️ Назад в меню", callback_data="courier_menu")]
                ]),
                parse_mode="HTML"
            )
            await callback.answer()
            return
        
        # Показываем список заказов
        for order in orders[:5]:  # Максимум 5 заказов
            # Получаем товары заказа
            items_res = await session.execute(
                select(OrderItem).where(OrderItem.order_id == order.id)
            )
            items = items_res.scalars().all()
            
            items_text = "\n".join([f"• {item.product_name} x{item.quantity}" for item in items])
            
            # Кнопки действий для заказа
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="📍 Прибыл на место", 
                    callback_data=f"order_arrived_{order.id}"
                )],
                [InlineKeyboardButton(
                    text="✅ Доставлено", 
                    callback_data=f"order_delivered_{order.id}"
                )],
                [InlineKeyboardButton(
                    text="❌ Проблема", 
                    callback_data=f"order_problem_{order.id}"
                )]
            ])
            
            await callback.message.answer(
                f"📦 <b>Заказ #{order.id}</b>\n\n"
                f"📍 Адрес: {order.delivery_address}\n"
                f"💰 Сумма: {order.total_amount}₽\n"
                f"📋 Состав:\n{items_text}",
                reply_markup=kb,
                parse_mode="HTML"
            )
        
        await callback.answer()

# ==================== ДЕЙСТВИЯ С ЗАКАЗАМИ ====================
@dp.callback_query(F.data.startswith("order_arrived_"))
async def order_arrived(callback: types.CallbackQuery):
    """Курьер прибыл на место"""
    order_id = int(callback.data.split("_")[2])
    
    async with async_session() as session:
        order = await session.get(Order, order_id)
        if order:
            order.status = OrderStatus.COURIER_ASSIGNED
            await session.commit()
            
            # Уведомляем клиента
            client_res = await session.execute(
                select(User).where(User.id == order.user_id)
            )
            client = client_res.scalar_one_or_none()
            
            if client:
                await bot.send_message(
                    int(client.telegram_id),
                    f"🚴 Курьер прибыл на место!\n"
                    f"Заказ #{order.id} скоро будет у вас."
                )
            
            # Уведомляем менеджера
            await bot.send_message(
                MANAGER_CHAT_ID,
                f"📍 Курьер прибыл на место\n"
                f"Заказ #{order.id}"
            )
    
    await callback.message.edit_text(
        "✅ <b>Статус обновлен!</b>\n\n"
        "Вы отметили, что прибыли на место.\n"
        "Клиент и менеджер уведомлены.",
        parse_mode="HTML"
    )
    await callback.answer("Статус обновлен!")

@dp.callback_query(F.data.startswith("order_delivered_"))
async def order_delivered(callback: types.CallbackQuery):
    """Заказ доставлен"""
    order_id = int(callback.data.split("_")[2])
    
    async with async_session() as session:
        order = await session.get(Order, order_id)
        if order:
            order.status = OrderStatus.DELIVERED
            await session.commit()
            
            # Начисляем заработок курьеру (например, 10% от суммы заказа)
            earning_amount = order.total_amount * 0.10
            
            earning = CourierEarning(
                courier_id=order.courier_id,
                order_id=order.id,
                amount=earning_amount
            )
            session.add(earning)
            await session.commit()
            
            # Уведомляем клиента
            client_res = await session.execute(
                select(User).where(User.id == order.user_id)
            )
            client = client_res.scalar_one_or_none()
            
            if client:
                await bot.send_message(
                    int(client.telegram_id),
                    f"✅ Ваш заказ #{order.id} доставлен!\n"
                    f"Спасибо, что выбрали Vincenzo!"
                )
    
    await callback.message.edit_text(
        "🎉 <b>Заказ доставлен!</b>\n\n"
        f"💰 Вам начислено: {earning_amount:.2f}₽\n"
        "Спасибо за работу!",
        parse_mode="HTML"
    )
    await callback.answer("Заказ закрыт!")

@dp.callback_query(F.data.startswith("order_problem_"))
async def order_problem(callback: types.CallbackQuery):
    """Проблема с заказом"""
    order_id = int(callback.data.split("_")[2])
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Клиент не отвечает", callback_data=f"problem_noanswer_{order_id}")],
        [InlineKeyboardButton(text="Неверный адрес", callback_data=f"problem_wrongaddress_{order_id}")],
        [InlineKeyboardButton(text="Другое", callback_data=f"problem_other_{order_id}")]
    ])
    
    await callback.message.edit_text(
        "❌ <b>Выберите проблему:</b>",
        reply_markup=kb,
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("problem_"))
async def handle_problem(callback: types.CallbackQuery):
    """Обработка выбранной проблемы"""
    parts = callback.data.split("_")
    problem_type = parts[1]
    order_id = int(parts[2])
    
    problem_texts = {
        "noanswer": "Клиент не отвечает",
        "wrongaddress": "Неверный адрес",
        "other": "Другая проблема"
    }
    
    # Уведомляем менеджера
    await bot.send_message(
        MANAGER_CHAT_ID,
        f"🚨 <b>Проблема с заказом #{order_id}</b>\n\n"
        f"Тип: {problem_texts.get(problem_type, 'Неизвестно')}\n"
        f"Курьер: {callback.from_user.full_name}",
        parse_mode="HTML"
    )
    
    await callback.message.edit_text(
        "📨 <b>Менеджер уведомлен!</b>\n\n"
        "С вами скоро свяжутся для решения проблемы.",
        parse_mode="HTML"
    )
    await callback.answer()

# ==================== ЗАРАБОТОК ====================
@dp.callback_query(F.data == "courier_earnings")
async def show_earnings(callback: types.CallbackQuery):
    """Показать заработок курьера"""
    async with async_session() as session:
        # Получаем курьера
        res = await session.execute(
            select(User).where(User.telegram_id == str(callback.from_user.id))
        )
        courier = res.scalar_one_or_none()
        
        if not courier:
            await callback.answer("Курьер не найден", show_alert=True)
            return
        
        # Считаем заработок за сегодня
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_earnings_res = await session.execute(
            select(func.sum(CourierEarning.amount))
            .where(CourierEarning.courier_id == courier.id)
            .where(CourierEarning.created_at >= today_start)
        )
        today_earnings = today_earnings_res.scalar() or 0
        
        # Считаем количество заказов за сегодня
        today_orders_res = await session.execute(
            select(func.count(CourierEarning.id))
            .where(CourierEarning.courier_id == courier.id)
            .where(CourierEarning.created_at >= today_start)
        )
        today_orders = today_orders_res.scalar() or 0
        
        # Общий заработок за все время
        total_earnings_res = await session.execute(
            select(func.sum(CourierEarning.amount))
            .where(CourierEarning.courier_id == courier.id)
        )
        total_earnings = total_earnings_res.scalar() or 0
        
        # Всего заказов за все время
        total_orders_res = await session.execute(
            select(func.count(CourierEarning.id))
            .where(CourierEarning.courier_id == courier.id)
        )
        total_orders = total_orders_res.scalar() or 0
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ Назад в меню", callback_data="courier_menu")]
    ])
    
    await callback.message.edit_text(
        f"💰 <b>Ваш заработок</b>\n\n"
        f"<b>Сегодня:</b>\n"
        f"📦 Заказов: {today_orders}\n"
        f"💵 Заработано: {today_earnings:.2f}₽\n\n"
        f"<b>За все время:</b>\n"
        f"📦 Заказов: {total_orders}\n"
        f"💵 Заработано: {total_earnings:.2f}₽",
        reply_markup=kb,
        parse_mode="HTML"
    )
    await callback.answer()

# ==================== СВЯЗЬ С МЕНЕДЖЕРОМ ====================
@dp.callback_query(F.data == "courier_manager")
async def contact_manager(callback: types.CallbackQuery):
    """Быстрая связь с менеджером"""
    # Отправляем менеджеру уведомление
    await bot.send_message(
        MANAGER_CHAT_ID,
        f"📞 <b>Курьер запрашивает связь!</b>\n\n"
        f"Курьер: {callback.from_user.full_name}\n"
        f"Telegram ID: {callback.from_user.id}\n\n"
        f"Свяжитесь с ним как можно скорее.",
        parse_mode="HTML"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ Назад в меню", callback_data="courier_menu")]
    ])
    
    await callback.message.edit_text(
        "📨 <b>Запрос отправлен!</b>\n\n"
        "Менеджер получил уведомление и свяжется с вами в ближайшее время.",
        reply_markup=kb,
        parse_mode="HTML"
    )
    await callback.answer("Менеджер уведомлен!")

# ==================== SOS ====================
@dp.callback_query(F.data == "courier_sos")
async def sos_alert(callback: types.CallbackQuery):
    """Экстренная кнопка SOS"""
    # Критическое уведомление менеджеру
    await bot.send_message(
        MANAGER_CHAT_ID,
        f"🆘 <b>ЭКСТРЕННЫЙ ВЫЗОВ!</b>\n\n"
        f"Курьер: {callback.from_user.full_name}\n"
        f"Telegram: @{callback.from_user.username or 'нет'}\n"
        f"ID: {callback.from_user.id}\n\n"
        f"⚠️ ТРЕБУЕТСЯ НЕМЕДЛЕННАЯ ПОМОЩЬ!",
        parse_mode="HTML"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ Назад в меню", callback_data="courier_menu")]
    ])
    
    await callback.message.edit_text(
        "🆘 <b>SOS сигнал отправлен!</b>\n\n"
        "Менеджер получил экстренное уведомление.\n"
        "С вами свяжутся в ближайшее время.",
        reply_markup=kb,
        parse_mode="HTML"
    )
    await callback.answer("SOS отправлен!", show_alert=True)

# ==================== ВОЗВРАТ В МЕНЮ ====================
@dp.callback_query(F.data == "courier_menu")
async def back_to_courier_menu(callback: types.CallbackQuery):
    """Вернуться в главное меню курьера"""
    await show_courier_menu(callback.message)
    await callback.answer()

# ==================== ОБРАБОТКА ЗАКАЗОВ ОТ КЛИЕНТОВ ====================
@dp.message(F.web_app_data)
async def receive_order(message: types.Message):
    """Обработка заказов из WebApp (для клиентов)"""
    # Тут остается твой существующий код обработки заказов
    # Добавляем только возможность назначения курьера
    pass

# ==================== ЗАПУСК ====================
async def main():
    await init_db()
    print("✅ Бот запущен. Жду заказы...")
    await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    asyncio.run(main())
