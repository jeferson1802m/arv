const defaultRules = [
  {
    keyword: "precio",
    response: "Hola, gracias por escribir. Te puedo enviar precios segun el producto que buscas. ¿Que modelo o servicio te interesa?"
  },
  {
    keyword: "delivery",
    response: "Si realizamos delivery en Lima. Indicanos tu distrito para calcular el costo y tiempo estimado."
  },
  {
    keyword: "horario",
    response: "Nuestro horario de atencion es de lunes a sabado de 9:00 a.m. a 8:00 p.m."
  }
];

const state = {
  mode: localStorage.getItem("arvConnectionMode") || "qr",
  connected: JSON.parse(localStorage.getItem("arvConnected") || "false"),
  rules: JSON.parse(localStorage.getItem("arvRules") || "null") || defaultRules,
  conversations: Number(localStorage.getItem("arvConversations") || 38),
  automation: Number(localStorage.getItem("arvAutomation") || 62)
};

const connectionStatus = document.querySelector("#connectionStatus");
const connectionHint = document.querySelector("#connectionHint");
const connectionDescription = document.querySelector("#connectionDescription");
const connectBtn = document.querySelector("#connectBtn");
const disconnectBtn = document.querySelector("#disconnectBtn");
const modeButtons = document.querySelectorAll("[data-mode]");
const settingsChannel = document.querySelector("#settingsChannel");
const evolutionPanel = document.querySelector("#evolutionPanel");
const evolutionStatus = document.querySelector("#evolutionStatus");
const evolutionForm = document.querySelector("#evolutionForm");
const evolutionUrl = document.querySelector("#evolutionUrl");
const evolutionInstance = document.querySelector("#evolutionInstance");
const evolutionApiKey = document.querySelector("#evolutionApiKey");
const evolutionNumber = document.querySelector("#evolutionNumber");
const realQrBtn = document.querySelector("#realQrBtn");
const stateBtn = document.querySelector("#stateBtn");
const diagnoseBtn = document.querySelector("#diagnoseBtn");
const loadChatsBtn = document.querySelector("#loadChatsBtn");
const realQr = document.querySelector("#realQr");
const realNumber = document.querySelector("#realNumber");
const realText = document.querySelector("#realText");
const realSendBtn = document.querySelector("#realSendBtn");
const apiLog = document.querySelector("#apiLog");
const ruleForm = document.querySelector("#ruleForm");
const ruleList = document.querySelector("#ruleList");
const keywordInput = document.querySelector("#keywordInput");
const responseInput = document.querySelector("#responseInput");
const incomingInput = document.querySelector("#incomingInput");
const simulateBtn = document.querySelector("#simulateBtn");
const messages = document.querySelector("#messages");
const replyInput = document.querySelector("#replyInput");
const sendReplyBtn = document.querySelector("#sendReplyBtn");
const conversationMetric = document.querySelector('[data-metric="conversations"]');
const automationMetric = document.querySelector('[data-metric="automation"]');
const addTaskBtn = document.querySelector("#addTaskBtn");
const taskProgress = document.querySelector("#taskProgress");
const taskProgressText = document.querySelector("#taskProgressText");
const taskList = document.querySelector(".task-list");

function saveState() {
  localStorage.setItem("arvConnectionMode", state.mode);
  localStorage.setItem("arvConnected", JSON.stringify(state.connected));
  localStorage.setItem("arvRules", JSON.stringify(state.rules));
  localStorage.setItem("arvConversations", String(state.conversations));
  localStorage.setItem("arvAutomation", String(state.automation));
}

function getEvolutionConfig() {
  return {
    baseUrl: normalizeEvolutionUrl(evolutionUrl.value),
    instance: evolutionInstance.value.trim(),
    apiKey: evolutionApiKey.value.trim(),
    number: evolutionNumber.value.trim()
  };
}

function normalizeEvolutionUrl(value) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function saveEvolutionConfig() {
  const config = getEvolutionConfig();
  localStorage.setItem("arvEvolutionUrl", config.baseUrl);
  localStorage.setItem("arvEvolutionInstance", config.instance);
  localStorage.setItem("arvEvolutionApiKey", config.apiKey);
  localStorage.setItem("arvEvolutionNumber", config.number);
  renderEvolutionStatus();
}

