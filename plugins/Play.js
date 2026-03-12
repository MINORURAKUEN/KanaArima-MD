import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, text, command }) => {
    if (!text) throw `❗ *Ingresa el nombre o link*\n\nEjemplo: .${command} Gurenge`

    try {
        const search = await yts(text)
        const video = search.videos[0]
        if (!video) throw '❌ No se encontró el video.'

        const isVideo = command === 'play2'
        const chat = m.chat
        
        await conn.sendMessage(chat, { image: { url: video.thumbnail }, caption: `📌 *Título:* ${video.title}\n🔗 *Link:* ${video.url}` }, { quoted: m })
        await m.react('⏳')

        let downloadUrl = null

        // --- INTENTO CON APIS EXTERNAS ---
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

        // --- FALLBACK: YT-DLP (TERMUX/LOCAL) ---
        if (!downloadUrl) {
            console.log('⚠️ APIs fallaron, intentando con yt-dlp...')
            const fileName = `./tmp/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
            const format = isVideo ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' : 'bestaudio[ext=m4a]/best'
            
            try {
                // Comando para descargar directamente el archivo
                await execPromise(`yt-dlp -f "${format}" --max-filesize 50M "${video.url}" -o "${fileName}"`)
                
                const buffer = fs.readFileSync(fileName)
                await conn.sendMessage(chat, { 
                    [isVideo ? 'video' : 'audio']: buffer, 
                    mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                    fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`
                }, { quoted: m })

                fs.unlinkSync(fileName) // Borrar archivo temporal
                await m.react('✅')
                return 
            } catch (err) {
                console.error('Error con yt-dlp:', err)
                throw '❌ Fallaron las APIs y yt-dlp local.'
            }
        }

        // --- ENVÍO SI FUNCIONÓ ALGUNA API ---
        if (isVideo) {
            await conn.sendMessage(chat, { video: { url: downloadUrl }, caption: video.title }, { quoted: m })
        } else {
            await conn.sendMessage(chat, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3` }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        conn.reply(m.chat, `❌ Error crítico: ${e.message || e}`, m)
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2)$/i

export default handler
    
