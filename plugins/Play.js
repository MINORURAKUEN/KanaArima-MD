import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    
    const apikey = process.env.API_CAUSAS || "causa-0e3eacf90ab7be15"
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.\n\n*Ejemplo:* .play Linkin Park` }, { quoted: m })

    try {
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video.')

        const isVideo = /play2|mp4|video/i.test(command)
        const type = isVideo ? 'video' : 'audio'

        const captionInfo = `╭━━━〔 🎵 YOUTUBE ${isVideo ? 'VIDEO' : 'AUDIO'} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: captionInfo }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(video.url)}&type=${type}`
        const res = await fetch(apiUrl)
        const json = await res.json()

        const downloadUrl = json.data?.download?.url || json.result?.download || json.url
        if (!downloadUrl) throw new Error('No se pudo obtener el enlace de descarga.')

        if (isVideo) {
            // ENVIAR COMO VIDEO (Sin el texto de "Descargado vía")
            await socket.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: `🎬 *${video.title}*`, // <--- Línea limpia
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

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2', 'mp4', 'mp3', 'video']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler
              
