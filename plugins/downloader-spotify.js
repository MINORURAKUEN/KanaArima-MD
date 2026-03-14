import axios from 'axios';
import fs from 'fs';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_spotify;

  if (!text) return m.reply(`${tradutor.texto1} _${usedPrefix + command} Good Feeling - Flo Rida_`);

  try {
    await m.reply(`*[⏳] Buscando en Spotify: ${text}...*`);

    // 1. Nueva API de Búsqueda (Reemplaza a la que falló con 402)
    const searchUrl = `https://api.vreden.my.id/api/spotifysearch?query=${encodeURIComponent(text)}`;
    const { data: searchData } = await axios.get(searchUrl);

    // Validamos que haya resultados
    if (!searchData?.result || searchData.result.length === 0) {
        return m.reply(tradutor.texto2 || '❌ No se encontraron resultados.');
    }

    // Tomamos el primer resultado de la búsqueda
    const track = searchData.result[0];
    const spotifyUrl = track.url || track.link; // Diferentes APIs usan .url o .link

    if (!spotifyUrl) throw 'No se pudo obtener el enlace de la canción.';

    // 2. Descargar usando la nueva API con tu API Key (apicausas)
    const apiKey = "causa-0e3eacf90ab7be15";
    const downloadApi = `https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodeURIComponent(spotifyUrl)}`;
    
    let downloadData = null;
    try {
        const { data: dlRes } = await axios.get(downloadApi);
        if (dlRes?.status && dlRes?.resultado) {
            downloadData = {
                title: dlRes.resultado.titulo || track.title || 'Desconocido',
                artist: dlRes.resultado.artista || track.artist || 'Desconocido',
                image: dlRes.resultado.portada || track.image || 'https://i.ibb.co/3S7mY8V/spotify.jpg',
                download: dlRes.resultado.url,
                duration: dlRes.resultado.duracion || track.duration || 'N/A'
            };
        }
    } catch (e) {
        console.error('Error en API apicausas:', e.message);
    }

    if (!downloadData || !downloadData.download) throw 'Las APIs de descarga están caídas.';

    // 3. Texto blindado contra errores de Baileys
    const caption = `🎵 *Título:* ${downloadData.title}\n👤 *Artista:* ${downloadData.artist}\n⏱ *Duración:* ${downloadData.duration}\n🔗 *Link:* ${spotifyUrl}`.trim();

    // 4. Envío de imagen con información (Sin linkPreview para evitar el crash)
    await conn.sendMessage(m.chat, {
        image: { url: downloadData.image },
        caption: String(caption)
    }, { 
        quoted: m,
        contextInfo: {
            externalAdReply: {
                showAdAttribution: true,
                title: downloadData.title.slice(0, 40),
                body: downloadData.artist.slice(0, 40),
                mediaType: 1,
                thumbnailUrl: downloadData.image,
                sourceUrl: spotifyUrl
            }
        }
    });

    // 5. Envío del Audio
    await conn.sendMessage(m.chat, {
      audio: { url: downloadData.download },
      fileName: `${downloadData.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    m.reply(tradutor.texto3 || '❌ Ocurrió un error al intentar descargar la canción.');
  }
};

handler.help = ['spotify <text>'];
handler.tags = ['downloader'];
handler.command = ['spotify', 'music'];

export default handler;
  
