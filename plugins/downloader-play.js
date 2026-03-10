import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  
  const isVideo = command === 'play2';
  const additionalText = isVideo ? 'vídeo' : 'audio';

  const result = await search(args.join(' '))
  if (!result) throw 'No se encontraron resultados.';

  const body = `${tradutor.texto2[0]} ${result.title}\n${tradutor.texto2[1]} ${result.ago}\n${tradutor.texto2[2]} ${result.duration.timestamp}\n${tradutor.texto2[3]} ${formatNumber(result.views)}\n${tradutor.texto2[4]} ${result.author.name}\n${tradutor.texto2[5]} ${result.videoId}\n${tradutor.texto2[6]} ${result.type}\n${tradutor.texto2[7]} ${result.url}\n${tradutor.texto2[8]} ${result.author.url}\n\n${tradutor.texto2[9]} ${additionalText}, ${tradutor.texto2[10]}`.trim();
  
  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  const videoUrl = result.url;
  let downloadUrl = null;

  try {
    // --- INTENTO CON API SIPUTZX (Principal) ---
    const apiType = isVideo ? 'ytmp4' : 'ytmp3';
    const res = await fetch(`https://api.siputzx.my.id/api/d/${apiType}?url=${encodeURIComponent(videoUrl)}`);
    const json = await res.json();
    
    if (json.status && json.data?.dl) {
        downloadUrl = json.data.dl;
    } else {
        // --- FALLBACKS SI FALLA LA PRIMERA ---
        if (!isVideo) {
            // Intento Ryzendesu para MP3
            const resRyzen = await fetch(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`);
            const jsonRyzen = await resRyzen.json();
            downloadUrl = jsonRyzen.url || jsonRyzen.link;
        } else {
            // Intento Deliriuss para MP4
            const resDel = await fetch(`https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(videoUrl)}`);
            const jsonDel = await resDel.json();
            downloadUrl = jsonDel.data?.download?.url || jsonDel.downloadUrl;
        }
    }

    if (!downloadUrl) throw 'No se pudo obtener el enlace de descarga.';

    // --- ENVÍO DEL ARCHIVO ---
    const messageOptions = isVideo 
        ? { video: { url: downloadUrl }, fileName: `${result.title}.mp4`, mimetype: 'video/mp4' }
        : { audio: { url: downloadUrl }, fileName: `${result.title}.mp3`, mimetype: 'audio/mpeg' };

    await conn.sendMessage(m.chat, messageOptions, { quoted: m });

  } catch (error) {
    console.error('Error en la descarga:', error);
    conn.reply(m.chat, tradutor.texto6, m);
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
  return num ? num.toLocaleString() : '0';
  }
