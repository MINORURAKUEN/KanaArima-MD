import { exec } from "child_process"
import fs from "fs"

let handler = async (m, { conn, args }) => {

if (!args[0]) throw "❗ Envia un link de YouTube"

let url = args[0]
let file = `./tmp/${Date.now()}.mp4`

await conn.reply(m.chat, "⏳ Descargando video...", m)

exec(`yt-dlp -f mp4 -o "${file}" ${url}`, async (err) => {

if (err) return conn.reply(m.chat, "❌ Error descargando video", m)

await conn.sendFile(m.chat, file, "video.mp4", "🎬 Aquí tienes tu video", m)

fs.unlinkSync(file)

})

}

handler.command = ["ytmp4"]
handler.tags = ["downloader"]

export default handler
