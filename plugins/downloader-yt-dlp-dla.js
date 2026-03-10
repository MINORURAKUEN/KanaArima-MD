// dla.js
// Copyright (C) 2025 Weskerty
// Este programa se distribuye bajo los términos de la Licencia Pública General Affero de GNU (AGPLv3).
// Licencia completa: https://www.gnu.org/licenses/agpl-3.0.html
// Modificado y optimizado para máxima compatibilidad con WhatsApp.

import fs from "fs";
import path, { join, basename } from "path";
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

// OPTIMIZACIÓN: Formatos más compatibles para WhatsApp (evita errores de ffmpeg)
const formats = {
  // Busca el mejor MP4 compatible. Ideal para TikTok, IG, Twitter y YouTube.
  video: '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --sponsorblock-mark all', 
  // Usa m4a nativo. WhatsApp lo lee perfecto, es más rápido y evita el error "MP3 no disponible".
  audio: '-f "bestaudio[ext=m4a]/bestaudio/best"', 
  playlist: '--yes-playlist',
  noPlaylist: '--no-playlist'
};

const commonFlags = [
  '--restrict-filenames',
  '--extractor-retries 3',
  '--fragment-retries 3',
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
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeDownloads--;
      this.processNext();
    }
  }
}

const downloadQueue = new DownloadQueue(config.maxConcurrent);

const cleanCommand = (text) => text.replace(/^\.(dla)\s*/i, "").trim();

