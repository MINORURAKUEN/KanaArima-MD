import { igdl } from 'ruhend-scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return conn.reply(
    m.chat,
    `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:*\n${usedPrefix + command} https://www.instagram.com/reel/DP7RggwD_1t/`,
    m
  );

  // Validación de URL mejorada
  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|reels)\//i.test(text)) {
    return conn.reply(m.chat, `⚠️ El enlace no es válido. Asegúrate de que sea de un Reel, Post o TV.`, m);
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  
  try {
    const mediaData = await getInstagramMedia(text);

    if (!mediaData || mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, 'No se pudo obtener el contenido. El perfil podría ser privado o el enlace estar roto.', m);
    }

    for (let i = 0; i < mediaData.length; i++) {
      const media = mediaData[i];
      const url = media.url;
      // Detección mejorada de video
      const isVideo = url.includes('.mp4') || !!media.thumbnail;

      await conn.sendMessage(
        m.chat,
        {
          [isVideo ? 'video' : 'image']: { url },
          mimetype: isVideo ? "video/mp4" : "image/jpeg",
          caption: `✅ *${isVideo ? 'VIDEO' : 'IMAGEN'} DE INSTAGRAM*\n*Fuente:* KanaArima-MD`
        },
        { quoted: m }
      );

      // Pequeño delay para carruseles (evita spam)
      if (i < mediaData.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(m.chat, `Ocurrió un error inesperado. Inténtalo de nuevo más tarde.`, m);
  }
};

async function getInstagramMedia(url) {
  try {
    const res = await igdl(url);
    return res.data || [];
  } catch {
    return [];
  }
}

handler.help = ['instagram', 'ig'];
handler.tags = ['downloader'];
handler.command = /^(instagramdl|instagram|igdl|ig|instagram2|ig2|instagram3|ig3)$/i;

export default handler;
  
