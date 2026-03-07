import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';

const handler = async (m, {conn, args, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_mediafire;

  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;
  
  try {
    const startTime = Date.now();
    const res = await mediafireDl(args[0]);
    const {name, size, mime, link} = res;
    
    const speed = (Date.now() - startTime) / 1000;

    const caption = `
< DESCARGAS - MEDIAFIRE />
*ARCHIVO:* ${name}
*TAMAÑO:* ${size}
*TIPO:* ${mime}
*TIEMPO DE RESPUESTA:* ${speed.toFixed(2)}s
*ESTADO:* Enviando archivo...`.trim();

    await m.reply(caption);

    // Forzamos el nombre del archivo en el envío para evitar el .bin
    await conn.sendFile(m.chat, link, name, '', m, null, { mimetype: mime, asDocument: true });

  } catch (error) {
    console.error('Error en MediaFire:', error);
    await m.reply('❌ No se pudo procesar el archivo.');
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  try {
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

    // 1. Extraer nombre base limpiando duplicados
    let rawName = $('.promoDownloadName').first().attr('title') || 
                  $('.filename').first().text().trim() || 
                  'archivo_descargado';

    // 2. Limpieza profunda del nombre (quitar repetidos y espacios extra)
    let cleanName = rawName.replace(/\s+/g, ' ').split('\n')[0].trim();

    // 3. Asegurar extensión (MediaFire a veces la oculta en el texto del botón)
    const urlExt = link.split('.').pop().split('?')[0];
    if (!cleanName.includes('.') && urlExt) {
        cleanName += `.${urlExt}`;
    }

    const size = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim() || 'Desconocido';
    const mime = lookup(cleanName) || 'application/octet-stream';

    return { name: cleanName, size, mime, link };
  } catch (error) {
    throw error;
  }
}
