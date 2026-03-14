import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Validamos que el usuario haya enviado un texto/enlace junto al comando
    if (!text) {
        return m.reply(`❌ *Falta el enlace.*\nPor favor, ingresa un enlace de YouTube válido.\n*Ejemplo:* ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ`);
    }

    // 2. Avisamos que el proceso inició
    await m.reply('⏳ *Obteniendo el video desde el servidor, por favor espera un momento...*');

    try {
        const apikey = 'causa-0e3eacf90ab7be15';
        const urlYouTube = text.trim();
        
        // 3. Hacemos la petición a la API
        const endpoint = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(urlYouTube)}&type=video`;
        const { data } = await axios.get(endpoint);

        // 4. Extraemos el enlace y el título
        const enlaceDescarga = data.url || (data.data && data.data.url) || data.download;
        const titulo = data.title || (data.data && data.data.title) || 'Video_YouTube';

        if (!enlaceDescarga) {
            return m.reply('❌ *Error:* La API no pudo generar un enlace de descarga válido.');
        }

        // Limpiamos el título para que WhatsApp no dé error con caracteres raros en el nombre de archivo
        const tituloLimpio = titulo.replace(/[\\/:*?"<>|]/g, ""); 

        // 5. Enviamos el archivo según el comando que el usuario utilizó
        if (command === 'ytmp4') {
            await conn.sendMessage(m.chat, { 
                video: { url: enlaceDescarga }, 
                caption: `🎬 *Título:* ${titulo}\n🚀 _Descargado vía Apicausas_`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } else if (command === 'ytmp4doc') {
            await conn.sendMessage(m.chat, { 
                document: { url: enlaceDescarga }, 
                fileName: `${tituloLimpio}.mp4`,
                caption: `📄 *Documento:* ${titulo}`,
                mimetype: 'video/mp4'
            }, { quoted: m });
        }

    } catch (error) {
        console.error('Error en ytmp4.js:', error.message);
        m.reply('❌ *Ocurrió un error inesperado al descargar.* Es posible que el video esté restringido o sea muy pesado.');
    }
};

// Configuración de los comandos que activarán este plugin
handler.command = ['ytmp4', 'ytmp4doc']; 
handler.tags = ['downloader'];
handler.help = ['ytmp4 <enlace>', 'ytmp4doc <enlace>'];

export default handler;
