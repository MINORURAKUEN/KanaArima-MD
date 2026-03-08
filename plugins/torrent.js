import WebTorrent from 'webtorrent';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Instanciamos el cliente fuera del handler para eficiencia
const client = new WebTorrent();

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Validación de entrada
    if (!args[0]) throw `*< DESCARGAS - TORRENT />*\n\n*[ ℹ️ ] Ingrese un enlace Magnet.*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} magnet:?xt=urn:btih:...`;

    if (!args[0].startsWith('magnet:')) {
        return m.reply('❌ *Formato inválido.* El enlace debe ser un **Magnet Link**.');
    }

    try {
        const waitingMsg = await m.reply(`*⏳ Buscando Seeds...*\n_Conectando a la red Peer-to-Peer para obtener metadatos._`);

        // 2. Configuración del Torrent
        // Usamos un timeout manual para evitar que el bot se quede colgado si el torrent está muerto
        const timeout = setTimeout(() => {
            const tor = client.get(args[0]);
            if (tor && !tor.metadata) {
                tor.destroy();
                conn.sendMessage(m.chat, { text: '❌ *Tiempo de espera agotado.* No se encontraron semillas (seeds) suficientes para iniciar la descarga.' }, { quoted: m });
            }
        }, 60000); // 1 minuto de espera para metadatos

        client.add(args[0], { path: tmpdir() }, (torrent) => {
            clearTimeout(timeout); // Si encontró metadatos, cancelamos el timeout

            // Buscamos el archivo más grande del torrent (el contenido principal)
            const file = torrent.files.reduce((prev, current) => {
                return (prev.length > current.length) ? prev : current;
            });

            const sizeInMB = file.length / (1024 * 1024);
            const sizeFormatted = sizeInMB.toFixed(2) + ' MB';

            // Validación de peso (Límite sugerido: 300MB para evitar errores de buffer en WhatsApp)
            if (sizeInMB > 300) {
                torrent.destroy();
                return m.reply(`⚠️ *Archivo demasiado grande (${sizeFormatted}).* El límite permitido es de 300MB.`);
            }

            m.reply(`*📥 Descarga Iniciada*\n\n*📝 Archivo:* ${file.name}\n*📁 Peso:* ${sizeFormatted}\n*👥 Semillas:* ${torrent.numPeers}\n\n_Enviando cuando finalice..._`);
            console.log(`\n[TORRENT] 🔽 Descargando: ${file.name}`);

            // 3. Monitoreo de Progreso (Terminal)
            torrent.on('download', () => {
                const progress = (torrent.progress * 100).toFixed(2);
                const speed = (torrent.downloadSpeed / (1024 * 1024)).toFixed(2);
                
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`[TORRENT] 🔽 ${progress}% | 🚀 ${speed} MB/s | Seeds: ${torrent.numPeers}`);
            });

            // 4. Finalización y Envío
            torrent.on('done', async () => {
                console.log(`\n[TORRENT] ✅ Completo. Preparando envío...`);
                const filePath = join(tmpdir(), file.path);
                
                try {
                    await conn.sendFile(m.chat, filePath, file.name, `*✅ Torrent Descargado*\n\n*📄 Archivo:* ${file.name}\n*⚖️ Peso:* ${sizeFormatted}`, m, null, {
                      
