import axios from 'axios';
import fs from 'fs';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_facebook;

    if (!text) throw `_*${tradutor.texto1[0]}*_\n\n*${tradutor.texto1[1]}*\n\n*${tradutor.texto1[2]}* ${usedPrefix + command} https://www.facebook.com/share/v/1E5R3gRuHk/`;

    try {
        await m.reply('*[⏳] Extrayendo video con bypass de seguridad...*');

        // Usamos una API de bypass que no depende de instatiktok
        const videoData = await fetchFacebookBypass(text);

        if (!videoData || !videoData.url) {
            throw new Error("El video es privado o el enlace ha caducado.");
        }

        await conn.sendMessage(m.chat, { 
            video: { url: videoData.url }, 
            caption: `*📥 Facebook Downloader Pro*\n\n*Calidad:* ${videoData.quality || 'Estándar'}`,
            mimetype: 'video/mp4'
        }, { quoted: m });

    } catch (error) {
        console.error('Error Crítico FB:', error);
        m.reply(`*[❌] No se pudo descargar el video.*\n\n*Motivo:* ${error.message}\n_Sugerencia: Verifica que el video sea público._`);
    }
};

handler.command = /^(facebook|fb|fbdl)$/i;
handler.tags = ['downloader'];
handler.help = ['facebook'];
export default handler;

/**
 * Función que utiliza una API de bypass para saltar restricciones de Meta
 */
async function fetchFacebookBypass(url) {
    // Lista de APIs de respaldo con mayor tasa de éxito en 2026
    const apiEndpoints = [
        `https://api.botcahx.eu.org/api/dowloader/fbdown?url=${encodeURIComponent(url)}&apikey=BrunoSobrino`,
        `https://api.alyachan.dev/api/facebook?url=${encodeURIComponent(url)}&apikey=Gata-Dios`,
        `https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(url)}`
    ];

    for (let api of apiEndpoints) {
        try {
            const { data } = await axios.get(api, { timeout: 15000 });
            
            // Adaptador para diferentes formatos de respuesta de APIs
            const result = data.result || data.data;
            const videoUrl = result?.url || result?.video || (Array.isArray(result) ? result[0].url : null);

            if (videoUrl && videoUrl.startsWith('http')) {
                return { 
                    url: videoUrl, 
                    quality: result?.quality || 'HD' 
                };
            }
        } catch (e) {
            continue; // Si una falla, probamos la siguiente inmediatamente
        }
    }
    return null;
}
