import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  
  // Sistema de traducción con protección
  let _translate;
  try {
    _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  } catch {
    _translate = JSON.parse(fs.readFileSync(`./src/languages/es.json`));
  }
  const tradutor = _translate.plugins.descargas_play;

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  
  const isVideo = command === 'play2';
  const result = await search(text);
  if (!result) throw '❌ No se encontraron resultados.';

  const body = `*TÍTULO:* ${result.title}\n*DURACIÓN:* ${result.duration.timestamp}\n*VISTAS:* ${formatNumber(result.views)}\n*ENLACE:* ${result.url}\n\n> _Descargando ${isVideo ? 'video' : 'audio'}..._`.trim();

  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  const url = result.url;

  if (!isVideo) {
    // --- LÓGICA PARA AUDIO (MP3) CON MULTI-API ---
    try {
      // API 1: Local / Herramientas del bot
      const res = await global.tools.downloader.ytmp3(url);
      await conn.sendMessage(m.chat, { audio: { url: res.download }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch {
      try {
        // API 2: Ruby-Core
        const res = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(url)}`)).json();
        if (!res.status) throw 'fail';
        await conn.sendMessage(m.chat, { audio: { url: res.download.url }, mimetype: "audio/mpeg" }, { quoted: m });
      } catch {
        try {
          // API 3: Akuari
          const res = await (await fetch(`https://api.akuari.my.id/downloader/youtube3?link=${encodeURIComponent(url)}`)).json();
          await conn.sendMessage(m.chat, { audio: { url: res.result.mp3 }, mimetype: "audio/mpeg" }, { quoted: m });
        } catch {
          try {
            // API 4: Dylux (API de respaldo común)
            const res = await (await fetch(`https://api.dhammadigital.com/api/ytv7?url=${url}`)).json();
            await conn.sendMessage(m.chat, { audio: { url: res.result.dl_link }, mimetype: "audio/mpeg" }, { quoted: m });
          } catch {
            conn.reply(m.chat, '❌ Todas las fuentes fallaron. El video podría tener restricciones de edad o copyright.', m);
          }
        }
      }
    }
  } else {
    // --- LÓGICA PARA VIDEO (MP4) CON MULTI-API ---
    try {
      // API 1: Local
      const res = await global.tools.downloader.ytmp4(url);
      await conn.sendMessage(m.chat, { video: { url: res.download }, mimetype: "video/mp4" }, { quoted: m });
    } catch {
      try {
        // API 2: Ruby-Core
        const res = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(url)}`)).json();
        if (!res.status) throw 'fail';
        await conn.sendMessage(m.chat, { video: { url: res.download.url }, mimetype: "video/mp4" }, { quoted: m });
      } catch {
        try {
          // API 3: Alyasany (A veces requiere API Key, pero suele tener free tier)
          const res = await (await fetch(`https://api.alyasany.my.id/api/ytmp4?url=${url}`)).json();
          await conn.sendMessage(m.chat, { video: { url: res.result.download.url }, mimetype: "video/mp4" }, { quoted: m });
        } catch {
          conn.reply(m.chat, '❌ No se pudo descargar el video. Intenta con un enlace más corto.', m);
        }
      }
    }
  }
};

handler.help = ['play', 'play2'];
handler.tags = ['downloader'];
handler.command = /^(play|play2)$/i;

export default handler;

async function search(query) {
  const searchRes = await yts.search({ query, hl: 'es', gl: 'ES' });
  return searchRes.videos[0];
}

function formatNumber(num) {
  return num.toLocaleString('es-ES');
}
