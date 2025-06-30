# rag_engine.py
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

class RAGEngine:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2") # Modelo preentrenado de Sentence Transformers
        self.index = None
        self.id_to_text = {}

    def cargar_chunks(self, documentos: list):
        textos = [doc["texto"] for doc in documentos if doc.get("texto")]

        if not textos:
            print("No hay textos válidos para vectorizar.")
            return

        embeddings = self.model.encode(textos, show_progress_bar=False)

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(np.array(embeddings))

        for i, texto in enumerate(textos):
            self.id_to_text[i] = texto

    def buscar_similares(self, pregunta: str, top_k=5):
        if not self.index:
            return []

        pregunta_embedding = self.model.encode([pregunta])
        D, I = self.index.search(np.array(pregunta_embedding), top_k)
        return [self.id_to_text[i] for i in I[0]]