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
    if (!url) throw `*🎬 Uso:* ${usedPrefix + command} <enlace de anime o link directo>`;

    try {
        let downloadUrl = url;
        let finalName = 'video_anime';
        let serverType = ''; 

        const isDirect = /mega\.nz|mediafire\.com|ok\.ru/.test(url);

        if (!isDirect) {
            await m.reply(`🔍 *Buscando servidores disponibles...*`);
            const animeData = await extractAnimeLinks(url);
            
            // Verificación segura de servidores encontrados
            if (animeData.megaUrl && typeof animeData.megaUrl === 'string' && animeData.megaUrl.includes('#')) {
                downloadUrl = animeData.megaUrl;
                serverType = 'mega';
            } else if (animeData.okRuUrl) {
                downloadUrl = animeData.okRuUrl;
                serverType = 'okru';
            } else if (animeData.mfUrl) {
                downloadUrl = animeData.mfUrl;
                serverType = 'mediafire';
            } else {
                throw 'No se encontró un servidor compatible (Mega con llave, Ok.ru o MediaFire) en esta página.';
            }
            finalName = animeData.title;
        } else {
            if (/mega\.nz/.test(url)) serverType = 'mega';
            else if (/mediafire\.com/.test(url)) serverType = 'mediafire';
            else if (/ok\.ru/.test(url)) serverType = 'okru';
        }

        // Validación final para enlaces directos de Mega
        if (serverType === 'mega' && (!downloadUrl || !downloadUrl.includes('#'))) {
            throw 'El enlace de Mega no tiene llave de cifrado (#hash). Intenta con otro servidor.';
        }

        const tempPath = join(tmpdir(), `${Date.now()}_video.mp4`);
        let name, sizeH;

        // --- INICIO DE DESCARGA ---
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
            await m.reply(`📥 *Obteniendo video de Ok.ru...*`);
            const okData = await okRuDl(downloadUrl);
            name = `${finalName}.mp4`;
            sizeH = "Calidad Máxima";
            const response = await axios({ method: 'get', url: okData.link, responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempPath));
        }

        // --- ENVÍO A WHATSAPP ---
        await m.reply(`🚀 *Descarga terminada. Enviando a WhatsApp...*`);
        
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, 
            fileName: name, 
            mimetype: 'video/mp4',
            caption: `✅ *Anime:* ${name}\n🎬 *Servidor:* ${serverType.toUpperCase()}`
        }, { quoted: m });

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } catch (e) {
        console.error(e);
        m.reply(`❌ *Error:* ${e.message || e}`);
    }
};

// --- SCRAPERS ---

async function extractAnimeLinks(url) {
    try {
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
                    const mega = videoData.find(v => v[0].toLowerCase() === 'mega');
                    const okru = videoData.find(v => v[0].toLowerCase() === 'okru');
                    const mf = videoData.find(v => v[0].toLowerCase() === 'mediafire');
                    
                    if (mega && mega[1]) megaUrl = mega[1].includes('mega.nz') ? mega[1] : `https://mega.nz/#!${mega[1]}`;
                    if (okru && okru[1]) okRuUrl = `https://ok.ru/videoembed/${okru[1]}`;
                    if (mf && mf[1]) mfUrl = mf[1];
                }
            }
        }
        return { 
            title: $('h1.title').text().trim() || $('title').text().trim() || 'Anime', 
            megaUrl, okRuUrl, mfUrl 
        };
    } catch {
        return { title: 'Anime', megaUrl: null, okRuUrl: null, mfUrl: null };
    }
}

async function okRuDl(url) {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const jsonStr = $('div[data-options]').attr('data-options');
    const json = JSON.parse(jsonStr);
    const metadata = JSON.parse(json.flashvars.metadata);
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
                        
