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
    throw `*¡Uso de Google Drive!* 💡\n\n*Archivo Individual:* \n_${usedPrefix + command} [link]_\n\n*Seleccionar de Carpeta:* \n_${usedPrefix + command} [link-carpeta] [número]_`;
  }

  const link = args[0];
  const indexSelected = parseInt(args[1]); // El número que elige el usuario (1, 2, 3...)
  const isFolder = link.includes('/folders/');

  try {
    if (isFolder) {
      // 1. Obtener lista de archivos de la carpeta
      const folderId = link.match(/\/folders\/(.{15,40})/)?.[1];
      if (!folderId) throw 'No se pudo extraer el ID de la carpeta.';
      
      conn.reply(m.chat, '📂 *Explorando carpeta...*', m);
      const files = await GDriveFolderList(folderId);

      // 2. Si el usuario NO eligió un número, mostramos el menú
      if (isNaN(indexSelected)) {
        let menu = `📂 *CONTENIDO DE LA CARPETA*\n\n`;
        menu += `Selecciona un archivo usando: \n_${usedPrefix + command} ${link} [número]_\n\n`;
        files.forEach((file, i) => {
          menu += `*${i + 1}.* 📄 ${file.name}\n`;
        });
        menu += `\n*Total:* ${files.length} archivos (Límite visual: 24)`;
        return m.reply(menu);
      }

      // 3. Si eligió un número, validar y descargar
      const fileIndex = indexSelected - 1;
      if (!files[fileIndex]) throw `El número *${indexSelected}* no es válido. Elige entre 1 y ${files.length}.`;

      const selectedFile = files[fileIndex];
      m.reply(`⏳ Descargando el archivo seleccionado: *${selectedFile.name}*...`);
      await downloadAndSend(selectedFile.id, selectedFile.name, conn, m, tradutor);

    } else {
      // Descarga normal de archivo único
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
    const fileName = knownName || res.fileName;

    if (res.sizeBytes > 2147483648) {
      return m.reply(`❌ El archivo *${fileName}* es demasiado grande (Límite 2GB).`);
    }

    const fileResponse = await fetch(res.downloadUrl);
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
    
    await pipeline(fileResponse.body, fs.createWriteStream(tempFilePath));

    await conn.sendMessage(m.chat, {
        document: { url: tempFilePath }, 
        fileName: fileName,
        mimetype: res.mimetype
    }, { quoted: m });

  } catch (err) {
    m.reply('Error al descargar el archivo seleccionado.');
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

// Función para listar archivos de una carpeta (Simulada por scraping)
async function GDriveFolderList(folderId) {
    // Usamos el visor embebido de Drive para obtener los nombres e IDs sin API KEY
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
    const html = await res.text();
    
    // Regex para capturar pares de [ID, Nombre] en el JSON interno de la página
    const files = [];
    const regex = /\["([a-zA-Z0-9_-]{25,})",\s*"([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        if (!files.find(f => f.id === match[1])) { // Evitar duplicados
            files.push({ id: match[1], name: match[2] });
        }
        if (files.length >= 24) break; // Límite de 24 como pediste
    }
    return files;
}

// Adaptación de tu función original para obtener link de descarga por ID
async function GDriveDlById(id) {
  const url = `https://drive.google.com/uc?id=${id}&authuser=0&export=download`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-drive-first-party': 'DriveWebUi'
    }
  });
  
  // Reutiliza aquí tu lógica de JSON.parse(rawText.slice(4)) para obtener el downloadUrl real
  // ... (Simplificado para el ejemplo)
  return { downloadUrl: url, sizeBytes: 0, mimetype: 'application/octet-stream' }; 
}

handler.command = /^(gdrive)$/i;
export default handler;
