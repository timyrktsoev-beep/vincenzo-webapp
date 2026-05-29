import asyncio
import json
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Base, Product

DATABASE_URL = "sqlite+aiosqlite:///./vincenzo.db"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

MENU_DATA = [
    {"name": "Омлет с томатами и базиликом", "description": "Яйца, томаты черри, базилик, пармезан", "price": 340, "weight": "220 г", "category": "breakfast"},
    {"name": "Сырники из рикотты", "description": "Рикотта, мука, сахар, ваниль, подаются со сметаной", "price": 310, "weight": "200 г", "category": "breakfast"},
    {"name": "Тост с авокадо и лососем", "description": "Хлеб на закваске, авокадо, слабосолёный лосось, микрозелень", "price": 490, "weight": "240 г", "category": "breakfast"},
    {"name": "Овсяная каша с ягодами", "description": "Овсянка на молоке, сезонные ягоды, мёд, орехи", "price": 280, "weight": "250 г", "category": "breakfast"},
    {"name": "Паста Карбонара", "description": "Спагетти, гуанчале, пекорино, яичный желток, чёрный перец", "price": 540, "weight": "300 г", "category": "main"},
    {"name": "Пицца Маргарита DOP", "description": "Томатный соус Сан-Марцано, моцарелла буфала, базилик, EVOO", "price": 620, "weight": "450 г", "category": "pizza"},
    {"name": "Цезарь с курицей гриль", "description": "Романо, куриное филе, пармезан, гренки, соус цезарь", "price": 480, "weight": "250 г", "category": "salads"},
    {"name": "Том Ям с морепродуктами", "description": "Кокосовое молоко, креветки, мидии, лемонграсс, лайм, чили", "price": 590, "weight": "350 мл", "category": "soups"},
    {"name": "Капучино", "description": "Эспрессо, взбитое молоко, молочная пена", "price": 220, "weight": "250 мл", "category": "drinks"},
    {"name": "Лимонад Домашний", "description": "Лимон, мята, имбирь, тростниковый сахар, газированная вода", "price": 260, "weight": "400 мл", "category": "drinks"}
]

async def seed_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        await session.execute(Product.__table__.delete())
        products = [Product(**p) for p in MENU_DATA]
        session.add_all(products)
        await session.commit()
        print(f"✅ В SQLite загружено {len(products)} позиций.")

    #  Экспорт для WebApp
    webapp_dir = os.path.join(os.path.dirname(__file__), '..', 'webapp')
    os.makedirs(webapp_dir, exist_ok=True)
    json_path = os.path.join(webapp_dir, 'products.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(MENU_DATA, f, ensure_ascii=False, indent=2)
    print(f"🌐 Меню экспортировано в {json_path}")

if __name__ == "__main__":
    asyncio.run(seed_db())