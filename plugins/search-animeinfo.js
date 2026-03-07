import axios from 'axios';
import * as cheerio from 'cheerio';
import translate from '@vitalets/google-translate-api';
import fs from 'fs';

const handler = async (m, { conn, text, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.buscador_animeinfo;

  if (!text) return m.reply(`*${tradutor.texto1}*`);

  try {
    // Busqueda en MyAnimeList via Jikan API (La API oficial abierta de MAL)
    const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
    
    if (!data || !data.data || data.data.length === 0) throw tradutor.texto3;

    const result = data.data[0];

    // Función segura para traducir
    const safeTranslate = async (txt) => {
      if (!txt) return 'No disponible';
      try {
        const res = await translate(txt, { to: 'es', autoCorrect: true });
        return res.text;
      } catch {
        return txt; 
      }
    };

    const background = await safeTranslate(result.background);
    const synopsis = await safeTranslate(result.synopsis);

    const AnimeInfo = `
*${tradutor.texto2[0]}* ${result.title || 'N/A'}
*${tradutor.texto2[1]}* ${result.type || 'N/A'}
*${tradutor.texto2[2]}* ${(result.status || 'N/A').toUpperCase().replace(/\_/g, ' ')}
*${tradutor.texto2[3]}* ${result.episodes || 'En emision'}
*${tradutor.texto2[4]}* ${result.duration || 'N/A'}
*${tradutor.texto2[5]}* ${(result.source || 'N/A').toUpperCase()}
*${tradutor.texto2[6]}* ${result.aired?.from ? result.aired.from.split('T')[0] : 'N/A'}
*${tradutor.texto2[7]}* ${result.aired?.to ? result.aired.to.split('T')[0] : 'En curso'}
*${tradutor.texto2[8]}* ${result.popularity || 'N/A'}
*${tradutor.texto2[9]}* ${result.favorites || 'N/A'}
*${tradutor.texto2[10]}* ${result.rating || 'N/A'}
*${tradutor.texto2[11]}* ${result.rank || 'N/A'}
*${tradutor.texto2[12]}* ${result.trailer?.url || 'No disponible'}
*${tradutor.texto2[13]}* ${result.url || 'N/A'}

*${tradutor.texto2[14]}* ${background}

*${tradutor.texto2[15]}* ${synopsis}`;

    const image = result.images?.jpg?.large_image_url || result.images?.jpg?.image_url;

    await conn.sendFile(m.chat, image, 'anime.jpg', AnimeInfo.trim(), m);

  } catch (e) {
    console.error(e);
    m.reply(`*${tradutor.texto3}*`);
  }
};

handler.help = ['animeinfo <nombre>'];
handler.tags = ['buscadores'];
handler.command = /^(anime|animeinfo)$/i;

export default handler;
