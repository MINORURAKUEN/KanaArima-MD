import { igdl } from 'ruhend-scraper';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args[0];
  
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:*\n${usedPrefix + command} https://www.instagram.com/reel/C4Xy9u_r_1t/`;

  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|reels|stories)\//i.test(text)) {
    throw `⚠️ El enlace no es válido.`;
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  
  try {
    let mediaData = [];
    
    // MÉTODO 1: ruhend-scraper
    try {
      const res = await igdl(text);
      if (res && res.data) mediaData = res.data;
    } catch {
      console.log("Método 1 falló...");
    }

    // MÉTODO 2: API Alternativa
    if (mediaData.length === 0) {
      try {
        const res = await fetch(`https://api.lolhuman.xyz/api/instagram?apikey=GataDios&url=${text}`);
        const json = await res.json();
        if (json.result) {
          mediaData = Array.isArray(json.result) ? json.result.map(url => ({ url })) : [{ url: json.result }];
        }
      } catch {
        console.log("Método 2 falló...");
      }
    }

    if (mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('❌ No se pudo descargar. El post es privado o el enlace está roto.');
    }

    for (const media of mediaData.slice(0, 5)) {
      const url = media.url || media;
      if (!url) continue;

      const isVideo = url.includes('.mp4') || url.includes('video');

      await conn.sendMessage(m.chat, {
        [isVideo ? 'video' : 'image']: { url },
        caption: `✅ *CONTENIDO DESCARGADO*\n*Fuente:* KanaArima-MD`,
        mimetype: isVideo ? 'video/mp4' : 'image/jpeg'
      }, { quoted: m });

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(`Hubo un error al procesar el enlace.`);
  }
};

handler.help = ['ig', 'instagram'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(ig|instagram)$/i;
handler.limit = false; // <-- CAMBIADO A FALSE PARA QUE NO CONSUMA DIAMANTES

export default handler;
