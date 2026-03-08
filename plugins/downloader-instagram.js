import { igdl } from 'ruhend-scraper';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args[0];
  
  // Validación de texto
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:*\n${usedPrefix + command} https://www.instagram.com/reel/C4Xy9u_r_1t/`;

  // Validación de URL
  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|reels|stories)\//i.test(text)) {
    throw `⚠️ El enlace no es válido. Asegúrate de que sea de Instagram.`;
  }

  // Reacción de espera
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  
  try {
    let mediaData = [];
    
    // Intento principal: ruhend-scraper
    try {
      const res = await igdl(text);
      mediaData = res.data || [];
    } catch (e) {
      console.log('Error en ruhend-scraper, intentando con API...');
    }

    // Backup: API externa (BotCaHX)
    if (mediaData.length === 0) {
      try {
        const api = await fetch(`https://api.botcahx.eu.org/api/dowloader/igdowloader?url=${text}&apikey=btc`);
        const res = await api.json();
        if (res.result) {
          mediaData = res.result.map(url => ({ url }));
        }
      } catch (e) {
        console.log('Error en API de respaldo');
      }
    }

    if (mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('❌ No se pudo obtener el contenido. El perfil puede ser privado o el enlace ha caducado.');
    }

    // Límite de 5 archivos para no saturar el bot
    const itemsToSend = mediaData.slice(0, 5);

    for (let i = 0; i < itemsToSend.length; i++) {
      const media = itemsToSend[i];
      const url = media.url;
      const isVideo = url.includes('.mp4') || !!media.thumbnail || media.type === 'video';

      await conn.sendMessage(
        m.chat,
        {
          [isVideo ? 'video' : 'image']: { url },
          mimetype: isVideo ? "video/mp4" : "image/jpeg",
          caption: `✅ *${isVideo ? 'VIDEO' : 'IMAGEN'} DESCARGADO*\n*Fuente:* KanaArima-MD`
        },
        { quoted: m }
      );

      // Pequeña pausa entre archivos para carruseles
      if (i < itemsToSend.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(`Ocurrió un error inesperado al procesar el enlace.`);
  }
};

handler.help = ['ig', 'instagram'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(ig|instagram)$/i; 
handler.limit = false; // <--- AQUÍ: Desactivado para que no pida diamantes

export default handler;
