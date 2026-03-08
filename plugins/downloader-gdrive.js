import fetch from 'node-fetch';
import { sizeFormatter } from 'human-readable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';

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
    throw `${tradutor.texto1} _${usedPrefix + command} https://drive.google.com/file/d/1dmHlx1WTbH5yZoNa_ln325q5dxLn1QHU/view_`;
  }

  let tempFilePath; // Declaramos la variable aquí para poder borrar el archivo en el bloque catch si algo falla

  try {
    // 1. Obtener metadatos y link directo
    conn.reply(m.chat, tradutor.texto2 || '🔄 Obteniendo enlace de descarga...', m);
    const res = await GDriveDl(args[0]);
    
    if (!res) throw 'No se pudo obtener el enlace de Google Drive.';

    // Límite de 100 MB = 104857600 bytes
    if (res.sizeBytes > 104857600) { 
        throw `El archivo es demasiado grande para enviarlo por WhatsApp (${res.fileSize}). El límite es de 100MB.`;
    }

    // 2. PROCESO DE DESCARGA (Al servidor del bot)
    // conn.reply(m.chat, `📥 Descargando *${res.fileName}* al servidor...`, m); // Opcional: Avisar que empezó la descarga
    const fileResponse = await fetch(res.downloadUrl);
    if (!fileResponse.ok) throw `Error al descargar el archivo: ${fileResponse.statusText}`;

    // Crear ruta temporal segura usando la carpeta temporal del sistema operativo
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${res.fileName}`);
    
    // Usamos pipeline para guardar el archivo en el disco sin saturar la RAM
    await pipeline(fileResponse.body, fs.createWriteStream(tempFilePath));

    // 3. PROCESO DE SUBIDA (A WhatsApp)
    // conn.reply(m.chat, '📤 Subiendo archivo a WhatsApp...', m); // Opcional: Avisar que empezó la subida
    
    // Se utiliza sendMessage enviando la ruta del archivo local
    await conn.sendMessage(m.chat, {
        document: { url: tempFilePath }, // WhatsApp leerá el archivo desde esta ruta local
        fileName: res.fileName,
        mimetype: res.mimetype
    }, { quoted: m });

    // 4. LIMPIEZA (Borrar el archivo temporal)
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }

  } catch (e) {
    m.reply(typeof e === 'string' ? e : tradutor.texto3);
    console.error('[ERROR DEL PLUGIN GDRIVE]:', e);
    
    // Limpieza de emergencia en caso de error a mitad del proceso
    if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
  }
};

handler.command = /^(gdrive)$/i;
export default handler;

// La función GDriveDl permanece igual a la versión refactorizada anterior
async function GDriveDl(url) {
  if (!(url && url.match(/drive\.google/i))) throw 'URL no válida';
  
  const idMatch = url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//);
  const id = idMatch ? idMatch[1] : null;
  if (!id) throw 'ID no encontrado';

  const res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
    method: 'post',
    headers: {
      'accept-encoding': 'gzip, deflate, br',
      'content-length': '0',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'origin': 'https://drive.google.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
      'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
      'x-drive-first-party': 'DriveWebUi',
      'x-json-requested': 'true'
    }
  });

  const rawText = await res.text();
  const { fileName, sizeBytes, downloadUrl } = JSON.parse(rawText.slice(4));
  
  if (!downloadUrl) throw '¡Límite de descarga alcanzado o el archivo es privado!';
  
  const data = await fetch(downloadUrl); // Solo para obtener los headers (mimetype)
  if (data.status !== 200) throw `Error HTTP: ${data.statusText}`;

  return { 
    downloadUrl, 
    fileName, 
    sizeBytes: Number(sizeBytes),
    fileSize: formatSize(sizeBytes), 
    mimetype: data.headers.get('content-type') 
  };
}
