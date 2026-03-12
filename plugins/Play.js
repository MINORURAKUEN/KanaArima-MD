import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, text, command }) => {
    if (!text) throw `❗ *Ingresa el nombre o link*\n\nEjemplo: .${command} Blinding Lights`

    try {
        const search = await yts(text)
        const video = search.videos[0]
        if (!video) throw '❌ No se encontró el video.'

        const caption = `╭━━━〔 🎵 YOUTUBE 〕━━━⬣\n┃ 📌 *Título:* ${video.title}\n┃ 🔗 *Link:* ${video.url}\n╰━━━━━━━━━━━━━━━━⬣`
        
        await conn.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await m.react('⏳')

        let downloadUrl = null
        const isVideo = command === 'play2'

        // --- LISTA DE APIS PARA PROBAR ---
        const apiList = [
            `https://api.evogb.org/api/${isVideo ? 'ytdl' : 'yta'}?url=${video.url}&apikey=evogb-9ivSW7OY`,
            `https://rest.apicausas.xyz/api/ytdl?url=${video.url}&apikey=causa-0e3eacf90ab7be15`,
            `https://api.zenkey.my.id/api/download/yt${isVideo ? 'mp4' : 'mp3'}?url=${video.url}` 
        ]

        // --- LÓGICA DE FALLBACK ---
        for (let api of apiList) {
            try {
                let res = await fetch(api)
                let json = await res.json()
                // Intentamos extraer el link de descarga según el formato de cada API
                downloadUrl = json.result?.download || json.result?.url || json.url || json.data?.url
                if (downloadUrl) break // Si obtuvimos link, salimos del bucle
            } catch (err) {
                continue // Si esta API falla, salta a la siguiente
            }
        }

        if (!downloadUrl) throw 'Ninguna API pudo procesar la descarga.'

        if (isVideo) {
            await conn.sendMessage(m.chat, { video: { url: downloadUrl }, caption: video.title }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3` 
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        conn.reply(m.chat, `❌ Error: No se pudo descargar el archivo tras intentar con varios servidores.`, m)
    }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2)$/i

export default handler
              
