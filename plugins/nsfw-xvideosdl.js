import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

const handler = async (m, { conn, args, command, usedPrefix, text }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.adult_xvideosdl;

  if (!db.data.chats[m.chat].modohorny && m.isGroup) throw `${tradutor.texto1} #enable modohorny*`;
  if (!args[0]) throw `${tradutor.texto2} ${usedPrefix + command} https://www.xvideos.com/video...*`;

  try {
    await conn.reply(m.chat, `🚀 *Buscando la mejor calidad disponible...*`, m);
    
    const res = await xvideosdl(args[0]);
    
    // IMPORTANTE: Enviamos como 'document' para que WhatsApp NO comprima la calidad.
    await conn.sendMessage(m.chat, { 
      document: { url: res.result.url }, 
      mimetype: 'video/mp4', 
      fileName: `${res.result.title}.mp4`,
      caption: `🔥 *Título:* ${res.result.title}\n📈 *Vistas:* ${res.result.views}\n✅ *Calidad Detectada:* ${res.result.quality}\n\n> 📥 _Se envió como documento para mantener la calidad original._`
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    throw `❌ *Error al obtener el video de alta calidad.*`;
  }
};

handler.tags = ['nsfw'];
handler.help = ['xvideosdl'];
handler.command = /^(xvideosdl)$/i;

export default handler;

async function xvideosdl(url) {
  return new Promise((resolve, reject) => {
    fetch(`${url}`, { method: 'get' })
      .then(res => res.text())
      .then(html => {
        let $ = cheerio.load(html);
        
        const title = $("meta[property='og:title']").attr("content") || "Video";
        const views = $("div#video-tabs > div > div > div > div > strong.mobile-hide").text() || "N/A";

        /* LÓGICA DE CALIDAD MÁXIMA:
           Xvideos usa variables JS. Intentamos capturar 'setVideoUrlHigh' primero.
        */
        const videoHigh = (html.match(/setVideoUrlHigh\('(.*?)'\)/) || [])[1];
        const videoLow = (html.match(/setVideoUrlLow\('(.*?)'\)/) || [])[1];
        const videoHLS = (html.match(/setVideoHLS\('(.*?)'\)/) || [])[1];

        // Prioridad: High > Low > HLS
        let finalUrl = videoHigh || videoLow || videoHLS;
        let qualityLabel = videoHigh ? "720p (HD Real)" : "360p/480p (SD)";

        if (!finalUrl) return reject("No se encontró video.");

        resolve({ 
          status: 200, 
          result: { 
            title, 
            url: finalUrl, 
            views, 
            quality: qualityLabel 
          } 
        });
      })
      .catch(err => reject(err));
  });
          }

