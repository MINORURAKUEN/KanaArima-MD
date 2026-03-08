import { File } from 'megajs';
import { lookup } from 'mime-types';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*< DESCARGAS - MEGA />*\n\n*[ ℹ️ ] Ingrese un enlace de Mega.*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} https://mega.nz/file/xxxx#yyyy`;

    try {
        // 1. Cargar metadatos del archivo
        console.log(`\n[MEGA] 🚀 Procesando enlace...`);
        const file = File.fromURL(args[0]);
        await file.loadAttributes();

        const name = file.name;
        const size = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        const mime = lookup(name) || 'application/octet-stream';

        // Validación de seguridad (ejemplo: 300MB)
        if (file.size > 300 * 1024 * 1024) {
            return m.reply(`⚠️ *El archivo es demasiado grande (${size}).* El límite es de 300MB.`);
        }

        await m.reply(`*📥 Descargando de Mega...*\n\n*📝 Nombre:* ${name}\n*📁 Peso:* ${size}\n\n_El progreso se monitorea en la terminal._`);

        // 2. Configurar ruta temporal y Stream
        const tempPath = join(tmpdir(), `${Date.now()}_${name.replace(/\s+/g, '_')}`);
        const writer = fs.createWriteStream(tempPath);
        const stream = file.download();

        console.log(`[MEGA] 📦 Descargando: ${name}`);

        let downloadedLength = 0;
        const totalLength = file.size;

        // 3. Monitoreo en Terminal
        stream.on('data', (chunk) => {
            downloadedLength += chunk.length;
            const progress = ((downloadedLength / totalLength) * 100).toFixed(2);
            
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`[MEGA] 🔽 PROGRESO: ${progress}% (${(downloadedLength / 1024 / 1024).toFixed(2)} MB / ${size})`);
        });

        stream.pipe(writer);

        // 4. Finalización y envío
        writer.on('finish', async () => {
            console.log(`\n[MEGA] ✅ Descarga completa. Subiendo a WhatsApp...`);
            
            try {
                await conn.sendFile(m.chat, tempPath, name, '', m, null, { 
                    mimetype: mime, 
                    asDocument: true 
                });
                console.log(`[MEGA] ✨ Enviado con éxito.\n`);
            } catch (e) {
                console.error(`[MEGA] ❌ Error al enviar:`, e.message);
                m.reply('❌ Error al subir el archivo a WhatsApp.');
            } finally {
                // Limpieza de disco
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }
        });

        writer.on('error', (err) => {
            console.error('[MEGA] ❌ Error de escritura:', err);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            m.reply('❌ Error crítico al procesar el archivo.');
        });

    } catch (error) {
        console.error('[MEGA] ❌ Error:', error.message);
        await m.reply(`❌ Enlace inválido o error de conexión. Asegúrate de incluir la clave de descifrado.`);
    }
};

handler.command = /^(mega|dlmega|mg)$/i;
export default handler;
