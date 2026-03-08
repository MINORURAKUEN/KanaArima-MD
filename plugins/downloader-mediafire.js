import { File } from 'megajs';
import WebTorrent from 'webtorrent';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Configuración del cliente Torrent para Termux
const client = new WebTorrent({ 
    maxConns: 25, 
});

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    
    // Mensaje de ayuda si no hay enlace
    if (!url) throw `*< DESCARGADOR TODO-EN-UNO />*\n\n*Uso:* ${usedPrefix + command} [enlace]\n\n*📌 Comandos disponibles:* \n- ${usedPrefix}torrent\n- ${usedPrefix}trt\n- ${usedPrefix}mega\n- ${usedPrefix}mf\n\n*⚖️ Límite máximo:* 2GB`;

    const isTorrent = url.startsWith('magnet:');
    const isMega = /mega\.nz/.test(url);
    const isMediaFire = /mediafire\.com/.test(url);
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

    try {
        // --- 1. LÓGICA TORRENT (.torrent / .trt) ---
        if (isTorrent || command === 'torrent' || command === 'trt') {
            await m.reply('*⏳ Procesando Torrent...*');

            client.add(url, { path: tmpdir() }, (torrent) => {
                const file = torrent.files.reduce((prev, curr) => (prev.length > curr.length ? prev : curr));

                if (file.length > MAX_SIZE) {
                    torrent.destroy();
                    return m.reply('❌ El archivo supera el límite de 2GB permitido en Termux.');
                }

                torrent.on('download', () => {
                    const progress = (torrent.progress * 100).toFixed(1);
                    process.stdout.write(`\r[TORRENT] 🔽 ${progress}% | Seeds: ${torrent.numPeers}`);
                });

                torrent.on('done', async () => {
                    const filePath = join(tmpdir(), file.path);
                    try {
                        await conn.sendFile(m.chat, filePath, file.name, `*✅ Torrent:* ${file.name}`, m, null, { asDocument: true });
                    } catch (err) {
                        m.reply('❌ Error al enviar el archivo pesado.');
                    } finally {
                        torrent.destroy();
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                });
            });
        }

        // --- 2. LÓGICA MEGA (.mega) ---
        else if (isMega || command === 'mega') {
            await m.reply('*📥 Procesando Mega...*');
            const file = File.fromURL(url);
            await file.loadAttributes();

            if (file.size > MAX_SIZE) return m.reply('⚠️ El archivo supera los 2GB.');

            const tempPath = join(tmpdir(), `${Date.now()}_${file.name}`);
            const writer = fs.createWriteStream(tempPath);
            file.download().pipe(writer);

            writer.on('finish', async () => {
                await conn.sendFile(m.chat, tempPath, file.name, `*✅ Mega:* ${file.name}`, m, null, { asDocument: true });
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            });
        }

        // --- 3. LÓGICA MEDIAFIRE (.mf) ---
        else if (isMediaFire || command === 'mf') {
            await m.reply('*📥 Procesando MediaFire...*');
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const dlUrl = $('#downloadButton').attr('href');
            const fileName = $('#downloadButton').text().replace(/\s+/g, ' ').trim().split('\n')[0];

            const tempPath = join(tmpdir(), `${Date.now()}_${fileName}`);
            const response = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(tempPath)).on('finish', async () => {
                await conn.sendFile(m.chat, tempPath, fileName, `*✅ MediaFire:* ${fileName}`, m, null, { asDocument: true });
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            });
        }

    } catch (error) {
        m.reply(`❌ *Error:* ${error.message}`);
    }
};

// Configuración de los comandos solicitados
handler.command = /^(torrent|trt|mega|mf|dl)$/i;
export default handler;
