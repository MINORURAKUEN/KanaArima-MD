import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  
  let type = command === 'play' ? 'mp3' : 'mp4';
  let additionalText = type === 'mp3' ? 'audio' : 'vídeo';

  // 1. Buscar el video
  const result = await search(args.join(' '));
  if (!result) throw 'No se encontraron resultados.';

  const body = `${tradutor.texto2[0]} ${result.title}\n${tradutor.texto2[1]} ${result.ago}\n${tradutor.texto2[2]} ${result.duration.timestamp}\n${tradutor.texto2[3]} ${formatNumber(result.views)}\n${tradutor.texto2[4]} ${result.author.name}\n${tradutor.texto2[7]} ${result.url}\n\n${tradutor.texto2[9]} ${additionalText}`.trim();
  
  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  const youtubeUrl = result.url;

  // 2. Lista de APIs para Rotación
  // Algunas APIs usan parámetros distintos, aquí adaptamos la lógica
  const apiEndpoints = [
    { name: 'Interno', type: 'internal' },
    { name: 'Ruby-Core', url: `https://ruby-core.vercel.app/api/download/youtube/${type}?url=${encodeURIComponent(youtubeUrl)}` },
    { name: 'Loco-API', url: `https://api.locogamer.com/api/yt${type}?url=${encodeURIComponent(youtubeUrl)}` },
    { name: 'Alternative-DL', url: `https://api.bot-whatsapp.tech/download/yt${type}?url=${encodeURIComponent(youtubeUrl)}` }
  ];

  let success = false;

  for (const api of apiEndpoints) {
    try {
      console.log(`--- Intentando descargar con: ${api.name} ---`);
      let downloadUrl = '';

      if (api.type === 'internal') {
        // Intento con tu tools.downloader original
        const dl = await tools.downloader[type === 'mp3' ? 'ytmp3' : 'ytmp4'](youtubeUrl);
        downloadUrl = dl.download;
      } else {
        // Intento con APIs externas
        const res = await fetch(api.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const data = await res.json();
        // Ajustamos según el formato común de respuesta { status: true, download: { url: '...' } }
        downloadUrl = data?.download?.url || data?.result || data?.url;
      }

      if (downloadUrl) {
        await conn.sendMessage(m.chat, { 
          [type === 'mp3' ? 'audio' : 'video']: { url: downloadUrl }, 
          mimetype: type === 'mp3' ? "audio/mpeg" : "video/mp4",
          fileName: `${result.title}.${type}`
        }, { quoted: m });
        
        success = true;
        break; // Detener el ciclo si la descarga fue exitosa
      }
    } catch (err) {
      console.error(`❌ Error en ${api.name}:`, err.message);
      continue; // Probar la siguiente API
    }
  }

  if (!success) {
    conn.reply(m.chat, "⚠️ Todas las fuentes de descarga fallaron. Intenta de nuevo más tarde o con otro video.", m);
  }
};

handler.help = ['play', 'play2'];
handler.tags = ['downloader'];
handler.command = ['play', 'play2'];

export default handler;

async function search(query, options = {}) {
  const searchRes = await yts.search({ query, hl: 'es', gl: 'ES', ...options });
  return searchRes.videos[0];
}

function formatNumber(num) {
  return num.toLocaleString();
}