function loadEvolutionConfig() {
  evolutionUrl.value = localStorage.getItem("arvEvolutionUrl") || "";
  evolutionInstance.value = localStorage.getItem("arvEvolutionInstance") || "";
  evolutionApiKey.value = localStorage.getItem("arvEvolutionApiKey") || "";
  evolutionNumber.value = localStorage.getItem("arvEvolutionNumber") || "";
}

function renderEvolutionStatus() {
  const config = getEvolutionConfig();
  const ready = config.baseUrl && config.instance && config.apiKey;
  evolutionStatus.textContent = ready ? "Configurado" : "Sin configurar";
  evolutionStatus.className = ready ? "pill" : "pill gray";
}

function logApi(payload) {
  apiLog.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

async function evolutionRequest(endpoint, payload = {}) {
  const config = getEvolutionConfig();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...config, ...payload })
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || "Error al llamar Evolution API");
    error.details = data;
    error.status = response.status;
    throw error;
  }
  return data.data;
}

function formatEvolutionError(error) {
  const details = error.details ? `\n\nDetalle:\n${JSON.stringify(error.details, null, 2)}` : "";
  return `${error.message}${details}`;
}

function buildCurlPreview(endpoint) {
  const config = getEvolutionConfig();
  const base = window.location.origin;
  const maskedKey = config.apiKey ? `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}` : "apikey";
  return [
    `URL normalizada: ${config.baseUrl || "(vacia)"}`,
    `Instancia: ${config.instance || "(vacia)"}`,
    `API key: ${maskedKey}`,
    "",
    "Prueba equivalente desde PowerShell:",
    `Invoke-WebRequest -Method Post -ContentType 'application/json' -Body '{"baseUrl":"${config.baseUrl}","instance":"${config.instance}","apiKey":"TU_API_KEY"}' ${base}${endpoint}`
  ].join("\n");
}

function extractQr(data) {
  const possible = [
    data?.base64,
    data?.qrcode?.base64,
    data?.qrcode,
    data?.qr,
    data?.code
  ].find(Boolean);
  return typeof possible === "string" ? possible : "";
}

function renderRealQr(value) {
  realQr.innerHTML = "";
  if (!value) {
    realQr.innerHTML = "<span>No se recibio QR. Revisa el log de la API.</span>";
    return;
  }
  if (value.startsWith("data:image")) {
    const image = document.createElement("img");
    image.src = value;
    image.alt = "QR real de Evolution API";
    realQr.appendChild(image);
    return;
  }
  if (value.startsWith("/9j") || value.startsWith("iVBOR") || value.length > 200) {
    const image = document.createElement("img");
    image.src = `data:image/png;base64,${value}`;
    image.alt = "QR real de Evolution API";
    realQr.appendChild(image);
    return;
  }
  const code = document.createElement("code");
  code.textContent = value;
  realQr.appendChild(code);
}

function renderConnection() {
  document.body.classList.toggle("is-connected", state.connected);
  document.body.classList.toggle("api-mode", state.mode === "api");
  document.body.classList.toggle("evolution-mode", state.mode === "evolution");
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });

  evolutionPanel.hidden = state.mode !== "evolution";

  if (state.mode === "evolution") {
    connectionDescription.textContent = "Modo real con Evolution API: usa tu URL, instancia y API key para generar QR, leer chats y enviar mensajes.";
    connectionStatus.textContent = state.connected ? "Evolution conectado" : "Evolution pendiente";
    connectionHint.textContent = state.connected
      ? "Credenciales guardadas. Puedes pedir QR, cargar chats o enviar mensajes."
      : "Guarda tus credenciales y solicita el QR real de tu instancia.";
    connectBtn.textContent = "Marcar conectado";
    settingsChannel.textContent = state.connected ? "Evolution API conectado" : "Evolution API pendiente";
    return;
  }

  if (state.mode === "api") {
    connectionDescription.textContent = "Modo produccion: pensado para WhatsApp Business Cloud API. No usa QR; requiere cuenta de Meta Business, numero aprobado, token y webhook.";
    connectionStatus.textContent = state.connected ? "API conectada" : "API pendiente";
    connectionHint.textContent = state.connected
      ? "Canal oficial activo. Los mensajes reales llegarian por webhook."
      : "Configura credenciales de Meta para activar mensajes reales.";
    connectBtn.textContent = "Simular API conectada";
    settingsChannel.textContent = state.connected ? "WhatsApp Business API conectado" : "WhatsApp Business API pendiente";
    return;
  }

  connectionDescription.textContent = "Modo demo: simula el escaneo por QR y la recepcion de mensajes para validar el MVP sin conectar una cuenta real.";
  connectionStatus.textContent = state.connected ? "Conectado" : "Desconectado";
  connectionHint.textContent = state.connected
    ? "Sesion demo activa. Las automatizaciones pueden responder mensajes simulados."
    : "Escanea el QR de prueba para iniciar la sesion demo.";
  connectBtn.textContent = "Simular conexion";
  settingsChannel.textContent = state.connected ? "WhatsApp Web demo conectado" : "WhatsApp demo desconectado";
}

