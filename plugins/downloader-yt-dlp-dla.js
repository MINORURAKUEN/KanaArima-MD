import { exec } from "child_process"
import fs from "fs"
import path from "path"

const handler = async (m, { conn, args }) => {

if (!args[0]) {
throw '❗ Envia un link de YouTube\n\nEjemplo:\n.ytmp3 https://youtu.be/xxxx'
}

let url = args[0]
let filename = `./tmp/${Date.now()}.mp3`

await m.reply('⏳ Descargando audio...')

exec(`yt-dlp -x --audio-format mp3 -o "${filename}" ${url}`, async (err) => {

if (err) {
console.log(err)
throw '❌ Error al descargar el audio'
}

if (!fs.existsSync(filename)) {
throw '❌ No se pudo generar el archivo mp3'
}

await conn.sendFile(
m.chat,
filename,
"audio.mp3",
"🎵 Aquí tienes tu audio",
m
)

fs.unlinkSync(filename)

})

}

handler.command = ['ytmp3','yta']
handler.help = ['ytmp3 <url>']
handler.tags = ['downloader']

export default handler
