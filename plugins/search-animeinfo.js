import axios from 'axios';
import translate from '@vitalets/google-translate-api';
import fs from 'fs';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.buscador_animeinfo;

  if (!text) return m.reply(`*${tradutor.texto1}*`);

  try {
    const query = `
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        title { romaji english native }
        studios(isMain: true) { nodes { name } }
        seasonYear
        episodes
        genres
        duration
        format
        season
        status
        description
        coverImage { large }
      }
    }`;

    const { data } = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { search: text }
    });

    const result = data.data.Media;
    if (!result) throw tradutor.texto3;

    // Traducción de la sinopsis
    const cleanDesc = result.description ? result.description.replace(/<br>|<i>|<\/i>|<b>|<\/b>/g, '') : 'No disponible';
    const safeTranslate = async (txt) => {
      try {
        const res = await translate(txt, { to: 'es', autoCorrect: true });
        return res.text;
      } catch { return txt; }
    };

    const sinopsisTranslate = await safeTranslate(cleanDesc);
    
    // Mapeo de datos para el diseño
    const titulo = result.title.romaji || result.title.english;
    const estudios = result.studios.nodes.map(s => s.name).join(', ') || 'N/A';
    const generos = result.genres.join(', ') || 'N/A';
    const estado = result.status === 'FINISHED' ? 'Finalizado' : result.status === 'RELEASING' ? 'En emisión' : result.status;

    const AnimeInfo = `
㊙️ ❘ Título: ${titulo}
🏦 ❘ Estudio/s: ${estudios}
📆 ❘ Año: ${result.seasonYear || 'N/A'}
🗂 ❘ Episodios: ${result.episodes || 'En emisión'}
🎧 ❘ Audio: Japonés
💬 ❘ Subtitulos: Español
🏷 ❘ Género: ${generos}
⏱ ❘ Duración: ${result.duration ? result.duration + ' min' : 'N/A'}
💽 ❘ Formato: ${result.format || 'N/A'}
🔅 ❘ Temporada: ${result.season || 'N/A'}
⏳ ❘ Estado: ${estado}
📜 ❘ Sinopsis: ${sinopsisTranslate}`;

    const image = result.coverImage.large;

    await conn.sendFile(m.chat, image, 'anime.jpg', AnimeInfo.trim(), m);

  } catch (e) {
    console.error(e);
    m.reply(`*${tradutor.texto3}*`);
  }
};

handler.help = ['anime <nombre>'];
handler.tags = ['buscadores'];
handler.command = /^(anime|animeinfo)$/i;

export default handler;
