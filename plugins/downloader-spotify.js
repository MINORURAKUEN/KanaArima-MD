const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, { text: '⚠️ *Uso:* .spotify <nombre de la canción>' }, { quoted: message });
            return;
        }

        // 1. Informar al usuario
        await sock.sendMessage(chatId, { text: '*[⏳] Buscando y procesando en Spotify...*' }, { quoted: message });

        // 2. Obtener datos de la API (Usando apicausas como prioridad)
        const apiKey = "causa-0e3eacf90ab7be15";
        // Nota: Primero necesitamos buscar la URL de la canción. 
        // Usaremos tu API actual de búsqueda para obtener el link de Spotify.
        const searchUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data: searchData } = await axios.get(searchUrl);

        if (!searchData?.status || !searchData?.result) {
            throw new Error('No se encontraron resultados.');
        }

        const track = searchData.result;
        const spotifyUrl = track.url; // URL original de Spotify

        // 3. Descargar usando la nueva API
        const downloadApi = `https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodeURIComponent(spotifyUrl)}`;
        const { data: dlRes } = await axios.get(downloadApi);

        let finalAudio = track.audio; // Fallback al audio original
        let finalTitle = track.title || track.name || 'Desconocido';
        let finalImage = track.thumbnails || '';

        if (dlRes?.status && dlRes?.resultado) {
            finalAudio = dlRes.resultado.url || finalAudio;
            finalTitle = dlRes.resultado.titulo || finalTitle;
            finalImage = dlRes.resultado.portada || finalImage;
        }

        if (!finalAudio) throw new Error('No se pudo obtener el enlace de descarga.');

        // 4. Construcción de texto segura (Evita el error text.match)
        const caption = `🎵 *Título:* ${finalTitle}\n👤 *Artista:* ${track.artist || 'N/A'}\n⏱ *Duración:* ${track.duration || 'N/A'}\n🔗 *Link:* ${spotifyUrl}`.trim();

        // 5. Envío de imagen con información
        // Usamos String() para asegurar que el texto sea válido para Baileys
        await sock.sendMessage(chatId, {
            image: { url: finalImage },
            caption: String(caption) 
        }, { 
            quoted: message,
            // Desactivamos explícitamente el link preview que causa el crash
            options: { linkPreview: null } 
        });

        // 6. Envío del audio
        await sock.sendMessage(chatId, {
            audio: { url: finalAudio },
            mimetype: 'audio/mpeg',
            fileName: `${finalTitle.replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: message });

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        // Fallback simple por si el error de Baileys ocurre en el bloque anterior
        await sock.sendMessage(chatId, { text: '❌ Error: No se pudo procesar la solicitud.' }, { quoted: message });
    }
}

module.exports = spotifyCommand;
