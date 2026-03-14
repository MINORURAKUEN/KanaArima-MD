import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  // 1. Validación de texto
  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      

  // 2. Determinar tipo de contenido y formato de salida
  const isVideo = ['play2', 'ytmp4', 'ytmp4doc'].includes(command);
  const isDoc = ['ytmp4doc', 'ytmp3doc'].includes(command);
  const typeLabel = isVideo ? 'vídeo' : 'audio';

  // 3. Búsqueda en YouTube
  const result = await search(args.join(' '));
  if (!result) throw '❌ No se encontraron resultados para tu búsqueda.';

  const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
  
  // 4. Mensaje informativo con miniatura
  const body = `
${tradutor.texto2[0]} ${result.title}
${tradutor.texto2[1]} ${result.ago}
${tradutor.texto2[2]} ${result.duration.timestamp}
${tradutor.texto2[3]} ${formatNumber(result.views)}
${tradutor.texto2[4]} ${result.author.name}
${tradutor.texto2[5]} ${result.videoId}
${tradutor.texto2[7]} ${result.url}

*Enviando:* ${typeLabel} ${isDoc ? '(Documento)' : ''}
`.trim();

  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  // 5. Lógica de descarga y envío
  try {
    let downloadUrl = null;

    if (isVideo) {
      // --- Lógica para VIDEO ---
      try {
        const videodlp = await tools.downloader.ytmp4(youtubeUrl);
        downloadUrl = videodlp.download;
      } catch (err) {
        console.log('Falla tools.downloader, intentando Ruby-core...');
        const ruby = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(youtubeUrl)}`)).json();
        downloadUrl = ruby?.download?.url;
      }

      if (!downloadUrl) throw new Error('No se pudo obtener enlace de descarga');

      if (isDoc) {
        await conn.sendMessage(m.chat, { 
          document: { url: downloadUrl }, 
          fileName: `${result.title}.mp4`, 
          mimetype: 'video/mp4' 
        }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { 
          video: { url: downloadUrl }, 
          fileName: `${result.title}.mp4`, 
          mimetype: 'video/mp4' 
        }, { quoted: m });
      }

    } else {
      // --- Lógica para AUDIO ---
      try {
        const audiodlp = await tools.downloader.ytmp3(youtubeUrl);
        downloadUrl = audiodlp.download;
      } catch (err) {
        console.log('Falla tools.downloader, intentando Ruby-core...');
        const ruby = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(youtubeUrl)}`)).json();
        downloadUrl = ruby?.download?.url;
      }

      if (!downloadUrl) throw new Error('No se pudo obtener enlace de descarga');

      if (isDoc) {
        await conn.sendMessage(m.chat, { 
          document: { url: downloadUrl }, 
          fileName: `${result.title}.mp3`, 
          mimetype: 'audio/mpeg' 
        }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { 
          audio: { url: downloadUrl }, 
          mimetype: 'audio/mpeg' 
        }, { quoted: m });
      }
    }

  } catch (error) {
    console.error(error);
    conn.reply(m.chat, tradutor.texto6 || '❌ Error al procesar la descarga.', m);
  }
};

handler.help = ['play', 'play2', 'playaudio', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc'];
handler.tags = ['downloader'];
handler.command = /^(play|play2|playaudio|ytmp3|ytmp4|ytmp3doc|ytmp4doc)$/i;

export default handler;

// Funciones auxiliares
async function search(query, options = {}) {
  const searchRes = await yts.search({ query, hl: 'es', gl: 'ES', ...options });
  return searchRes.videos[0];
}

function formatNumber(num) {
  return num ? num.toLocaleString() : '0';
}
