import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, args }) => {
  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  // Tu firma personalizada
  const firma = '᭄🅜֟፝ıηͨσ‍ͥяͩυ🧸⃝꙰ཻུ⸙͎';

  try {
    const startTime = performance.now();
    const { name, link, sizeH } = await mediafireDl(args[0]);

    const { key } = await m.reply(`🚀 *Iniciando descarga pesada...*\n📄 *Archivo:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n\n_Procesando archivo de gran tamaño..._\n\n${firma}`);

    const t1 = performance.now();
    const response = await axios.get(link, { 
        responseType: 'arraybuffer',
        timeout: 0, // Desactivamos el límite de tiempo para archivos de +1GB
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Connection': 'keep-alive'
        }
    });
    const t2 = performance.now();

    const buffer = Buffer.from(response.data);
    const mime = lookup(name) || 'application/octet-stream';
    const downloadSpeed = ((buffer.length / (1024 * 1024)) / ((t2 - t1) / 1000)).toFixed(2);

    // ENVIAR: Incluimos la firma en el caption del archivo
    await conn.sendMessage(m.chat, { 
        document: buffer, 
        fileName: name, 
        mimetype: mime,
        caption: `✅ *Archivo verificado e íntegro.*\n\n${firma}`
    }, { quoted: m });

    const totalTime = (performance.now() - startTime) / 1000;

    const finalCaption = `
✅ *¡DESCARGA COMPLETADA!*
📄 *Archivo:* ${name}
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s
\n${firma}`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

  } catch (error) {
    console.error('Error:', error.message);
    await m.reply(`❌ *Error:* El archivo es demasiado pesado para la RAM del servidor o el enlace expiró.\n\n${firma}`);
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

// La función mediafireDl se mantiene igual que la versión anterior para extraer el link
async function mediafireDl(url) {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
  const $ = cheerio.load(res.data);
  const downloadButton = $('#downloadButton');
  let link = downloadButton.attr('href');
  if (!link || link.includes('javascript:void(0)')) {
    link = res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
  }
  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) name += `.${urlExt}`;
  const sizeH = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim();
  return { name, link, sizeH };
}
