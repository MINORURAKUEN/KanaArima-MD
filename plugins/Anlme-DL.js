import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
// Importamos el motor que actuará como tu 1DM
import youtubedl from 'youtube-dl-exec'; 
import axios from 'axios';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `*🎬 Uso:* ${usedPrefix + command} <enlace del episodio de anime>`;

    const tempPath = join(tmpdir(), `${Date.now()}_anime.mp4`);

    try {
        await m.reply(`🔍 *Buscando en la API y servidores...*`);

        // --- 1. LA API (Obteniendo el enlace del servidor) ---
        // Aquí simulamos el uso de una API o tu scraper mejorado. 
        // Si el usuario envía un link de una página de anime, la API busca el link de Streamtape, VOE, etc.
        let targetUrl = url; 
        
        // Ejemplo conceptual: Si no es un link directo de un servidor, lo pasamos por la API
        if (!/streamtape|voe|mixdrop|mp4upload|doodstream/i.test(url)) {
            // targetUrl = await miApiDeAnime(url); 
            // ^ Aquí conectarías la API que extrae el link del servidor específico.
        }

        await m.reply(`📥 *Servidor encontrado. Descargando video (imitando a 1DM)... esto puede tomar un momento dependiendo del peso.*`);

        // --- 2. YT-DLP (El 1DM de Node.js en acción) ---
        // Esto descarga el video automáticamente sin abrir navegadores pesados
        await youtubedl(targetUrl, {
            output: tempPath,
            format: 'best', // Busca la mejor calidad en un solo archivo mp4
            noWarnings: true,
            addHeader: [
                'referer: https://google.com', // Engaña a servidores como Mp4upload
                'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Finge ser un PC normal
            ]
        });

        // --- VERIFICACIÓN DE TAMAÑO ---
        const stats = fs.statSync(tempPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        // Límite de WhatsApp suele ser 50MB-100MB para cuentas normales
        if (fileSizeInMB > 100) {
            await m.reply(`⚠️ *Aviso:* El video pesa *${fileSizeInMB} MB*. Es posible que WhatsApp tarde en enviarlo o lo rechace por límite de tamaño.`);
        } else {
            await m.reply(`🚀 *Descarga exitosa (${fileSizeInMB} MB). Enviando a WhatsApp...*`);
        }

        // --- ENVÍO A WHATSAPP ---
        await conn.sendMessage(m.chat, { 
            document: { url: tempPath }, // Enviamos como documento para evitar que WhatsApp le baje la calidad
            fileName: `Anime_${Date.now()}.mp4`, 
            mimetype: 'video/mp4',
            caption: `✅ *Anime descargado con éxito*\n⚖️ *Peso:* ${fileSizeInMB} MB`
        }, { quoted: m });

    } catch (e) {
        console.error("Error en la descarga:", e);
        m.reply(`❌ *Error al procesar:* El servidor podría estar bloqueando la descarga o el enlace expiró.\n\n_Detalle:_ ${e.message.substring(0, 100)}...`);
    } finally {
        // --- LIMPIEZA OBLIGATORIA (Evita que tu OPPO se llene de basura) ---
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (err) {
                console.error('Error al borrar archivo temporal:', err);
            }
        }
    }
};

handler.command = /^(animedl|amdl)$/i;
export default handler;

