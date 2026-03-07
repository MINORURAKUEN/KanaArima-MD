import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_mediafire;

  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  try {
    // 1. Obtener enlace directo y metadata
    const startTime = performance.now();
    const { name, size, link, mime } = await mediafireDl(args[0]);

    // 2. Iniciar descarga en el servidor para medir velocidad
    const response = await axios({
      method: 'get',
      url: link,
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    let downloadedBytes = 0;
    const t1 = performance.now();

    // Mensaje de carga inicial
    const { key } = await m.reply(`🚀 *Analizando:* ${name}\n⚖️ *Tamaño:* ${size}\n\n_Calculando velocidades..._`);

    // 3. Procesar el stream para calcular velocidad de descarga
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
    });

    // 4. Enviar a WhatsApp
    // Usamos el stream directamente para que la "subida" sea simultánea a la "descarga" (Piping)
    await conn.sendFile(m.chat, response.data, name, '', m, null, { 
      mimetype: mime, 
      asDocument: true 
    });

    const t2 = performance.now();
    const totalTime = (t2 - startTime) / 1000;
    
    // Calcular velocidad media (MB/s)
    // Convertimos bytes a MB y dividimos por segundos
    const sizeInMB = downloadedBytes / (1024 * 1024);
    const downloadSpeed = (sizeInMB / ((t2 - t1) / 1000)).toFixed(2);

    const finalCaption = `
✅ *¡DESCARGA COMPLETADA!*

📄 *Archivo:* ${name}
⚖️ *Tamaño:* ${size}
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s
📡 *Estado:* Enviado con éxito`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

  } catch (error) {
    console.error(error);
    await m.reply('❌ Error al procesar el archivo. Asegúrate de que el enlace sea público.');
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  const res = await axios.get(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const $ = cheerio.load(res.data);
  
  const downloadButton = $('#downloadButton');
  let link = downloadButton.attr('href');

  if (!link || link.includes('javascript:void(0)')) {
    const linkMatch = res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
    link = linkMatch ? linkMatch[1] : null;
  }

  if (!link) throw new Error('No se encontró el enlace.');

  // Limpieza de nombre (Evita duplicados y errores de extensión)
  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) {
    name += `.${urlExt}`;
  }

  const size = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim();
  const mime = lookup(name) || 'application/octet-stream';

  return { name, size, link, mime };
}
