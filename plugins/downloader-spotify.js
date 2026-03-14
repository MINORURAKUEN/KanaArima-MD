import axios from 'axios';
import fs from 'fs';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_spotify;

  if (!text) return m.reply(`${tradutor.texto1} _${usedPrefix + command} Good Feeling - Flo Rida_`);

  try {
    // 1. Buscar la canción (Usando tu API de búsqueda actual)
    const searchUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(text)}`;
    const { data: searchData } = await axios.get(searchUrl);

    if (!searchData?.status || !searchData?.result) {
        return m.reply(tradutor.texto2 || '❌ No se encontraron resultados.');
    }

    const track = searchData.result;
    const spotifyUrl = track.url; 

    await m.reply(`*[⏳] Descargando de Spotify...*`);

    // 2. Descargar usando la nueva API con tu API Key
    const apiKey = "causa-0e3eacf90ab7be15";
    const downloadApi = `https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodeURIComponent(spotifyUrl)}`;
    
    let downloadData = null;
    try {
        const { data: dlRes } = await axios.get(downloadApi);
        if (dlRes?.status && dlRes?.resultado) {
            downloadData = {
                title: dlRes.resultado.titulo || track.title,
                artist: dlRes.resultado.artista || track.artist,
                image: dlRes.resultado.portada || track.thumbnails,
                download: dlRes.resultado.url,
                duration: track.duration || 'N/A'
            };
        }
    } catch (e) {
        console.error('Error en API apicausas:', e.message);
    }

    // Fallback por si apicausas falla
    if (!downloadData) {
        downloadData = {
            title: track.title,
            artist: track.artist,
            image: track.thumbnails,
            download: track.audio,
            duration: track.duration
        };
    }

    if (!downloadData.download) throw 'No se pudo obtener el audio.';

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
    m.reply(tradutor.texto3 || '❌ Error inesperado.');
  }
};

handler.help = ['spotify <text>'];
handler.tags = ['downloader'];
handler.command = ['spotify', 'music'];

export default handler;
