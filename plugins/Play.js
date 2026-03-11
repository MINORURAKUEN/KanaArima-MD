import yts from 'yt-search'
import fetch from 'node-fetch'

const handler = async (m, { conn, text, command }) => {

if (!text) throw '❗ Escribe el nombre o link del video'

let video

if (text.includes('youtu')) {
video = { url: text }
} else {
let search = await yts(text)
video = search.videos[0]
}

let url = video.url || text

try {

if (command === 'play') {

let api = `https://api.evogb.org/api/ytdl?url=${url}&apikey=evogb-9ivSW7OY`
let res = await fetch(api)
let json = await res.json()

await conn.sendMessage(m.chat, {
audio: { url: json.result.audio },
mimetype: 'audio/mpeg',
fileName: 'audio.mp3'
}, { quoted: m })

}

if (command === 'play2') {

let api = `https://rest.apicausas.xyz/api/ytdl?url=${url}&apikey=causa-0e3eacf90ab7be15`
let res = await fetch(api)
let json = await res.json()

await conn.sendMessage(m.chat, {
video: { url: json.result.video },
caption: '🎬 Aquí tienes tu video'
}, { quoted: m })

}

} catch (e) {
console.log(e)
conn.reply(m.chat, '❌ Error al descargar el video', m)
}

}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = ['play','play2']

export default handler
