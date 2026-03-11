import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

const handler = async (m, { conn, args, command, usedPrefix, text }) => {
  const usuario = global.db.data.users[m.sender];
  const idioma = usuario.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf8'));
  const tradutor = _translate.plugins.animedl || { texto3: 'Descargando anime...', texto4: 'Error al obtener el anime.' };

  if (!args[0]) throw `*¡Falta el enlace!* 🎬\nUso: ${usedPrefix + command} https://animevideo.com/ver/video-id`;

  try {
    await conn.reply(m.chat, tradutor.texto3, m);

    const res = await animeDownloader(args[0]);
    
    if (!res.url) throw 'No encontré un enlace de video compatible.';

    // Enviamos el video
    await conn.sendMessage(m.chat, { 
      video: { url: res.url }, 
      caption: `🎬 *Título:* ${res.title}\n✨ *Calidad:* ${res.quality || 'Auto'}`,
      mimetype: 'video/mp4'
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    throw `${tradutor.texto4}\n\n*Nota:* Algunas páginas protegen sus videos. Prueba con enlaces directos de reproductores.`;
  }
};

handler.tags = ['anime'];
handler.help = ['animedl'];
handler.command = /^(animedl|dl-anime)$/i;

export default handler;

/**
 * Función Maestra de Descarga
 * Intenta extraer el video dependiendo del dominio
 */
async function animeDownloader(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    let videoUrl = '';
    let title = $("title").text() || "Anime Video";

    // Lógica para detectar el servidor de video
    // 1. Buscar en etiquetas <video> o <source>
    videoUrl = $("video source").attr("src") || $("video").attr("src");

    // 2. Si es un iframe (común en páginas de anime)
    if (!videoUrl) {
      const iframeSrc = $("iframe").attr("src");
      if (iframeSrc) {
        // Aquí podrías añadir lógica para resolver el iframe de Fembed, Vidoza, etc.
        videoUrl = iframeSrc; 
      }
    }

    // 3. Metadatos de OpenGraph
    const thumb = $("meta[property='og:image']").attr("content");

    return {
      title: title.replace(' - Ver Anime Online', '').trim(),
      url: videoUrl,
      thumb: thumb
    };
  } catch (err) {
    return { error: err.message };
  }
}

