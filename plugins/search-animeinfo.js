import axios from 'axios';
import translate from '@vitalets/google-translate-api';
import fs from 'fs';

const handler = async (m, { conn, text, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.buscador_animeinfo;

  if (!text) return m.reply(`*${tradutor.texto1}*`);

  try {
    // Consulta a la API de JustWatch (GraphQL)
    const query = {
      query: `
        query GetSuggestedTitles($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) {
          suggestedTitles(country: $country, language: $language, first: $first, filter: $filter) {
            edges {
              node {
                title
                releaseYear
                objectType
                shortDescription
                poster
                backdrops { backdropUrl }
                offers {
                  monetizationType
                  package { clearName }
                }
              }
            }
          }
        }`,
      variables: {
        country: "ES", // Puedes cambiarlo a tu país (MX, AR, PE, etc.)
        language: "es",
        first: 1,
        filter: { searchQuery: text }
      }
    };

    const { data } = await axios.post('https://apis.justwatch.com/graphql', query);
    const result = data.data.suggestedTitles.edges[0]?.node;

    if (!result) throw tradutor.texto3;

    // Traducción de la descripción si es necesario
    const safeTranslate = async (txt) => {
      if (!txt) return 'No disponible';
      try {
        const res = await translate(txt, { to: 'es', autoCorrect: true });
        return res.text;
      } catch {
        return txt;
      }
    };

    const descripcion = await safeTranslate(result.shortDescription);

    // Formatear plataformas donde ver
    const plataformas = result.offers 
      ? [...new Set(result.offers.map(o => o.package.clearName))].join(', ') 
      : 'No disponible en plataformas de streaming';

    const posterUrl = result.poster 
      ? `https://images.justwatch.com${result.poster.replace('{profile}', 's592')}` 
      : 'https://via.placeholder.com/592x841.png?text=No+Poster';

    const AnimeInfo = `
*${tradutor.texto2[0]}* ${result.title}
*Año de lanzamiento:* ${result.releaseYear || 'N/A'}
*Tipo:* ${result.objectType === 'SHOW' ? 'Serie / Anime' : 'Película'}
*Plataformas:* ${plataformas}

*Sinopsis:* ${descripcion}`;

    await conn.sendFile(m.chat, posterUrl, 'anime.jpg', AnimeInfo.trim(), m);

  } catch (e) {
    console.error(e);
    m.reply(`*${tradutor.texto3}*`);
  }
};

handler.help = ['animeinfo <nombre>'];
handler.tags = ['buscadores'];
handler.command = /^(anime|animeinfo)$/i;

export default handler;
