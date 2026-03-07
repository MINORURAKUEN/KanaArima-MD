import fetch from 'node-fetch';
import fs from 'fs';

export default {
  command: ['tiktok', 'tt', 'ttdl', 'tiktokdl'],
  category: 'downloader',
  run: async (client, m, args, command) => {
    // 1. Configuración de Idioma y Traducciones (del primer código)
    const datas = global;
    const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
    let tradutor;
    try {
        const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
        tradutor = _translate.plugins.descargas_tiktok;
    } catch {
        tradutor = { texto3: '📥 Procesando...', texto9: '❌ Error fatal.' };
    }

    if (!args.length) return m.reply(`✿ Ingresa un *término* o *enlace* de TikTok.`);

    const urls = args.filter(arg => /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(arg));
    
    // Lista de servidores de respaldo (Failover)
    const backupServers = [
      { name: 'Masha API', url: global.masha || 'https://api.masha.xyz' }, 
      { name: 'Alya API', url: global.alya || 'https://api.alya.xyz' },
      { name: 'Masachika API', url: global.masachika || 'https://api.masachika.xyz' }
    ].sort(() => Math.random() - 0.5);

    // --- FUNCIÓN PARA DESCARGAR (Lógica de redundancia) ---
    const downloadVideo = async (url) => {
      // Intento 1: Tu API Principal
      try {
        const apiUrl = `${global.api?.url}/dl/tiktok?url=${url}&key=${global.api?.key}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.data) return json.data;
        }
      } catch (e) {}

      // Intentos de respaldo: Servidores aleatorios
      for (let server of backupServers) {
        try {
          const res = await fetch(`${server.url}/Tiktok_videodl?url=${encodeURIComponent(url)}`);
          if (!res.ok) continue;
          const json = await res.json();
          const videoUrl = json.video_url || json.result?.video || json.data?.url;
          if (videoUrl) return { dl: videoUrl, title: 'TikTok Video', backup: server.name };
        } catch (e) { continue; }
      }
      return null;
    };

    // --- LÓGICA PRINCIPAL ---
    if (urls.length) {
      await m.reply(tradutor.texto3);
      
      if (urls.length > 1) {
        // MODO ÁLBUM (Varios Links)
        const medias = [];
        for (const url of urls.slice(0, 10)) {
          const data = await downloadVideo(url);
          if (data) {
            medias.push({
              type: 'video',
              data: { url: data.dl },
              caption: `✅ Enlace: ${url}`
            });
          }
        }
        if (medias.length) return await client.sendAlbumMessage(m.chat, medias, { quoted: m });
        else return m.reply(`✿ No se pudo procesar ningún enlace.`);

      } else {
        // MODO ÚNICO (Un Link)
        const data = await downloadVideo(urls[0]);
        if (!data) return m.reply(`✿ Error: No se pudo obtener el video.`);

        const caption = genCaption(data);
        await client.sendMessage(m.chat, { video: { url: data.dl }, caption }, { quoted: m });
      }

    } else {
      // MODO BÚSQUEDA (Texto)
      const query = args.join(" ");
      try {
        const apiUrl = `${global.api?.url}/search/tiktok?query=${encodeURIComponent(query)}&key=${global.api?.key}`;
        const res = await fetch(apiUrl);
        const json = await res.json();
        const results = json.data;

        if (!results || results.length === 0) return m.reply(`❖ No se encontraron resultados para: ${query}`);

        const data = results[0];
        const caption = genCaption(data);
        await client.sendMessage(m.chat, { video: { url: data.dl }, caption }, { quoted: m });
      } catch (e) {
        m.reply('✿ Error al realizar la búsqueda.');
      }
    }
  },
};

// Generador de plantillas visuales
function genCaption(data) {
  const { title = 'Sin título', author = {}, stats = {}, music = {}, duration, backup } = data;
  return `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ\n\n` +
         `𖣣ֶㅤ֯⌗ ✿ ⬭ *Título:* ${title}\n` +
         `𖣣ֶㅤ֯⌗ ★ ⬭ *Autor:* ${author.nickname || author.unique_id || 'Desconocido'}\n` +
         `𖣣ֶㅤ֯⌗ ❖ ⬭ *Duración:* ${duration || 'N/A'}\n` +
         `𖣣ֶㅤ֯⌗ ♡ ⬭ *Likes:* ${(stats.likes || 0).toLocaleString()}\n` +
         `𖣣ֶㅤ֯⌗ ꕥ ⬭ *Comentarios:* ${(stats.comments || 0).toLocaleString()}\n` +
         `𖣣ֶㅤ֯⌗ ❒ ⬭ *Vistas:* ${(stats.views || stats.plays || 0).toLocaleString()}\n` +
         `𖣣ֶㅤ֯⌗ ⚡︎ ⬭ *Audio:* ${music.title || 'Original'} ${music.author ? '- ' + music.author : ''}` +
         `${backup ? `\n\n⚙️ *Source:* ${backup}` : ''}`;
}
