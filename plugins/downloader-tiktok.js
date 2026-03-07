import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs'; // Importación faltante corregida
import { generateWAMessageFromContent } from "baileys";

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    const datas = global;
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
    
    // Manejo seguro de lectura de archivos de idioma
    let tradutor;
    try {
        const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
        tradutor = _translate.plugins.descargas_tiktok;
    } catch {
        tradutor = { texto1: 'Ingrese un enlace de TikTok.', texto2: 'Enlace no válido.', texto3: 'Descargando...', texto8: ['Usa', 'para audio'], texto9: 'Error al descargar.' };
    }

    if (!text) throw `${tradutor.texto1} \n*${usedPrefix + command}* https://vt.tiktok.com/ZSSm2fhLX/`;
    if (!/(?:https:?\/2)?(?:w{3}|vm|vt|t)?\.?tiktok\.com\/([^\s&]+)/gi.test(text)) throw tradutor.texto2;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }); // Reacción de espera
    const isAudio = command.toLowerCase().includes('audio');

    try {
        const links = await fetchDownloadLinks(args[0]);
        if (!links || links.length === 0) throw new Error();

        const download = getDownloadLink(links);
        
        if (isAudio) {
            // Lógica específica para Audio
            await conn.sendMessage(m.chat, { 
                audio: { url: download }, 
                mimetype: 'audio/mp4', 
                ptt: false 
            }, { quoted: m });
        } else {
            // Lógica para Video con subtítulo dinámico
            const cap = `${tradutor.texto8[0]} *${usedPrefix}tomp3* ${tradutor.texto8[1]}`;
            await conn.sendMessage(m.chat, { 
                video: { url: download }, 
                caption: cap,
                fileName: `tiktok.mp4`
            }, { quoted: m });
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        throw tradutor.texto9;
    }
};

handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;
export default handler;

async function fetchDownloadLinks(url) {
    const SITE_URL = 'https://instatiktok.com/';
    try {
        const form = new URLSearchParams();
        form.append('url', url);
        
        const res = await axios.post(`${SITE_URL}api`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': SITE_URL,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36'
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
    } catch (err) {
        return null;
    }
}

function getDownloadLink(links) {
    // Priorizamos HD, luego sin marca de agua, luego el primero disponible
    return links.find(link => /hdplay|nowatermark/i.test(link)) || links[0];
}
