import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    
    // Configuración de APIs
    const apikeyCausa = "causa-0e3eacf90ab7be15"
    const apikeyEvo = "evogb-9ivSW7OY"
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    try {
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video.')

        const isVideo = /play2|mp4|video/.test(command)
        const type = isVideo ? 'mp4' : 'mp3'

        const captionInfo = `╭━━━〔 🎵 YOUTUBE ${isVideo ? 'VIDEO' : 'AUDIO'} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: captionInfo }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = ''
        let metodo = ''

        if (isVideo) {
            // NUEVA API PARA VIDEO: EvoGB
            const apiEvoUrl = `https://api.evogb.org/dl/ytmp4?apikey=${apikeyEvo}&url=${encodeURIComponent(video.url)}`
            const res = await fetch(apiEvoUrl)
            const json = await res.json()
            
            // Ajuste según la estructura de respuesta de EvoGB
            downloadUrl = json.result?.url || json.url || json.download
            metodo = `Descargado vía: *EvoGB* 🎬`
        } else {
            // API PARA AUDIO: RestCausas (Original)
            const apiCausaUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikeyCausa}&url=${encodeURIComponent(video.url)}&type=mp3`
            const res = await fetch(apiCausaUrl)
            const json = await res.json()
            
            downloadUrl = json.data?.download?.url || json.result?.download || json.url
            metodo = `Descargado vía: *RestCausas* 🎵`
        }

        if (!downloadUrl) throw new Error('La API no devolvió un enlace válido.')

        if (isVideo) {
            await socket.sendMessage(m.chat, { 
                document: { url: downloadUrl }, 
                mimetype: 'video/mp4',
                fileName: `${video.title}.mp4`,
                caption: `🎬 *Aquí tienes tu video*\n\n${metodo}`
            }, { quoted: m })
        } else {
            await socket.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: m })
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        socket.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler

