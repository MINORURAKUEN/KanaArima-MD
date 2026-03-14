import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, client, args, text, command }) => {
    // Compatibilidad por si usas 'conn' o 'client' en tu base
    const socket = conn || client
    let query = text || args.join(' ')
    
    // Tu API Key de RestCausas (Recomendación: Mover a un archivo .env en el futuro)
    const apikey = process.env.API_CAUSAS || "causa-0e3eacf90ab7be15"
    
    // Validar si el usuario ingresó un texto o enlace
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.\n\n*Ejemplo:* .play Linkin Park` }, { quoted: m })

    try {
        // 1. Buscar en YouTube
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video con esa búsqueda.')

        // 2. Detectar si el comando pide video (mp4) o audio (mp3)
        const isVideo = /play2|mp4|video/i.test(command)
        const type = isVideo ? 'video' : 'audio' // Asegurado para la API

        // 3. Crear el texto de información
        const captionInfo = `╭━━━〔 🎵 YOUTUBE ${isVideo ? 'VIDEO' : 'AUDIO'} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        // 4. Enviar miniatura informativa y reaccionar con reloj
        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: captionInfo }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        // 5. Consultar la API de descargas
        const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(video.url)}&type=${type}`
        const res = await fetch(apiUrl)
        const json = await res.json()

        // 6. Extraer el enlace de descarga de la respuesta JSON
        const downloadUrl = json.data?.download?.url || json.result?.download || json.url
        if (!downloadUrl) throw new Error('La API no devolvió un enlace de descarga válido.')

        // 7. Enviar el archivo final
        if (isVideo) {
            // ENVIAR COMO VIDEO
            await socket.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: `🎬 *${video.title}*\n\nDescargado vía: *RestCausas* ✅`,
                mimetype: 'video/mp4',
                fileName: `${video.title}.mp4`
            }, { quoted: m })
        } else {
            // ENVIAR COMO AUDIO
            await socket.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: m })
        }

        // Reacción de éxito
        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        // Reacción de error y mensaje
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m })
    }
}

// Configuración del comando para el bot
handler.help = ['play', 'play2', 'mp4', 'mp3', 'video']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler
  
