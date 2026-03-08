import axios from 'axios';
import fetch from 'node-fetch';
import fs from 'fs';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  
  // Cargar traducciones (siguiendo tu estructura de carpetas)
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.downloader_igstory;
  } catch {
    // Fallback por si no encuentra el archivo de idioma
    tradutor = { 
      texto1: 'Ingrese el nombre de usuario de Instagram.', 
      texto2: 'No se encontraron historias o el perfil es privado.' 
    };
  }

  if (!args[0]) throw `*⚠️ ${tradutor.texto1}*\n\n*Ejemplo:*\n${usedPrefix + command} luisitocomunica`;

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await m.reply(global.wait);

  try {
    // Uso de la API de Lolhuman (necesitas tu apikey en global.lolkeysapi)
    const res = await fetch(`https://api.lolhuman.xyz/api/igstory/${args[0]}?apikey=${global.lolkeysapi}`);
    const anu = await res.json();
    const anuku = anu.result;

    if (!anuku || anuku.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(tradutor.texto2);
    }

    for (const i of anuku) {
      const resHead = await axios.head(i);
      const mime = resHead.headers['content-type'];

      if (/image/.test(mime)) {
        await conn.sendFile(m.chat, i, 'story.jpg', `✅ *HISTORIA DESCARGADA*\n*Fuente:* KanaArima-MD`, m).catch(() => null);
      }
      
      if (/video/.test(mime)) {
        await conn.sendFile(m.chat, i, 'story.mp4', `✅ *VIDEO HISTORIA*\n*Fuente:* KanaArima-MD`, m).catch(() => null);
      }
      
      // Delay de 1.5 segundos entre historias para evitar saturar la conexión
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.log(e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(tradutor.texto2);
  }
};

handler.help = ['igstory <username>'];
handler.tags = ['downloader'];
handler.command = ['igstory', 'ighistoria'];
handler.limit = false; // Sin límite de diamantes

export default handler;
