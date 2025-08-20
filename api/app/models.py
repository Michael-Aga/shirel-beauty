from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Boolean, Date, Time, DateTime, ForeignKey, Column, Integer
from .db import Base

class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    duration_min: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class DailyOverride(Base):
    __tablename__ = "daily_overrides"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[Date] = mapped_column(Date, unique=True, index=True)
    start_time: Mapped[Time] = mapped_column(Time)
    end_time: Mapped[Time] = mapped_column(Time)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)

class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    client_name: Mapped[str] = mapped_column(String(120))
    client_phone: Mapped[str] = mapped_column(String(40))
    start_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    end_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")

class DayOverride(Base):
    __tablename__ = "day_overrides"

    id = Column(Integer, primary_key=True)
    date = Column(Date, unique=True, nullable=False, index=True)  # local calendar day (YYYY-MM-DD)
    is_closed = Column(Boolean, nullable=False, default=False)
    start_time = Column(Time, nullable=True)  # local time (HH:MM)
    end_time = Column(Time, nullable=True)
