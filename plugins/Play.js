import yts from 'yt-search'
import axios from 'axios'

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre de la canción o URL del video.` }, { quoted: m })

    try {
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video o canción.')

        const isVideo = /play2|mp4|video/i.test(command)
        const type = isVideo ? 'video' : 'audio'
        const format = isVideo ? 'mp4' : 'mp3' // Variable para el parámetro type de la API

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
        const ytUrl = encodeURIComponent(video.url) 

        // INTENTO CON APIS EXTERNAS (RestCausas como prioridad 1 con el parámetro type)
        const apiList = [
            { url: `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=causa-0e3eacf90ab7be15&url=${ytUrl}&type=${format}` },
            { url: `https://apis-keith.vercel.app/download/${isVideo ? 'dlmp4' : 'dlmp3'}?url=${ytUrl}` },
            { url: `https://api.zenkey.my.id/api/download/yt${format}?url=${ytUrl}` },
            { url: `https://api.evogb.org/api/${isVideo ? 'ytdl' : 'yta'}?url=${ytUrl}&apikey=evogb-9ivSW7OY` }
        ]

        for (let api of apiList) {
            try {
                let { data } = await axios.get(api.url, { timeout: 15000 })
                
                // Extraemos la URL según cómo la devuelva la API
                downloadUrl = data?.result?.downloadUrl || data?.result?.download || data?.result?.url || data?.url || data?.data?.url || data?.link || data?.data?.link
                
                if (downloadUrl) break 
            } catch (err) { 
                continue 
            }
        }

        if (downloadUrl) {
            await socket.sendMessage(m.chat, { 
                [type]: { url: downloadUrl },
                mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
                fileName: `${video.title}.${format}`
            }, { quoted: m })
            
            await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } else {
            throw new Error('Todas las APIs están caídas temporalmente. No se pudo obtener el enlace de descarga.')
        }

    } catch (e) {
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error Final:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2', 'playaudio']
handler.tags = ['downloader']
handler.command = /^(play|play2|playaudio|mp3|video|mp4)$/i

export default handler

