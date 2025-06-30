// content.js
// Inyecta el widget solo una vez
if (!document.getElementById('eduMentorWidget')) {
  // ----- ESTILOS -----
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
      height: 450px;
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
    #pdfUploader {
      margin: 5px 10px 10px 10px;
    }
  `;
  document.head.appendChild(style);

  // ----- ESTRUCTURA -----
  const widget = document.createElement('div');
  widget.id = 'eduMentorWidget';
  document.body.appendChild(widget);

  const chat = document.createElement('div');
  chat.id = 'eduMentorChat';
  chat.style.display = 'none';
  chat.innerHTML = `
    <div id="eduMentorHeader" style="display: flex; justify-content: space-between; align-items: center;">
    EduMentorIA
    <button id="clearChatBtn" style="
      background: transparent;
      border: none;
      color: white;
      font-weight: bold;
      cursor: pointer;
      font-size: 16px;
      padding: 0 8px;
      border-radius: 5px;
      ">✖</button>
  </div>
    <div id="eduMentorMessages"></div>
    <div id="eduMentorInputArea">
      <input id="eduMentorInput" type="text" placeholder="Escribí tu pedido..." />
      <button id="eduMentorSend">➤</button>
    </div>
    <input type="file" id="pdfUploader" accept="application/pdf" />
  `;
  document.body.appendChild(chat);

  const messages = document.getElementById('eduMentorMessages');

document.getElementById('clearChatBtn').addEventListener('click', () => {
  const messages = document.getElementById('eduMentorMessages');
  messages.innerHTML = '';               // limpio el contenido visual
  localStorage.removeItem("eduMentorHistorial"); // limpio el historial guardado
});

  // ----- RESTAURAR HISTORIAL -----
  const historial = JSON.parse(localStorage.getItem("eduMentorHistorial") || "[]");
  historial.forEach(({ msg, from }) => {
    messages.innerHTML += `<div><strong>${from === "user" ? "Vos" : "IA"}:</strong> ${msg}</div>`;
  });

  // ----- TOGGLE CHAT -----
  widget.addEventListener('click', () => {
    const visible = chat.style.display === 'none';
    chat.style.display = visible ? 'flex' : 'none';
    localStorage.setItem("eduMentorChatVisible", visible ? "true" : "false");
  });

  // ----- ENTER = ENVIAR -----
  document.getElementById('eduMentorInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      document.getElementById('eduMentorSend').click();
      event.preventDefault();
    }
  });

  // ----- CONTEXTO DE LA PÁGINA -----
  function getContextoDesdePagina() {
    const items = document.querySelectorAll('ol.breadcrumb [itemprop="title"]');
    if (!items || items.length === 0) return "Sin contexto disponible";
    return Array.from(items).map(el => el.textContent.trim()).join(" > ");
  }

  // ----- GUARDAR HISTORIAL -----
  function guardarHistorial(msg, from = "user") {
    const historial = JSON.parse(localStorage.getItem("eduMentorHistorial") || "[]");
    historial.push({ msg, from });
    localStorage.setItem("eduMentorHistorial", JSON.stringify(historial));
  }

  // ----- ENVÍO DE MENSAJE (LOCAL FETCH) -----
  document.getElementById('eduMentorSend').addEventListener('click', () => {
    const input = document.getElementById('eduMentorInput');
    const msg = input.value.trim();
    if (!msg) return;

    messages.innerHTML += `<div><strong>Vos:</strong> ${msg}</div>`;
    guardarHistorial(msg, "user");
    input.value = '';

    const contexto = getContextoDesdePagina();
    const responseId = `streaming-response-${Date.now()}`;
    messages.innerHTML += `<div><strong>IA:</strong> <span id="${responseId}"></span></div>`;
    const span = document.getElementById(responseId);

    fetch("http://localhost:5000/chat-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, context: contexto })
    })
    .then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            guardarHistorial(fullText, "ia");
            return;
          }
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
      messages.innerHTML += `<div style="color:red;">[Error al conectar con el servidor: ${err.message}]</div>`;
    });
  });

  // ----- SUBIDA DE PDF -----
  document.getElementById('pdfUploader').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    fetch("http://localhost:5000/upload-pdf", {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      alert("PDF cargado y procesado correctamente");
      console.log("Texto extraído:", data.preview);
    })
    .catch(err => {
      console.error("Error al subir el PDF:", err);
      alert("Error al subir el PDF");
    });
  });

  // Restaurar visibilidad del chat
  const visible = localStorage.getItem("eduMentorChatVisible") === "true";
  chat.style.display = visible ? "flex" : "none";
}
