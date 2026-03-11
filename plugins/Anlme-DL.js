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
        let isMega = /mega\.nz/.test(url);
        let isMediaFire = /mediafire\.com/.test(url);
        let isOkRu = /ok\.ru/.test(url);

        // --- 1. DETECCIÓN Y SCRAPING ---
        if (!isMega && !isMediaFire && !isOkRu) {
            await m.reply(`🔍 *Buscando servidores (Mega/MF/OkRu)...*`);
            const animeData = await extractAnimeLinks(url);
            
            if (animeData.megaUrl) { downloadUrl = animeData.megaUrl; isMega = true; }
            else if (animeData.okRuUrl) { downloadUrl = animeData.okRuUrl; isOkRu = true; }
            else if (animeData.mfUrl) { downloadUrl = animeData.mfUrl; isMediaFire = true; }
            else throw 'No se encontró un servidor compatible (Mega, Ok.ru o MediaFire) en este enlace.';
            
            finalName = animeData.title;
        }

        const tempPath = join(tmpdir(), `${Date.now()}_anime.mp4`);
        let name, sizeH;

        // --- 2. LÓGICA DE DESCARGA SEGÚN SERVIDOR ---
        if (isMega) {
            const file = File.fromURL(downloadUrl);
            await file.loadAttributes();
            name = file.name || `${finalName}.mp4`;
            sizeH = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            await m.reply(`📥 *Descargando de Mega:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            await pipeline(file.download(), fs.createWriteStream(tempPath));

        } else if (isMediaFire) {
            const mfData = await mediafireDl(downloadUrl);
            name = mfData.name || `${finalName}.mp4`;
            const head = await axios.head(mfData.link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            sizeH = (parseInt(head.headers['content-length'] || '0') / 1024 / 1024).toFixed(2) + ' MB';
            await m.reply(`📥 *Descargando de MediaFire:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            const response = await axios({ method: 'get', url: mfData.link, responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempPath));

        } else if (isOkRu) {
            await m.reply(`📥 *Procesando video de Ok.ru...*`);
            const okData = await okRuDl(downloadUrl);
            name = `${finalName}.mp4`;
            sizeH = "Variable"; // Ok.ru no siempre da el content-length en el HEAD
            const response = await axios({ method: 'get', url: okData.link, responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempPath));
        }

        // --- 3. SUBIDA A WHATSAPP ---
        await m.reply(`🚀 *Descarga completa. Subiendo a WhatsApp...*`);
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, 
            fileName: name, 
            mimetype: 'video/mp4',
            caption: `✅ *Anime:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n🎬 *Servidor:* ${isMega ? 'Mega' : isOkRu ? 'Ok.ru' : 'MediaFire'}`
        }, { quoted: m });

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } catch (e) {
        console.error(e);
        m.reply(`❌ *Error:* ${e.message || e}`);
    }
};

// --- SCRAPERS ESPECÍFICOS ---

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
    // Seleccionamos la calidad más alta disponible (móvil, la más baja suele ser "mobile", la alta "ultra")
    const videoUrl = metadata.videos.sort((a, b) => b.name - a.name)[0].url;
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
                       
