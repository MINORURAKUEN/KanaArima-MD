import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, client, args, text, command }) => {
    // Definimos el socket para compatibilidad con diferentes versiones de bots
    const socket = conn || client
    let query = text || args.join(' ')
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    // Crear carpeta temporal si no existe
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        // Realizar la búsqueda con yt-search
        const search = await yts(query)
        const video = search.videos[0]
        
        if (!video) throw new Error('No se encontró ningún video con ese nombre.')

        // --- LÓGICA DE FORMATOS ---
        const isVideo = /play2|mp4|video|ytmp4|ytmp4doc/.test(command)
        const isDoc = /doc|documento|ytmp3doc|ytmp4doc/.test(command)
        const type = isVideo ? 'video' : 'audio'
        
        // Limpieza de caracteres para evitar "formato inusual" en WhatsApp
        const cleanTitle = video.title.replace(/[\\/:*?"<>|]/g, '')
        
        const caption = `╭━━━〔 🎵 YOUTUBE ${type.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        // Mensaje inicial con miniatura
        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null
        let metodo = ""

        // 1. INTENTO CON API RESTCAUSAS (Tu API Key)
        try {
            const apiRes = await fetch(`https://rest.apicausas.xyz/api/v1/descargas/youtube?url=${encodeURIComponent(video.url)}&apikey=causa-0e3eacf90ab7be15`)
            const json = await apiRes.json()
            downloadUrl = json.result?.download || json.result?.url || json.data?.url || json.url
            if (downloadUrl) metodo = `Descargado vía: *RestCausas API* ✅`
        } catch (e) {
            console.error("Error en API RestCausas:", e.message)
        }

        // --- FUNCIÓN DE ENVÍO REUTILIZABLE ---
        const sendFile = async (source) => {
            const ext = isVideo ? 'mp4' : 'mp3'
            const fileName = `${cleanTitle}.${ext}`
            const mimetype = isVideo ? 'video/mp4' : 'audio/mpeg'
            
            if (isDoc) {
                // Modo Documento (Sin alerta de seguridad)
                return await socket.sendMessage(m.chat, { 
                    document: typeof source === 'string' ? { url: source } : source, 
                    mimetype: mimetype, 
                    fileName: fileName,
                    caption: `*Archivo:* ${fileName}\n${metodo}`
                }, { quoted: m })
            } else {
                // Modo Multimedia normal
                return await socket.sendMessage(m.chat, { 
                    [type]: typeof source === 'string' ? { url: source } : source,
                    mimetype: mimetype,
                    fileName: fileName,
                    caption: isVideo ? `${video.title}\n\n${metodo}` : metodo
                }, { quoted: m })
            }
        }

        // Procesar descarga
        if (downloadUrl) {
            await sendFile(downloadUrl)
        } else {
            // 2. FALLBACK LOCAL (yt-dlp)
            metodo = "Descargado vía: *yt-dlp (Local)* 🛠️"
            const tempFile = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            await execPromise(`yt-dlp -f "${format}" --max-filesize 60M "${video.url}" -o "${tempFile}"`)
            const buffer = fs.readFileSync(tempFile)
            await sendFile(buffer)
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc', 'play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|mp4|video|ytmp3|ytmp4|ytmp3doc|ytmp4doc|playaudio|playdoc)$/i

export default handler
                
