from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime
import enum

class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    CLIENT = "client"
    COURIER = "courier"
    ADMIN = "admin"

class OrderStatus(str, enum.Enum):
    NEW = "new"
    COOKING = "cooking"
    READY = "ready"
    COURIER_ASSIGNED = "courier_assigned"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    telegram_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default=UserRole.CLIENT, nullable=False)
    is_active_courier: Mapped[bool] = mapped_column(Boolean, default=False)  # Курьер на смене
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    orders: Mapped[list["Order"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    deliveries: Mapped[list["Delivery"]] = relationship(back_populates="courier")

class CourierEarning(Base):
    __tablename__ = "courier_earnings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # Заработок за заказ
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    courier: Mapped["User"] = relationship()
    order: Mapped["Order"] = relationship()

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    weight: Mapped[str] = mapped_column(String(20), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=True)  # breakfast, pizza, main, drinks, salads
    image_url: Mapped[str] = mapped_column(String(255), nullable=True)

    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_address: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=OrderStatus.NEW, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    delivery: Mapped["Delivery"] = relationship(back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    price_at_order: Mapped[float] = mapped_column(Float, nullable=False)  # Фиксируем цену на момент оформления

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")

class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    courier_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, on_way, completed
    assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    comment: Mapped[str] = mapped_column(String(255), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="delivery")
    courier: Mapped["User"] = relationship(back_populates="deliveries")
