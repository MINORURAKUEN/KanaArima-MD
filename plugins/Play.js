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

        const caption = `╭━━━〔 🎵 YOUTUBE ${mediaType.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(video.url)}&type=${type}`

        const res = await fetch(apiUrl)
        const json = await res.json()

        const downloadUrl = json.data?.download?.url || json.result?.download || json.url

        if (!downloadUrl) throw new Error('La API no devolvió un enlace válido.')

        // SOLUCIÓN: Descargar el archivo para enviarlo como buffer
        const response = await fetch(downloadUrl)
        if (!response.ok) throw new Error('Error al descargar el archivo desde el servidor de la API.')
        const buffer = await response.buffer()

        const metodo = `Descargado vía: *RestCausas* ✅`

        await socket.sendMessage(m.chat, { 
            [mediaType]: buffer, 
            mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
            fileName: `${video.title}.${type}`,
            caption: isVideo ? `${video.title}\n\n${metodo}` : metodo
        }, { quoted: m })

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

