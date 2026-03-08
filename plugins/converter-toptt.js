import { toPTT } from '../src/libraries/converter.js';
import fs from 'fs'; // Importación vital para leer tu JSON

const handler = async (m, { conn, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.convertidor_toptt;
  
  const q = m.quoted ? m.quoted : m;
  const mime = (m.quoted ? m.quoted : m.msg).mimetype || '';
  
  if (!/video|audio/.test(mime)) throw `*${tradutor.texto1}*`;
  
  const media = await q.download?.();
  if (!media && !/video/.test(mime)) throw `*${tradutor.texto2}*`;
  if (!media && !/audio/.test(mime)) throw `*${tradutor.texto3}*`;
  
  // Convertimos a OGG/Opus usando tu librería
  const audio = await toPTT(media, 'mp4');
  
  if (!audio.data && !/audio/.test(mime)) throw `*${tradutor.texto4}*`;
  if (!audio.data && !/video/.test(mime)) throw `*${tradutor.texto5}*`;
  
  // Enviamos el buffer con el formato estricto de notas de voz
  await conn.sendMessage(m.chat, { 
    audio: audio.data, 
    mimetype: 'audio/ogg; codecs=opus', 
    ptt: true 
  }, { quoted: m });
};

handler.help = ['tovn'];
handler.tags = ['converter'];
handler.command = ['tovn', 'toptt'];

export default handler;
