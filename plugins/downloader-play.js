// dla.js con soporte para APIs Externas (EvoGB & ApiCausas)
import fs from "fs";
import path, { join, basename } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import fetch from "node-fetch"; // Asegúrate de tenerlo instalado

const execPromise = promisify(exec);
const __dirname = path.resolve();

// Configuración de APIs externas
const externalApis = {
  evogb: {
    baseUrl: 'https://api.evogb.org',
    key: 'evogb-9ivSW7OY'
  },
  apicausas: {
    baseUrl: 'https://rest.apicausas.xyz',
    key: 'causa-0e3eacf90ab7be15'
  }
};

const config = {
  tempDir: process.env.TEMP_DOWNLOAD_DIR || path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxFileSize: (parseInt(process.env.MAX_UPLOAD, 10) * 1048576) || 1500000000,
  ytDlpPath: path.join(process.cwd(), 'src/tmp/YTDLP'),
  maxConcurrent: parseInt(process.env.MAXSOLICITUD, 10) || 5,
  playlistLimit: parseInt(process.env.PLAYLIST_LIMIT, 10) || 10,
  cookiesFile: path.join(process.cwd(), 'src/tmp/YTDLP/cookies.txt')
};

// ... (ytDlpBinaries, formats y commonFlags se mantienen igual)
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
  video: '-f "sd/18/bestvideo[height<=720][vcodec*=h264]+bestaudio[acodec*=aac]/bestvideo[height<=720][vcodec*=h264]+bestaudio[acodec*=mp4a]/bestvideo[height<=720][vcodec*=h264]+bestaudio/bestvideo[height<=720]+bestaudio/bestvideo[vcodec*=h264]+bestaudio/bestvideo+bestaudio/best" --sponsorblock-mark all', 
  audio: '-f "ba/best" -x --audio-format mp3 --audio-quality 0',
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

// --- FUNCIONES DE APOYO PARA APIS EXTERNAS ---

const downloadExternal = async (url, isVideo = false) => {
  const type = isVideo ? 'ytmp4' : 'ytmp3';
  
  // Intento 1: EvoGB
  try {
    const res = await fetch(`${externalApis.evogb.baseUrl}/api/${type}?url=${encodeURIComponent(url)}&apikey=${externalApis.evogb.key}`);
    const data = await res.json();
    if (data.status && data.result?.url) return data.result.url;
  } catch (e) { console.error("EvoGB Error:", e.message); }

  // Intento 2: ApiCausas
  try {
    const res = await fetch(`${externalApis.apicausas.baseUrl}/api/${type}?url=${encodeURIComponent(url)}&apikey=${externalApis.apicausas.key}`);
    const data = await res.json();
    if (data.status && data.result?.url) return data.result.url;
  } catch (e) { console.error("ApiCausas Error:", e.message); }

  return null;
};

