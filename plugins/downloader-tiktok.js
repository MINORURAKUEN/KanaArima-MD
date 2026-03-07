import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const handler = async (m, {conn, text, args, usedPrefix, command}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.descargas_tiktok

  // Validaciones de URL
  if (!text) throw `${tradutor.texto1} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`;
  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) throw `${tradutor.texto2} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`;
  
  await m.reply(tradutor.texto3); // "Descargando..."
  
  try {
      // Sistema de búsqueda con respaldo (Fallback)
      const download = await getTikTokVideo(args[0]);
      
      if (!download) throw new Error('Servidores fuera de línea');

      const cap = `${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}`;
      
      await conn.sendMessage(m.chat, {
          video: { url: download }, 
          caption: cap,
          mimetype: 'video/mp4'
      }, {quoted: m});

    } catch (e) {
      console.error(e);
      throw `${tradutor.texto9}`;
    }
};

handler.help = ['tiktok'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(tiktok|ttdl|tiktokdl|tt|ttnowm|tiktokaudio)$/i;

export default handler;

/**
 * Función maestra para obtener el video de TikTok
 */
async function getTikTokVideo(url) {
    // MÉTODO 1: Tu código original (instatiktok.com)
    try {
        const SITE_URL = 'https://instatiktok.com/';
        const form = new URLSearchParams();
        form.append('url', url);
        form.append('platform', 'tiktok');

        const res = await axios.post(`${SITE_URL}api`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = res?.data?.html;
        if (html && res?.data?.status === 'success') {
            const $ = cheerio.load(html);
            const links = [];
            $('a.btn[href^="http"]').each((_, el) => {
                const link = $(el).attr('href');
                if (link) links.push(link);
            });
            const bestLink = links.find(link => /hdplay/.test(link)) || links[0];
            if (bestLink) return bestLink;
        }
    } catch (e) { console.log("Método 1 falló"); }

    // MÉTODO 2: API de Respaldo Tiklydown (Muy estable)
    try {
        const res2 = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`);
        if (res2.data.status && res2.data.result.video) return res2.data.result.video;
    } catch (e) { console.log("Método 2 falló"); }

    // MÉTODO 3: API de Alyachan (Respaldo final)
    try {
        const res3 = await axios.get(`https://api.alyachan.dev/api/tiktok?url=${encodeURIComponent(url)}&apikey=Gata-Dios`);
        if (res3.data.result && res3.data.result.video) return res3.data.result.video;
    } catch (e) { console.log("Método 3 falló"); }

    return null;
}
