from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import sent_tokenize

nltk.download("punkt")

class SimpleRAG:
    def __init__(self):
        self.documentos = []
        self.vectorizador = TfidfVectorizer()

    def agregar_documento(self, texto):
        oraciones = sent_tokenize(texto)
        self.documentos.extend(oraciones)

    def buscar_relevante(self, pregunta, k=5):
        corpus = self.documentos + [pregunta]
        tfidf = self.vectorizador.fit_transform(corpus)
        similitudes = cosine_similarity(tfidf[-1], tfidf[:-1])
        indices = similitudes[0].argsort()[-k:][::-1]
        return [self.documentos[i] for i in indices]
