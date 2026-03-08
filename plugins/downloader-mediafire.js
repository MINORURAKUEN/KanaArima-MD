import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  // Verificación de argumento (Enlace)
  if (!args[0]) throw `*< DESCARGAS - MEDIAFIRE />*\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} https://www.mediafire.com/file/ejemplo.zip`;

  try {
    // 1. Obtener metadatos mediante scraping
    const res = await mediafireDl(args[0]);
    const { name, size, mime, link } = res;

    await m.reply(`*📥 Preparando archivo...*\n\n*📝 Nombre:* ${name}\n*📁 Peso:* ${size}\n\n_El progreso de descarga y subida se muestra en la terminal del servidor._`);

    // 2. Configuración de ruta temporal (Uso de disco para estabilidad)
    const tempPath = join(tmpdir(), `${Date.now()}_${name.replace(/\s+/g, '_')}`);
    const writer = fs.createWriteStream(tempPath);

    console.log(`\n[MEDIAFIRE] 🚀 Comando ejecutado: .${command}`);
    console.log(`[MEDIAFIRE] 📦 Archivo: ${name}`);
    console.log(`[MEDIAFIRE] 🔗 Enlace: ${link}`);

    // 3. Descarga mediante Stream (Flujo de datos)
    const response = await axios({
      method: 'get',
      url: link,
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloadedLength = 0;

    // Evento de progreso en Terminal
    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      const progress = ((downloadedLength / totalLength) * 100).toFixed(2);
      
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`[MEDIAFIRE] 🔽 DESCARGANDO: ${progress}% (${(downloadedLength / 1024 / 1024).toFixed(2)} MB / ${(totalLength / 1024 / 1024).toFixed(2)} MB)`);
    });

    response.data.pipe(writer);

    // 4. Proceso de finalización y envío a WhatsApp
    writer.on('finish', async () => {
      console.log(`\n[MEDIAFIRE] ✅ Descarga local completada. Subiendo a WhatsApp...`);
      
      try {
        await conn.sendFile(m.chat, tempPath, name, '', m, null, { 
          mimetype: mime, 
          asDocument: true 
        });

        console.log(`[MEDIAFIRE] ✨ Archivo enviado con éxito: ${name}\n`);
      } catch (sendError) {
        console.error(`[MEDIAFIRE] ❌ Error al enviar archivo:`, sendError.message);
        m.reply('❌ Error al intentar subir el archivo a WhatsApp.');
      } finally {
        // Borrar siempre el archivo temporal para liberar espacio en el VPS
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    });

    writer.on('error', (err) => {
      console.error('[MEDIAFIRE] ❌ Error en Stream de escritura:', err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      m.reply('❌ Error crítico al procesar el archivo.');
    });

  } catch (error) {
    console.error('[MEDIAFIRE] ❌ Error General:', error.message);
    await m.reply(`❌ No se pudo procesar el enlace. Asegúrate de que sea un archivo directo.`);
  }
};

// Esta línea permite que el bot responda a .mediafire, .mediafiredl, .dlmediafire y .mf
handler.command = /^(mediafire|mediafiredl|dlmediafire|mf)$/i;

export default handler;

async function mediafireDl(url) {
  try {
    const res = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });
    const $ = cheerio.load(res.data);
    
    // Búsqueda del enlace de descarga
    let link = $('#downloadButton').attr('href') || 
               $('a#downloadButton').attr('href') ||
               res.data.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/)?.[0];

    if (!link) throw new Error('No se encontró el enlace directo.');

    // Metadatos
    const name = $('div.dl-btn-label').attr('title') || 
                 $('div.promoDownloadName').text().trim() || 
                 'archivo_descargado';
                 
    const size = $('#downloadButton').text()
                 .replace(/Download|[\(\)\n\t]/g, '')
                 .replace(/\s+/g, ' ').trim() || 'N/A';

    const ext = name.split('.').pop()?.toLowerCase();
    const mime = lookup(ext) || 'application/octet-stream';

    return { name, size, mime, link };
  } catch (e) {
    throw e;
  }
}
