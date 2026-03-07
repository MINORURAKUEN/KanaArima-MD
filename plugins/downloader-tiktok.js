import axios from 'axios';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

export default {
  command: ['tiktok', 'tt', 'ttdl', 'tiktokdl'],
  category: 'downloader',
  run: async (client, m, { args, command, usedPrefix }) => {
    // 1. Configuración de Idioma y Traducciones
    const datas = global;
    const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
    let tradutor;
    try {
        const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
        tradutor = _translate.plugins.descargas_tiktok;
    } catch {
        tradutor = { 
          texto1: '✿ Ingresa un enlace de TikTok.', 
          texto3: '📥 Procesando...', 
          texto8: ['Usa', 'para audio'], 
          texto9: '❌ Error al obtener el video.' 
        };
    }

    if (!args.length) return m.reply(tradutor.texto1);

    const urls = args.filter(arg => /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(arg));
    
    // Servidores de respaldo (Failover)
    const backupServers = [
      { name: 'Masha API', url: global.masha || 'https://api.masha.xyz' }, 
      { name: 'Alya API', url: global.alya || 'https://api.alya.xyz' },
      { name: 'Masachika API', url: global.masachika || 'https://api.masachika.xyz' }
    ].sort(() => Math.random() - 0.5);

    // --- FUNCIÓN PARA DESCARGAR (Lógica combinada) ---
    const downloadVideo = async (url) => {
      // Intento 1: API Principal
      try {
        const res = await fetch(`${global.api?.url}/dl/tiktok?url=${url}&key=${global.api?.key}`);
        const json = await res.json();
        if (json.data) return json.data;
      } catch {}

      // Intento 2: Scraper Manual (Instatiktok)
      try {
        const manualLinks = await fetchManualLinks(url);
        if (manualLinks) {
          const dl = manualLinks.find(link => /hdplay/.test(link)) || manualLinks[0];
          if (dl) return { dl, title: 'TikTok Video', backup: 'Web Scraper' };
        }
      } catch {}

      // Intento 3: Servidores de respaldo
      for (let server of backupServers) {
        try {
          const res = await fetch(`${server.url}/Tiktok_videodl?url=${encodeURIComponent(url)}`);
          if (!res.ok) continue;
          const json = await res.json();
          const videoUrl = json.video_url || json.result?.video || json.data?.url;
          if (videoUrl) return { dl: videoUrl, title: 'TikTok Video', backup: server.name };
        } catch {}
      }
      return null;
    };

    // --- LÓGICA PRINCIPAL ---
    if (urls.length) {
      await m.reply(tradutor.texto3);
      
      if (urls.length > 1) {
        const medias = [];
        for (const url of urls.slice(0, 10)) {
          const data = await downloadVideo(url);
          if (data) {
            medias.push({ type: 'video', data: { url: data.dl || data.video_url }, caption: `✅ Enlace: ${url}` });
          }
        }
        if (medias.length) return await client.sendAlbumMessage(m.chat, medias, { quoted: m });
        else return m.reply(tradutor.texto9);
      } else {
        const data = await downloadVideo(urls[0]);
        if (!data) return m.reply(tradutor.texto9);

        const caption = genCaption(data, tradutor, usedPrefix);
        await client.sendMessage(m.chat, { video: { url: data.dl || data.video_url }, caption }, { quoted: m });
      }

    } else {
      // BÚSQUEDA POR TEXTO
      const query = args.join(" ");
      try {
        await m.reply(tradutor.texto3);
        const res = await fetch(`${global.api?.url}/search/tiktok?query=${encodeURIComponent(query)}&key=${global.api?.key}`);
        const json = await res.json();
        const results = json.data;

        if (!results || results.length === 0) return m.reply(`❖ No se encontraron resultados.`);
        const data = results[0];
        const caption = genCaption(data, tradutor, usedPrefix);
        await client.sendMessage(m.chat, { video: { url: data.dl }, caption }, { quoted: m });
      } catch {
        m.reply(tradutor.texto9);
      }
    }
  },
};

// Auxiliar: Scraper Manual
async function fetchManualLinks(url) {
    const SITE_URL = 'https://instatiktok.com/';
    const form = new URLSearchParams({ url, platform: 'tiktok', siteurl: SITE_URL });
    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res?.data?.html;
    if (!html) return null;
    const $ = cheerio.load(html);
    const links = [];
    $('a.btn[href^="http"]').each((_, el) => { links.push($(el).attr('href')); });
    return links.length ? links : null;
}

// Generador de Caption
function genCaption(data, tradutor, usedPrefix) {
  const { title = 'TikTok Video', author = {}, stats = {}, music = {}, backup } = data;
  return `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload\n\n` +
         `𖣣ֶㅤ֯⌗ ✿ *Título:* ${title}\n` +
         `𖣣ֶㅤ֯⌗ ★ *Autor:* ${author.nickname || 'User'}\n` +
         `𖣣ֶㅤ֯⌗ ♡ *Likes:* ${(stats.likes || 0).toLocaleString()}\n` +
         `${backup ? `𖣣ֶㅤ֯⌗ ⚙️ *Source:* ${backup}` : ''}\n\n` +
         `_${tradutor.texto8[0]} *${usedPrefix}tomp3* ${tradutor.texto8[1]}_`;
}
