import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

// Función auxiliar para obtener buffer si es necesario
const getBuffer = async (url) => {
    const res = await fetch(url)
    return res.buffer()
}

const handler = async (m, { conn, client, args, text, command }) => {
    // Adaptación para ambos tipos de estructura (client o conn)
    const socket = conn || client
    const query = text || args.join(' ')
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Por favor, menciona el nombre o URL del video.\n\nEjemplo: .${command} Gurenge` }, { quoted: m })

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        // 1. Búsqueda de video
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw '❌ No se encontró el video'

        const isVideo = /play2|mp4|video/.test(command)
        const type = isVideo ? 'video' : 'audio'

        // 2. Diseño de la interfaz (Mezcla de ambos estilos)
        const caption = `╭━━━〔 🎵 YOUTUBE ${type.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣
> 𐙚 El archivo se está procesando, espera un momento...`.trim()

        await socket.sendMessage(m.chat, { 
            image: { url: video.thumbnail }, 
            caption 
        }, { quoted: m })

        // Reacción de espera
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null

        // 3. Intento con API Personalizada (Tu segunda estructura)
        try {
            const apiCustom = `${global.api?.url || 'https://api.example.com'}/dl/youtubeplay?query=${encodeURIComponent(video.url)}&key=${global.api?.key || ''}`
            const resCustom = await fetch(apiCustom).then(r => r.json())
            if (resCustom.status && resCustom.data) {
                downloadUrl = isVideo ? resCustom.data.dl_video : resCustom.data.dl
            }
        } catch (e) { /* fallback a la siguiente */ }

        // 4. Lista de APIs de respaldo (Tu primera estructura)
        if (!downloadUrl) {
            const apiList = [
                `https://api.evogb.org/api/${isVideo ? 'ytdl' : 'yta'}?url=${video.url}&apikey=evogb-9ivSW7OY`,
                `https://rest.apicausas.xyz/api/ytdl?url=${video.url}&apikey=causa-0e3eacf90ab7be15`,
                `https://api.zenkey.my.id/api/download/yt${isVideo ? 'mp4' : 'mp3'}?url=${video.url}`
            ]

            for (let api of apiList) {
                try {
                    let res = await fetch(api)
                    let json = await res.json()
                    downloadUrl = json.result?.download || json.result?.url || json.url || json.data?.url
                    if (downloadUrl) break
                } catch { continue }
            }
        }

        // 5. Envío de archivo
        if (downloadUrl) {
            const docOptions = {
                [type]: { url: downloadUrl },
                mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                caption: isVideo ? video.title : ''
            }
            await socket.sendMessage(m.chat, docOptions, { quoted: m })
        } else {
            // 6. FALLBACK FINAL: YT-DLP (Si las APIs fallan)
            const fileName = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            await execPromise(`yt-dlp -f "${format}" --max-filesize 60M "${video.url}" -o "${fileName}"`)
            const buffer = fs.readFileSync(fileName)
            
            await socket.sendMessage(m.chat, { 
                [type]: buffer, 
                mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                caption: isVideo ? video.title : ''
            }, { quoted: m })

            if (fs.existsSync(fileName)) fs.unlinkSync(fileName)
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* No se pudo procesar la descarga.` }, { quoted: m })
    }
}

handler.help = ['play', 'play2', 'mp3', 'mp4']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|ytmp3|ytaudio|video|mp4)$/i

export default handler
                
