import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs'; // Añadido: Importación necesaria para leer el idioma

const handler = async (m, {conn, args, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_mediafire;

  if (!args[0]) throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingrese un enlace de MediaFire.*`;
  
  try {
    const startTime = Date.now(); // Inicio del cronómetro
    const res = await mediafireDl(args[0]);
    const {name, size, date, mime, link} = res;
    
    // Cálculo de velocidad simulada o tiempo de respuesta
    const endTime = Date.now();
    const speed = (endTime - startTime) / 1000; // Tiempo en segundos

    const caption = `
${tradutor.texto2[0]}
*ARCHIVO:* ${name}
*TAMAÑO:* ${size}
*TIPO:* ${mime}
*TIEMPO DE RESPUESTA:* ${speed.toFixed(2)}s
*ESTADO:* Enviando archivo...`.trim();

    await m.reply(caption);

    // Enviamos el archivo
    await conn.sendFile(m.chat, link, name, '', m, null, { mimetype: mime, asDocument: true });

  } catch (error) {
    console.error('Error en MediaFire:', error);
    await m.reply('❌ Ocurrió un error al procesar el enlace. Inténtalo de nuevo.');
  }
};

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  try {
    if (!url.includes('www.mediafire.com')) throw new Error('URL inválida');
    
    // Configuración de Axios para obtener info del archivo
    const res = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    
    const $ = cheerio.load(res.data);
    const downloadButton = $('#downloadButton');
    let link = downloadButton.attr('href');

    // Lógica de extracción del enlace (Scraping profundo)
    if (!link || link.includes('javascript:void(0)')) {
        const htmlContent = res.data;
        const linkMatch = htmlContent.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
        link = linkMatch ? linkMatch[1] : null;
    }

    if (!link) throw new Error('No se encontró el botón de descarga.');

    const name = $('.filename').text().trim() || 'archivo_desconocido';
    const size = $('#downloadButton').text().replace('Download', '').trim();
    const ext = name.split('.').pop()?.toLowerCase();
    const mime = lookup(ext) || 'application/octet-stream';

    return { name, size, mime, link };
  } catch (error) {
    throw error;
  }
}
