import fetch from 'node-fetch';
import fs from 'fs';

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_tiktok;

  // Validación de URL con los mensajes de tu sistema de idiomas
  if (!text) throw `${tradutor.texto1} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`;
  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) {
    throw `${tradutor.texto2} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`;
  }

  // Definición de Servidores (Asegúrate de que estas variables/URLs estén definidas en tu global o cámbialas por strings)
  const servers = [
    { name: 'Server Masha', url: global.masha || 'https://api.masha.xyz' }, 
    { name: 'Server Alya', url: global.alya || 'https://api.alya.xyz' },
    { name: 'Server Masachika', url: global.masachika || 'https://api.masachika.xyz' }
  ];

  // Reordenar aleatoriamente para balancear la carga entre servidores
  const shuffledServers = servers.sort(() => Math.random() - 0.5);
  
  await m.reply(tradutor.texto3); // Mensaje de "Descargando..."

  let success = false;
  let lastError = '';

  for (let server of shuffledServers) {
    const endpoint = `${server.url}/Tiktok_videodl?url=${encodeURIComponent(args[0])}`;
    
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw `Status ${res.status}`;

      const json = await res.json();
      
      // Intentamos obtener la URL del video del JSON (soporta varios formatos de respuesta)
      const videoUrl = json.video_url || json.result?.video || json.data?.url;
      
      if (!videoUrl) throw `El servidor no devolvió una URL válida`;

      const cap = `${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}\n\n💫 *Servidor:* ${server.name}`;

      // Enviamos el archivo usando el método de tu bot
      await conn.sendFile(m.chat, videoUrl, 'tiktok.mp4', cap, m);

      success = true;
      break; // Éxito, salimos del ciclo for
    } catch (err) {
      lastError = `Fallo en ${server.name}: ${err.message || err}`;
      console.log(lastError);
      // El ciclo continúa automáticamente con el siguiente servidor
    }
  }

  if (!success) {
    // Si todos fallan, lanzamos el error final del archivo de idioma
    throw `${tradutor.texto9}\n\n*Detalle técnico:* ${lastError}`;
  }
};

handler.help = ['tiktok', 'tt'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(tt|tiktok|ttdl|tiktokdl)$/i;

export default handler;
