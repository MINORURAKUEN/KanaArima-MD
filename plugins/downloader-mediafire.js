import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { join } from 'path';

const handler = async (m, { conn, args }) => {
  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;

  // Creamos una carpeta temporal si no existe
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  try {
    const startTime = performance.now();
    const { name, link, mime } = await mediafireDl(args[0]);

    const { key } = await m.reply(`⏳ *Descargando archivo al servidor...*\n_Esto evita el error de 0 kB._`);

    const filePath = join(tmpDir, `${Date.now()}_${name}`);
    const writer = fs.createWriteStream(filePath);

    // 1. Descarga real al disco
    const t1 = performance.now();
    const response = await axios({
      method: 'get',
      url: link,
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    const t2 = performance.now();

    // 2. Obtener estadísticas del archivo físico
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const downloadSpeed = (fileSizeMB / ((t2 - t1) / 1000)).toFixed(2);

    // 3. Enviar el archivo desde el disco
    await conn.sendFile(m.chat, filePath, name, '', m, null, { 
      mimetype: mime, 
      asDocument: true 
    });

    const totalTime = (performance.now() - startTime) / 1000;

    const finalCaption = `
✅ *¡LOGRADO!*
📄 *Archivo:* ${name}
⚖️ *Tamaño:* ${fileSizeMB} MB
⏱️ *Tiempo total:* ${totalTime.toFixed(2)}s
⚡ *Vel. Descarga:* ${downloadSpeed} MB/s`.trim();

    await conn.sendMessage(m.chat, { text: finalCaption, edit: key });

    // 4. Limpieza: Borrar archivo temporal para no llenar el disco
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error(error);
    await m.reply('❌ Error crítico al descargar. El enlace podría estar roto.');
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

  let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
  name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
  
  const urlExt = link.split('.').pop().split('?')[0];
  if (!name.toLowerCase().endsWith(urlExt.toLowerCase())) name += `.${urlExt}`;

  const mime = lookup(name) || 'application/octet-stream';
  return { name, link, mime };
}
