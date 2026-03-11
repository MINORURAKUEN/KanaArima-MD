import fetch from "node-fetch"

let handler = async (m, { conn, text, usedPrefix, command }) => {

if (!text) throw `❗ Usa el comando así:\n${usedPrefix + command} nombre de canción`

await conn.reply(m.chat, "🔎 Buscando canción...", m)

try {

let search = await fetch(`https://api.evogb.org/api/search/yt?q=${encodeURIComponent(text)}&apikey=evogb-9ivSW7OY`)
let res = await search.json()

if (!res.result || res.result.length === 0) throw "❌ No se encontraron resultados"

let video = res.result[0]

let download = await fetch(`https://api.evogb.org/api/download/ytmp3?url=${video.url}&apikey=evogb-9ivSW7OY`)
let data = await download.json()

let audio = data.result.download

let caption = `
🎵 *PLAY - YOUTUBE*

📌 Título: ${video.title}
⏱ Duración: ${video.timestamp}
👁 Vistas: ${video.views}
🔗 Link: ${video.url}
`.trim()

await conn.sendMessage(m.chat, {
image: { url: video.thumbnail },
caption: caption
}, { quoted: m })

await conn.sendMessage(m.chat, {
audio: { url: audio },
mimetype: "audio/mpeg",
fileName: `${video.title}.mp3`
}, { quoted: m })

} catch (e) {

try {

let api2 = await fetch(`https://rest.apicausas.xyz/api/youtube/play?query=${encodeURIComponent(text)}&apikey=causa-0e3eacf90ab7be15`)
let data2 = await api2.json()

let caption = `
🎵 *PLAY - YOUTUBE*

📌 Título: ${data2.result.title}
⏱ Duración: ${data2.result.duration}
🔗 Link: ${data2.result.url}
`.trim()

await conn.sendMessage(m.chat, {
image: { url: data2.result.thumbnail },
caption: caption
}, { quoted: m })

await conn.sendMessage(m.chat, {
audio: { url: data2.result.audio },
mimetype: "audio/mpeg"
}, { quoted: m })

} catch {

throw "❌ Error descargando la canción"

}

}

}

handler.help = ["play <canción>"]
handler.tags = ["downloader"]
handler.command = ["play"]

export default handler
