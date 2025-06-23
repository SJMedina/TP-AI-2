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

# Al iniciar, cargar todos los chunks guardados
todos_los_chunks = session.query(RAGChunk).all()
documentos = [{"texto": c.texto} for c in todos_los_chunks]
rag_engine.cargar_chunks(documentos)

DOCUMENTOS_RAG = []  # Aquí se almacenan temporalmente los chunks
rag_engine = RAGEngine()

# Se inicializa el agente con un backend LLM local
agent = EduMentorAgent(llm_model="mistral")  # LLM local en Ollama

agent.set_user_profile({
    "curso": "Ingenieria en Sistemas de Informacion",
    "materia": "No especificado",
    "nivel": "Avanzado",
    "idioma": "Español"
})

@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        return jsonify({"error": "No se envió ningún archivo PDF"}), 400

    file = request.files["pdf"]
    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Formato no permitido"}), 400

    try:
        texto = extraer_texto_pdf(file.read())
        chunks = dividir_en_chunks(texto)

        # Guardamos los chunks para la fase de vectorización
        for chunk in chunks:
            nuevo = RAGChunk(
                texto=chunk,
                documento=file.filename,
                materia=agent.user_profile.get("materia", "Desconocida"),
                curso=agent.user_profile.get("curso", "Desconocido")
            )
            session.add(nuevo)
        session.commit()

        return jsonify({
            "status": "ok",
            "total_chunks": len(chunks),
            "preview": chunks[:2]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat-stream", methods=["POST"])
def chat_stream():
    data = request.json
    mensaje = data.get("message", "")
    extra_context = data.get("context", "")
    prompt = agent.build_prompt(mensaje, extra_context)
    return agent.query_llm_stream(prompt)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
