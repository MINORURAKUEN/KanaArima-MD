import fetch from 'node-fetch';

const handler = async (m, { conn, client, args, text, command }) => {
    // Compatibilidad de sockets
    const socket = conn || client;
    let url = text || args[0];
    
    // Tu API Key
    const apikey = "causa-0e3eacf90ab7be15";
    
    // Validar si el usuario ingresó un enlace
    if (!url) {
        return socket.sendMessage(m.chat, { 
            text: `《✧》 Por favor, ingresa un enlace de YouTube válido.` 
        }, { quoted: m });
    }
    
    if (!url.includes('youtu')) {
        return socket.sendMessage(m.chat, { 
            text: `❌ El enlace proporcionado no parece ser de YouTube.` 
        }, { quoted: m });
    }

    try {
        // Reaccionar con reloj al inicio del proceso
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        // 1. Construir la URL de la API dinámicamente
        let apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(url)}&type=video`;
        
        // Si el comando es ytmp4doc, le añadimos el parámetro para forzar 720p
        if (command === 'ytmp4doc') {
            apiUrl += `&quality=720p`;
        }

        // Consultar la API
        const res = await fetch(apiUrl);
        const json = await res.json();

        // Extraer enlace de descarga y título
        const downloadUrl = json.data?.download?.url || json.result?.download || json.url || (json.data && json.data.url);
        const title = json.data?.title || json.title || json.result?.title || 'Video_YouTube';
        
        if (!downloadUrl) throw new Error('La API no devolvió un enlace de descarga válido.');

        // Limpiar el título para el nombre del archivo
        const tituloLimpio = title.replace(/[\\/:*?"<>|]/g, "");

        // 2. Enviar el archivo según el comando
        if (command === 'ytmp4doc') {
            // ENVIAR COMO DOCUMENTO (Calidad 720p, sin caption)
            await socket.sendMessage(m.chat, { 
                document: { url: downloadUrl }, 
                mimetype: 'video/mp4',
                fileName: `${tituloLimpio}.mp4`
            }, { quoted: m });
        } else {
            // ENVIAR COMO VIDEO NORMAL (Calidad por defecto, solo título en caption)
            await socket.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: `🎬 *${title}*`,
                mimetype: 'video/mp4',
                fileName: `${tituloLimpio}.mp4`
            }, { quoted: m });
        }

        // Reacción de éxito
        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        // Reacción de error y mensaje
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m });
    }
};

// Configuración de los comandos para el bot
handler.help = ['ytmp4 <link>', 'ytmp4doc <link>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytmp4doc)$/i;

export default handler;
