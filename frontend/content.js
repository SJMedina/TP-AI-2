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
      <input id="eduMentorInput" type="text" placeholder="Pregunta lo que quieras..." />
      <button id="eduMentorSend">➤</button>
    </div>
    <input type="file" id="pdfUploader" accept="application/pdf">
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

   function getContextoDesdePagina() {
  const items = document.querySelectorAll('ol.breadcrumb [itemprop="title"]');
  if (!items || items.length === 0) return "Sin contexto disponible";
  return Array.from(items).map(el => el.textContent.trim()).join(" > ");
   }


  document.getElementById('eduMentorSend').addEventListener('click', () => {
    const input = document.getElementById('eduMentorInput');
    const msg = input.value.trim();
    if (msg) {
      const messages = document.getElementById('eduMentorMessages');
      messages.innerHTML += `<div><strong>Vos:</strong> ${msg}</div>`;
      input.value = '';

      const contexto = getContextoDesdePagina();

fetch("http://localhost:5000/chat-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: msg,
    context: contexto
  })
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
  messages.innerHTML += `<div style="color:red;">[Error al conectar con el servidor: ${err.message}]</div>`;
});

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
    alert("✅ PDF cargado y procesado correctamente");
    console.log("Texto extraído:", data.preview);
  })
  .catch(err => {
    console.error("Error al subir el PDF:", err);
    alert("❌ Error al subir el PDF");
  });
});

}
