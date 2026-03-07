import axios from 'axios';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    // 1. Configuración de Idioma y Traducciones
    const datas = global;
    const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
    let tradutor;
    try {
        const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
        tradutor = _translate.plugins.descargas_tiktok;
    } catch {
        // Fallback en caso de que el archivo de idioma no exista
        tradutor = { 
            texto1: 'Ingresa un enlace de TikTok.', 
            texto3: '📥 Procesando...', 
            texto8: ['Usa', 'para convertir a MP3'], 
            texto9: '❌ No se pudo descargar el video.' 
        };
    }

    if (!text) throw `✿ ${tradutor.texto1}\n\n*Ejemplo:* _${usedPrefix + command} https://vt.tiktok.com/ZS..._ o un término de búsqueda.`;

    const urls = args.filter(arg => /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(arg));

    // --- FUNCIONES DE DESCARGA (Redundancia) ---
    
    // Opción A: Scraping Manual (Tu primer código)
    const scrapeTikTok = async (url) => {
        try {
            const SITE_URL = 'https://instatiktok.com/';
            const form = new URLSearchParams();
            form.append('url', url);
            form.append('platform', 'tiktok');
            form.append('siteurl', SITE_URL);

            const res = await axios.post(`${SITE_URL}api`, form.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const html = res?.data?.html;
            if (!html) return null;
            const $ = cheerio.load(html);
            const links = [];
            $('a.btn[href^="http"]').each((_, el) => links.push($(el).attr('href')));
            const dl = links.find(link => /hdplay/.test(link)) || links[0];
            return dl ? { dl, title: 'TikTok Video', source: 'InstaTikTok' } : null;
        } catch { return null; }
    };

    // Opción B: APIs de Respaldo
    const downloadVideo = async (url) => {
        // Intento 1: API Principal (si existe en global)
        try {
            if (global.api?.url) {
                const res = await fetch(`${global.api.url}/dl/tiktok?url=${url}&key=${global.api.key}`);
                const json = await res.json();
                if (json.data) return json.data;
            }
        } catch {}

        // Intento 2: Scraping Directo
        const scraped = await scrapeTikTok(url);
        if (scraped) return scraped;

        // Intento 3: Servidores Failover
        const backupServers = ['https://api.masha.xyz', 'https://api.alya.xyz'].sort(() => Math.random() - 0.5);
        for (let server of backupServers) {
            try {
                const res = await fetch(`${server}/Tiktok_videodl?url=${encodeURIComponent(url)}`);
                const json = await res.json();
                const videoUrl = json.video_url || json.result?.video || json.data?.url;
                if (videoUrl) return { dl: videoUrl, title: 'TikTok Backup', source: 'Mirror API' };
            } catch { continue; }
        }
        return null;
    };

    // --- LÓGICA PRINCIPAL ---
    
    if (urls.length) {
        // MODO DESCARGA (URL)
        await m.reply(tradutor.texto3);
        
        for (const url of urls.slice(0, 5)) { // Máximo 5 videos a la vez
            const data = await downloadVideo(url);
            if (!data) continue;

            const cap = genCaption(data, tradutor, usedPrefix);
            await conn.sendMessage(m.chat, { video: { url: data.dl }, caption: cap }, { quoted: m });
        }

    } else {
        // MODO BÚSQUEDA (Texto)
        try {
            await m.reply(tradutor.texto3);
            const query = args.join(" ");
            const res = await fetch(`${global.api?.url || 'https://api.masha.xyz'}/search/tiktok?query=${encodeURIComponent(query)}`);
            const json = await res.json();
            const results = json.data || json.result;

            if (!results || results.length === 0) throw tradutor.texto9;

            const data = results[0];
            const cap = genCaption(data, tradutor, usedPrefix);
            await conn.sendMessage(m.chat, { video: { url: data.dl || data.video }, caption: cap }, { quoted: m });
        } catch {
            throw tradutor.texto9;
        }
    }
};

// Generador de Caption Estético
function genCaption(data, tradutor, usedPrefix) {
    const { title = 'TikTok', author = {}, stats = {}, music = {}, duration, source } = data;
    const infoAudio = tradutor.texto8 ? `\n\n_${tradutor.texto8[0]} *${usedPrefix}tomp3* ${tradutor.texto8[1]}_` : '';
    
    return `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ\n\n` +
           `𖣣ֶㅤ֯⌗ ✿ ⬭ *Título:* ${title}\n` +
           `𖣣ֶㅤ֯⌗ ★ ⬭ *Autor:* ${author.nickname || 'User'}\n` +
           `𖣣ֶㅤ֯⌗ ♡ ⬭ *Likes:* ${(stats.likes || 0).toLocaleString()}\n` +
           `𖣣ֶㅤ֯⌗ ❒ ⬭ *Vistas:* ${(stats.views || 0).toLocaleString()}\n` +
           `${source ? `𖣣ֶㅤ֯⌗ ⚙️ ⬭ *Servidor:* ${source}` : ''}` +
           `${infoAudio}`;
}

handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;
export default handler;
