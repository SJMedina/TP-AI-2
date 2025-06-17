// content.js

// Evita múltiples inyecciones
if (!document.getElementById('eduMentorWidget')) {
  const style = document.createElement('style');
  style.innerText = `
    #eduMentorWidget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #4a90e2;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
    }

    #eduMentorChat {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 300px;
      height: 400px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
      z-index: 9999;
    }

    #eduMentorHeader {
      background-color: #4a90e2;
      padding: 10px;
      color: white;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      font-weight: bold;
    }

    #eduMentorMessages {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
    }

    #eduMentorInputArea {
      display: flex;
      padding: 10px;
      border-top: 1px solid #ccc;
    }

    #eduMentorInputArea input {
      flex: 1;
      padding: 5px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }

    #eduMentorInputArea button {
      margin-left: 5px;
      background-color: #4a90e2;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'eduMentorWidget';
  document.body.appendChild(widget);

  const chat = document.createElement('div');
  chat.id = 'eduMentorChat';
  chat.style.display = 'none';
  chat.innerHTML = `
    <div id="eduMentorHeader">EduMentorIA</div>
    <div id="eduMentorMessages"></div>
    <div id="eduMentorInputArea">
      <input id="eduMentorInput" type="text" placeholder="Escribí tu pedido..." />
      <button id="eduMentorSend">➤</button>
    </div>
  `;
  document.body.appendChild(chat);

  widget.addEventListener('click', () => {
    chat.style.display = chat.style.display === 'none' ? 'flex' : 'none';
  });
   document.getElementById('eduMentorInput').addEventListener('keydown', function (event) {
     if (event.key === 'Enter') {
       document.getElementById('eduMentorSend').click();
       event.preventDefault();  // evita salto de línea
     }
   });

   function getCursoDesdeBreadcrumb() {
  const breadcrumb = document.querySelectorAll('ol.breadcrumb [itemprop="title"]');
  if (!breadcrumb || breadcrumb.length === 0) return null;

  // Extrae el último título relevante
  const contextos = Array.from(breadcrumb).map(el => el.textContent.trim());
  return contextos.join(" > "); // ejemplo: "Grado > Ingeniería... > Inteligencia Artificial"
  }

  document.getElementById('eduMentorSend').addEventListener('click', () => {
    const input = document.getElementById('eduMentorInput');
    const msg = input.value.trim();
    if (msg) {
      const messages = document.getElementById('eduMentorMessages');
      messages.innerHTML += `<div><strong>Vos:</strong> ${msg}</div>`;
      input.value = '';

      // Simulación de respuesta (reemplazá con llamada al backend)
      fetch("http://localhost:5000/chat-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: msg, task: "generar_consigna" })
})
.then(response => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  const messages = document.getElementById('eduMentorMessages');
  messages.innerHTML += `<div><strong>IA:</strong> <span id="streaming-response"></span></div>`;
  const span = document.getElementById('streaming-response');

  function read() {
    reader.read().then(({ done, value }) => {
      if (done) return;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      span.innerText = fullText;
      messages.scrollTop = messages.scrollHeight;
      read();
    });
  }

  read();
})
.catch((err) => {
  console.error("Error en streaming:", err);
  messages.innerHTML += `<div style="color:red;">[Error al conectar con el servidor]</div>`;
});

    }
  });
}