// Mejorada la detección de URLs para redes sociales
const isUrl = (string) => {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const buildCookiesFlag = async () => {
  try {
    await fs.promises.access(config.cookiesFile);
    return `--cookies "${config.cookiesFile}"`;
  } catch {
    return '';
  }
};

const safeExecute = async (command, silentError = false) => {
  try {
    return await execPromise(command);
  } catch (error) {
    if (!silentError) {
      console.error(`[❗] DLA Command Error: ${command}`);
      console.error(`[❗] Detalle: ${error.message}`);
    }
    throw error;
  }
};

const isYtDlpAvailable = async () => {
  try {
    await execPromise('yt-dlp --version');
    return true;
  } catch {
    return false;
  }
};

const detectYtDlpBinaryName = () => {
  const key = `${os.platform()}-${os.arch()}`;
  return ytDlpBinaries.get(key) || ytDlpBinaries.get('default');
};

const ensureDirectories = async () => {
  await Promise.all([
    fs.promises.mkdir(config.tempDir, { recursive: true }),
    fs.promises.mkdir(config.ytDlpPath, { recursive: true }),
  ]);
};

const detectYtDlpBinary = async (m) => {
  if (await isYtDlpAvailable()) return 'yt-dlp';
  const filePath = path.join(config.ytDlpPath, detectYtDlpBinaryName());
  try {
    await fs.promises.access(filePath);
    return `"${filePath}"`; // Asegurar comillas en rutas
  } catch {
    return await downloadYtDlp(m);
  }
};

const downloadYtDlp = async (m) => {
  await ensureDirectories();
  const fileName = detectYtDlpBinaryName();
  const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${fileName}`;
  const filePath = path.join(config.ytDlpPath, fileName);

  try {
    await safeExecute(`curl -L -o "${filePath}" "${downloadUrl}"`);
    if (os.platform() !== 'win32') await fs.promises.chmod(filePath, '755');
    return `"${filePath}"`;
  } catch (error) {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Fallo de descarga: ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);
    if (os.platform() !== 'win32') await fs.promises.chmod(filePath, '755');
    return `"${filePath}"`;
  }
};

const updateYtDlp = async (m, errorMsg = null) => {
  try {
    const ytDlpPath = await detectYtDlpBinary(m);
    const updateCommand = `${ytDlpPath} --update-to master`;
    const result = await safeExecute(updateCommand);
    const updateOutput = result.stdout || result.stderr || '✅ yt-dlp actualizado exitosamente';
    await m.reply(errorMsg ? `Intentando solucionar error...\n${updateOutput}` : updateOutput);
    return true;
  } catch (error) {
    await m.reply(`❌ Error al actualizar dependencias: ${error.message}`);
    return false;
  }
};

const processDownloadedFile = async (m, filePath, originalFileName, isVideo = false) => {
  try {
    await fs.promises.access(filePath);
    
    if (isVideo) {
      await conn.sendMessage(m.chat, { 
        video: { url: filePath }, 
        caption: `🎬 Descarga completada`, 
        mimetype: "video/mp4" 
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { 
        audio: { url: filePath }, 
        mimetype: "audio/mp4", 
        ptt: false // Cambia a 'true' si quieres que se envíe como Nota de Voz 🎤
      }, { quoted: m });
    }

    await fs.promises.unlink(filePath).catch(() => {});
  } catch (error) {
    console.error(`[❗] Error enviando el archivo: ${error.message}`);
    throw error;
  }
};

const downloadWithYtDlp = async (m, url, customOptions = '', enablePlaylist = false, isVideo = false) => {
  const ytDlpPath = await detectYtDlpBinary(m);
  const sessionId = `dl_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  const cookiesFlag = await buildCookiesFlag();

  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    const outputTemplate = path.join(outputDir, '%(title).50s.%(ext)s');
    const playlistFlag = enablePlaylist ? formats.playlist : formats.noPlaylist;
    const playlistItemsFlag = enablePlaylist ? `--playlist-items 1:${config.playlistLimit}` : '';
    
    const command = [
      ytDlpPath,
      `--max-filesize ${config.maxFileSize}`,
      commonFlags,
      playlistFlag,
      playlistItemsFlag,
      cookiesFlag,
      customOptions,
      `-o "${outputTemplate}"`,
      `"${url}"`
    ].filter(Boolean).join(' ');

    await safeExecute(command);
    const files = await fs.promises.readdir(outputDir);
    
    if (files.length === 0) throw new Error("No se pudo descargar el archivo.");

    for (const file of files) {
      await processDownloadedFile(m, path.join(outputDir, file), file, isVideo);
    }
  } catch (error) {
    const errorMsg = error.stderr || error.message || 'Error desconocido';
    console.error(`[❗] Error de descarga: ${errorMsg}`);
    await m.reply(`❌ Ocurrió un error al descargar. Asegúrate de que el enlace sea público.`);
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

const searchAndDownload = async (m, searchQuery, isVideo = false) => {
  const ytDlpPath = await detectYtDlpBinary(m);
  const sessionId = `search_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  const cookiesFlag = await buildCookiesFlag();
  
  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    const outputTemplate = path.join(outputDir, '%(title).50s.%(ext)s');
    const formatOptions = isVideo ? formats.video : formats.audio;
    
    const command = [
      ytDlpPath,
      `--max-filesize ${config.maxFileSize}`,
      commonFlags,
      '--playlist-items 1',
      formatOptions,
      cookiesFlag,
      `-o "${outputTemplate}"`,
      `"ytsearch1:${searchQuery}"` // Limitamos a 1 resultado directamente para mayor velocidad
    ].filter(Boolean).join(' ');
    
    await safeExecute(command);
    const files = await fs.promises.readdir(outputDir);
    
    if (files.length > 0) {
      await processDownloadedFile(m, path.join(outputDir, files[0]), files[0], isVideo);
    } else {
      await m.reply("❌ No se encontraron resultados para tu búsqueda.");
    }
  } catch (error) {
    console.error(`[❗] Error de búsqueda: ${error.message}`);
    await m.reply(`❌ Hubo un problema procesando tu búsqueda.`);
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

const handleRequest = async (m) => {
  const input = cleanCommand(m.text.trim());
  
  if (!input) {
    return await m.reply(
      '> 🎶 *Descargar Canción:* \n`dla <nombre o link>`\n\n' +
      '> 🎬 *Descargar Video:* \n`dla vd <nombre o link>`\n\n' +
      '> 🎵 *Descargar Playlist (Audio):* \n`dla mp3 <link>`'
    );
  }

  try {
    const args = input.split(' ').filter(Boolean);
    const isCommandVd = args[0] === 'vd';
    const isCommandMp3 = args[0] === 'mp3';
    
    // Remover el subcomando del input si existe ('vd' o 'mp3')
    let query = input;
    if (isCommandVd || isCommandMp3) {
      query = args.slice(1).join(' ');
    }

    if (!query) return await m.reply("❌ Por favor, proporciona un enlace o término de búsqueda.");

    await m.reply('⏳ *Descargando...* Esto puede tomar unos segundos.');

    // Verificar si es un enlace (IG, TikTok, YouTube, etc) o una búsqueda por texto
    const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
    const isLink = urlMatch ? true : false;
    const finalUrlOrQuery = isLink ? urlMatch[0] : query;

    if (isCommandVd) {
      if (isLink) await downloadWithYtDlp(m, finalUrlOrQuery, formats.video, false, true);
      else await searchAndDownload(m, finalUrlOrQuery, true);
    } else if (isCommandMp3) {
      if (isLink) await downloadWithYtDlp(m, finalUrlOrQuery, formats.audio, true, false); // true para playlist
      else await m.reply("❌ El comando `mp3` está diseñado para listas de reproducción mediante enlaces.");
    } else {
      // Comportamiento por defecto: Descarga Audio
      if (isLink) await downloadWithYtDlp(m, finalUrlOrQuery, formats.audio, false, false);
      else await searchAndDownload(m, finalUrlOrQuery, false);
    }
  } catch (error) {
    console.error(`[❗] Error crítico: ${error.message}`);
    await m.reply(`❌ Ocurrió un error inesperado.`);
  }
};

let handler = (m) => {
  return downloadQueue.add(() => handleRequest(m));
};

handler.help = ['dla <link/búsqueda>', 'dla vd <link/búsqueda>', 'dla mp3 <link playlist>'];
handler.tags = ['tools', 'descargas'];
handler.command = /^(dla)$/i;
handler.owner = false;

export default handler;
                                                           
