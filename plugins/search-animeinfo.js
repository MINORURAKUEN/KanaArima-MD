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
    // Consulta GraphQL optimizada para imágenes EXTRA GRANDES y Banners
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
        bannerImage
        coverImage { 
          extraLarge  # MÁXIMA CALIDAD DE PORTADA DISPONIBLE
          large
        }
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
    
    // Traducción de estados técnicos
    const estadosRespaldo = {
        'FINISHED': 'Finalizado',
        'RELEASING': 'En emisión',
        'NOT_YET_RELEASED': 'Próximamente',
        'CANCELLED': 'Cancelado',
        'HIATUS': 'En pausa'
    };
    const estado = estadosRespaldo[result.status] || result.status;

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

    // SELECCIÓN INTELIGENTE DE IMAGEN DE ALTA CALIDAD
    // Prioridad: ExtraLarge Cover -> Banner -> Large Cover
    const imageHD = result.coverImage.extraLarge || result.bannerImage || result.coverImage.large;

    // Enviamos el archivo con la URL de alta resolución
    await conn.sendFile(m.chat, imageHD, 'anime_hd.jpg', AnimeInfo.trim(), m);

  } catch (e) {
    console.error(e);
    m.reply(`*${tradutor.texto3}*`);
  }
};

handler.help = ['anime <nombre>'];
handler.tags = ['buscadores'];
handler.command = /^(anime|animeinfo)$/i;

export default handler;
