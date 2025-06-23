# edu_mentor_agent.py

import json
from typing import List, Dict, Optional
import requests
from flask import stream_with_context, Response

from backend import rag_engine
from backend.rag import SimpleRAG


class EduMentorAgent:
    def __init__(self, llm_model="mistral"):
        self.llm_model = llm_model  # ahora es el nombre del modelo cargado en Ollama
        self.memory = []  # memoria de corto plazo
        self.user_profile = {}  # datos del docente, curso, preferencias
        self.rag = SimpleRAG()

    def set_user_profile(self, profile: Dict):
        """Establece el perfil del docente (curso, nivel, materia, etc.)"""
        self.user_profile = profile

    def update_memory(self, interaction: Dict):
        """Guarda interacciones para el contexto a corto plazo"""
        self.memory.append(interaction)
        if len(self.memory) > 10:
            self.memory.pop(0)

    def build_prompt(self, user_message: str, extra_context: str = "", fragmentos_rag: list = None) -> str:
        if not extra_context:
            extra_context = f"{self.user_profile.get('curso', 'Curso no especificado')} – {self.user_profile.get('materia', 'Materia desconocida')}"

        contexto = f"""Eres un asistente pedagógico inteligente que ayuda a docentes universitarios.
    Contexto de navegación actual: {extra_context}
    """
        if fragmentos_rag:
            contexto += "Fragmentos relevantes de documentos cargados:\n"
            for i, frag in enumerate(fragmentos_rag):
                contexto += f"[{i + 1}] {frag.strip()}\n"
        else:
            contexto += "No se encontraron documentos relevantes para esta consulta.\n"

        prompt = f"""{contexto}

    Respondé con claridad, utilidad, y sin asumir tareas no pedidas.

    Mensaje del docente: {user_message}

    Respuesta:"""
        return prompt

    from flask import Response, stream_with_context

    def query_llm_stream(self, prompt: str):
        """Consulta al modelo local (Ollama) y devuelve respuesta por partes"""
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.llm_model,
                    "prompt": prompt,
                    "stream": True
                },
                stream=True,
                timeout=60
            )

            def generate():
                for line in response.iter_lines():
                    if line:
                        data = json.loads(line.decode("utf-8"))
                        yield data.get("response", "")

            return Response(stream_with_context(generate()), content_type='text/plain')

        except Exception as e:
            return Response(f"[Error]: {e}", content_type='text/plain')

    def handle_request(self, user_message: str, extra_context: str = "") -> str:
        if extra_context:
            self.user_profile["última_ubicación"] = extra_context

        # Buscar fragmentos relevantes desde RAG si hay índice
        contexto_rag = rag_engine.buscar_similares(user_message) if rag_engine.index else []

        # Construir el prompt con el contexto y los fragmentos
        prompt = self.build_prompt(user_message, extra_context, contexto_rag)

        # Consultar al modelo y guardar la respuesta
        response = self.query_llm(prompt)

        self.update_memory({
            "entrada": user_message,
            "respuesta": response,
            "contexto": extra_context,
            "fragmentos_rag": contexto_rag
        })

        return response

    def agregar_documento(self, texto):
        self.rag.agregar_documento(texto)

    def recuperar_contexto(self, pregunta):
        fragmentos = self.rag.buscar_relevante(pregunta)
        return "\n".join(fragmentos)