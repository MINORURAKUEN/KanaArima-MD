import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  await m.reply('*[⏳] Analizando video...*')

  try {
    const data = await getFacebookData(args[0])
    if (!data) throw 'No se encontraron formatos disponibles.'

    const options = []
    if (data.hd) options.push({ type: 'video', quality: 'HD (720p/1080p)', url: data.hd })
    if (data.sd) options.push({ type: 'video', quality: 'SD (360p)', url: data.sd })
    if (data.audio) options.push({ type: 'audio', quality: 'Solo Audio (MP3)', url: data.audio })

    let menu = `✅ *Video Encontrado*\n\nSelecciona una opción:\n`
    options.forEach((opt, i) => menu += `${i + 1}. 📥 *${opt.quality}*\n`)

    const { key } = await conn.reply(m.chat, menu, m)

    const filter = (res) => res.author === m.sender && res.quoted && res.quoted.id === key.id
    const collector = m.chat.createMessageCollector({ filter, time: 60000, max: 1 })

    collector.on('collect', async (msg) => {
      const sel = parseInt(msg.text) - 1
      if (!options[sel]) return m.reply('❌ Opción inválida.')

      const selected = options[sel]
      const { url, type, quality } = selected

      // --- Lógica de Porcentaje ---
      const response = await fetch(url)
      const contentLength = response.headers.get('content-length')
      
      if (!contentLength) {
        await m.reply('*[⏳] Descargando... (Tamaño desconocido)*')
      }

      let downloaded = 0
      let lastPercent = -1
      const total = parseInt(contentLength, 10)
      
      // Creamos un mensaje para ir actualizando el progreso
      const { key: progressKey } = await conn.reply(m.chat, `*📥 Iniciando descarga de ${quality}...*`, m)

      const chunks = []
      for await (const chunk of response.body) {
        chunks.push(chunk)
        downloaded += chunk.length
        const percent = Math.floor((downloaded / total) * 100)
        
        // Actualizamos cada 20% para no saturar el bot con mensajes
        if (percent % 20 === 0 && percent !== lastPercent) {
          lastPercent = percent
          const bar = '▓'.repeat(percent / 10) + '░'.repeat(10 - (percent / 10))
          await conn.sendMessage(m.chat, { 
            text: `*📥 Descargando:* [${bar}] ${percent}%\n*Peso:* ${(total / 1024 / 1024).toFixed(2)} MB`,
            edit: progressKey 
          })
        }
      }

      const buffer = Buffer.concat(chunks)
      await conn.sendMessage(m.chat, { text: `*📤 Subiendo a WhatsApp... 99%*`, edit: progressKey })

      if (type === 'video') {
        await conn.sendFile(m.chat, buffer, 'fb.mp4', `✅ *Calidad: ${quality}*`, m)
      } else {
        await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: m })
      }
      
      // Borrar mensaje de progreso al terminar
      await conn.sendMessage(m.chat, { delete: progressKey })
    })

  } catch (e) {
    m.reply(`❌ *Error:* ${e.message || e}`)
  }
}

async function getFacebookData(link) {
  const encoded = encodeURIComponent(link)
  try {
    const res = await fetch(`https://api.vreden.my.id/api/facebook?url=${encoded}`)
    const json = await res.json()
    if (!json.status) return null
    return {
      hd: json.result.hd || null,
      sd: json.result.sd || json.result.video || null,
      audio: json.result.audio || null
    }
  } catch { return null }
}

handler.command = ['fb', 'facebook', 'fbdl']
export default handler
