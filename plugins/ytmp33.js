import fetch from 'node-fetch';

const handler = async (m, { conn, client, args, text, command, usedPrefix }) => {
    // Compatibilidad de sockets (por si usas conn o client)
    const socket = conn || client;
    let url = text || args[0];
    
    // Tu API Key de RestCausas
    const apikey = "causa-0e3eacf90ab7be15";
    
    // Validar si el usuario ingresó un enlace
    if (!url) {
        return socket.sendMessage(m.chat, { 
            text: `《✧》 Por favor, ingresa un enlace de YouTube válido.\n\n*Ejemplo:* ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ` 
        }, { quoted: m });
    }
    
    if (!url.includes('youtu')) {
        return socket.sendMessage(m.chat, { 
            text: `❌ El enlace proporcionado no parece ser de YouTube.` 
        }, { quoted: m });
    }

    try {
        // Reaccionar con reloj de arena al inicio del proceso
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        // Consultar la API (OJO: Aquí cambiamos type=video por type=audio)
        const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(url)}&type=audio`;
        const res = await fetch(apiUrl);
        const json = await res.json();

        // Extraer enlace de descarga y título de la respuesta de la API
        const downloadUrl = json.data?.download?.url || json.result?.download || json.url || (json.data && json.data.url);
        const title = json.data?.title || json.title || json.result?.title || 'Audio_YouTube';
        
        if (!downloadUrl) throw new Error('La API no devolvió un enlace de descarga válido para el audio.');

        // Limpiar el título para evitar errores en el nombre del archivo
        const tituloLimpio = title.replace(/[\\/:*?"<>|]/g, "");

        // Diferenciar entre comando de audio normal y documento
        if (command === 'ytmp3doc') {
            // ENVIAR COMO DOCUMENTO (.ytmp3doc)
            await socket.sendMessage(m.chat, { 
                document: { url: downloadUrl }, 
                caption: `📄 *${title}*\n\n🎵 _Formato: MP3_\n✅ _Descargado vía RestCausas_`,
                mimetype: 'audio/mpeg',
                fileName: `${tituloLimpio}.mp3`
            }, { quoted: m });
        } else {
            // ENVIAR COMO AUDIO NORMAL (.ytmp3)
            // Nota: En Baileys, mandar 'audio' envía un reproductor en el chat.
            await socket.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${tituloLimpio}.mp3`
                // Los audios normales en WhatsApp no suelen soportar 'caption' (texto debajo), 
                // así que no lo incluimos para evitar errores de Baileys.
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
handler.help = ['ytmp3 <link>', 'ytmp3doc <link>'];
handler.tags = ['downloader'];
// Detecta tanto .ytmp3, .ytmp3doc, y también atajos comunes como .yta o .playaudio si quieres añadirlos luego
handler.command = /^(ytmp3|ytmp3doc|yta)$/i;

export default handler;
