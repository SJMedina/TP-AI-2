from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class RAGChunk(Base):
    __tablename__ = 'rag_chunks'

    id = Column(Integer, primary_key=True)
    texto = Column(Text, nullable=False)
    documento = Column(String, nullable=True)
    materia = Column(String, nullable=True)
    curso = Column(String, nullable=True)

# Configuración de base de datos SQLite
engine = create_engine("sqlite:///edu_mentor.db")
Session = sessionmaker(bind=engine)
session = Session()

def init_db():
    Base.metadata.create_all(engine)
