import fetch from 'node-fetch';
import fs from 'fs';

let enviando = false;

const handler = async (m, { command, usedPrefix, conn, text }) => {
    const datas = global;
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_play;

    if (!text) throw `✨ *Ingrese el nombre o enlace de YouTube*\n\nEjemplo:\n${usedPrefix + command} Sia Unstoppable`;
    
    if (enviando) return;
    enviando = true;

    try {
        // --- 1. BUSCAR INFORMACIÓN DEL VIDEO ---
        let apiUrlsz = [
            `https://api.cafirexos.com/api/ytplay?text=${encodeURIComponent(text)}`,
            `https://api-brunosobrino.onrender.com/api/ytplay?text=${encodeURIComponent(text)}&apikey=BrunoSobrino`,
            `https://api-brunosobrino-dcaf9040.koyeb.app/api/ytplay?text=${encodeURIComponent(text)}`
        ];

        // Si el texto ya es un link, usamos el endpoint de info directa
        if (isValidYouTubeLink(text)) {
            apiUrlsz = [
                `https://api.cafirexos.com/api/ytinfo?url=${encodeURIComponent(text)}`,
                `https://api-brunosobrino-koiy.onrender.com/api/ytinfo?url=${encodeURIComponent(text)}&apikey=BrunoSobrino`,
                `https://api-brunosobrino-dcaf9040.koyeb.app/api/ytinfo?url=${encodeURIComponent(text)}`
            ];
        }

        let data = null;
        for (const url of apiUrlsz) {
            try {
                const res = await fetch(url);
                data = await res.json();
                if (data.resultado && data.resultado.url) break;
            } catch (e) { console.log(`Error en búsqueda: ${url}`); }
        }

        if (!data || !data.resultado) {
            enviando = false;
            throw `❌ No se encontró el video o las APIs están caídas.`;
        }

        const { title, publicDate, channel, url: videoUrl, image } = data.resultado;
        const isVideo = command === 'play2'; // play = audio, play2 = video

        const caption = `
🎶 *YouTube Descargas*
📌 *Título:* ${title}
🗓️ *Publicado:* ${publicDate || 'Desconocido'}
👤 *Canal:* ${channel}
🔗 *Link:* ${videoUrl}

_Enviando ${isVideo ? 'video' : 'audio'}..._`.trim();

        await conn.sendMessage(m.chat, { image: { url: image }, caption }, { quoted: m });

        // --- 2. DESCARGAR EL ARCHIVO ---
        let apiDownloadUrls = [];
        if (isVideo) {
            apiDownloadUrls = [
                `https://api.cafirexos.com/api/v1/ytmp4?url=${videoUrl}`,
                `https://api.cafirexos.com/api/v2/ytmp4?url=${videoUrl}`,
                `https://api-brunosobrino.onrender.com/api/v1/ytmp4?url=${videoUrl}&apikey=BrunoSobrino`,
                `https://api-brunosobrino-dcaf9040.koyeb.app/api/v1/ytmp4?url=${videoUrl}`
            ];
        } else {
            apiDownloadUrls = [
                `https://api.cafirexos.com/api/v1/ytmp3?url=${videoUrl}`,
                `https://api.cafirexos.com/api/v2/ytmp3?url=${videoUrl}`,
                `https://api-brunosobrino.onrender.com/api/v1/ytmp3?url=${videoUrl}&apikey=BrunoSobrino`,
                `https://api-brunosobrino-dcaf9040.koyeb.app/api/v1/ytmp3?url=${videoUrl}`
            ];
        }

        let buff = null;
        let mimeType = isVideo ? 'video/mp4' : 'audio/mpeg';

        for (const dlUrl of apiDownloadUrls) {
            try {
                // Usamos getFile para manejar la descarga del buffer
                const resDl = await conn.getFile(dlUrl);
                if (resDl && resDl.data) {
                    buff = resDl.data;
                    break;
                }
            } catch (e) { console.log(`Error en descarga: ${dlUrl}`); }
        }

        if (buff) {
            await conn.sendMessage(m.chat, { 
                [isVideo ? 'video' : 'audio']: buff, 
                mimetype: mimeType, 
                fileName: `${title}.${isVideo ? 'mp4' : 'mp3'}` 
            }, { quoted: m });
        } else {
            throw `❌ Todas las APIs de descarga fallaron.`;
        }

    } catch (error) {
        console.log(error);
        m.reply(`⚠️ Error: ${error.message || error}`);
    } finally {
        enviando = false;
    }
};

handler.command = /^(play|play2)$/i;
export default handler;

function isValidYouTubeLink(link) {
    const validPatterns = [/youtube\.com\/watch\?v=/i, /youtube\.com\/shorts\//i, /youtu\.be\//i, /youtube\.com\/embed\//i, /youtube\.com\/v\//i, /yt\.be\//i];
    return validPatterns.some(pattern => pattern.test(link));
}