function renderMetrics() {
  conversationMetric.textContent = String(state.conversations);
  automationMetric.textContent = `${state.automation}%`;
}

function updateTaskProgress() {
  const tasks = [...taskList.querySelectorAll('input[type="checkbox"]')];
  const done = tasks.filter((task) => task.checked).length;
  taskProgress.max = String(tasks.length || 1);
  taskProgress.value = String(done);
  taskProgressText.textContent = `${done}/${tasks.length}`;
}

function renderRules() {
  ruleList.innerHTML = "";
  state.rules.forEach((rule, index) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <b>${escapeHtml(rule.keyword)}</b>
        <span>${escapeHtml(rule.response)}</span>
      </div>
      <button type="button" aria-label="Eliminar regla ${escapeHtml(rule.keyword)}">Eliminar</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      state.rules.splice(index, 1);
      saveState();
      renderRules();
    });
    ruleList.appendChild(item);
  });
}

function addMessage(text, type = "client") {
  const message = document.createElement("p");
  message.className = `msg ${type}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function findRule(text) {
  const normalized = text.toLowerCase();
  return state.rules.find((rule) => normalized.includes(rule.keyword.toLowerCase()));
}

function simulateIncoming() {
  const text = incomingInput.value.trim();
  if (!text) return;

  if (!state.connected) {
    addMessage("No se puede recibir el mensaje porque la sesion demo esta desconectada.", "bot");
    return;
  }

  addMessage(text, "client");
  state.conversations += 1;

  const rule = findRule(text);
  if (rule) {
    window.setTimeout(() => {
      addMessage(rule.response, "bot");
    }, 280);
    state.automation = Math.min(99, state.automation + 1);
  } else {
    window.setTimeout(() => {
      addMessage("No encontre una regla para este mensaje. Lo dejo como pendiente para atencion humana.", "bot");
    }, 280);
  }

  incomingInput.value = "";
  saveState();
  renderMetrics();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

connectBtn.addEventListener("click", () => {
  state.connected = true;
  saveState();
  renderConnection();
  addMessage(
    state.mode === "api"
      ? "API simulada conectada. En produccion, aqui aparecerian mensajes recibidos por webhook."
      : state.mode === "evolution"
        ? "Evolution API marcado como conectado. Usa Obtener QR real para enlazar la instancia."
      : "Sesion demo conectada. Ya puedes probar mensajes entrantes.",
    "bot"
  );
});

disconnectBtn.addEventListener("click", () => {
  state.connected = false;
  saveState();
  renderConnection();
  addMessage("Sesion demo desconectada. Las automatizaciones quedan pausadas.", "bot");
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    state.connected = false;
    saveState();
    renderConnection();
  });
});

ruleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const keyword = keywordInput.value.trim().toLowerCase();
  const response = responseInput.value.trim();
  if (!keyword || !response) return;

  const existing = state.rules.find((rule) => rule.keyword.toLowerCase() === keyword);
  if (existing) {
    existing.response = response;
  } else {
    state.rules.unshift({ keyword, response });
  }

  keywordInput.value = "";
  responseInput.value = "";
  saveState();
  renderRules();
});

simulateBtn.addEventListener("click", simulateIncoming);
incomingInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) simulateIncoming();
});

sendReplyBtn.addEventListener("click", () => {
  const text = replyInput.value.trim();
  if (!text) return;
  addMessage(text, "agent");
  replyInput.value = "";
});

taskList.addEventListener("change", (event) => {
  if (event.target.matches('input[type="checkbox"]')) updateTaskProgress();
});

addTaskBtn.addEventListener("click", () => {
  const item = document.createElement("li");
  item.innerHTML = '<input type="checkbox"> <span>Nueva tarea de seguimiento</span><b>Hoy</b>';
  taskList.appendChild(item);
  updateTaskProgress();
});

evolutionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveEvolutionConfig();
  state.mode = "evolution";
  state.connected = Boolean(getEvolutionConfig().baseUrl && getEvolutionConfig().instance && getEvolutionConfig().apiKey);
  saveState();
  renderConnection();
  logApi("Credenciales guardadas localmente. Ahora puedes obtener el QR real.");
});

realQrBtn.addEventListener("click", async () => {
  saveEvolutionConfig();
  logApi("Solicitando QR a Evolution API...");
  try {
    const data = await evolutionRequest("/api/evolution/connect");
    renderRealQr(extractQr(data));
    state.connected = true;
    saveState();
    renderConnection();
    logApi(data);
  } catch (error) {
    logApi(formatEvolutionError(error));
  }
});

stateBtn.addEventListener("click", async () => {
  saveEvolutionConfig();
  logApi(`Consultando estado de la instancia...\n\n${buildCurlPreview("/api/evolution/state")}`);
  try {
    const data = await evolutionRequest("/api/evolution/state");
    const currentState = data?.instance?.state || data?.state || "desconocido";
    state.connected = currentState === "open" || currentState === "connected";
    saveState();
    renderConnection();
    logApi(data);
  } catch (error) {
    logApi(`${formatEvolutionError(error)}\n\nRevisa: URL base, API key y nombre exacto de instancia. En tu captura parece: Botrestaurante.`);
  }
});

diagnoseBtn.addEventListener("click", async () => {
  saveEvolutionConfig();
  const config = getEvolutionConfig();
  const lines = [
    "Diagnostico Evolution API",
    "-------------------------",
    `URL ingresada/normalizada: ${config.baseUrl || "(vacia)"}`,
    `Instancia: ${config.instance || "(vacia)"}`,
    `API key presente: ${config.apiKey ? "si" : "no"}`,
    "",
    "1) Probando estado..."
  ];

  try {
    const stateData = await evolutionRequest("/api/evolution/state");
    lines.push(JSON.stringify(stateData, null, 2));
  } catch (error) {
    lines.push(formatEvolutionError(error));
  }

  lines.push("", "2) Probando carga de chats...");
  try {
    const chatsData = await evolutionRequest("/api/evolution/find-chats");
    lines.push(JSON.stringify(chatsData, null, 2));
  } catch (error) {
    lines.push(formatEvolutionError(error));
  }

  lines.push(
    "",
    "Si el manager muestra Connected pero aqui falla:",
    "- La URL debe ser solo el dominio base, sin /manager/instance/...",
    "- La instancia debe ser el nombre exacto, probablemente Botrestaurante.",
    "- La API key debe ser la clave valida para la API, no necesariamente el token de la tarjeta.",
    "- En algunos despliegues, el manager y la API no comparten la misma instancia o apikey."
  );
  logApi(lines.join("\n"));
});

loadChatsBtn.addEventListener("click", async () => {
  saveEvolutionConfig();
  logApi("Cargando chats desde Evolution API...");
  try {
    const data = await evolutionRequest("/api/evolution/find-chats");
    logApi(data);
  } catch (error) {
    logApi(formatEvolutionError(error));
  }
});

realSendBtn.addEventListener("click", async () => {
  saveEvolutionConfig();
  const number = realNumber.value.trim();
  const text = realText.value.trim();
  if (!number || !text) {
    logApi("Completa numero destino y mensaje real.");
    return;
  }
  logApi("Enviando mensaje por Evolution API...");
  try {
    const data = await evolutionRequest("/api/evolution/send-text", { number, text });
    addMessage(text, "agent");
    realText.value = "";
    logApi(data);
  } catch (error) {
    logApi(formatEvolutionError(error));
  }
});

loadEvolutionConfig();
renderConnection();
renderEvolutionStatus();
renderMetrics();
renderRules();
updateTaskProgress();
