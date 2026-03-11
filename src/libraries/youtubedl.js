import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import axios from 'axios';
import crypto from 'crypto';

const execPromise = promisify(exec);

const config = {
  tempDir: process.env.TEMP_DOWNLOAD_DIR || path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxFileSize: (parseInt(process.env.MAX_UPLOAD, 10) * 1048576) || 1500000000,
  ytDlpPath: path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxConcurrent: parseInt(process.env.MAXSOLICITUD, 10) || 5,
  playlistLimit: parseInt(process.env.PLAYLIST_LIMIT, 10) || 10,
  cookiesFile: path.join(process.cwd(), 'src/tmp/YTDLP/cookies.txt')
};

const APIS = {
  evogb: { base: 'https://api.evogb.org', key: 'evogb-9ivSW7OY' },
  apicausas: { base: 'https://rest.apicausas.xyz', key: 'causa-0e3eacf90ab7be15' }
};

// --- OBJETO OGMP3 INTEGRADO ---
const ogmp3 = {
  api: {
    base: "https://api3.apiapi.lat",
    endpoints: ["https://api5.apiapi.lat", "https://api.apiapi.lat", "https://api3.apiapi.lat"]
  },
  headers: {
    'authority': 'api.apiapi.lat',
    'content-type': 'application/json',
    'origin': 'https://ogmp3.lat',
    'referer': 'https://ogmp3.lat/',
    'user-agent': 'Postify/1.0.0'
  },
  utils: {
    hash: () => crypto.randomBytes(16).toString('hex'),
    encoded: (str) => str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 1)).join(''),
    enc_url: (url) => url.split('').map(c => c.charCodeAt(0)).reverse().join(',')
  },
  youtubeId: url => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  },
  async request(endpoint, data = {}) {
    const base = this.api.endpoints[Math.floor(Math.random() * this.api.endpoints.length)];
    try {
      const res = await axios.post(`${base}${endpoint}`, data, { headers: this.headers });
      return { status: true, data: res.data };
    } catch (e) { return { status: false, error: e.message }; }
  },
  async download(link, isVideo = false) {
    const id = this.youtubeId(link);
    if (!id) return null;
    const type = isVideo ? 'video' : 'audio';
    const format = isVideo ? '720' : '320';

    for (let i = 0; i < 5; i++) { // Reintentos
      const c = this.utils.hash();
      const d = this.utils.hash();
      const res = await this.request(`/${c}/init/${this.utils.enc_url(link)}/${d}/`, {
        data: this.utils.encoded(link),
        format: isVideo ? "1" : "0",
        mp3Quality: isVideo ? null : format,
        mp4Quality: isVideo ? format : null,
      });

      if (res.status && res.data.s === "C") {
        return {
          title: res.data.t || 'Download',
          url: `${this.api.base}/${this.utils.hash()}/download/${this.utils.encoded(res.data.i)}/${this.utils.hash()}/`
        };
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    return null;
  }
};

// --- LÓGICA DE BÚSQUEDA ACTUALIZADA CON OGMP3 ---
const searchAndDownload = async (m, searchQuery, isVideo = false) => {
  const sessionId = `dl_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    const { default: fetch } = await import('node-fetch');
    let downloadUrl = null;
    let title = "video";

    // 1. Intentar con EvoGB
    try {
      const res = await fetch(`${APIS.evogb.base}/download?query=${encodeURIComponent(searchQuery)}&type=${isVideo?'video':'audio'}&apikey=${APIS.evogb.key}`);
      const data = await res.json();
      if (data.status && data.result?.url) {
        downloadUrl = data.result.url;
        title = data.result.title;
      }
    } catch (e) {}

    // 2. Si falla, intentar con OGMP3 (Solo si es enlace de YT o si buscamos y obtenemos el link de YT localmente)
    if (!downloadUrl) {
      const ytLink = searchQuery.startsWith('http') ? searchQuery : await getFirstYoutubeResult(searchQuery);
      if (ytLink) {
        const resOg = await ogmp3.download(ytLink, isVideo);
        if (resOg) {
          downloadUrl = resOg.url;
          title = resOg.title;
        }
      }
    }

    // 3. Descarga final del buffer
    if (downloadUrl) {
      const fileName = `${title.substring(0,20)}.${isVideo?'mp4':'mp3'}`;
      const filePath = path.join(outputDir, fileName);
      const fileRes = await fetch(downloadUrl);
      await fs.promises.writeFile(filePath, Buffer.from(await fileRes.arrayBuffer()));
      await processDownloadedFile(m, filePath, fileName, isVideo);
      return;
    }

    // 4. Fallback a YT-DLP local
    await downloadWithYtDlp(m, [searchQuery.startsWith('http') ? searchQuery : `ytsearch1:${searchQuery}`], isVideo ? formats.video : formats.audio, false, isVideo);

  } catch (error) {
    await m.reply(`Error: ${error.message}`);
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

// Función auxiliar para obtener el primer link de YouTube si es búsqueda de texto
async function getFirstYoutubeResult(query) {
  try {
    const { stdout } = await execPromise(`yt-dlp --get-id "ytsearch1:${query}"`);
    return `https://www.youtube.com/watch?v=${stdout.trim()}`;
  } catch { return null; }
}

// ... (Resto de funciones: ensureDirectories, processDownloadedFile, handler, etc.)
    
