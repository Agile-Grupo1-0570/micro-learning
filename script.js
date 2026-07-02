"use strict";

/*
 * SocialShield Training
 * Gestiona los parámetros de seguimiento, el estado local de finalización
 * y el envío opcional de la confirmación a n8n.
 */

// URL de ejemplo: reemplázala por la URL real de tu webhook de producción.
const WEBHOOK_URL = "https://TU-N8N-DOMINIO/webhook/training-completed";

// Lee los identificadores de la URL. Si no existen, su valor será null.
const urlParameters = new URLSearchParams(window.location.search);
const userId = urlParameters.get("userId");
const campaignId = urlParameters.get("campaignId");

/*
 * La clave incluye usuario y campaña para no mezclar finalizaciones distintas
 * en un mismo navegador. Los valores por defecto permiten usar la página sin
 * parámetros y conservar igualmente el estado tras una recarga.
 */
const storageKey = `socialShieldTrainingCompleted:${userId || "anonymous"}:${campaignId || "general"}`;

const completionButton = document.getElementById("completionButton");
const completionMessage = document.getElementById("completionMessage");

/**
 * Consulta localStorage de forma segura.
 * Algunos navegadores pueden bloquearlo por sus ajustes de privacidad.
 */
function hasCompletedTraining() {
  try {
    return localStorage.getItem(storageKey) === "true";
  } catch (error) {
    console.warn("No fue posible consultar el estado local.", error);
    return false;
  }
}

/**
 * Guarda la finalización en este navegador.
 */
function saveCompletionLocally() {
  try {
    localStorage.setItem(storageKey, "true");
  } catch (error) {
    // La experiencia visual sigue funcionando aunque localStorage no esté disponible.
    console.warn("No fue posible guardar el estado local.", error);
  }
}

/**
 * Actualiza el botón y el mensaje para mostrar que la capacitación terminó.
 */
function showCompletedState() {
  completionButton.classList.add("is-completed");
  completionButton.disabled = true;
  completionButton.setAttribute("aria-label", "Capacitación completada");
  completionMessage.hidden = false;
}

/**
 * Envía la finalización al webhook de n8n.
 * La función devuelve la promesa de fetch para facilitar futuras integraciones.
 * La ausencia de userId o campaignId no interrumpe el envío: se mandan como null.
 */
function sendCompletionToWebhook() {
  const completionData = {
    userId,
    campaignId,
    completed: true,
    completedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  return fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(completionData),
  });
}

/**
 * Procesa una nueva confirmación. Primero guarda y muestra el éxito localmente;
 * después intenta notificar a n8n sin bloquear la experiencia del usuario.
 */
function completeTraining() {
  saveCompletionLocally();
  showCompletedState();

  sendCompletionToWebhook().catch((error) => {
    /*
     * Mientras WEBHOOK_URL sea un placeholder, este error es esperado.
     * La capacitación permanece completada en el navegador.
     */
    console.warn("No fue posible notificar la finalización al webhook.", error);
  });
}

// Restaura el estado guardado o habilita la confirmación por primera vez.
if (hasCompletedTraining()) {
  showCompletedState();
} else {
  completionButton.addEventListener("click", completeTraining, { once: true });
}
