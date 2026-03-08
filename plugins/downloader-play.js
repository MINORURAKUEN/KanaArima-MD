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

  // 1. Buscar el video en YouTube
  const result = await search(args.join(' '));
  if (!result) throw 'No se encontraron resultados.';

  const body = `${tradutor.texto2[0]} ${result.title}\n${tradutor.texto2[1]} ${result.ago}\n${tradutor.texto2[2]} ${result.duration.timestamp}\n${tradutor.texto2[3]} ${formatNumber(result.views)}\n${tradutor.texto2[4]} ${result.author.name}\n${tradutor.texto2[7]} ${result.url}\n\n${tradutor.texto2[9]} ${additionalText}`.trim();
  
  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  const youtubeUrl = result.url;

  // 2. Rotación de APIs especializadas en YouTube (Bypass Cloudflare)
  const apiEndpoints = [
    { name: 'API 1 (Direct)', url: `https://api.zenon.io/download/youtube?url=${encodeURIComponent(youtubeUrl)}&format=${type}` },
    { name: 'API 2 (Ruby)', url: `https://ruby-core.vercel.app/api/download/youtube/${type}?url=${encodeURIComponent(youtubeUrl)}` },
    { name: 'API 3 (Aggregator)', url: `https://api.vyt-loader.com/v2/convert?url=${encodeURIComponent(youtubeUrl)}&type=${type}` }
  ];

  

  let success = false;

  for (const api of apiEndpoints) {
    try {
      console.log(`--- Intentando con fuente: ${api.name} ---`);
      
      const res = await fetch(api.url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const data = await res.json();
      
      // Mapeo flexible de respuestas según la API
      const downloadUrl = data?.download?.url || data?.result?.url || data?.url || data?.link;

      if (downloadUrl) {
        await conn.sendMessage(m.chat, { 
          [type === 'mp3' ? 'audio' : 'video']: { url: downloadUrl }, 
          mimetype: type === 'mp3' ? "audio/mpeg" : "video/mp4",
          fileName: `${result.title}.${type}`
        }, { quoted: m });
        
        success = true;
        break; 
      }
    } catch (err) {
      console.error(`❌ Error en fuente ${api.name}:`, err.message);
      continue; 
    }
  }

  if (!success) {
    conn.reply(m.chat, "⚠️ No pudimos procesar la descarga de YouTube. Intenta con otro término de búsqueda.", m);
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
