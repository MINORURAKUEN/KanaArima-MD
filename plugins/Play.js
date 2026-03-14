import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      

  // Configuración de la API
  const apiKey = "causa-0e3eacf90ab7be15";
  const baseUrl = "https://rest.apicausas.xyz/api/v1/descargas/youtube";

  // Determinar tipo de descarga y formato
  const isVideo = ['play2', 'ytmp4', 'ytmp4doc'].includes(command);
  const isDoc = ['ytmp4doc', 'ytmp3doc'].includes(command);
  const downloadType = isVideo ? 'video' : 'audio';

  // 1. Búsqueda en YouTube
  const result = await search(args.join(' '));
  if (!result) throw '❌ No se encontraron resultados.';

  const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
  
  // 2. Mensaje informativo
  const body = `
${tradutor.texto2[0]} ${result.title}
${tradutor.texto2[2]} ${result.duration.timestamp}
${tradutor.texto2[4]} ${result.author.name}
${tradutor.texto2[7]} ${result.url}

*Modo:* ${downloadType.toUpperCase()} ${isDoc ? '(Documento)' : ''}
`.trim();

  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  // 3. Descarga vía API Causas
  try {
    const fetchUrl = `${baseUrl}?apikey=${apiKey}&url=${encodeURIComponent(youtubeUrl)}&type=${downloadType}`;
    const response = await fetch(fetchUrl);
    
    // Validar si la respuesta es JSON válido
    const textRes = await response.text();
    let json;
    try {
      json = JSON.parse(textRes);
    } catch (e) {
      throw new Error("Respuesta de API no válida");
    }

    // Extraer enlace de descarga (ajustado según estructura común de estas APIs)
    const downloadUrl = json.status === 200 || json.status === true ? (json.result?.download?.url || json.result?.url || json.url) : null;

    if (!downloadUrl) throw 'no_url';

    // 4. Envío del archivo
    if (isVideo) {
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
    console.error("Error en API Causas:", error);
    conn.reply(m.chat, '❌ Hubo un fallo al obtener el archivo de la API. Verifica tu API Key o intenta más tarde.', m);
  }
};

handler.help = ['play', 'play2', 'playaudio', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc'];
handler.tags = ['downloader'];
handler.command = /^(play|play2|playaudio|ytmp3|ytmp4|ytmp3doc|ytmp4doc)$/i;

export default handler;

async function search(query, options = {}) {
  const searchRes = await yts.search({ query, hl: 'es', gl: 'ES', ...options });
  return searchRes.videos[0];
}

function formatNumber(num) {
  return num ? num.toLocaleString() : '0';
}