// ... (DownloadQueue, cleanCommand, isUrl, buildCookiesFlag, safeExecute, isYtDlpAvailable, detectYtDlpBinaryName, ensureDirectories, detectYtDlpBinary, downloadYtDlp, updateYtDlp, uploadCookies se mantienen igual)

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
    if (this.activeDownloads >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

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
const isUrl = (string) => {
  try {
    new URL(string);
    return true;
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
    const result = await execPromise(command);
    return result;
  } catch (error) {
    if (!silentError) {
      console.error(`PLUGIN DLA Command: ${command}`);
      console.error(`PLUGIN DLA Error: ${error.message}`);
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
  const platform = os.platform();
  const arch = os.arch();
  const key = `${platform}-${arch}`;
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
  const fileName = detectYtDlpBinaryName();
  const filePath = path.join(config.ytDlpPath, fileName);
  try {
    await fs.promises.access(filePath);
    return `${filePath}`;
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
    return `${filePath}`;
  } catch (error) {
    const response = await fetch(downloadUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);
    if (os.platform() !== 'win32') await fs.promises.chmod(filePath, '755');
    return `${filePath}`;
  }
};

const updateYtDlp = async (m, errorMsg = null) => {
  try {
    const ytDlpPath = await detectYtDlpBinary(m);
    const updateCommand = `${ytDlpPath} --update-to master`;
    await safeExecute(updateCommand);
    return true;
  } catch (error) {
    return false;
  }
};

const uploadCookies = async (m, cookieText = null) => {
  try {
    let cookieContent = null;
    if (cookieText) {
      cookieContent = cookieText;
    } else if (m.quoted && m.quoted.fileSha256) {
      const media = await m.quoted.download();
      cookieContent = media.toString();
    } else {
      await m.reply('Las cookies deben ser texto o archivo.');
      return;
    }
    await ensureDirectories();
    await fs.promises.writeFile(config.cookiesFile, cookieContent);
    await m.reply(`Cookies subidas exitosamente`);
  } catch (error) {
    await m.reply(`Error subiendo cookies: ${error.message}`);
  }
};

const processDownloadedFile = async (m, filePath, originalFileName, isVideo = false) => {
  try {
    await fs.promises.access(filePath);
    if (isVideo) {
      await conn.sendMessage(m.chat, { video: { url: filePath }, mimetype: "video/mp4" }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { audio: { url: filePath }, mimetype: "audio/mpeg" }, { quoted: m });
    }
    await fs.promises.unlink(filePath).catch(() => {});
  } catch (error) { throw error; }
};

// --- MODIFICACIÓN DE DOWNLOAD CON FALLBACK ---

const downloadWithYtDlp = async (m, urls, customOptions = '', enablePlaylist = false, isVideo = false) => {
  const ytDlpPath = await detectYtDlpBinary(m);
  const sessionId = `yt-dlp_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  const cookiesFlag = await buildCookiesFlag();

  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    for (const url of urls) {
      const outputTemplate = path.join(outputDir, '%(title).20s.%(ext)s');
      const playlistFlag = enablePlaylist ? formats.playlist : formats.noPlaylist;
      
      const command = [
        ytDlpPath,
        `--max-filesize ${config.maxFileSize}`,
        commonFlags,
        playlistFlag,
        cookiesFlag,
        customOptions,
        `-o "${outputTemplate}"`,
        `"${url}"`
      ].filter(Boolean).join(' ');

      try {
        await safeExecute(command);
        const files = await fs.promises.readdir(outputDir);
        for (const file of files) {
          await processDownloadedFile(m, path.join(outputDir, file), file, isVideo);
        }
      } catch (error) {
        // SI FALLA YT-DLP, USAR APIS EXTERNAS
        console.log("yt-dlp falló, intentando APIs externas...");
        const externalUrl = await downloadExternal(url, isVideo);
        if (externalUrl) {
          if (isVideo) {
            await conn.sendMessage(m.chat, { video: { url: externalUrl }, mimetype: "video/mp4" }, { quoted: m });
          } else {
            await conn.sendMessage(m.chat, { audio: { url: externalUrl }, mimetype: "audio/mpeg" }, { quoted: m });
          }
        } else {
          const errorMsg = error.stderr || error.message || 'Error desconocido';
          await updateYtDlp(m, errorMsg);
        }
      }
    }
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

const searchAndDownload = async (m, searchQuery, isVideo = false) => {
  const sessionId = `yt-dlp_search_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  const cookiesFlag = await buildCookiesFlag();
  
  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    const outputTemplate = path.join(outputDir, '%(title).20s.%(ext)s');
    const ytDlpPath = await detectYtDlpBinary(m);
    const formatOptions = isVideo ? formats.video : formats.audio;
    
    // Primero intentamos con yt-dlp (ytsearch)
    try {
      const command = [
        ytDlpPath,
        `--max-filesize ${config.maxFileSize}`,
        commonFlags,
        '--playlist-items 1',
        formatOptions,
        cookiesFlag,
        `-o "${outputTemplate}"`,
        `"ytsearch1:${searchQuery}"`
      ].filter(Boolean).join(' ');
      
      await safeExecute(command);
      const files = await fs.promises.readdir(outputDir);
      
      if (files.length > 0) {
        for (const file of files) {
          await processDownloadedFile(m, path.join(outputDir, file), file, isVideo);
        }
        return;
      }
    } catch (e) {
      console.log("Búsqueda con yt-dlp falló, intentando con APIs externas via búsqueda manual...");
    }

    // Fallback: Si yt-dlp falla en la búsqueda, buscamos la URL primero y luego usamos APIs
    const searchResult = await yts(searchQuery);
    const firstVideo = searchResult.videos[0];
    if (firstVideo) {
      const externalUrl = await downloadExternal(firstVideo.url, isVideo);
      if (externalUrl) {
        if (isVideo) {
          await conn.sendMessage(m.chat, { video: { url: externalUrl }, mimetype: "video/mp4" }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, { audio: { url: externalUrl }, mimetype: "audio/mpeg" }, { quoted: m });
        }
        return;
      }
    }

    await m.reply("No se pudo descargar de ninguna fuente.");
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

// ... (handleRequest y export default se mantienen igual)
const handleRequest = async (m) => {
  const input = cleanCommand(m.text.trim());
  
  if (!input) {
    await m.reply(
      '> 🎶Buscar y descargar cancion:\n`dla` <consulta>\n' +
      '> 🎥Buscar y descargar video:\n`dla vd` <consulta>\n' +
      '> ⬇️Descargar todo tipo de media: \n`dla` <url> _YT-DLP FLAGS_ \n' +
      '> 🎵Descargar todo el audio de playlist: \n`dla mp3` <url> \n' +
      '> 🌐Mas informacion:\ngithub.com/yt-dlp/yt-dlp/blob/master/README.md#usage-and-options'
    );
    return;
  }

  try {
    const args = input.match(/[^\s"]+|"([^"]*)"/g)?.map(arg => 
      arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
    ) || [];

    const command = args[0];
    const remainingArgs = args.slice(1);
    const urls = remainingArgs.filter(arg => isUrl(arg));

    if (command === 'cookies') {
      const cookiesIndex =
  
