import axios from 'axios';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

/**
 * Código optimizado para KanaArima-MD
 * Solución al error de desestructuración en línea 971 del handler.js
 */
let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  // Verificación de seguridad para evitar 'undefined'
  if (!m || !conn) return;

  // Manejo de base de datos y traducciones
  const user = global.db && global.db.data ? global.db.data.users[m.sender] : {};
  const idioma = user?.language || global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.descargas_tiktok;
  } catch (e) {
    // Textos de respaldo si falla el archivo de idioma
    tradutor = { 
      texto1: 'Ingrese un enlace de TikTok', 
      texto2: 'Enlace no válido', 
      texto3: 'Descargando...',
      texto8: ['Usa', 'para audio'],
      texto9: 'Error al descargar'
    };
  }

  // Validaciones del mensaje
  if (!text) throw `*${tradutor.texto1}*\n\n*Ejemplo:* _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`;
  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) throw `*${tradutor.texto2}*`;

  await m.reply(`*[⏳] ${tradutor.texto3}*`);

  try {
    let videoUrl = null;

    // --- MÉTODO 1: SCRAPING (instatiktok.com) ---
    try {
      const links = await fetchDownloadLinks(args[0], 'tiktok');
      if (links && links.length > 0) {
        videoUrl = links.find(link => /hdplay|download/i.test(link)) || links[0];
      }
    } catch { 
      console.log("Fallo scraping, intentando APIs de respaldo...");
    }

    // --- MÉTODO 2: APIS ESTABLES (Fallback) ---
    if (!videoUrl) {
      const encoded = encodeURIComponent(args[0]);
      const apis = [
        `https://api.botcahx.eu.org/api/dowloader/tiktok?url=${encoded}&apikey=BrunoSobrino`,
        `https://api.vreden.my.id/api/tiktok?url=${encoded}`,
        `https://luminai.my.id/api/download/tiktok?url=${encoded}`
      ];

      for (const api of apis) {
        try {
          const res = await fetch(api);
          if (!res.ok) continue;
          const json = await res.json();
          videoUrl = json.data?.url || json.result?.video || json.result?.url || (Array.isArray(json.data) ? json.data[0].url : null);
          if (videoUrl && videoUrl.startsWith('http')) break;
        } catch { continue; }
      }
    }

    if (!videoUrl) throw new Error('No se pudo obtener el video');

    const cap = `✅ *TikTok descargado con éxito*\n\n${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}`;
    
    // Envío final del video
    await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption: cap }, { quoted: m });

  } catch (e) {
    console.error(e);
    m.reply(`*${tradutor.texto9}*`);
  }
};

handler.help = ['tiktok', 'tt'];
handler.tags = ['downloader'];
handler.command = /^(tt|tiktok|tiktokdl|ttdl)$/i;

export default handler;

// --- FUNCIÓN DE EXTRACCIÓN ---
async function fetchDownloadLinks(text, platform) {
  try {
    const SITE_URL = 'https://instatiktok.com/';
    const form = new URLSearchParams();
    form.append('url', text);
    form.append('platform', platform);

    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = res?.data?.html;
    if (!html) return null;

    const $ = cheerio.load(html);
    const links = [];
    $('a.btn[href^="http"]').each((_, el) => {
      const link = $(el).attr('href');
      if (link) links.push(link);
    });
    return links;
  } catch {
    return null;
  }
}
    if (!html) return null;

    const $ = cheerio.load(html);
    const links = [];
    $('a.btn[href^="http"]').each((_, el) => {
      const link = $(el).attr('href');
      if (link) links.push(link);
    });
    return links;
  } catch {
    return null;
  }
}
