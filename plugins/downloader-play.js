import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  let additionalText = '';
  if (['play'].includes(command)) {
    additionalText = 'audio';
  } else if (['play2'].includes(command)) {
    additionalText = 'vídeo';
  }

  const regex = "https://www.youtube.com/watch?v="
  const result = await search(args.join(' '))
  const videoUrl = regex + result.videoId
  
  const body = `${tradutor.texto2[0]} ${result.title}\n${tradutor.texto2[1]} ${result.ago}\n${tradutor.texto2[2]} ${result.duration.timestamp}\n${tradutor.texto2[3]} ${formatNumber(result.views)}\n${tradutor.texto2[4]} ${result.author.name}\n${tradutor.texto2[5]} ${result.videoId}\n${tradutor.texto2[6]} ${result.type}\n${tradutor.texto2[7]} ${result.url}\n${tradutor.texto2[8]} ${result.author.url}\n\n${tradutor.texto2[9]} ${additionalText}, ${tradutor.texto2[10]}`.trim();
  
  conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  if (command === 'play') {
    try {
      const audiodlp = await tools.downloader.ytmp3(videoUrl);
      conn.sendMessage(m.chat, { audio: { url: audiodlp.download }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch {
      try {
        // Fallback 1: EvoGB
        const res = await fetch(`https://api.evogb.org/api/ytmp3?url=${videoUrl}&apikey=evogb-9ivSW7OY`)
        const json = await res.json()
        conn.sendMessage(m.chat, { audio: { url: json.result.url }, mimetype: "audio/mpeg" }, { quoted: m });
      } catch {
        try {
          // Fallback 2: ApiCausas
          const res = await fetch(`https://rest.apicausas.xyz/api/ytmp3?url=${videoUrl}&apikey=causa-0e3eacf90ab7be15`)
          const json = await res.json()
          conn.sendMessage(m.chat, { audio: { url: json.result.url }, mimetype: "audio/mpeg" }, { quoted: m });
        } catch {
          // Fallback 3: Ruby
          const ruby = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(videoUrl)}`)).json();
          if (ruby?.status && ruby?.download?.url) {
            conn.sendMessage(m.chat, { audio: { url: ruby.download.url }, mimetype: "audio/mpeg" }, { quoted: m });
          } else {
            conn.reply(m.chat, tradutor.texto6, m);
          }
        }
      }
    }
  }

  if (command === 'play2') {
    try {
      const videodlp = await tools.downloader.ytmp4(videoUrl);
      conn.sendMessage(m.chat, { video: { url: videodlp.download }, mimetype: "video/mp4" }, { quoted: m });
    } catch {
      try {
        // Fallback 1: EvoGB
        const res = await fetch(`https://api.evogb.org/api/ytmp4?url=${videoUrl}&apikey=evogb-9ivSW7OY`)
        const json = await res.json()
        conn.sendMessage(m.chat, { video: { url: json.result.url }, mimetype: "video/mp4" }, { quoted: m });
      } catch {
        try {
          // Fallback 2: ApiCausas
          const res = await fetch(`https://rest.apicausas.xyz/api/ytmp4?url=${videoUrl}&apikey=causa-0e3eacf90ab7be15`)
          const json = await res.json()
          conn.sendMessage(m.chat, { video: { url: json.result.url }, mimetype: "video/mp4" }, { quoted: m });
        } catch {
          // Fallback 3: Ruby
          const ruby = await (await fetch(`https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(videoUrl)}`)).json();
          if (ruby?.status && ruby?.download?.url) {
            conn.sendMessage(m.chat, { video: { url: ruby.download.url }, mimetype: "video/mp4" }, { quoted: m });
          } else {
            conn.reply(m.chat, tradutor.texto6, m);
          }
        }
      }
    }
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

