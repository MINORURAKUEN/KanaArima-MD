import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, text, command }) => {
    if (!text) throw `❗ *Escribe el nombre o link del video*\n\nEjemplo: .${command} Gurenge`

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        const search = await yts(text)
        const video = search.videos[0]
        if (!video) throw '❌ No se encontró el video'

        const isVideo = command === 'play2'
        
        // --- PLANTILLA PERSONALIZADA ---
        let caption = `
╭━━━〔 🎵 YOUTUBE PLAY ${isVideo ? 'MP4' : 'MP3'} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await conn.sendMessage(m.chat, { 
            image: { url: video.thumbnail }, 
            caption 
        }, { quoted: m })

        // Reacción de espera
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null

        // --- LISTA DE APIS ---
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

        // --- FALLBACK: YT-DLP ---
        if (!downloadUrl) {
            const fileName = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            try {
                // Descarga local con límite de 60MB para evitar lag en Termux
                await execPromise(`yt-dlp -f "${format}" --max-filesize 60M "${video.url}" -o "${fileName}"`)
                
                const buffer = fs.readFileSync(fileName)
                await conn.sendMessage(m.chat, { 
                    [isVideo ? 'video' : 'audio']: buffer, 
                    mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                    fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                    caption: isVideo ? video.title : ''
                }, { quoted: m })

                fs.unlinkSync(fileName) 
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                return 
            } catch (err) {
                throw new Error('No se pudo descargar con APIs ni con yt-dlp.')
            }
        }

        // --- ENVÍO POR API (SI FUNCIONÓ) ---
        if (isVideo) {
            await conn.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: video.title 
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg', 
                fileName: `${video.title}.mp3` 
            }, { quoted: m })
        }

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        conn.reply(m.chat, `❌ *Fallo en la descarga:* ${e.message}`, m)
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2)$/i

export default handler
    
