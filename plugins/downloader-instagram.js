import axios from "axios";
import fs from "fs";

// Configuración de Proxy (usando tus datos de Soax)
const proxyConfig = {
  protocol: 'http',
  host: 'proxy.soax.com',
  port: 9137,
  auth: {
    username: '<api_key>:wifi;ca;;;toronto',
    password: 'tu_password_aqui' // Reemplaza con tu pass de Soax
  }
};

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `*⚠️ Ingrese un enlace de Instagram*\nEjemplo: ${usedPrefix + command} https://www.instagram.com/p/C12345/`;

  await m.reply('⏳ *Procesando solicitud...*');

  try {
    // MÉTODO 1: Scraper Interno con Proxy
    const data = await fetchWithProxy(args[0]);
    await sendMedia(conn, m, data);

  } catch (err) {
    try {
      // MÉTODO 2: Fallback a HikerAPI (Alta fiabilidad)
      const hikerData = await fetchHikerApi(args[0]);
      await sendMedia(conn, m, hikerData);
    } catch (e) {
      throw `❌ Error crítico: No se pudo obtener el contenido. Los servidores de Instagram están bloqueando la petición.`;
    }
  }
};

handler.command = /^(instagram|igdl|ig|insta)$/i;
export default handler;

// --- Funciones de Apoyo ---

async function fetchWithProxy(url) {
  // Aquí usamos el endpoint de la API interna que mencionaste
  const endpoint = `https://i.instagram.com/api/v1/media/id_from_url/?shortcode=${extractShortcode(url)}`;
  
  const response = await axios.get(endpoint, {
    proxy: proxyConfig,
    headers: {
      'User-Agent': 'Instagram 219.0.0.12.117 Android',
      'X-IG-Capabilities': '3brTvw==',
      'Accept-Language': 'en-US'
    }
  });
  // Lógica de parseo del JSON interno...
  return response.data; 
}

async function fetchHikerApi(url) {
  const API_KEY = "TU_HIKER_API_KEY";
  const res = await axios.get(`https://hikerapi.com/v1/post/decode`, {
    params: { url: url },
    headers: { 'x-access-key': API_KEY }
  });
  return res.data; // Retorna array de media
}

async function sendMedia(conn, m, items) {
  for (const item of items) {
    const type = item.type === "image" ? "image" : "video";
    await conn.sendMessage(m.chat, { [type]: { url: item.url } }, { quoted: m });
  }
}

function extractShortcode(url) {
  const match = url.match(/(?:reels?|p|tv|s)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
