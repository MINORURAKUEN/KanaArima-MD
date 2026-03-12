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
        if (!video) throw new Error('No se encontró ningún video.')

        const isVideo = /play2|mp4|video/.test(command)
        const type = isVideo ? 'video' : 'audio'

        const caption = `╭━━━〔 🎵 YOUTUBE ${type.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null
        let metodo = "" // Variable para rastrear el método

        // 1. INTENTO CON APIS EXTERNAS
        const apiList = [
            { name: "API Zenkey", url: `https://api.zenkey.my.id/api/download/yt${isVideo ? 'mp4' : 'mp3'}?url=${video.url}` },
            { name: "API EvoGB", url: `https://api.evogb.org/api/${isVideo ? 'ytdl' : 'yta'}?url=${video.url}&apikey=evogb-9ivSW7OY` },
            { name: "API RestCausas", url: `https://rest.apicausas.xyz/api/ytdl?url=${video.url}&apikey=causa-0e3eacf90ab7be15` }
        ]

        for (let api of apiList) {
            try {
                let res = await fetch(api.url)
                let json = await res.json()
                downloadUrl = json.result?.download || json.result?.url || json.url || json.data?.url
                if (downloadUrl) {
                    metodo = `Descargado vía: *${api.name}* ✅`
                    break
                }
            } catch { continue }
        }

        if (downloadUrl) {
            // Envío si funcionó alguna API
            await socket.sendMessage(m.chat, { 
                [type]: { url: downloadUrl },
                mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                caption: isVideo ? `${video.title}\n\n${metodo}` : metodo
            }, { quoted: m })
        } else {
            // 2. FALLBACK: yt-dlp (Servidor Local)
            metodo = "Descargado vía: *yt-dlp (Local)* 🛠️"
            const fileName = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            try {
                // Se añade explícitamente el uso de node para evitar el error JS anterior
                await execPromise(`yt-dlp --js-runtime node -f "${format}" --max-filesize 60M "${video.url}" -o "${fileName}"`)
                
                const buffer = fs.readFileSync(fileName)
                await socket.sendMessage(m.chat, { 
                    [type]: buffer, 
                    mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                    fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                    caption: isVideo ? `${video.title}\n\n${metodo}` : metodo
                }, { quoted: m })

                if (fs.existsSync(fileName)) fs.unlinkSync(fileName)
            } catch (err) {
                throw new Error('Todas las fuentes fallaron (APIs y yt-dlp).')
            }
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error Final:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler

