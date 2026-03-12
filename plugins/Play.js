import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró el video.')

        const isVideo = /play2|mp4|video|ytmp4|ytmp4doc/.test(command)
        const isDoc = /doc|documento|ytmp3doc|ytmp4doc/.test(command)
        const cleanTitle = video.title.replace(/[\\/:*?"<>|]/g, '')
        
        const caption = `╭━━━〔 🎵 YOUTUBE ${isVideo ? 'VIDEO' : 'AUDIO'} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null
        let metodo = ""

        // 1. INTENTO API RESTCAUSAS
        try {
            const apiRes = await fetch(`https://rest.apicausas.xyz/api/v1/descargas/youtube?url=${encodeURIComponent(video.url)}&apikey=causa-0e3eacf90ab7be15`)
            const json = await apiRes.json()
            downloadUrl = json.result?.download || json.result?.url || json.data?.url
            if (downloadUrl) metodo = `Descargado vía: *RestCausas API* ✅`
        } catch { /* Fallback */ }

        const sendFile = async (source) => {
            // Si es una URL, descargamos a Buffer para asegurar compatibilidad
            let data = typeof source === 'string' ? await (await fetch(source)).buffer() : source
            const fileName = `${cleanTitle}.${isVideo ? 'mp4' : 'mp3'}`
            
            if (isDoc) {
                return await socket.sendMessage(m.chat, { 
                    document: data, 
                    mimetype: isVideo ? 'video/mp4' : 'audio/mpeg', 
                    fileName,
                    caption: metodo 
                }, { quoted: m })
            } else if (isVideo) {
                // ENVÍO DE VIDEO REPRODUCIBLE
                return await socket.sendMessage(m.chat, { 
                    video: data, 
                    mimetype: 'video/mp4',
                    caption: `${video.title}\n\n${metodo}`,
                    fileName: fileName,
                    asDocument: false 
                }, { quoted: m })
            } else {
                // ENVÍO DE AUDIO REPRODUCIBLE (Naranja)
                return await socket.sendMessage(m.chat, { 
                    audio: data, 
                    mimetype: 'audio/mp4', // mp4 suele ser más compatible para reproductor
                    fileName: fileName,
                    ptt: false // Cambia a true si prefieres nota de voz (verde)
                }, { quoted: m })
            }
        }

        if (downloadUrl) {
            await sendFile(downloadUrl)
        } else {
            // 2. FALLBACK YT-DLP
            metodo = "Descargado vía: *yt-dlp (Local)* 🛠️"
            const tempFile = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            await execPromise(`yt-dlp -f "${format}" --max-filesize 60M "${video.url}" -o "${tempFile}"`)
            await sendFile(fs.readFileSync(tempFile))
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m })
    }
}

handler.command = /^(play|play2|mp3|mp4|video|ytmp3|ytmp4|ytmp3doc|ytmp4doc|playaudio|playdoc)$/i
export default handler
            
