// dla.js
// Copyright (C) 2026 Weskerty
// Modificado con Sistema Híbrido: APIs de alta velocidad + Respaldo de yt-dlp.

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);
const __dirname = path.resolve();

const config = {
  tempDir: process.env.TEMP_DOWNLOAD_DIR || path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxFileSize: (parseInt(process.env.MAX_UPLOAD, 10) * 1048576) || 1500000000,
  ytDlpPath: path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxConcurrent: parseInt(process.env.MAXSOLICITUD, 10) || 5,
  playlistLimit: parseInt(process.env.PLAYLIST_LIMIT, 10) || 10,
  cookiesFile: path.join(process.cwd(), 'src/tmp/YTDLP/cookies.txt')
};

const ytDlpBinaries = new Map([
  ['win32-x64', 'yt-dlp.exe'],
  ['win32-ia32', 'yt-dlp_x86.exe'],
  ['darwin', 'yt-dlp_macos'],
  ['linux-x64', 'yt-dlp_linux'],
  ['linux-arm64', 'yt-dlp_linux_aarch64'],
  ['linux-arm', 'yt-dlp_linux_armv7l'],
  ['default', 'yt-dlp'],
]);

const formats = {
  video: '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --sponsorblock-mark all', 
  audio: '-f "bestaudio[ext=m4a]/bestaudio/best"', 
  playlist: '--yes-playlist',
  noPlaylist: '--no-playlist'
};

const commonFlags = [
  '--restrict-filenames',
  '--extractor-retries 3',
  '--compat-options no-youtube-unavailable-videos',
  '--ignore-errors',
  '--no-abort-on-error'
].join(' ');

class DownloadQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.activeDownloads = 0;
    this.maxConcurrent = maxConcurrent;
  }
  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }
  async processNext() {
    if (this.activeDownloads >= this.maxConcurrent || this.queue.length === 0) return;
    this.activeDownloads++;
    const { task, resolve, reject } = this.queue.shift();
    try {
      resolve(await task());
    } catch (error) {
      reject(error);
    } finally {
      this.activeDownloads--;
      this.processNext();
    }
  }
}
const downloadQueue = new DownloadQueue(config.maxConcurrent);

const isYouTubeUrl = (url) => /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);

// ==========================================
// 🚀 NUEVO: SISTEMA DE APIS PARA YOUTUBE
// ==========================================
const fetchFromApis = async (url, isVideo = false) => {
  const audioApis = [
    `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
    `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`
  ];
  const videoApis = [
    `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
    `https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(url)}`
  ];

  const apisToTry = isVideo ? videoApis : audioApis;

  for (const apiUrl of apisToTry) {
    try {
      const response = await fetch(apiUrl);
      const json = await response.json();
      
      // Buscamos la URL de descarga en la respuesta típica de estas APIs
      const dlLink = json?.data?.dl || json?.data?.url || json?.url || json?.download?.url || json?.link;
      
      if (dlLink) {
        console.log(`[✅] API exitosa: ${apiUrl}`);
        return dlLink;
      }
    } catch (e) {
      console.log(`[⚠️] API falló, intentando la siguiente: ${apiUrl}`);
      continue;
    }
  }
  return null; // Si todas las APIs fallan, devolvemos null para que yt-dlp haga el trabajo
};

// ==========================================
// 🛠️ yt-dlp (Plan B y Redes Sociales)
// ==========================================
const detectYtDlpBinaryName = () => ytDlpBinaries.get(`${os.platform()}-${os.arch()}`) || ytDlpBinaries.get('default');
const ensureDirectories = async () => {
  await Promise.all([fs.promises.mkdir(config.tempDir, { recursive: true }), fs.promises.mkdir(config.ytDlpPath, { recursive: true })]);
};

const safeExecute = async (command) => await execPromise(command);

const detectYtDlpBinary = async () => {
  try {
    await execPromise('yt-dlp --version');
    return 'yt-dlp';
  } catch {
    return `"${path.join(config.ytDlpPath, detectYtDlpBinaryName())}"`;
  }
};

const processDownloadedFile = async (m, filePath, isVideo = false) => {
  try {
    await fs.promises.access(filePath);
    if (isVideo) {
      await conn.sendMessage(m.chat, { video: { url: filePath }, caption: `🎬 Descarga completada`, mimetype: "video/mp4" }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { audio: { url: filePath }, mimetype: "audio/mp4", ptt: false }, { quoted: m });
    }
    await fs.promises.unlink(filePath).catch(() => {});
  } catch (error) {
    throw error;
  }
};

const downloadWithYtDlp = async (m, url, customOptions = '', enablePlaylist = false, isVideo = false) => {
  const ytDlpPath = await detectYtDlpBinary();
  const sessionId = `dl_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  let cookiesFlag = '';
  try { await fs.promises.access(config.cookiesFile); cookiesFlag = `--cookies "${config.cookiesFile}"`; } catch {}

  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    const outputTemplate = path.join(outputDir, '%(title).50s.%(ext)s');
    const command = [
      ytDlpPath, `--max-filesize ${config.maxFileSize}`, commonFlags, 
      enablePlaylist ? formats.playlist : formats.noPlaylist, cookiesFlag, customOptions, 
      `-o "${outputTemplate}"`, `"${url}"`
    ].filter(Boolean).join(' ');

    await safeExecute(command);
    const files = await fs.promises.readdir(outputDir);
    if (files.length === 0) throw new Error("No file");

    for (const file of files) await processDownloadedFile(m, path.join(outputDir, file), isVideo);
  } catch (error) {
    throw new Error('Fallo general de yt-dlp');
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

const handleRequest = async (m) => {
  const input = m.text.replace(/^\.(dla)\s*/i, "").trim();
  
  if (!input) {
    return await m.reply('> 🎶 *Canción:* `dla <link/nombre>`\n> 🎬 *Video:* `dla vd <link/nombre>`\n> 🎵 *Playlist:* `dla mp3 <link>`');
  }

  const args = input.split(' ').filter(Boolean);
  const isCommandVd = args[0] === 'vd';
  const isCommandMp3 = args[0] === 'mp3';
  
  let query = (isCommandVd || isCommandMp3) ? args.slice(1).join(' ') : input;
  if (!query) return await m.reply("❌ Proporciona un enlace o término de búsqueda.");

  await m.reply('⏳ *Descargando...* Esto puede tomar unos segundos.');

  const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
  const isLink = !!urlMatch;
  const finalQuery = isLink ? urlMatch[0] : query;
  const isVideo = isCommandVd;

  try {
    // 1. INTENTAR APIs (Solo si es un enlace de YouTube y NO es una playlist entera)
    if (isLink && isYouTubeUrl(finalQuery) && !isCommandMp3) {
      const apiResultUrl = await fetchFromApis(finalQuery, isVideo);
      
      if (apiResultUrl) {
        // Enviar directamente el resultado de la API
        if (isVideo) {
          await conn.sendMessage(m.chat, { video: { url: apiResultUrl }, caption: `🎬 Listo!`, mimetype: "video/mp4" }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, { audio: { url: apiResultUrl }, mimetype: "audio/mp4", ptt: false }, { quoted: m });
        }
        return; // Termina la ejecución aquí si la API tuvo éxito
      }
      console.log("[⚠️] APIs fallaron, pasando al Plan B (yt-dlp)...");
    }

    // 2. PLAN B (yt-dlp): Si no es YT, si es Playlist, o si las APIs fallaron
    if (isCommandMp3) {
      if (isLink) await downloadWithYtDlp(m, finalQuery, formats.audio, true, false);
      else await m.reply("❌ El comando `mp3` está diseñado para listas de reproducción mediante enlaces.");
    } else {
      await downloadWithYtDlp(m, finalQuery, isVideo ? formats.video : formats.audio, false, isVideo);
    }

  } catch (error) {
    console.error(`[❗] Error final: ${error.message}`);
    await m.reply(`❌ Ocurrió un error al procesar tu solicitud. Intenta con otro enlace.`);
  }
};

let handler = (m) => downloadQueue.add(() => handleRequest(m));

handler.help = ['dla <link>', 'dla vd <link>', 'dla mp3 <link>'];
handler.tags = ['tools', 'descargas'];
handler.command = /^(dla)$/i;
handler.owner = false;

export default handler;
                                 
