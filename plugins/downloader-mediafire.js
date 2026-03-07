import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, args }) => {
  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  try {
    const startTime = performance.now();
    const { name, size, link, mime } = await mediafireDl(args[0]);

    // Mensaje de inicio
    const { key } = await m.reply(`🚀 *Descargando:* ${name}\n⚖️ *Tamaño:* ${size}`);

    // DESCARGA: Obtenemos el archivo en un Buffer para asegurar que no llegue en 0 kB
    const t1 = performance.now();
    const res = await axios.get(link, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const t2 = performance.now();

    const buffer = Buffer.from(res.data);
    const downloadSpeed = ((buffer.length / (1024 * 1024)) / ((t2 - t1) / 1000)).toFixed(2);

    // SUBIDA: Enviamos el archivo completo
    await conn.sendFile(m.chat, buffer, name, '', m, null, { 
      mimetype: mime, 
      asDocument: true 
    });

    const totalTime = (performance.now() - startTime) / 1000;

    const finalCaption = `
✅ *¡DESCARGA COMPLETADA!*

📄 *Archivo:* ${name}
⚖️ *Tamaño:* ${size}
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

  } catch (error) {
    console.error(error);
    await m.reply('❌ Error: El archivo es demasiado grande o el enlace expiró.');
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
  const $ = cheerio.load(res.data);
  const downloadButton = $('#downloadButton');
  let link = downloadButton.attr('href');

  if (!link || link.includes('javascript:void(0)')) {
    link = res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
  }

  // Limpieza de nombre única (evita el error de la captura anterior)
  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) name += `.${urlExt}`;

  const size = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim();
  const mime = lookup(name) || 'application/octet-stream';

  return { name, size, link, mime };
}
  return { name, size, link, mime };
}
