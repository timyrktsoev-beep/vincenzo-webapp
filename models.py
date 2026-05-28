from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    CLIENT = "client"
    COURIER = "courier"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100))
    phone = Column(String(20))
    role = Column(String(20), default="client") # Роль по умолчанию - клиент
    created_at = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Float)
    delivery_address = Column(String(255))
    status = Column(String(50), default="new") # new, cooking, courier_assigned, delivered
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связь с пользователем
    user = relationship("User")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_name = Column(String(100)) # Сохраняем название, чтобы при удалении товара из меню история не ломалась
    price = Column(Float)
    quantity = Column(Integer)
    
    order = relationship("Order", back_populates="items")
