import fitz  # PyMuPDF
import re
import nltk

nltk.download('punkt')
from nltk.tokenize import sent_tokenize

def extraer_texto_pdf(file_bytes) -> str:
    texto = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            texto += page.get_text()
    return texto

def dividir_en_chunks(texto, max_tokens=250):
    oraciones = sent_tokenize(texto)
    chunks = []
    chunk = ""

    for oracion in oraciones:
        if len(chunk.split()) + len(oracion.split()) < max_tokens:
            chunk += " " + oracion
        else:
            chunks.append(chunk.strip())
            chunk = oracion

    if chunk:
        chunks.append(chunk.strip())

    return chunks
