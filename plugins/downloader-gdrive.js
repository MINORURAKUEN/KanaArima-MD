import fetch from 'node-fetch';
import { sizeFormatter } from 'human-readable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

const formatSize = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`
});

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_gdrive;

  if (!args[0]) {
    throw `*¡Uso de Google Drive!* 💡\n\n*Archivo:* \n_${usedPrefix + command} [link]_\n\n*Carpeta (Seleccionar 1 de 24):* \n_${usedPrefix + command} [link-carpeta] [número]_`;
  }

  const link = args[0];
  const indexSelected = parseInt(args[1]);
  const isFolder = link.includes('/folders/') || link.includes('/drive/mobile/folders/') || link.includes('id=');

  try {
    if (isFolder) {
      const folderId = link.match(/\/folders\/(.{15,40})/)?.[1] || link.match(/id=(.{15,40})/)?.[1];
      if (!folderId) throw 'ID de carpeta no encontrado.';
      
      const files = await GDriveFolderList(folderId);
      if (!files || files.length === 0) throw 'No se encontraron archivos. Verifica que la carpeta sea pública.';

      if (isNaN(indexSelected)) {
        let menu = `📂 *ARCHIVOS ENCONTRADOS:*\n\n`;
        files.forEach((file, i) => { menu += `*${i + 1}.* ${file.name}\n`; });
        menu += `\n*Para descargar uno escribe:* \n_${usedPrefix + command} ${link} [número]_`;
        return m.reply(menu);
      }

      const fileIndex = indexSelected - 1;
      if (!files[fileIndex]) throw `Número inválido. Elige entre 1 y ${files.length}.`;
      
      conn.reply(m.chat, `⏳ Procesando selección: *${files[fileIndex].name}*...`, m);
      await downloadAndSend(files[fileIndex].id, files[fileIndex].name, conn, m, tradutor);
    } else {
      const fileId = link.match(/\/?id=(.+)/i)?.[1] || link.match(/\/d\/(.*?)\//)?.[1];
      await downloadAndSend(fileId, null, conn, m, tradutor);
    }
  } catch (e) {
    m.reply(typeof e === 'string' ? e : 'Error al leer la carpeta.');
  }
};

async function downloadAndSend(id, knownName, conn, m, tradutor) {
  let tempFilePath;
  try {
    const res = await GDriveDlById(id);
    const fileName = (knownName || res.fileName || 'archivo_drive').replace(/[\\/:*?"<>|]/g, '_');
    const totalBytes = res.sizeBytes;

    const fileResponse = await fetch(res.downloadUrl);
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);

    let downloadedBytes = 0;
    const startTime = Date.now();

    const downloadProgress = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        const now = Date.now();
        const duration = (now - startTime) / 1000;
        const speed = duration > 0 ? (downloadedBytes / duration / 1024 / 1024).toFixed(2) : 0;
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '??';
        
        // --- LIMPIEZA TOTAL DE FILA ---
        process.stdout.write(`\r\x1b[K📥 [DESCARGA] ${percent}% | ${speed} MB/s | ${fileName.substring(0, 20)}...`);
        
        callback(null, chunk);
      }
    });

    await pipeline(fileResponse.body, downloadProgress, fs.createWriteStream(tempFilePath));
    process.stdout.write('\n✅ Proceso completado.\n');

    await conn.sendMessage(m.chat, {
        document: { url: tempFilePath }, 
        fileName: fileName,
        mimetype: res.mimetype || 'application/octet-stream'
    }, { quoted: m });

  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

// Función de lista mejorada para evitar el "0 archivos"
async function GDriveFolderList(folderId) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
  const html = await res.text();
  const files = [];
  
  // Regex corregida: Google cambió el formato de los arrays internos
  const regex = /\["([a-zA-Z0-9_-]{25,})",\["([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const name = match[2].replace(/\\u003d/g, '=').replace(/\\u0027/g, "'");
    if (!files.find(f => f.id === id)) files.push({ id, name });
    if (files.length >= 24) break;
  }
  return files;
}

async function GDriveDlById(id) {
    const url = `https://drive.google.com/uc?id=${id}&export=download`;
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
    return {
        downloadUrl: url,
        fileName: 'archivo',
        sizeBytes: parseInt(res.headers.get('content-length')) || 0,
        mimetype: res.headers.get('content-type')
    };
}

handler.command = /^(gdrive)$/i;
export default handler;
    
