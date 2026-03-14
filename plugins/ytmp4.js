import axios from 'axios';

// =========================================================================
// 1. FUNCIÓN PARA OBTENER EL ENLACE DE LA API (El Motor)
// =========================================================================
const obtenerDescargaAPI = async (urlYouTube) => {
    try {
        const apikey = 'causa-0e3eacf90ab7be15';
        // Construimos la URL exacta con los parámetros que me diste
        const endpoint = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(urlYouTube)}&type=video`;

        const respuesta = await axios.get(endpoint);
        const data = respuesta.data;

        // Extraemos la información (ajustado a las respuestas comunes de APIs REST)
        // Nota: Si la API usa otra estructura exacta, asegúrate de cambiar "data.url" por la correcta.
        const enlaceDescarga = data.url || (data.data && data.data.url);
        const titulo = data.title || (data.data && data.data.title) || 'Video_YouTube';

        if (!enlaceDescarga) {
            return { status: false, error: 'La API no devolvió un enlace de descarga.' };
        }

        return { 
            status: true, 
            titulo: titulo, 
            enlace: enlaceDescarga 
        };

    } catch (error) {
        console.error('Error al conectar con la API de Apicausas:', error.message);
        return { status: false, error: 'No se pudo conectar con la API.' };
    }
};

// =========================================================================
// 2. LÓGICA DE LOS COMANDOS (Integrar en tu manejador de mensajes)
// =========================================================================

// Asegúrate de que estas variables vengan de tu lector de mensajes del bot
// const text = msg.message.conversation; (ejemplo)
// const chatId = msg.key.remoteJid; (ejemplo)

const args = text.trim().split(/ +/);
const comando = args[0].toLowerCase(); // Ej: ".ytmp4" o ".ytmp4doc"
const url = args[1];                   // Ej: "https://youtu.be/..."

if (comando === '.ytmp4' || comando === '.ytmp4doc') {
    
    // Validar que el usuario haya enviado un enlace
    if (!url || !url.includes('youtu')) {
        return responder('❌ Por favor, envía un enlace de YouTube válido.\n*Ejemplo:* ' + comando + ' https://youtu.be/dQw4w9WgXcQ');
    }

    responder('⏳ Obteniendo el video desde el servidor, por favor espera...');

    // Llamamos a la API
    const resultado = await obtenerDescargaAPI(url);

    if (!resultado.status) {
        return responder('❌ Ocurrió un error: ' + resultado.error);
    }

    try {
        // Limpiamos el título para evitar problemas en el nombre del archivo
        const tituloLimpio = resultado.titulo.replace(/[\\/:*?"<>|]/g, ""); 

        // OPCIÓN 1: Enviar como VIDEO (.ytmp4)
        if (comando === '.ytmp4') {
            await bot.sendMessage(chatId, { 
                video: { url: resultado.enlace }, 
                caption: `🎬 *Título:* ${resultado.titulo}\n🚀 _Descargado vía Apicausas_`,
                mimetype: 'video/mp4'
            });
        } 
        
        // OPCIÓN 2: Enviar como DOCUMENTO (.ytmp4doc)
        else if (comando === '.ytmp4doc') {
            await bot.sendMessage(chatId, { 
                document: { url: resultado.enlace }, 
                fileName: `${tituloLimpio}.mp4`,
                caption: `📄 *Documento:* ${resultado.titulo}`,
                mimetype: 'video/mp4'
            });
        }

    } catch (err) {
        console.error('Error al enviar el archivo a WhatsApp:', err);
        responder('❌ Error al enviar. Es posible que el archivo exceda el límite de peso permitido por WhatsApp.');
    }
}
