// ... (tus imports anteriores)
import axios from "axios";

// Configuración de la nueva API
const API_CONFIG = {
  baseUrl: 'https://rest.apicausas.xyz/api/v1/descargas/youtube',
  apikey: 'causa-0e3eacf90ab7be15'
};

// ... (clase DownloadQueue y constantes previas)

/**
 * Nueva función para descargar usando la API de apicausas
 * @param {string} url - URL de YouTube
 * @param {string} type - 'mp3' o 'mp4'
 */
const downloadViaApi = async (url, type = 'mp4') => {
  try {
    const endpoint = `${API_CONFIG.baseUrl}?apikey=${API_CONFIG.apikey}&url=${url}`;
    const { data } = await axios.get(endpoint);

    // La API suele devolver un JSON con el link directo de descarga
    // Ajusta según la respuesta real de tu API (ej: data.result.url o data.download_url)
    if (data.status && data.result) {
      const downloadUrl = type === 'mp3' ? data.result.mp3 : data.result.mp4;
      return downloadUrl;
    }
    throw new Error("La API no devolvió un enlace válido");
  } catch (error) {
    console.error("Error en API apicausas:", error.message);
    return null;
  }
};

// Modificación dentro de handleRequest para priorizar la API en links de YouTube
const handleRequest = async (m) => {
  const input = cleanCommand(m.text.trim());
  // ... (validaciones de input vacio)

  try {
    const args = input.match(/[^\s"]+|"([^"]*)"/g)?.map(arg => 
      arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
    ) || [];

    const command = args[0];
    const remainingArgs = args.slice(1);
    const urls = remainingArgs.filter(arg => isUrl(arg));

    // Lógica para links de YouTube usando la API
    if (urls.length > 0 && urls[0].includes('youtube.com') || urls[0].includes('youtu.be')) {
        await m.reply('Procesando enlace de YouTube vía API...');
        const type = (command === 'mp3') ? 'mp3' : 'mp4';
        const mediaUrl = await downloadViaApi(urls[0], type);

        if (mediaUrl) {
            if (type === 'mp4') {
                return await conn.sendMessage(m.chat, { video: { url: mediaUrl }, caption: '✅ Descargado' }, { quoted: m });
            } else {
                return await conn.sendMessage(m.chat, { audio: { url: mediaUrl }, mimetype: "audio/mpeg" }, { quoted: m });
            }
        } else {
            await m.reply('La API falló, intentando con YT-DLP local...');
            // Si falla la API, el flujo sigue abajo con el yt-dlp normal
        }
    }

    // ... (El resto de tu lógica original de yt-dlp se mantiene como backup)
    // switch (command) { ... }
    
  } catch (error) {
    // ...
  }
}

