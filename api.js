import fs, { watchFile, unwatchFile } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import chalk from 'chalk';

const execPromise = promisify(exec);

// --- CONFIGURACIÓN GLOBAL DE APIS ---
global.MyApiRestBaseUrl = 'https://api.cafirexos.com';
global.MyApiRestApikey = 'BrunoSobrino';
global.lolkeysapi = ['GataDiosV3'];

global.APIs = {
  CFROSAPI: 'https://api.cafirexos.com',
  lol: 'https://api.lolhuman.xyz',
  BK9: 'https://apii.bk9.site',
  fgmods: 'https://api-fgmods.ddns.net'
};

const config = {
  tempDir: path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxFileSize: 1500000000,
  maxConcurrent: 5,
  cookiesFile: path.join(process.cwd(), 'src/tmp/YTDLP/cookies.txt')
};

// --- OBJETO OGMP3 (Lógica de cifrado integrada) ---
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
      }, { headers: { 'origin': 'https://ogmp3.lat', 'user-agent': 'Postify/1.0.0' } });

      if (res.data?.s === "C") return { title: res.data.t, url: `${this.api.base}/${this.utils.hash()}/download/${this.utils.encoded(res.data.i)}/${this.utils.hash()}/` };
      return null;
    } catch { return null; }
  }
};

// --- FUNCIÓN DE BÚSQUEDA MULTI-API ---
const searchAndDownload = async (m, searchQuery, isVideo = false) => {
  const sessionId = `dl_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    let downloadUrl = null;
    let title = "archivo";

    // 1. INTENTO: API LOLHUMAN (Usando tus llaves globales)
    try {
      const lolApi = `https://api.lolhuman.xyz/api/yt${isVideo?'video':'audio'}?apikey=${global.lolkeysapi[0]}&url=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(lolApi);
      const data = await res.json();
      if (data.status === 200) {
        downloadUrl = isVideo ? data.result.link : data.result.link;
        title = data.result.title || "video";
      }
    } catch (e) {}

    // 2. INTENTO: OGMP3 (Si es link de YT)
    if (!downloadUrl && searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be')) {
      const resOg = await ogmp3.download(searchQuery, isVideo);
      if (resOg) { downloadUrl = resOg.url; title = resOg.title; }
    }

    // 3. INTENTO: API CAFIREXOS (Tu base global)
    if (!downloadUrl) {
      try {
        const cfRes = await fetch(`${global.MyApiRestBaseUrl}/api/v2/yt${isVideo?'mp4':'mp3'}?url=${encodeURIComponent(searchQuery)}&apikey=${global.MyApiRestApikey}`);
        const cfData = await cfRes.json();
        if (cfData.status) {
            downloadUrl = cfData.result.download.url;
            title = cfData.result.title;
        }
      } catch (e) {}
    }

    // PROCESAMIENTO DE DESCARGA
    if (downloadUrl) {
      const fileName = `${title.substring(0,20)}.${isVideo?'mp4':'mp3'}`;
      const filePath = path.join(outputDir, fileName);
      const fileRes = await fetch(downloadUrl);
      const buffer = await fileRes.buffer();
      await fs.promises.writeFile(filePath, buffer);
      
      if (isVideo) {
        await conn.sendMessage(m.chat, { video: { url: filePath }, fileName: fileName }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { audio: { url: filePath }, mimetype: "audio/mpeg" }, { quoted: m });
      }
    } else {
      await m.reply("❌ No se encontró el archivo en ninguna API. Intenta con yt-dlp local.");
    }

  } catch (error) {
    console.error(error);
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

// --- SISTEMA DE RELOAD (WatchFile) ---
const file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  console.log(chalk.redBright('Update \'dla.js\''));
  import(`${file}?update=${Date.now()}`);
});

// --- LÓGICA RPG (Mantenida por compatibilidad) ---
global.rpg = { emoticon(string) { /* ... tu lógica de emojis ... */ } };

export default searchAndDownload;
        
