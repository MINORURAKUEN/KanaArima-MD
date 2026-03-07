import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, args }) => {
  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  try {
    const startTime = performance.now();
    const { name, link, mime, sizeH } = await mediafireDl(args[0]);

    const { key } = await m.reply(`🚀 *Descargando:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n\n_Preparando archivo para WhatsApp..._`);

    const t1 = performance.now();
    // Descargamos con configuración específica para evitar corrupción
    const res = await axios.get(link, { 
        responseType: 'arraybuffer',
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': args[0]
        }
    });
    const t2 = performance.now();

    const buffer = Buffer.from(res.data);
    const downloadSpeed = ((buffer.length / (1024 * 1024)) / ((t2 - t1) / 1000)).toFixed(2);

    // ENVIAR ARCHIVO: Usamos un objeto literal para asegurar el reconocimiento del tipo
    await conn.sendMessage(m.chat, { 
        document: buffer, 
        fileName: name, 
        mimetype: mime 
    }, { quoted: m });

    const totalTime = (performance.now() - startTime) / 1000;

    const finalCaption = `
✅ *¡DESCARGA COMPLETADA!*
📄 *Archivo:* ${name}
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

  } catch (error) {
    console.error(error);
    await m.reply('❌ Error: El archivo es demasiado grande o MediaFire bloqueó la conexión.');
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  const res = await axios.get(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' }
  });
  const $ = cheerio.load(res.data);
  const downloadButton = $('#downloadButton');
  let link = downloadButton.attr('href');

  if (!link || link.includes('javascript:void(0)')) {
    link = res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
  }

  // Limpieza de nombre (Solución al duplicado que vimos en tus fotos)
  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  
  // Forzar extensión correcta
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) {
    name += `.${urlExt}`;
  }

  const sizeH = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim();
  const mime = lookup(name) || 'application/octet-stream';

  return { name, link, mime, sizeH };
}
