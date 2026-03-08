import axios from 'axios';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

// Quitamos las llaves { } del segundo argumento para evitar el error de "undefined"
let handler = async (m, _context) => {
  // Intentamos obtener 'conn' de donde sea que esté (this o el contexto)
  const conn = _context?.conn || m.conn || this;
  
  // Si no hay conexión o mensaje, salimos sin error
  if (!m || !conn) return;

  // Variables de apoyo seguras
  const text = _context?.text || m.text || '';
  const args = _context?.args || text.trim().split` `.slice(1) || [];
  const usedPrefix = _context?.usedPrefix || (text.match(/^[./!#]/) ? text[0] : '.');
  const command = _context?.command || 'tiktok';

  // Manejo de traducciones (con protección si no existe global.db)
  const user = global.db?.data?.users?.[m.sender] || {};
  const idioma = user.language || global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.descargas_tiktok;
  } catch (e) {
    tradutor = { 
      texto1: 'Ingrese un enlace de TikTok', 
      texto2: 'Enlace no válido', 
      texto3: 'Descargando...',
      texto8: ['Usa', 'para audio'],
      texto9: 'Error al descargar'
    };
  }

  // Validación de link
  if (!text) throw `*${tradutor.texto1}*\n\n*Ejemplo:* _${usedPrefix + command} https://vt.tiktok.com/ZS123/_`;
  if (!/tiktok\.com/i.test(text)) throw `*${tradutor.texto2}*`;

  await m.reply(`*[⏳] ${tradutor.texto3}*`);

  try {
    let videoUrl = null;

    // MÉTODO 1: SCRAPING (instatiktok.com)
    try {
      const links = await fetchDownloadLinks(text, 'tiktok');
      if (links && links.length > 0) {
        videoUrl = links.find(link => /hdplay|download/i.test(link)) || links[0];
      }
    } catch { }

    // MÉTODO 2: APIS (Fallback)
    if (!videoUrl) {
      const encoded = encodeURIComponent(text);
      const apis = [
        `https://api.botcahx.eu.org/api/dowloader/tiktok?url=${encoded}&apikey=BrunoSobrino`,
        `https://api.vreden.my.id/api/tiktok?url=${encoded}`,
        `https://luminai.my.id/api/download/tiktok?url=${encoded}`
      ];

      for (const api of apis) {
        try {
          const res = await fetch(api);
          const json = await res.json();
          videoUrl = json.data?.url || json.result?.video || json.result?.url || (Array.isArray(json.data) ? json.data[0].url : null);
          if (videoUrl && videoUrl.startsWith('http')) break;
        } catch { continue; }
      }
    }

    if (!videoUrl) throw new Error();

    const cap = `✅ *TikTok descargado*\n\n${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}`;
    await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption: cap }, { quoted: m });

  } catch (e) {
    m.reply(`*${tradutor.texto9}*`);
  }
};

handler.help = ['tiktok', 'tt'];
handler.tags = ['downloader'];
handler.command = /^(tt|tiktok|tiktokdl|ttdl)$/i;

export default handler;

// Función de apoyo para scraping
async function fetchDownloadLinks(url, platform) {
  try {
    const SITE_URL = 'https://instatiktok.com/';
    const form = new URLSearchParams();
    form.append('url', url);
    form.append('platform', platform);
    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res?.data?.html;
    if (!html) return null;
    const $ = cheerio.load(html);
    const links = [];
    $('a.btn[href^="http"]').each((_, el) => { links.push($(el).attr('href')); });
    return links;
  } catch { return null; }
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
