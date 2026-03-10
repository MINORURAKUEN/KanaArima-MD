import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  
  // Lectura del archivo de idioma
  let _translate;
  try {
    _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  } catch (e) {
    _translate = JSON.parse(fs.readFileSync(`./src/languages/es.json`)); // Fallback a español
  }
  
  const tradutor = _translate.plugins.descargas_play;

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  
  let additionalText = command === 'play' ? 'audio' : 'vídeo';

  // Buscar el video
  const result = await search(text);
  if (!result) throw '❌ No se encontraron resultados.';

  const body = `
${tradutor.texto2[0]} ${result.title}
${tradutor.texto2[1]} ${result.ago}
${tradutor.texto2[2]} ${result.duration.timestamp}
${tradutor.texto2[3]} ${formatNumber(result.views)}
${tradutor.texto2[4]} ${result.author.name}
${tradutor.texto2[5]} ${result.videoId}
${tradutor.texto2[6]} ${result.type}
${tradutor.texto2[7]} ${result.url}
${tradutor.texto2[8]} ${result.author.url}

${tradutor.texto2[9]} ${additionalText}, ${tradutor.texto2[10]}`.trim();

  // Enviar miniatura e info
  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  // Lógica de descarga
  if (command === 'play') {
    try {
      // Intento 1: Herramientas internas
      const audiodlp = await global.tools.downloader.ytmp3(result.url);
      const downloader = audiodlp.download;
      await conn.sendMessage(m.chat, { audio: { url: downloader }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch (error) {
      console.log(' Fallback a Ruby-core mp3...');
      try {
        const res = await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(result.url)}`);
        const ruby = await res.json();
        if (ruby?.status && ruby?.download?.url) {
          await conn.sendMessage(m.chat, { audio: { url: ruby.download.url }, mimetype: "audio/mpeg" }, { quoted: m });
        } else {
          conn.reply(m.chat, tradutor.texto6, m);
        }
      } catch (err2) {
        conn.reply(m.chat, tradutor.texto6, m);
      }
    }
  }

  if (command === 'play2') {
    try {
      // Intento 1: Herramientas internas
      const videodlp = await global.tools.downloader.ytmp4(result.url);
      const downloader = videodlp.download;
      await conn.sendMessage(m.chat, { video: { url: downloader }, mimetype: "video/mp4" }, { quoted: m });
    } catch (error) {
      console.log(' Fallback a Ruby-core mp4...');
      try {
        const res = await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(result.url)}`);
        const ruby = await res.json();
        if (ruby?.status && ruby?.download?.url) {
          await conn.sendMessage(m.chat, { video: { url: ruby.download.url }, mimetype: "video/mp4" }, { quoted: m });
        } else {
          conn.reply(m.chat, tradutor.texto6, m);
        }
      } catch (err2) {
        conn.reply(m.chat, tradutor.texto6, m);
      }
    }
  }
};

handler.help = ['play', 'play2'];
handler.tags = ['downloader'];
handler.command = /^(play|play2)$/i; // Esto activa ambos comandos

export default handler;

async function search(query, options = {}) {
  const searchRes = await yts.search({ query, hl: 'es', gl: 'ES', ...options });
  return searchRes.videos[0];
}

function formatNumber(num) {
  return num.toLocaleString('es-ES');
}
