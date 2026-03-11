import { File } from 'megajs';
import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';
import { lookup } from 'mime-types';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `*🎬 Uso:* ${usedPrefix + command} <enlace de anime o link directo (Mega, MF, Okru)>`;

    try {
        let downloadUrl = url;
        let finalName = 'video_anime';
        let serverType = ''; 

        // --- 1. DETECCIÓN Y SCRAPING ---
        const isDirect = /mega\.nz|mediafire\.com|ok\.ru/.test(url);

        if (!isDirect) {
            await m.reply(`🔍 *Buscando servidores compatibles...*`);
            const animeData = await extractAnimeLinks(url);
            
            // Sistema de Prioridad: Mega (si tiene hash) > Ok.ru > MediaFire
            if (animeData.megaUrl && animeData.megaUrl.includes('#')) {
                downloadUrl = animeData.megaUrl;
                serverType = 'mega';
            } else if (animeData.okRuUrl) {
                downloadUrl = animeData.okRuUrl;
                serverType = 'okru';
            } else if (animeData.mfUrl) {
                downloadUrl = animeData.mfUrl;
                serverType = 'mediafire';
            } else {
                throw 'No se encontró un servidor compatible con enlace completo (Mega sin llave o servidor no soportado).';
            }
            finalName = animeData.title;
        } else {
            if (/mega\.nz/.test(url)) serverType = 'mega';
            else if (/mediafire\.com/.test(url)) serverType = 'mediafire';
            else if (/ok\.ru/.test(url)) serverType = 'okru';
        }

        // Validación de seguridad para Mega
        if (serverType === 'mega' && !downloadUrl.includes('#')) {
            throw 'El enlace de Mega no contiene la llave de cifrado (#hash). Intenta con otro servidor.';
        }

        const tempPath = join(tmpdir(), `${Date.now()}_anime.mp4`);
        let name, sizeH;

        // --- 2. LÓGICA DE DESCARGA ---
        if (serverType === 'mega') {
            const file = File.fromURL(downloadUrl);
            await file.loadAttributes();
            name = file.name || `${finalName}.mp4`;
            sizeH = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            await m.reply(`📥 *Descargando de Mega:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            await pipeline(file.download(), fs.createWriteStream(tempPath));

        } else if (serverType === 'mediafire') {
            const mfData = await mediafireDl(downloadUrl);
            name = mfData.name || `${finalName}.mp4`;
            const head = await axios.head(mfData.link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            sizeH = (parseInt(head.headers['content-length'] || '0') / 1024 / 1024).toFixed(2) + ' MB';
            await m.reply(`📥 *Descargando de MediaFire:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            const response = await axios({ method: 'get', url: mfData.link, responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempPath));

        } else if (serverType === 'okru') {
            await m.reply(`📥 *Procesando video de Ok.ru...*`);
            const okData = await okRuDl(downloadUrl);
            name = `${finalName}.mp4`;
            sizeH = "HD (Ok.ru)";
            const response = await axios({ method: 'get', url: okData.link, responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempPath));
        }

        // --- 3. SUBIDA A WHATSAPP ---
        await m.reply(`🚀 *Descarga completa. Enviando a WhatsApp...*`);
        
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, 
            fileName: name, 
            mimetype: 'video/mp4',
            caption: `✅ *Anime:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n🎬 *Servidor:* ${serverType.toUpperCase()}`
        }, { quoted: m });

        // Limpieza de archivos temporales
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } catch (e) {
        console.error(e);
        const errorText = e.message.includes('no hash') 
            ? '❌ El enlace de Mega está incompleto (falta el hash #).' 
            : `❌ *Error:* ${e.message}`;
        m.reply(errorText);
    }
};

// --- SCRAPERS DE SERVIDORES ---

async function extractAnimeLinks(url) {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    let megaUrl, okRuUrl, mfUrl;

    const scripts = $('script').toArray();
    for (let script of scripts) {
        const content = $(script).html();
        if (content && content.includes('var videos =')) {
            const match = content.match(/var videos = (\[.*\]);/);
            if (match) {
                const videoData = JSON.parse(match[1]);
                // Intentamos capturar los IDs de los servidores
                const mega = videoData.find(v => v[0].toLowerCase() === 'mega');
                const okru = videoData.find(v => v[0].toLowerCase() === 'okru');
                const mf = videoData.find(v => v[0].toLowerCase() === 'mediafire');
                
                if (mega) megaUrl = mega[1].includes('mega.nz') ? mega[1] : `https://mega.nz/#!${mega[1]}`;
                if (okru) okRuUrl = `https://ok.ru/videoembed/${okru[1]}`;
                if (mf) mfUrl = mf[1];
            }
        }
    }
    return { title: $('h1.title').text().trim() || 'Anime', megaUrl, okRuUrl, mfUrl };
}

async function okRuDl(url) {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const jsonStr = $('div[data-options]').attr('data-options');
    const json = JSON.parse(jsonStr);
    const metadata = JSON.parse(json.flashvars.metadata);
    // Ordena de mejor a peor calidad y elige la primera
    const videoUrl = metadata.videos.sort((a, b) => parseInt(b.name) - parseInt(a.name))[0].url;
    return { link: videoUrl };
}

async function mediafireDl(url) {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const link = $('#downloadButton').attr('href') || res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
    const name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
    return { name, link };
}

handler.command = /^(animedl|amdl|mega|mf|okru)$/i;
export default handler;
                
