from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from routers import tickets  # apna tickets router import karo

# FastAPI app initialize
app = FastAPI(
    title="Customer Support CRM",
    description="Backend API for CRM project",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ya apna frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./crm.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tables create karo
Base.metadata.create_all(bind=engine)

# Routers include karo
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])
