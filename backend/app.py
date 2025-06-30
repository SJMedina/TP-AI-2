from flask import Flask, request, jsonify
from flask_cors import CORS
from edu_mentor_agent import EduMentorAgent
from utils.text_splitter import extraer_texto_pdf, dividir_en_chunks
from rag_engine import RAGEngine
from models import init_db, session, RAGChunk

app = Flask(__name__)
CORS(app)

init_db()
rag_engine = RAGEngine()

# Cargar todos los chunks guardados al iniciar
todos_los_chunks = session.query(RAGChunk).all()
documentos = [{"texto": c.texto} for c in todos_los_chunks]
rag_engine.cargar_chunks(documentos)

# Inicializar agente con modelo local
agent = EduMentorAgent(llm_model="mistral")
agent.set_user_profile({
    "curso": "Ingenieria en Sistemas de Informacion",
    "materia": "No especificado",
    "nivel": "Avanzado",
    "idioma": "Español"
})

@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        print("⚠ No se encontró el archivo 'pdf' en la petición")
        return jsonify({"error": "No se envió ningún archivo PDF"}), 400

    file = request.files["pdf"]
    print(f"Archivo recibido: {file.filename}")

    if not file.filename.endswith(".pdf"):
        print("El archivo no es un PDF válido")
        return jsonify({"error": "Formato no permitido"}), 400

    try:
        raw_bytes = file.read()
        print(f"Tamaño del archivo en bytes: {len(raw_bytes)}")

        texto = extraer_texto_pdf(raw_bytes)
        print(f"Texto extraído (primeros 300): {texto[:300] if texto else 'NULO'}")

        chunks = dividir_en_chunks(texto)
        print(f"Total de chunks generados: {len(chunks)}")

        for chunk in chunks:
            nuevo = RAGChunk(
                texto=chunk,
                documento=file.filename,
                materia=agent.user_profile.get("materia", "Desconocida"),
                curso=agent.user_profile.get("curso", "Desconocido")
            )
            session.add(nuevo)
        session.commit()

        nuevos_docs = [{"texto": chunk} for chunk in chunks]
        rag_engine.cargar_chunks(nuevos_docs)

        return jsonify({
            "status": "ok",
            "total_chunks": len(chunks),
            "preview": chunks[:2]
        })

    except Exception as e:
        print("Error en /upload-pdf:", e)
        return jsonify({"error": str(e)}), 500

current_public_url = None

@app.route("/chat-stream", methods=["POST"])
def chat_stream():
    data = request.json
    mensaje = data.get("message", "")
    extra_context = data.get("context", "")

    contexto_rag = rag_engine.buscar_similares(mensaje) if rag_engine.index else []
    prompt = agent.build_prompt(mensaje, extra_context, contexto_rag)
    return agent.query_llm_stream(prompt)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
