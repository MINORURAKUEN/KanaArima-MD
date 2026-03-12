import yts from 'yt-search'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre de la canción o URL del video.` }, { quoted: m })

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        // Reacción inicial de carga
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        // Búsqueda en YouTube
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video o canción.')

        const isVideo = /play2|mp4|video/i.test(command)
        const type = isVideo ? 'video' : 'audio'

        // Enviar información del video con mensaje de espera
        const caption = `╭━━━〔 🎵 YOUTUBE ${type.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣
_Por favor espera, tu descarga está en proceso..._`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })

        let downloadUrl = null
        let metodo = "" 

        // 1. INTENTO CON APIS EXTERNAS (Añadida la API de Keith como prioridad #1)
        const apiList = [
            { name: "API Keith", url: `https://apis-keith.vercel.app/download/${isVideo ? 'dlmp4' : 'dlmp3'}?url=${video.url}` },
            { name: "API Zenkey", url: `https://api.zenkey.my.id/api/download/yt${isVideo ? 'mp4' : 'mp3'}?url=${video.url}` },
            { name: "API EvoGB", url: `https://api.evogb.org/api/${isVideo ? 'ytdl' : 'yta'}?url=${video.url}&apikey=evogb-9ivSW7OY` },
            { name: "API RestCausas", url: `https://rest.apicausas.xyz/api/ytdl?url=${video.url}&apikey=causa-0e3eacf90ab7be15` }
        ]

        for (let api of apiList) {
            try {
                let { data } = await axios.get(api.url)
                
                // Extraer la URL dependiendo de la estructura que devuelva cada API
                downloadUrl = data.result?.downloadUrl || data.result?.download || data.result?.url || data.url || data.data?.url
                
                if (downloadUrl) {
                    metodo = `Descargado vía: *${api.name}* ✅`
                    break // Si encuentra la URL, rompe el ciclo
                }
            } catch { 
                continue // Si falla una API, pasa a la siguiente
            }
        }

        if (downloadUrl) {
            // Envío si funcionó alguna de las APIs
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
                await execPromise(`yt-dlp --js-runtime node -f "${format}" --max-filesize 60M "${video.url}" -o "${fileName}"`)
                
                const buffer = fs.readFileSync(fileName)
                await socket.sendMessage(m.chat, { 
                    [type]: buffer, 
                    mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                    fileName: `${video.title}.${isVideo ? 'mp4' : 'mp3'}`,
                    caption: isVideo ? `${video.title}\n\n${metodo}` : metodo
                }, { quoted: m })

                // Limpiar el archivo temporal
                if (fs.existsSync(fileName)) fs.unlinkSync(fileName)
            } catch (err) {
                throw new Error('Todas las fuentes fallaron (APIs y yt-dlp).')
            }
        }

        // Reacción de éxito
        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        // Reacción y mensaje de error
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error Final:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler
                         
