import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'
import axios from 'axios'
import crypto from 'crypto'
import chalk from 'chalk' // Para que los errores se vean en color en la terminal

// --- Lógica de OGMP3 integrada ---
const ogmp3 = {
  api: {
    base: "https://api3.apiapi.lat",
    endpoints: ["https://api5.apiapi.lat", "https://api.apiapi.lat", "https://api3.apiapi.lat"]
  },
  utils: {
    hash: () => crypto.randomBytes(16).toString('hex'),
    encoded: (str) => str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 1)).join(''),
    enc_url: (url) => url.split('').map(c => c.charCodeAt(0)).reverse().join(',')
  },
  async download(link, isVideo = false) {
    try {
      const base = this.api.endpoints[Math.floor(Math.random() * this.api.endpoints.length)];
      const c = this.utils.hash();
      const d = this.utils.hash();
      const res = await axios.post(`${base}/${c}/init/${this.utils.enc_url(link)}/${d}/`, {
        data: this.utils.encoded(link),
        format: isVideo ? "1" : "0",
        mp4Quality: isVideo ? "720" : null,
        mp3Quality: isVideo ? null : "320"
      }, { headers: { 'origin': 'https://ogmp3.lat', 'user-agent': 'Postify/1.0.0' }, timeout: 10000 });
      if (res.data?.s === "C") return { url: `${this.api.base}/${this.utils.hash()}/download/${this.utils.encoded(res.data.i)}/${this.utils.hash()}/` };
      return null;
    } catch (e) {
      console.log(chalk.red(`[OGMP3 ERROR]: ${e.message}`));
      return null;
    }
  }
};

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_play

  if (!text) throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`;      
  
  const isVideo = command === 'play2';
  const additionalText = isVideo ? 'vídeo' : 'audio';

  console.log(chalk.cyan(`\n[LOG]: Iniciando búsqueda para: "${text}" (${additionalText})`));

  // 1. Búsqueda
  const result = await search(args.join(' '))
  if (!result) {
    console.log(chalk.red(`[ERROR]: No se encontraron resultados en YouTube.`));
    return conn.reply(m.chat, '❌ No se encontraron resultados.', m);
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`
  console.log(chalk.green(`[OK]: Video encontrado: "${result.title}"`));
  
  const body = `${tradutor.texto2[0]} ${result.title}\n${tradutor.texto2[1]} ${result.ago}\n${tradutor.texto2[2]} ${result.duration.timestamp}\n${tradutor.texto2[3]} ${formatNumber(result.views)}\n${tradutor.texto2[4]} ${result.author.name}\n${tradutor.texto2[5]} ${result.videoId}\n${tradutor.texto2[7]} ${youtubeUrl}\n\n${tradutor.texto2[9]} ${additionalText}`.trim();
  
  await conn.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: body }, { quoted: m });

  let downloadUrl = null;
  let method = "";

  // --- CASCADA CON LOGS ---

  // 1. EvoGB
  console.log(chalk.yellow(`[TRY]: Intentando con EvoGB...`));
  try {
    const evogb = await (await fetch(`https://api.evogb.org/download?query=${encodeURIComponent(youtubeUrl)}&type=${isVideo?'video':'audio'}&apikey=evogb-9ivSW7OY`)).json();
    if (evogb.status && evogb.result?.url) {
      downloadUrl = evogb.result.url;
      method = "EvoGB";
    } else {
      console.log(chalk.red(`[FAIL]: EvoGB no devolvió URL válida.`));
    }
  } catch (e) { console.log(chalk.red(`[ERROR EvoGB]: ${e.message}`)); }

  // 2. OGMP3
  if (!downloadUrl) {
    console.log(chalk.yellow(`[TRY]: Intentando con OGMP3...`));
    const resOg = await ogmp3.download(youtubeUrl, isVideo);
    if (resOg) {
      downloadUrl = resOg.url;
      method = "OGMP3";
    } else {
      console.log(chalk.red(`[FAIL]: OGMP3 falló.`));
    }
  }

  // 3. LolHuman
  if (!downloadUrl && global.lolkeysapi) {
    console.log(chalk.yellow(`[TRY]: Intentando con LolHuman...`));
    try {
      const lol = await (await fetch(`https://api.lolhuman.xyz/api/yt${isVideo?'video':'audio'}?apikey=${global.lolkeysapi[0]}&url=${youtubeUrl}`)).json();
      if (lol.status === 200) {
        downloadUrl = lol.result.link || lol.result;
        method = "LolHuman";
      } else {
        console.log(chalk.red(`[FAIL]: LolHuman Status ${lol.status}`));
      }
    } catch (e) { console.log(chalk.red(`[ERROR LolHuman]: ${e.message}`)); }
  }

  // 4. ApiCausas
  if (!downloadUrl) {
    console.log(chalk.yellow(`[TRY]: Intentando con ApiCausas...`));
    try {
      const causa = await (await fetch(`https://rest.apicausas.xyz/ytdlp/${isVideo?'video':'audio'}?q=${encodeURIComponent(youtubeUrl)}&apikey=causa-0e3eacf90ab7be15`)).json();
      if (causa.url) {
        downloadUrl = causa.url;
        method = "ApiCausas";
      } else {
        console.log(chalk.red(`[FAIL]: ApiCausas no devolvió URL.`));
      }
    } catch (e) { console.log(chalk.red(`[ERROR ApiCausas]: ${e.message}`)); }
  }

  // --- RESULTADO FINAL ---
  if (downloadUrl) {
    console.log(chalk.bgGreen.black(`[ÉXITO]: Descarga obtenida mediante ${method}`));
    console.log(chalk.gray(`[URL]: ${downloadUrl}`));
    
    if (isVideo) {
      await conn.sendMessage(m.chat, { video: { url: downloadUrl }, mimetype: "video/mp4", caption: `🎬 Fuente: ${method}` }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { audio: { url: downloadUrl }, mimetype: "audio/mpeg" }, { quoted: m });
    }
  } else {
    console.log(chalk.bgRed.white(`[FATAL]: Todas las APIs fallaron para ${youtubeUrl}`));
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
  return num.toLocaleString();
      }
               
