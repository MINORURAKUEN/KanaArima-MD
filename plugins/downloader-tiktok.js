import axios from 'axios';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

const handler = async (client, m, { conn, text, args, usedPrefix, command }) => {
  // Configuración de idioma y mensajes (basado en tu primer código)
  const datas = global;
  const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let tradutor;
  try {
    const fileContent = fs.readFileSync(`./src/languages/${idioma}.json`);
    tradutor = JSON.parse(fileContent).plugins.descargas_tiktok;
  } catch {
    // Fallback manual si no encuentra el archivo de traducción
    tradutor = { 
        texto1: 'Ingresa un enlace de TikTok.', 
        texto2: 'Enlace no válido.',
        texto9: 'Error al procesar la solicitud.' 
    };
  }

  if (!text) return m.reply(`🍒 ${tradutor.texto1}\nEjemplo: _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`);

  // Detectar si es un enlace o una búsqueda
  const isUrl = /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text);

  try {
    let data;

    if (isUrl) {
      // ESCENARIO 1: DESCARGA POR ENLACE DIRECTO
      // Intentamos primero con tu API externa (url2)
      const apiUrl = `${global.api?.url2 || ''}/dl/tiktok?url=${text}&key=${global.api?.key2 || ''}`;
      const res = await fetch(apiUrl);
      
      if (res.ok) {
        const json = await res.json();
        data = json.data;
      }

      // Si la API falla, usamos el Scraper manual (tu función fetchDownloadLinks) como fallback
      if (!data) {
        const links = await fetchDownloadLinks(text);
        if (links && links.length > 0) {
          const downloadUrl = links.find(link => /hdplay/.test(link)) || links[0];
          return await client.sendMessage(m.chat, { video: { url: downloadUrl }, caption: '✅ Video descargado con éxito' }, { quoted: m });
        }
      }
    } else {
      // ESCENARIO 2: BÚSQUEDA POR TEXTO (Query)
      const apiUrl = `${global.api?.url2}/search/tiktok?query=${encodeURIComponent(text)}&key=${global.api?.key2}`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      data = json.data?.[0]; // Tomamos el primer resultado
    }

    if (!data) throw new Error('No results');

    // Construcción del Caption Estético
    const { title, dl, duration, author, stats, music } = data;
    const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ

𖣣ֶㅤ֯⌗ 🌽  ׄ ⬭ *Título:* ${title || 'Sin título'}
𖣣ֶㅤ֯⌗ 🍒  ׄ ⬭ *Autor:* ${author?.nickname || 'Desconocido'}
𖣣ֶㅤ֯⌗ 🍓  ׄ ⬭ *Duración:* ${duration || 'N/A'}
𖣣ֶㅤ֯⌗ 🦩  ׄ ⬭ *Likes:* ${(stats?.likes || 0).toLocaleString()}
𖣣ֶㅤ֯⌗ 🌾  ׄ ⬭ *Vistas:* ${(stats?.views || 0).toLocaleString()}
𖣣ֶㅤ֯⌗ 🪶  ׄ ⬭ *Audio:* ${music?.title || 'Original'}`.trim();

    // Verificación de tipo de contenido y envío
    const head = await fetch(dl, { method: 'HEAD' });
    const contentType = head.headers.get('content-type') || '';

    if (contentType.includes('video')) {
      await client.sendMessage(m.chat, { video: { url: dl }, caption }, { quoted: m });
    } else {
      await m.reply(`🌽 El contenido no es compatible o no es un video.`);
    }

  } catch (e) {
    console.error(e);
    m.reply(`${tradutor.texto9}`);
  }
};

// Función Scraper Manual (Tu lógica original de instatiktok)
async function fetchDownloadLinks(url) {
    try {
        const SITE_URL = 'https://instatiktok.com/';
        const form = new URLSearchParams();
        form.append('url', url);
        form.append('platform', 'tiktok');
        form.append('siteurl', SITE_URL);

        const res = await axios.post(`${SITE_URL}api`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (res.data?.status !== 'success') return null;
        
        const $ = cheerio.load(res.data.html);
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

handler.command = /^(tiktok|ttdl|tiktokdl|tt|tiktokaudio)$/i;
handler.category = 'downloader';

export default handler;
