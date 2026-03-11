import { exec } from "child_process"
import fs from "fs"

let handler = async (m, { conn, args }) => {

if (!args[0]) throw "❗ Envia un link de YouTube"

let url = args[0]
let file = `./tmp/${Date.now()}.mp3`

await conn.reply(m.chat, "⏳ Descargando audio...", m)

exec(`yt-dlp -f bestaudio -x --audio-format mp3 -o "${file}" ${url}`, async (err) => {

if (err) return conn.reply(m.chat, "❌ Error descargando audio", m)

await conn.sendFile(m.chat, file, "audio.mp3", "🎵 Aquí tienes tu audio", m)

fs.unlinkSync(file)

})

}

handler.command = ["ytmp3"]
handler.tags = ["downloader"]

export default handler
