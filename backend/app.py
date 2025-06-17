from flask import Flask, request, jsonify
from flask_cors import CORS
from edu_mentor_agent import EduMentorAgent


app = Flask(__name__)
CORS(app)

# Inicializamos el agente con un backend LLM local
agent = EduMentorAgent(llm_model="mistral")  # solo etiqueta, ahora usamos Ollama

agent.set_user_profile({
    "curso": "IA",
    "materia": "Agentes Inteligentes",
    "nivel": "Avanzado",
    "idioma": "Español"
})

@app.route("/chat-stream", methods=["POST"])
def chat_stream():
    data = request.json
    mensaje = data.get("message", "")
    extra_context = data.get("context", "")
    prompt = agent.build_prompt(mensaje, extra_context)
    return agent.query_llm_stream(prompt)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
