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

  // Feedback visual inicial
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  
  try {
    let mediaData = [];
    
    // Intento 1: Usando ruhend-scraper (Librería local)
    try {
      const res = await igdl(text);
      mediaData = res.data || [];
    } catch (e) {
      console.log('Error en ruhend-scraper, intentando con API...');
    }

    // Intento 2: API externa si la primera falla
    if (mediaData.length === 0) {
      const api = await fetch(`https://api.botcahx.eu.org/api/dowloader/igdowloader?url=${text}&apikey=TU_APIKEY_AQUI`);
      const res = await api.json();
      if (res.result) {
        mediaData = res.result.map(url => ({ url }));
      }
    }

    if (mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('No se pudo obtener el contenido. El perfil puede ser privado o el enlace ha caducado.');
    }

    // Límite de carrusel (Máximo 5 archivos para evitar spam)
    const limit = 5;
    const itemsToSend = mediaData.slice(0, limit);

    for (let i = 0; i < itemsToSend.length; i++) {
      const media = itemsToSend[i];
      const url = media.url;
      const isVideo = url.includes('.mp4') || !!media.thumbnail;

      await conn.sendMessage(
        m.chat,
        {
          [isVideo ? 'video' : 'image']: { url },
          mimetype: isVideo ? "video/mp4" : "image/jpeg",
          caption: `✅ *${isVideo ? 'VIDEO' : 'IMAGEN'} DESCARGADO*\n*Fuente:* KanaArima-MD`
        },
        { quoted: m }
      );

      // Delay de seguridad entre archivos
      if (i < itemsToSend.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(`Ocurrió un error inesperado. Inténtalo de nuevo más tarde.`);
  }
};

// Configuración de los comandos solicitados
handler.help = ['ig', 'instagram'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(ig|instagram)$/i; // Solo responde a .ig y .instagram
handler.limit = true;

export default handler;
