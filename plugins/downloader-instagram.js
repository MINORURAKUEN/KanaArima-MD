import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args[0];
  
  // Validación de texto
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:*\n${usedPrefix + command} https://www.instagram.com/reel/C4Xy9u_r_1t/`;

  // Validación de URL de Instagram
  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|reels|stories)\//i.test(text)) {
    throw `⚠️ El enlace no es válido. Asegúrate de que sea un link de Instagram.`;
  }

  // Feedback visual inicial (Reacción)
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  
  try {
    let mediaData = [];
    
    // MÉTODO 1: API de Delirius (Muy estable)
    try {
      const res = await fetch(`${global.BASE_API_DELIRIUS}/download/instagram?url=${text}`);
      const json = await res.json();
      if (json.status && json.data) {
        mediaData = json.data; // Delirius suele devolver un array de objetos { url, type }
      }
    } catch (e) {
      console.log('Error en API Delirius, intentando con respaldo...');
    }

    // MÉTODO 2: API de BotCaHX (Respaldo)
    if (mediaData.length === 0) {
      try {
        const api = await fetch(`https://api.botcahx.eu.org/api/dowloader/igdowloader?url=${text}&apikey=btc`);
        const res = await api.json();
        if (res.result) {
          // Normalizamos el formato de BotCaHX
          mediaData = res.result.map(url => ({ url }));
        }
      } catch (e) {
        console.log('Error en todas las APIs de Instagram');
      }
    }

    if (mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('❌ No se pudo obtener el contenido. El perfil puede ser privado o el enlace está roto.');
    }

    // Límite de 5 archivos para evitar saturación
    const itemsToSend = mediaData.slice(0, 5);

    for (let i = 0; i < itemsToSend.length; i++) {
      const media = itemsToSend[i];
      const url = media.url || media;
      
      // Detectar si es video (por extensión o propiedad de la API)
      const isVideo = url.includes('.mp4') || media.type === 'video';

      await conn.sendMessage(
        m.chat,
        {
          [isVideo ? 'video' : 'image']: { url },
          mimetype: isVideo ? "video/mp4" : "image/jpeg",
          caption: `✅ *${isVideo ? 'VIDEO' : 'IMAGEN'} DESCARGADO*\n*Fuente:* KanaArima-MD`
        },
        { quoted: m }
      );

      // Delay de 1.5 segundos entre envíos para carruseles
      if (i < itemsToSend.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(`Hubo un error al procesar tu solicitud. Inténtalo de nuevo.`);
  }
};

handler.help = ['ig', 'instagram'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(ig|instagram)$/i; 
handler.limit = false; // Sin consumo de diamantes

export default handler;
