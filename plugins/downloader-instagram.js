import axios from "axios";
import fs from "fs";
import { HttpsProxyAgent } from 'https-proxy-agent';

// --- CONFIGURACIÓN DE IDENTIDAD Y RED ---
// Reemplaza <api_key> con tu llave de Soax y pon tu password si es necesario
const proxyUrl = "http://<api_key>:wifi;ca;;;toronto@proxy.soax.com:9137";
const agent = new HttpsProxyAgent(proxyUrl);

const commonHeaders = {
  'User-Agent': 'Instagram 219.0.0.12.117 Android (31/12; 480dpi; 1080x2202; Google/google; Pixel 6; oriole; s5e8825; en_US; 340052329)',
  'X-IG-Capabilities': '3brTvw==',
  'X-IG-App-ID': '124024574287414',
  'Accept-Language': 'en-US,en;q=0.9',
};

const handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) throw `*⚠️ Ingrese un enlace de Instagram*\nEjemplo: _${usedPrefix + command} https://www.instagram.com/reel/C12345/_`;

  await m.reply('⏳ *Descargando contenido...*');

  try {
    // MÉTODO 1: API Interna de Instagram con Proxy Soax
    const mediaData = await instagramDownload(args[0]);
    if (!mediaData || mediaData.length === 0) throw new Error("No media found");

    for (const item of mediaData) {
      await conn.sendMessage(m.chat, { [item.type]: { url: item.url } }, { quoted: m });
    }

  } catch (err) {
    try {
      // MÉTODO 2: Fallback a HikerAPI (Rescate de alta fiabilidad)
      const res = await axios.get(`https://hikerapi.com/v1/post/decode`, {
        params: { url: args[0] },
        headers: { 'x-access-key': 'TU_HIKER_API_KEY' } // Pon tu Key de HikerAPI aquí
      });
      
      const result = res.data; 
      for (const item of result) {
        const type = item.type === "image" ? "image" : "video";
        await conn.sendMessage(m.chat, { [type]: { url: item.url } }, { quoted: m });
      }
    } catch (e) {
      throw `❌ *Error Crítico:* Los servidores de Instagram detectaron actividad inusual. Intenta más tarde o verifica tus credenciales de Proxy/API.`;
    }
  }
};

handler.command = /^(instagramdl|instagram|igdl|ig|insta)$/i;
export default handler;

// --- FUNCIONES INTERNAS ---

async function instagramDownload(url) {
  const shortcode = extractShortcode(url);
  if (!shortcode) return null;

  try {
    // Sincronización previa (qe/sync) para validar la sesión ante IG
    await axios.get('https://i.instagram.com/api/v1/qe/sync/', { 
      httpsAgent: agent, 
      headers: commonHeaders 
    });

    // Petición de información del post
    const response = await axios.get(`https://i.instagram.com/api/v1/media/${shortcode}/info/`, {
      httpsAgent: agent,
      headers: {
        ...commonHeaders,
        'X-IG-Device-ID': `android-${(Math.random() * 1e18).toString(16)}`
      }
    });

    const items = response.data.items[0];
    let results = [];

    if (items.carousel_media) {
      results = items.carousel_media.map(m => ({
        type: m.media_type === 1 ? 'image' : 'video',
        url: m.media_type === 1 ? m.image_versions2.candidates[0].url : m.video_versions[0].url
      }));
    } else {
      results.push({
        type: items.media_type === 1 ? 'image' : 'video',
        url: items.media_type === 1 ? items.image_versions2.candidates[0].url : items.video_versions[0].url
      });
    }

    return results;
  } catch (e) {
    console.error("Error en Proxy Method:", e.message);
    return null;
  }
}

function extractShortcode(url) {
  const match = url.match(/(?:reels?|p|tv|s)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
