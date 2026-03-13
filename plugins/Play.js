import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    const apikey = "causa-0e3eacf90ab7be15"
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    try {
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video.')

        const isVideo = /play2|mp4|video/.test(command)
        const type = isVideo ? 'mp4' : 'mp3'
        const mediaType = isVideo ? 'video' : 'audio'

        const captionInfo = `╭━━━〔 🎵 YOUTUBE ${mediaType.toUpperCase()} 〕━━━⬣
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

        if (!downloadUrl) throw new Error('La API no devolvió un enlace válido.')

        const metodo = `Descargado vía: *RestCausas* ✅`

        if (isVideo) {
            // SOLUCIÓN: Enviar como documento para saltar el bloqueo de códec de WhatsApp
            await socket.sendMessage(m.chat, { 
                document: { url: downloadUrl }, 
                mimetype: 'video/mp4',
                fileName: `${video.title}.mp4`,
                caption: `*Nota:* Enviado como documento por restricciones de formato.\n\n${metodo}`
            }, { quoted: m })
        } else {
            // Si es audio (MP3), WhatsApp suele aceptarlo sin problemas
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

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler

