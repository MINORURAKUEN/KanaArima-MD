import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_facebook;

    if (!text) throw `_*${tradutor.texto1[0]}*_\n\n*${tradutor.texto1[1]}*\n\n*${tradutor.texto1[2]}* ${usedPrefix + command} https://www.facebook.com/share/v/1E5R3gRuHk/`;

    try {
        await m.reply('*[⏳] Intentando descargar video de Facebook...*');

        // Intentar con el sistema de múltiples servidores (Método Fallback)
        const videoUrl = await getFacebookVideo(text);

        if (!videoUrl) {
            return await conn.sendMessage(m.chat, { text: '*[ ❌ ] Todos los servidores de descarga fallaron. El video podría ser privado o no estar disponible.*' }, { quoted: m });
        }

        await conn.sendMessage(m.chat, { 
            video: { url: videoUrl }, 
            caption: `*📥 Descarga de Facebook exitosa!*`,
            mimetype: 'video/mp4'
        }, { quoted: m });

    } catch (error) {
        console.error('Error final:', error);
        m.reply(`*[❌] Error crítico:* ${error.message}`);
    }
};

handler.command = /^(facebook|fb|fbdl)$/i;
handler.tags = ['downloader'];
handler.help = ['facebook'];
export default handler;

/**
 * Motor de descarga con 3 niveles de rescate
 */
async function getFacebookVideo(url) {
    // NIVEL 1: Motor Instatiktok (Tu código original mejorado)
    try {
        const res = await axios.post('https://instatiktok.com/api', 
            new URLSearchParams({ url, platform: 'facebook' }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        const $ = cheerio.load(res.data.html || '');
        const link = $('a.btn').first().attr('href');
        if (link && link.startsWith('http')) return link;
    } catch (e) { console.log("Nivel 1 falló"); }

    // NIVEL 2: API de Snapsave (Muy robusta para Reels y Videos)
    try {
        const res2 = await axios.get(`https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(url)}`);
        if (res2.data.status && res2.data.result.video) return res2.data.result.video;
    } catch (e) { console.log("Nivel 2 falló"); }

    // NIVEL 3: API de Tiklydown/Aisearch (Respaldo final)
    try {
        const res3 = await axios.get(`https://api.alyachan.dev/api/facebook?url=${encodeURIComponent(url)}&apikey=Gata-Dios`);
        if (res3.data.result) return res3.data.result.url;
    } catch (e) { console.log("Nivel 3 falló"); }

    return null;
}
