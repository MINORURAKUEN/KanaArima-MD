import { File } from 'megajs';
import WebTorrent from 'webtorrent';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Configuración del cliente Torrent para Termux (Archivos Pesados)
const client = new WebTorrent({ 
    maxConns: 25, // No saturar la red del celular
});

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `*< MULTI-DESCARGADOR PRO />*\n\n*Uso:* ${usedPrefix + command} [enlace]\n\n*✅ Soportados:* \n- Mega\n- MediaFire\n- Torrents (Magnet)\n\n*⚖️ Límite:* 2GB (Asegúrate de tener espacio en tu cel)`;

    const isTorrent = url.startsWith('magnet:');
    const isMega = /mega\.nz/.test(url);
    const isMediaFire = /mediafire\.com/.test(url);
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB en Bytes

    try {
        // --- 1. LÓGICA DE MEDIAFIRE ---
        if (isMediaFire) {
            await m.reply('*📥 Procesando MediaFire...*');
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const dlUrl = $('#downloadButton').attr('href');
            const fileName = $('#downloadButton').text().replace(/\s+/g, ' ').trim().split('\n')[0] || 'archivo_mediafire';
            
            if (!dlUrl) throw new Error('No se pudo encontrar el botón de descarga.');

            const tempPath = join(tmpdir(), `${Date.now()}_${fileName}`);
            const response = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });
            
            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);

            writer.on('finish', async () => {
                await conn.sendFile(m.chat, tempPath, fileName, `*✅ MediaFire:* ${fileName}`, m, null, { asDocument: true });
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            });
        }

        // --- 2. LÓGICA DE MEGA ---
        else if (isMega) {
            await m.reply('*📥 Procesando Mega...*');
            const file = File.fromURL(url);
            await file.loadAttributes();

            if (file.size > MAX_SIZE) return m.reply(`⚠️ El archivo es demasiado grande para WhatsApp (${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB).`);

            const tempPath = join(tmpdir(), `${Date.now()}_${file.name}`);
            const stream = file.download();
            const writer = fs.createWriteStream(tempPath);
            
            stream.pipe(writer);

            writer.on('finish', async () => {
                await conn.sendFile(m.chat, tempPath, file.name, `*✅ Mega:* ${file.name}`, m, null, { asDocument: true });
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            });
        }

        // --- 3. LÓGICA DE TORRENT ---
        else if (isTorrent) {
            await m.reply('*⏳ Conectando a la red Torrent...*\n_Buscando semillas (seeds) para iniciar descarga de hasta 2GB..._');

            client.add(url, { path: tmpdir() }, (torrent) => {
                // Selecciona el archivo más grande del torrent
                const file = torrent.files.reduce((prev, curr) => (prev.length > curr.length ? prev : curr));

                if (file.length > MAX_SIZE) {
                    torrent.destroy();
                    return m.reply('❌ El archivo torrent supera el límite de 2GB.');
                }

                console.log(`\n[TORRENT] Descargando: ${file.name}`);

                torrent.on('download', () => {
                    const progress = (torrent.progress * 100).toFixed(1);
                    const speed = (torrent.downloadSpeed / (1024 * 1024)).toFixed(2);
                    process.stdout.write(`\r[TORRENT] 🔽 ${progress}% | 🚀 ${speed} MB/s | Seeds: ${torrent.numPeers}`);
                });

                torrent.on('done', async () => {
                    const filePath = join(tmpdir(), file.path);
                    console.log(`\n[TORRENT] ✅ Completo. Enviando a WhatsApp...`);

                    try {
                        await conn.sendFile(m.chat, filePath, file.name, `*✅ Torrent:* ${file.name}\n*⚖️:* ${(file.length / 1024 / 1024).toFixed(2)} MB`, m, null, { 
                            asDocument: true 
                        });
                    } catch (err) {
                        m.reply('❌ Error al enviar el archivo pesado desde Termux.');
                    } finally {
                        torrent.destroy();
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                });
            });
        }

        else {
            m.reply('❌ El enlace no es válido para Mega, MediaFire o Torrent.');
        }

    } catch (error) {
        console.error(error);
        m.reply(`❌ *Error:* ${error.message}`);
    }
};

handler.command = /^(dl|mega|mf|torrent|trt)$/i;
export default handler;
