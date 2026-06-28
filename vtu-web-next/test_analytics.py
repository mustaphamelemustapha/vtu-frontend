import sys
import os
sys.path.insert(0, os.path.abspath('../../vtu-backend'))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.api.v1.endpoints.admin import analytics

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    res = analytics(admin=None, db=db)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
