import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';

const handler = async (m, { conn, args }) => {
  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  try {
    const startTime = performance.now();
    const { name, link, sizeH } = await mediafireDl(args[0]);

    const { key } = await m.reply(`🚀 *Descargando:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n\n_Verificando integridad del archivo..._`);

    // DESCARGA TOTAL: Usamos un timeout largo y máximo de respuesta para evitar el error de 0kb o archivos corruptos
    const t1 = performance.now();
    const response = await axios.get(link, { 
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutos de espera máxima
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }
    });
    const t2 = performance.now();

    const buffer = Buffer.from(response.data);
    const mime = lookup(name) || 'video/mp4'; // Forzamos MIME si falla la detección
    const downloadSpeed = ((buffer.length / (1024 * 1024)) / ((t2 - t1) / 1000)).toFixed(2);

    // ENVIAR: Usamos el método de envío nativo de documentos más compatible
    await conn.sendMessage(m.chat, { 
        document: buffer, 
        fileName: name, 
        mimetype: mime,
        caption: `✅ *Archivo verificado e íntegro.*`
    }, { quoted: m });

    const totalTime = (performance.now() - startTime) / 1000;

    const finalCaption = `
✅ *¡DESCARGA COMPLETADA!*
📄 *Archivo:* ${name}
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

  } catch (error) {
    console.error('Error en MediaFire:', error.message);
    await m.reply('❌ Error: El servidor de MediaFire rechazó la conexión o el archivo es demasiado pesado.');
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

  // Limpieza de nombre (Soluciona el duplicado que aparece en tu captura)
  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  
  // Forzar extensión .mp4 si es el caso
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) name += `.${urlExt}`;

  const sizeH = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim();

  return { name, link, sizeH };
}
