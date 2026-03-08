import { File } from 'megajs';
import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { performance } from 'perf_hooks';
import { pipeline } from 'stream/promises';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `*< DESCARGAS - MULTIPLATAFORMA />*\n\n*[ ℹ️ ] Ingrese un enlace de Mega o MediaFire.*`;

    const isMega = /mega\.nz/.test(url);
    const isMediaFire = /mediafire\.com/.test(url);
    if (!isMega && !isMediaFire) throw `❌ *Enlace no válido.*`;

    const LIMIT_MEGA = 400 * 1024 * 1024; 
    const LIMIT_MF = 1.8 * 1024 * 1024 * 1024; 
    let tempPath;

    try {
        const startTime = performance.now();
        let name, sizeH, downloadUrl, sizeBytes;

        if (isMega) {
            const file = File.fromURL(url);
            await file.loadAttributes();
            name = file.name;
            sizeBytes = file.size;
            sizeH = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
            if (sizeBytes > LIMIT_MEGA) return m.reply(`⚠️ *Mega:* Límite 400MB.`);

            await m.reply(`📥 *Descargando de Mega:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            tempPath = join(tmpdir(), `mega_${Date.now()}_${name}`);
            
            const fileStream = file.download();
            // Monitor de progreso Mega
            let downloaded = 0;
            fileStream.on('data', (chunk) => {
                downloaded += chunk.length;
                const p = ((downloaded / sizeBytes) * 100).toFixed(2);
                process.stdout.write(`\r[MEGA] 🔽 PROGRESO: ${p}% | ${(downloaded / 1024 / 1024).toFixed(2)}MB`);
            });

            await pipeline(fileStream, fs.createWriteStream(tempPath));

        } else {
            const mfData = await mediafireDl(url);
            name = mfData.name;
            downloadUrl = mfData.link;
            
            const head = await axios.head(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            sizeBytes = parseInt(head.headers['content-length'] || '0');
            sizeH = sizeBytes > 0 ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : mfData.sizeH;
            if (sizeBytes > LIMIT_MF) return m.reply(`⚠️ *MediaFire:* Límite 1.8GB.`);

            await m.reply(`📥 *Descargando de MediaFire:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            tempPath = join(tmpdir(), `mf_${Date.now()}_${name}`);

            const response = await axios({ method: 'get', url: downloadUrl, responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });

            // Monitor de progreso MediaFire
            let downloaded = 0;
            response.data.on('data', (chunk) => {
                downloaded += chunk.length;
                const p = ((downloaded / sizeBytes) * 100).toFixed(2);
                process.stdout.write(`\r[MEDIAFIRE] 🔽 PROGRESO: ${p}% | ${(downloaded / 1024 / 1024).toFixed(2)}MB`);
            });

            await pipeline(response.data, fs.createWriteStream(tempPath));
        }

        console.log(`\n[BOT] ✅ Descarga terminada. Subiendo a WhatsApp...`);
        const mime = lookup(name) || 'application/octet-stream';
        
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, 
            fileName: name, 
            mimetype: mime,
            caption: `✅ *Archivo:* ${name}\n⚖️ *Tamaño:* ${sizeH}`
        }, { quoted: m });

        console.log(`[BOT] ✨ Enviado con éxito.`);

    } catch (error) {
        console.error(`\n[ERROR]:`, error.message);
        await m.reply(`❌ *Error:* ${error.message}`);
    } finally {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
};

async function mediafireDl(url) {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const $ = cheerio.load(res.data);
    const link = $('#downloadButton').attr('href') || res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
    let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
    return { name: name.replace(/\s+/g, ' ').trim(), link, sizeH: 'Info' };
}

handler.command = /^(mega|mg|mediafire|mf)$/i;
export default handler;
