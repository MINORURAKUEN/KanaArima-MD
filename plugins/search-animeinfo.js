import translate from '@vitalets/google-translate-api';
import { Anime } from '@shineiichijo/marika';
import fs from 'fs';

const client = new Anime();

const handler = async (m, { conn, text, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.buscador_animeinfo;

  if (!text) return m.reply(`*${tradutor.texto1}*`);

  try {
    const anime = await client.searchAnime(text);
    if (!anime || anime.data.length === 0) throw tradutor.texto3;

    const result = anime.data[0];

    // Traducción de Sinopsis y Background (si existen)
    const background = result.background ? (await translate(result.background, { to: 'es', autoCorrect: true })).text : 'N/A';
    const synopsis = result.synopsis ? (await translate(result.synopsis, { to: 'es', autoCorrect: true })).text : 'N/A';

    // Limpieza de datos técnicos
    const trailer = result.trailer?.url || 'No disponible';
    const score = result.score || 'N/A';

    const AnimeInfo = `
✨ *${tradutor.texto2[0]}* ${result.title}
🎞️ *${tradutor.texto2[1]}* ${result.type}
📊 *${tradutor.texto2[2]}* ${result.status.toUpperCase().replace(/\_/g, ' ')}
🔢 *${tradutor.texto2[3]}* ${result.episodes || 'En emisión'}
⏱️ *${tradutor.texto2[4]}* ${result.duration}
🌍 *${tradutor.texto2[5]}* ${result.source.toUpperCase()}
📅 *${tradutor.texto2[6]}* ${result.aired.from.split('T')[0]}
📅 *${tradutor.texto2[7]}* ${result.aired.to ? result.aired.to.split('T')[0] : 'Actualidad'}
🔥 *${tradutor.texto2[8]}* ${result.popularity}
⭐ *${tradutor.texto2[9]}* ${result.favorites}
🔞 *${tradutor.texto2[10]}* ${result.rating}
🏆 *${tradutor.texto2[11]}* ${result.rank}
🎥 *${tradutor.texto2[12]}* ${trailer}
🌐 *${tradutor.texto2[13]}* ${result.url}

📖 *${tradutor.texto2[14]}* ${background}

📝 *${tradutor.texto2[15]}* ${synopsis}`;

    // Enviamos la imagen con la información formateada
    await conn.sendFile(m.chat, result.images.jpg.large_image_url || result.images.jpg.image_url, 'anime.jpg', AnimeInfo.trim(), m);

  } catch (e) {
    console.error(e);
    throw `*${tradutor.texto3}*`;
  }
};

handler.help = ['animeinfo <nombre>'];
handler.tags = ['buscadores'];
handler.command = /^(anime|animeinfo)$/i;

export default handler;
