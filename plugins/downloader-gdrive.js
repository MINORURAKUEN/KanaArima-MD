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
    throw `*¡Uso de Google Drive!* 💡\n\n*Archivo Individual:* \n_${usedPrefix + command} [link]_\n\n*Seleccionar de Carpeta (1 al 24):* \n_${usedPrefix + command} [link-carpeta] [número]_`;
  }

  const link = args[0];
  const indexSelected = parseInt(args[1]);
  const isFolder = link.includes('/folders/') || link.includes('id=') || link.includes('/drive/mobile/folders/');

  try {
    if (isFolder) {
      const folderId = link.match(/\/folders\/(.{15,40})/)?.[1] || link.match(/id=(.{15,40})/)?.[1];
      if (!folderId) throw 'No se pudo extraer el ID de la carpeta.';
      
      const files = await GDriveFolderList(folderId);
      if (!files || files.length === 0) throw 'No se encontraron archivos. Asegúrate de que la carpeta sea *Pública*.';

      // Si no ha seleccionado un número, mostrar la lista
      if (isNaN(indexSelected)) {
        let menu = `📂 *CONTENIDO DE LA CARPETA*\n\n`;
        files.forEach((file, i) => {
          menu += `*${i + 1}.* 📄 ${file.name}\n`;
        });
        menu += `\n*Para descargar uno, escribe:* \n_${usedPrefix + command} ${link} [número]_`;
        return m.reply(menu);
      }

      const fileIndex = indexSelected - 1;
      if (!files[fileIndex]) throw `El número *${indexSelected}* no es válido. Elige entre 1 y ${files.length}.`;

      const selectedFile = files[fileIndex];
      conn.reply(m.chat, `⏳ Procesando: *${selectedFile.name}*...`, m);
      await downloadAndSend(selectedFile.id, selectedFile.name, conn, m, tradutor);

    } else {
      // Descarga directa de archivo
      const fileId = link.match(/\/?id=(.+)/i)?.[1] || link.match(/\/d\/(.*?)\//)?.[1];
      await downloadAndSend(fileId, null, conn, m, tradutor);
    }

  } catch (e) {
    m.reply(typeof e === 'string' ? e : 'Error al procesar la solicitud.');
    console.error(e);
  }
};

async function downloadAndSend(id, knownName, conn, m, tradutor) {
  let tempFilePath;
  try {
    const res = await GDriveDlById(id);
    const fileName = (knownName || res.fileName || 'archivo_drive').replace(/[\\/:*?"<>|]/g, '_');
    
    const fileResponse = await fetch(res.downloadUrl);
    if (!fileResponse.ok) throw `Error HTTP: ${fileResponse.statusText}`;

    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
    const totalBytes = parseInt(fileResponse.headers.get('content-length')) || 0;
    
    let downloadedBytes = 0;
    const startTime = Date.now();

    const downloadProgress = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        const now = Date.now();
        const duration = (now - startTime) / 1000;
        const speed = duration > 0 ? (downloadedBytes / duration / 1024 / 1024).toFixed(2) : 0;
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '??';
        
        // LOG EN UNA SOLA FILA LIMPIA (ANSI Escape Codes)
        process.stdout.write(`\r\x1b[K📥 [GDRIVE] ${percent}% | ${speed} MB/s | ${fileName.substring(0, 25)}...`);
        
        callback(null, chunk);
      }
    });

    await pipeline(fileResponse.body, downloadProgress, fs.createWriteStream(tempFilePath));
    process.stdout.write('\n✅ Descarga completada. Enviando a WhatsApp...\n');

    await conn.sendMessage(m.chat, {
        document: { url: tempFilePath }, 
        fileName: fileName,
        mimetype: fileResponse.headers.get('content-type') || 'application/octet-stream'
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply('Error al descargar o enviar el archivo.');
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

async function GDriveFolderList(folderId) {
  // Forzamos la vista móvil para una lectura más sencilla del HTML
  const res = await fetch(`https://drive.google.com/drive/u/0/mobile/folders/${folderId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15' }
  });
  const html = await res.text();
  
  const files = [];
  const regex = /"([a-zA-Z0-9_-]{25,})",\["([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const name = match[2].replace(/\\u003d/g, '=').replace(/\\u0027/g, "'");
    if (!files.find(f => f.id === id)) {
      files.push({ id, name });
    }
    if (files.length >= 24) break; 
  }
  return files;
}

async function GDriveDlById(id) {
  const baseUrl = `https://drive.google.com/uc?id=${id}&export=download`;
  const res = await fetch(baseUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = await res.text();

  // Bypass para la advertencia de archivos grandes (Virus Scan Warning)
  if (text.includes('confirm=')) {
    const confirmToken = text.match(/confirm=([a-zA-Z0-9_-]+)/)?.[1] || 't';
    return {
      downloadUrl: `${baseUrl}&confirm=${confirmToken}`,
      fileName: text.match(/<span class="uc-name-size">.*?>(.*?)<\/a>/)?.[1] || 'archivo'
    };
  }

  return {
    downloadUrl: baseUrl,
    fileName: 'archivo'
  };
}

handler.command = /^(gdrive)$/i;
export default handler;
