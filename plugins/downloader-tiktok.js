import axios from 'axios';
import cheerio from 'cheerio';
import { generateWAMessageFromContent } from "baileys";

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    // 1. Configuración de Idioma y Traducción
    const datas = global;
    const idioma = datas.db.data?.users?.[m.sender]?.language || 'es';
    
    // Fallback de traducción integrado para evitar fallos si el archivo no existe
    const tradutor = datas.db.data?.languages?.[idioma]?.plugins?.descargas_tiktok || {
        texto1: '📌 Por favor, ingresa un enlace de TikTok.',
        texto2: '❌ El enlace proporcionado no es válido.',
        texto3: '⏳ Descargando...',
        texto8: ['Usa', 'para convertir a audio'],
        texto9: '⚠️ Ocurrió un error al procesar la descarga.'
    };

    // 2. Validaciones de entrada
    if (!text) throw `${tradutor.texto1}\n\n*Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMYuXvA/`;
    
    const tiktokUrl = text.trim().split(' ')[0];
    if (!/tiktok\.com/i.test(tiktokUrl)) throw tradutor.texto2;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    const isAudio = command.toLowerCase().includes('audio') || command.toLowerCase() === 'tiktokaudio';

    try {
        const links = await fetchDownloadLinks(tiktokUrl);
        if (!links || links.length === 0) throw new Error('No links found');

        const downloadUrl = getDownloadLink(links);
        
        if (isAudio) {
            // Envío de Audio
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mp4', 
                ptt: false 
            }, { quoted: m });
        } else {
            // Envío de Video
            const caption = `✅ *TikTok Downloader*\n\n💡 ${tradutor.texto8[0]} *${usedPrefix}tomp3* ${tradutor.texto8[1]}`;
            await conn.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: caption,
                fileName: `tiktok.mp4`
            }, { quoted: m });
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        console.error(`[Error TikTok]:`, e);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        m.reply(tradutor.texto9);
    }
};

handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;
handler.tags = ['downloader'];
export default handler;

// --- Funciones de Apoyo (Scraper) ---

async function fetchDownloadLinks(url) {
    const SITE_URL = 'https://instatiktok.com/';
    try {
        const params = new URLSearchParams();
        params.append('url', url);
        
        const { data } = await axios.post(`${SITE_URL}api`, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });

        if (!data?.html) return null;

        const $ = cheerio.load(data.html);
        const links = [];
        
        $('a.btn').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('http')) {
                links.push(href);
            }
        });
        
        return links;
    } catch (err) {
        return null;
    }
}

function getDownloadLink(links) {
    // Prioridad: 1. HD, 2. No Watermark, 3. Primer enlace disponible
    const priority = links.find(l => /hdplay|nowatermark/i.test(l));
    return priority || links[0];
}
