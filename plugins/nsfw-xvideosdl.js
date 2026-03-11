import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

const handler = async (m, { conn, args, command, usedPrefix, text }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.adult_xvideosdl

  // Verificación de modo horny y argumentos
  if (!db.data.chats[m.chat].modohorny && m.isGroup) throw `${tradutor.texto1} #enable modohorny*`;
  if (!args[0]) throw `${tradutor.texto2} ${usedPrefix + command} https://www.xvideos.com/video70389849/pequena_zorra_follada_duro*`;

  try {
    await conn.reply(m.chat, `${tradutor.texto3}`, m);
    
    // Llamada a la función de descarga optimizada
    const res = await xvideosdl(args[0]);
    
    // Enviamos el video como documento para evitar pérdida de calidad y restricciones de tamaño
    await conn.sendMessage(m.chat, { 
      document: { url: res.result.url }, 
      mimetype: 'video/mp4', 
      fileName: `${res.result.title}.mp4`,
      caption: `🔥 *Título:* ${res.result.title}\n📈 *Vistas:* ${res.result.views}\n✅ *Calidad:* ${res.result.quality}`
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    throw `${tradutor.texto4}\n*◉ Verifica que el enlace sea correcto.*`;
  }
};

handler.tags = ['nsfw'];
handler.help = ['xvideosdl'];
handler.command = /^(xvideosdl)$/i;

export default handler;

/**
 * Función para extraer el video en la mejor calidad posible
 */
async function xvideosdl(url) {
  return new Promise((resolve, reject) => {
    fetch(`${url}`, { method: 'get' })
      .then(res => res.text())
      .then(html => {
        let $ = cheerio.load(html, { xmlMode: false });
        
        const title = $("meta[property='og:title']").attr("content") || "Video_Xvideos";
        const views = $("div#video-tabs > div > div > div > div > strong.mobile-hide").text() || "N/A";
        const thumb = $("meta[property='og:image']").attr("content");
        
        // Buscamos las URLs en los scripts internos (High > Low > HLS)
        let videoUrl = (html.match(/setVideoUrlHigh\('(.*?)'\)/) || [])[1] || 
                       (html.match(/setVideoUrlLow\('(.*?)'\)/) || [])[1] || 
                       (html.match(/setVideoHLS\('(.*?)'\)/) || [])[1];

        const quality = html.includes('setVideoUrlHigh') ? '720p/HD' : '360p/SD';

        if (!videoUrl) return reject("No se encontró un enlace de descarga válido.");

        resolve({ 
          status: 200, 
          result: { 
            title, 
            url: videoUrl, 
            views, 
            thumb, 
            quality 
          } 
        });
      })
      .catch(err => reject(err));
  });
}

/**
 * Función de búsqueda (Mantenida por si la necesitas en otro comando)
 */
async function xvideosSearch(query) {
  return new Promise(async (resolve) => {
    try {
      const res = await axios.get(`https://www.xvideos.com/?k=${query}&p=${Math.floor(Math.random() * 9) + 1}`);
      let $ = cheerio.load(res.data);
      let hasil = [];

      $("div.mozaique > div.thumb-block").each(function (a, b) {
        let title = $(this).find("p.title a").attr("title");
        let duration = $(this).find("span.duration").text();
        let url = "https://www.xvideos.com" + $(this).find("p.title a").attr("href");
        let thumb = $(this).find("div.thumb img").attr("data-src");
        let quality = $(this).find("span.video-hd-mark").text() || "SD";

        if (title) {
          hasil.push({ title, duration, quality, thumb, url });
        }
      });
      resolve(hasil);
    } catch (e) {
      resolve([]);
    }
  });
}

