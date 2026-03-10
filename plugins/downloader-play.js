import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import yts from 'yt-search'

const execPromise = promisify(exec)

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*[❗] Uso:* ${usedPrefix + command} <nombre o enlace>`;

  const isVideo = command === 'play2'
  const result = await yts(text)
  const video = result.videos[0]
  if (!video) throw '❌ No se encontró el video.'

  // Mensaje de carga
  await conn.sendMessage(m.chat, { 
    image: { url: video.thumbnail }, 
    caption: `*PROCESANDO ${isVideo ? 'VIDEO' : 'AUDIO'}* 📥\n\n*Título:* ${video.title}\n*Duración:* ${video.duration.timestamp}\n\n> _Usando motor interno yt-dlp..._` 
  }, { quoted: m })

  // Detectar arquitectura para usar el binario correcto
  const arch = process.arch === 'arm64' ? './yt-dlp_linux_aarch64' : './yt-dlp_linux'
  const tmpDir = `./tmp`
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const filename = `${tmpDir}/${video.videoId}_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`
  
  // Comando de descarga
  // -f 'bestaudio' o 'bestvideo+bestaudio'
  const commandExec = isVideo 
    ? `${arch} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 "${video.url}" -o "${filename}"`
    : `${arch} -x --audio-format mp3 --audio-quality 0 "${video.url}" -o "${filename}"`

  try {
    await execPromise(commandExec)

    if (isVideo) {
      await conn.sendMessage(m.chat, { video: { url: filename }, fileName: `${video.title}.mp4`, mimetype: 'video/mp4' }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { audio: { url: filename }, fileName: `${video.title}.mp3`, mimetype: 'audio/mpeg' }, { quoted: m })
    }

    // Borrar archivo temporal después de enviar
    fs.unlinkSync(filename)
  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ Error al procesar con yt-dlp. Asegúrate de que el binario tenga permisos de ejecución y ffmpeg esté instalado.', m)
  }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2)$/i

export default handler
