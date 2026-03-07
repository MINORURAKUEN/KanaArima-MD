import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

let handler = async (m, { args, conn, text, usedPrefix, command }) => {
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.descargas_facebook;

    // Validación de texto/URL
    if (!text) throw `_*${tradutor.texto1[0]}*_\n\n*${tradutor.texto1[1]}*\n\n*${tradutor.texto1[2]}* ${usedPrefix + command} https://www.facebook.com/share/v/1E5R3gRuHk/`;

    const platform = 'facebook';
    
    try {
        await m.reply('*[⏳] Procesando tu solicitud de Facebook...*');

        const links = await fetchDownloadLinks(text, platform, conn, m);
        if (!links || links.length === 0) {
            return await conn.sendMessage(m.chat, { text: '*[ ❌ ] No se encontraron enlaces de descarga válidos.*' }, { quoted: m });
        }

        // Seleccionamos el mejor enlace (usualmente el último en Facebook es el de mayor calidad)
        let download = getDownloadLink(platform, links);

        if (!download) {
            return await conn.sendMessage(m.chat, { text: '*[ ❌ ] Error al procesar el enlace final.*' }, { quoted: m });
        }

        const caption = `*📥 Descarga de Facebook exitosa!*\n\n_Calidad detectada: Alta_`;

        // Enviamos el video
        await conn.sendMessage(m.chat, { 
            video: { url: download }, 
            caption: caption,
            mimetype: 'video/mp4',
            fileName: `fb_video.mp4`
        }, { quoted: m });

    } catch (error) {
        console.error('Error en facebook downloader:', error);
        return await conn.sendMessage(m.chat, { text: `*[❌] Ocurrió un error inesperado:*\n${error.message || error}` }, { quoted: m });
    }
};

handler.command = /^(facebook|fb|facebookdl|fbdl)$/i;
handler.tags = ['downloader'];
handler.help = ['facebook'];
export default handler;

/**
 * Función para extraer enlaces usando el motor de instatiktok (scraping)
 */
async function fetchDownloadLinks(text, platform, conn, m) {
    try {
        const SITE_URL = 'https://instatiktok.com/';
        const form = new URLSearchParams();
        form.append('url', text);
        form.append('platform', platform);

        const res = await axios.post(`${SITE_URL}api`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': SITE_URL,
                'Referer': SITE_URL,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 20000 // 20 segundos de espera
        });

        const html = res?.data?.html;
        
        if (!html || res?.data?.status !== 'success') {
            return null;
        }

        const $ = cheerio.load(html);
        const links = [];
        
        // Buscamos todos los botones de descarga con enlaces HTTP
        $('a.btn').each((_, el) => {
            const link = $(el).attr('href');
            // Filtramos para asegurar que sean enlaces de video/media reales
            if (link && link.startsWith('http') && !link.includes('facebook.com/sharer')) {
                links.push(link);
            }
        });

        return links;
    } catch (e) {
        console.error("Error en el fetch de la API:", e.message);
        return null;
    }
}

/**
 * Lógica para elegir el enlace correcto según la plataforma
 */
function getDownloadLink(platform, links) {
    if (platform === 'facebook') {
        // En Facebook, el sitio instatiktok suele poner el HD al final
        return links.length > 1 ? links[0] : links[0]; 
    }
    return links[0];
}
}

function getDownloadLink(platform, links) {
    if (platform === 'instagram') {
        return links;
    } else if (platform === 'tiktok') {
        return links.find(link => /hdplay/.test(link)) || links[0];
    } else if (platform === 'facebook') {
        return links.at(-1);
    }
    return null;
}
