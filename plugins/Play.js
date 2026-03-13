import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, args, text, command }) => {
    // 1. Validación de entrada
    let query = text || args.join(' ')
    const apikey = "causa-0e3eacf90ab7be15"
    
    if (!query) return conn.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    try {
        // 2. Búsqueda del video
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

        // Enviar miniatura e información inicial
        await conn.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: captionInfo }, { quoted: m })
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        // 3. Obtención del enlace de descarga (API)
        const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(video.url)}&type=${type}`
        const res = await fetch(apiUrl)
        const json = await res.json()

        // Mapeo inteligente del enlace (similar a tu script de FB)
        const downloadUrl = json.data?.download?.url || json.result?.download || json.url || (json.data && json.data[0]?.url)
        
        if (!downloadUrl) throw new Error('La API no devolvió un enlace válido o está caída.')

        // 4. Envío del archivo (Uso de conn.sendFile para mayor compatibilidad)
        if (isVideo) {
            await conn.sendFile(m.chat, downloadUrl, `${video.title}.mp4`, `🎬 *Aquí tienes tu video*\n\nDescargado vía: *RestCausas* ✅`, m, false, { 
                mimetype: 'video/mp4',
                asDocument: false // Cambiar a true si el video es muy pesado
            })
        } else {
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: m })
        }

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        conn.sendMessage(m.chat, { text: `❌ *Error:* ${e.message || 'Ocurrió un problema inesperado.'}` }, { quoted: m })
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2|mp3|video|mp4)$/i

export default handler

