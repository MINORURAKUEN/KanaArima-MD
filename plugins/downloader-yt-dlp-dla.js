import { exec } from "child_process"
import fs from "fs"

let handler = async (m, { conn, args, command }) => {

if (!args[0]) {
throw "❗ Envia un link de YouTube"
}

let url = args[0]
let file = `./tmp/${Date.now()}.mp3`

await conn.reply(m.chat, "⏳ Descargando audio...", m)

exec(`yt-dlp -f bestaudio -x --audio-format mp3 -o "${file}" ${url}`, async (err) => {

if (err) {
console.log(err)
return conn.reply(m.chat, "❌ Error descargando el audio", m)
}

if (!fs.existsSync(file)) {
return conn.reply(m.chat, "❌ No se pudo generar el mp3", m)
}

await conn.sendFile(
m.chat,
file,
"audio.mp3",
"🎵 Aquí tienes tu audio",
m
)

fs.unlinkSync(file)

})

}

handler.command = ['ytmp3','yta']
handler.tags = ['downloader']
handler.help = ['ytmp3 <url>']

export default handler
