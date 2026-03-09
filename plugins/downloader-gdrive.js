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
  if (!args[0]) {
    throw `*¡Uso de Google Drive!* 💡\n\n*Archivo:* \n_${usedPrefix + command} [link]_\n\n*Carpeta (1 de 24):* \n_${usedPrefix + command} [link-carpeta] [número]_`;
  }

  const link = args[0];
  const indexSelected = parseInt(args[1]);
  const isFolder = link.includes('/folders/') || link.includes('id=');

  try {
    if (isFolder) {
      const folderId = link.match(/\/folders\/(.{15,40})/)?.[1] || link.match(/id=(.{15,40})/)?.[1];
      if (!folderId) throw 'No pude encontrar el ID de la carpeta.';
      
      const files = await GDriveFolderList(folderId);
      if (!files || files.length === 0) throw 'No se encontraron archivos. Verifica que la carpeta sea *Pública* (Cualquier persona con el enlace).';

      if (isNaN(indexSelected)) {
        let menu = `📂 *LISTA DE ARCHIVOS (Máx 24):*\n\n`;
        files.forEach((file, i) => { menu += `*${i + 1}.* ${file.name}\n`; });
        menu += `\n*Descargar uno:* \n_${usedPrefix + command} ${link} [número]_`;
        return m.reply(menu);
      }

      const fileIndex = indexSelected - 1;
      if (!files[fileIndex]) throw `Número inválido. Elige entre 1 y ${files.length}.`;
      
      m.reply(`⏳ Descargando selección: *${files[fileIndex].name}*...`);
      await downloadAndSend(files[fileIndex].id, files[fileIndex].name, conn, m);
    } else {
      const fileId = link.match(/\/?id=(.+)/i)?.[1] || link.match(/\/d\/(.*?)\//)?.[1];
      await downloadAndSend(fileId, null, conn, m);
    }
  } catch (e) {
    m.reply(typeof e === 'string' ? e : 'Error al procesar.');
  }
};

async function downloadAndSend(id, knownName, conn, m) {
  let tempFilePath;
  try {
    const res = await GDriveDlById(id);
    const fileName = (knownName || res.fileName || 'archivo').replace(/[\\/:*?"<>|]/g, '_');
    
    const fileResponse = await fetch(res.downloadUrl);
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);

    let downloadedBytes = 0;
    const totalBytes = parseInt(fileResponse.headers.get('content-length')) || 0;

    const downloadProgress = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '??';
        
        // \r mueve al inicio, \x1b[K borra la línea antigua
        process.stdout.write(`\r\x1b[K📥 [GDRIVE] ${percent}% | ${fileName.substring(0, 30)}`);
        
        callback(null, chunk);
      }
    });

    await pipeline(fileResponse.body, downloadProgress, fs.createWriteStream(tempFilePath));
    process.stdout.write(`\n✅ Enviando a WhatsApp...\n`);

    await conn.sendMessage(m.chat, {
        document: { url: tempFilePath }, 
        fileName: fileName,
        mimetype: fileResponse.headers.get('content-type') || 'application/octet-stream'
    }, { quoted: m });

  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

async function GDriveFolderList(folderId) {
  // Usamos un User-Agent de móvil para obtener un HTML más simple
  const res = await fetch(`https://drive.google.com/drive/u/0/mobile/folders/${folderId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/0.4' }
  });
  const html = await res.text();
  
  const files = [];
  // Buscamos los patrones de archivos en la versión móvil
  const regex = /"([a-zA-Z0-9_-]{25,})",\["([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!files.find(f => f.id === match[1])) {
      files.push({ id: match[1], name: match[2].replace(/\\u003d/g, '=') });
    }
    if (files.length >= 24) break;
  }
  return files;
}

async function GDriveDlById(id) {
  return {
    downloadUrl: `https://drive.google.com/uc?id=${id}&export=download`,
    fileName: 'archivo_drive'
  };
}

handler.command = /^(gdrive)$/i;
export default handler;
