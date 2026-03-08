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
    if (!url) throw `*< DESCARGAS - MULTIPLATAFORMA />*\n\n*[ ℹ️ ] Ingrese un enlace de Mega o MediaFire.*\n\n*Ejemplo:* ${usedPrefix + command} https://www.mediafire.com/file/xxx`;

    const isMega = /mega\.nz/.test(url);
    const isMediaFire = /mediafire\.com/.test(url);

    if (!isMega && !isMediaFire) throw `❌ *Enlace no válido.* Solo se admiten Mega y MediaFire.`;

    // Límites de seguridad
    const LIMIT_MEGA = 400 * 1024 * 1024; // 400MB
    const LIMIT_MF = 1.8 * 1024 * 1024 * 1024; // 1.8GB
    
    let tempPath;

    try {
        const startTime = performance.now();
        let name, sizeH, downloadUrl;

        if (isMega) {
            // --- PROCESO MEGA ---
            const file = File.fromURL(url);
            await file.loadAttributes();
            name = file.name;
            const sizeBytes = file.size;
            sizeH = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
            
            if (sizeBytes > LIMIT_MEGA) return m.reply(`⚠️ *Mega:* El archivo excede el límite de 400MB. (${sizeH})`);
            
            await m.reply(`📥 *Descargando de Mega:* ${name}\n⚖️ *Tamaño:* ${sizeH}`);
            tempPath = join(tmpdir(), `mega_${Date.now()}_${name.replace(/\s+/g, '_')}`);
            await pipeline(file.download(), fs.createWriteStream(tempPath));

        } else {
            // --- PROCESO MEDIAFIRE ---
            const mfData = await mediafireDl(url);
            name = mfData.name;
            downloadUrl = mfData.link;
            
            // Validación de tamaño vía HEAD request (Evita descargar si es > 1.8GB)
            const head = await axios.head(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const sizeBytes = parseInt(head.headers['content-length'] || '0');
            sizeH = sizeBytes > 0 ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : mfData.sizeH;

            if (sizeBytes > LIMIT_MF) return m.reply(`⚠️ *MediaFire:* El archivo excede el límite de 1.8GB. (${sizeH})`);

            await m.reply(`📥 *Descargando de MediaFire:* ${name}\n⚖️ *Tamaño:* ${sizeH}\n\n_Procesando archivo pesado..._`);
            
            tempPath = join(tmpdir(), `mf_${Date.now()}_${name.replace(/\s+/g, '_')}`);
            const response = await axios({
                method: 'get',
                url: downloadUrl,
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            await pipeline(response.data, fs.createWriteStream(tempPath));
        }

        const mime = lookup(name) || 'application/octet-stream';
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
        
        // --- ENVÍO A WHATSAPP ---
        // Usar { url: tempPath } permite a la librería leer directamente del disco
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, 
            fileName: name, 
            mimetype: mime,
            caption: `✅ *Descarga Exitosa (${totalTime}s)*\n📄 *Nombre:* ${name}\n⚖️ *Tamaño:* ${sizeH}`
        }, { quoted: m });

    } catch (error) {
        console.error(error);
        await m.reply(`❌ *Error:* ${error.message}`);
    } finally {
        // Limpieza de archivos temporales para no llenar el VPS
        if (tempPath && fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) { console.error('Error al borrar temporal:', e); }
        }
    }
};

// Scraper de MediaFire actualizado
async function mediafireDl(url) {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const $ = cheerio.load(res.data);
    const downloadButton = $('#downloadButton');
    let link = downloadButton.attr('href');
    
    if (!link || link.includes('javascript:void(0)')) {
        link = res.data.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)?.[1];
    }
    
    let name = $('.promoDownloadName').first().attr('title') || $('.filename').first().text().trim();
    name = name.replace(/\s+/g, ' ').split('\n')[0].trim();
    
    const sizeH = downloadButton.text().replace(/Download|[\(\)]|\s+/g, ' ').trim() || 'Desconocido';
    return { name, link, sizeH };
}

handler.command = /^(mega|mg|mediafire|mf)$/i;
export default handler;
