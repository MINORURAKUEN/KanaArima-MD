import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_tiktok;

  // 1. Validaciones previas (Sin enviar mensaje de carga aún)
  if (!text) throw `*${tradutor.texto1}*\n_${usedPrefix + command} https://vt.tiktok.com/ZS12345/ _`;
  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) throw `*${tradutor.texto2}*`;

  // 2. Reacción visual y mensaje de espera (Solo si el comando es válido)
  await m.react('⏳'); 
  const waitMsg = await m.reply(`*[⏳] ${tradutor.texto3}*`);

  try {
    let videoUrl = null;
    
    // INTENTO 1: Scraping instatiktok.com
    const links = await fetchDownloadLinks(args[0], 'tiktok');
    if (links && links.length > 0) {
      videoUrl = links.find(link => /hdplay/i.test(link)) || links.find(link => /download/i.test(link)) || links[0];
    }

    // INTENTO 2: Fallback con APIs
    if (!videoUrl) {
      const encoded = encodeURIComponent(args[0]);
      const apis = [
        `https://www.tikwm.com/api/?url=${encoded}&hd=1`,
        `https://api.vreden.my.id/api/tiktok?url=${encoded}`,
        `https://luminai.my.id/api/download/tiktok?url=${encoded}`
      ];

      for (const api of apis) {
        try {
          const { data: json } = await axios.get(api);
          videoUrl = json.data?.hdplay || json.data?.play || json.data?.url || json.result?.url;
          if (videoUrl) break;
        } catch { continue; }
      }
    }

    if (!videoUrl) throw new Error();

    // 3. Envío del video y eliminación del mensaje de espera
    const cap = `✅ *TikTok HD*\n${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}`;
    
    await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption: cap }, { quoted: m });
    await m.react('✅');

  } catch (e) {
    console.error(e);
    await m.react('❌');
    throw `*${tradutor.texto9}*`;
  }
};

handler.help = ['tiktok'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;

export default handler;

// --- FUNCIONES DE APOYO ---
async function fetchDownloadLinks(text, platform) {
  try {
    const SITE_URL = 'https://instatiktok.com/';
    const form = new URLSearchParams();
    form.set('url', text);
    form.set('platform', platform);

    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const html = res?.data?.html;
    if (!html) return null;

    const $ = cheerio.load(html);
    const links = [];
    $('a.btn').each((_, el) => {
      const link = $(el).attr('href');
      if (link && link.startsWith('http')) links.push(link);
    });
    return links;
  } catch { return null; }
}

