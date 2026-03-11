import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, text, command }) => {

if (!text) throw '❗ Escribe el nombre del video'

let search = await yts(text)
let video = search.videos[0]

if (!video) throw '❌ No se encontró el video'

let caption = `
╭━━━〔 🎵 YOUTUBE PLAY 〕━━━⬣
┃ 📌 Título: ${video.title}
┃ ⏱ Duración: ${video.timestamp}
┃ 👀 Vistas: ${video.views}
┃ 👤 Canal: ${video.author.name}
┃ 🔗 Link: ${video.url}
╰━━━━━━━━━━━━━━━━⬣
`

await conn.sendMessage(m.chat, {
image: { url: video.thumbnail },
caption
}, { quoted: m })

try {

if (command == 'play') {

let api = `https://api.evogb.org/api/yta?url=${video.url}&apikey=evogb-9ivSW7OY`
let res = await fetch(api)
let json = await res.json()

await conn.sendMessage(m.chat, {
audio: { url: json.result.download },
mimetype: 'audio/mpeg'
}, { quoted: m })

}

if (command == 'play2') {

let api = `https://rest.apicausas.xyz/api/ytdl?url=${video.url}&apikey=causa-0e3eacf90ab7be15`
let res = await fetch(api)
let json = await res.json()

await conn.sendMessage(m.chat, {
video: { url: json.result.download },
caption: video.title
}, { quoted: m })

}

} catch (e) {

conn.reply(m.chat, '❌ Error con la API, intenta otra vez', m)

}

}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = ['play','play2']

export default handler
