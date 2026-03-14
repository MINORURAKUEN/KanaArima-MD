import axios from 'axios';
import fs from 'fs';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_spotify;

  if (!text) return m.reply(`${tradutor.texto1} _${usedPrefix + command} Good Feeling - Flo Rida_`);

  try {
    // 1. Buscar la canción
    let songInfo = await spotifyxv(text);
    if (!songInfo.length) return m.reply(tradutor.texto2);
    let song = songInfo[0];

    await m.reply(`*[⏳] Procesando descarga: ${song.name}...*`);

    const apiKey = "causa-0e3eacf90ab7be15";
    const encodedUrl = encodeURIComponent(song.url);
    
    let downloadData = null;

    // 2. Intento con API principal (apicausas)
    try {
      const res = await axios.get(`https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodedUrl}`);
      if (res.data?.status && res.data?.resultado) {
        downloadData = {
          title: res.data.resultado.titulo || song.name,
          artist: res.data.resultado.artista || song.artista[0],
          image: res.data.resultado.portada || song.imagen,
          download: res.data.resultado.url,
          duration: song.duracion || 'N/A'
        };
      }
    } catch (e) {
      console.error('Error en API apicausas:', e.message);
    }

    // 3. Fallback a Stellar si la primera falla
    if (!downloadData) {
      const resFallback = await axios.get(`${global.APIs.stellar}/dow/spotify?url=${song.url}&apikey=${global.APIKeys[global.APIs.stellar]}`);
      if (resFallback.data?.data?.download) {
        const dataF = resFallback.data.data;
        downloadData = {
          title: dataF.title,
          artist: dataF.artist,
          image: dataF.image,
          download: dataF.download,
          duration: dataF.duration
        };
      }
    }

    if (!downloadData || !downloadData.download) throw 'No se pudo obtener el enlace de descarga.';

    // 4. Construcción del texto (Asegurando que sea String para evitar el error text.match)
    let spotifyi = ` _${tradutor.texto2[0]}_\n\n`;
    spotifyi += ` ${tradutor.texto2[1]} ${downloadData.title}\n`;
    spotifyi += ` ${tradutor.texto2[2]} ${downloadData.artist}\n`; 
    spotifyi += ` ${tradutor.texto2[3]} ${song.album || 'N/A'}\n`;
    spotifyi += ` ${tradutor.texto2[4]} ${downloadData.duration}\n\n`;
    spotifyi += `> ${tradutor.texto2[5]}`;

    // 5. Envío del mensaje con miniatura (Solución al error de Baileys)
    await conn.sendMessage(m.chat, {
      text: String(spotifyi.trim()), // Forzamos String aquí
      contextInfo: {
        forwardingScore: 9999999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,
          containsAutoReply: true,
          renderLargerThumbnail: true,
          title: global.titulowm2 || 'Spotify Downloader',
          mediaType: 1,
          thumbnailUrl: downloadData.image,
          mediaUrl: song.url,
          sourceUrl: song.url
        }
      }
    }, { quoted: m });

    // 6. Envío del Audio
    await conn.sendMessage(m.chat, {
      audio: { url: downloadData.download },
      fileName: `${downloadData.title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    m.reply(`${tradutor.texto3}`);
  }
};

handler.help = ['spotify <text>'];
handler.tags = ['downloader'];
handler.command = ['spotify', 'music'];
export default handler;

async function spotifyxv(query) {
  try {
    const res = await axios.get(`${global.APIs.stellar}/search/spotify?query=${query}&apikey=${global.APIKeys[global.APIs.stellar]}`, { responseType: 'json' });
    if (!res.data?.status || !res.data?.data?.length) return [];
    const firstTrack = res.data.data[0];
    return [{
      name: firstTrack.title,
      artista: [firstTrack.artist],
      album: firstTrack.album,
      duracion: firstTrack.duration,
      url: firstTrack.url,
      imagen: firstTrack.image || ''
    }];
  } catch {
    return [];
  }
}
