import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import yts from 'yt-search'

const execPromise = promisify(exec)

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*[❗] Uso:* ${usedPrefix + command} <nombre o enlace>`;

  const isVideo = command === 'play2'
  const result = await yts(text)
  const video = result.videos[0]
  if (!video) throw '❌ No se encontró el video.'

  await conn.sendMessage(m.chat, { 
    image: { url: video.thumbnail }, 
    caption: `*DESCARGANDO ${isVideo ? 'VIDEO' : 'AUDIO'}* 📥\n\n*Título:* ${video.title}\n*Calidad:* La mejor disponible` 
  }, { quoted: m })

  const arch = process.arch === 'arm64' ? './yt-dlp_linux_aarch64' : './yt-dlp_linux'
  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  // Nombre base sin extensión fija para el audio
  const baseFilename = path.join(tmpDir, `${video.videoId}_${Date.now()}`)
  
  let commandExec;
  if (isVideo) {
    // Intenta MP4 directo (compatible con WhatsApp)
    commandExec = `${arch} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 "${video.url}" -o "${baseFilename}.mp4"`
  } else {
    /** * ESTRATEGIA DE AUDIO: 
     * Intentamos extraer audio. Si FFmpeg falla, yt-dlp descargará 
     * el formato original (m4a/webm) automáticamente.
     **/
    commandExec = `${arch} -f "bestaudio" -x --audio-format mp3 --audio-quality 0 --continue --no-part --prefer-free-formats "${video.url}" -o "${baseFilename}.%(ext)s"`
  }

  try {
    await execPromise(commandExec)

    // Buscamos el archivo que se creó (ya que la extensión puede variar)
    const files = fs.readdirSync(tmpDir)
    const fileName = files.find(f => f.startsWith(path.basename(baseFilename)))
    const fullPath = path.join(tmpDir, fileName)

    if (isVideo) {
      await conn.sendMessage(m.chat, { video: { url: fullPath }, caption: video.title, mimetype: 'video/mp4' }, { quoted: m })
    } else {
      // Enviamos el audio con el mimetype correcto detectando la extensión
      const ext = path.extname(fileName).replace('.', '')
      await conn.sendMessage(m.chat, { 
        audio: { url: fullPath }, 
        mimetype: ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`,
        fileName: `${video.title}.${ext}` 
      }, { quoted: m })
    }

    fs.unlinkSync(fullPath) // Limpiar
  } catch (e) {
    console.error(e)
    conn.reply(m.chat, `❌ Error crítico: ${e.message}`, m)
  }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = /^(play|play2)$/i

export default handler
