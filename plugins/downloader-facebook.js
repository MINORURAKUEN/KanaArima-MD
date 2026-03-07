import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, text }) => {
  conn.fb_download = conn.fb_download || {}

  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  const { key: loadingKey } = await conn.reply(m.chat, '*[🔍] Analizando video... 0%*', m)
  
  try {
    const data = await getFacebookData(args[0])
    if (!data) throw 'No se encontraron formatos.'

    // Actualizamos a 50% tras encontrar el video
    await conn.editMessage(m.chat, loadingKey, '*[🔎] Video encontrado. Generando opciones... 50%*')

    let options = []
    if (data.hd) options.push({ type: 'video', quality: 'HD', url: data.hd })
    if (data.sd) options.push({ type: 'video', quality: 'SD', url: data.sd })
    if (data.audio) options.push({ type: 'audio', quality: 'Audio MP3', url: data.audio })

    let menu = `✅ *Análisis Completo 100%*\n\n`
    menu += `Selecciona la calidad para descargar:\n\n`
    options.forEach((opt, index) => {
      menu += `*${index + 1}.* 📥 ${opt.quality}\n`
    })

    await conn.editMessage(m.chat, loadingKey, menu)
    
    conn.fb_download[m.sender] = { options, selecting: true }
    
  } catch (e) {
    await conn.editMessage(m.chat, loadingKey, `❌ *Error:* ${e.message || e}`)
  }
}

handler.before = async (m, { conn }) => {
  if (!m.quoted || !m.text || !conn.fb_download || !conn.fb_download[m.sender]) return
  
  const session = conn.fb_download[m.sender]
  const choice = parseInt(m.text.trim()) - 1

  if (!isNaN(choice) && session.options[choice]) {
    const selected = session.options[choice]
    
    // Mensaje de estado inicial
    const { key: statusKey } = await conn.reply(m.chat, `*⬇️ Descargando buffer... 10%*`, m)
    
    try {
      // Simulamos progreso de descarga del servidor a la memoria del bot
      await delay(1000); await conn.editMessage(m.chat, statusKey, `*⬇️ Descargando buffer... 40%*`)
      
      const res = await fetch(selected.url)
      const buffer = await res.buffer()
      
      await conn.editMessage(m.chat, statusKey, `*⬆️ Enviando a WhatsApp... 80%*`)

      if (selected.type === 'video') {
        await conn.sendFile(m.chat, buffer, 'fb.mp4', `✅ *Calidad: ${selected.quality}*`, m)
      } else {
        await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m })
      }
      
      await conn.editMessage(m.chat, statusKey, `*✅ ¡Enviado con éxito! 100%*`)
      delete conn.fb_download[m.sender]
      
    } catch (err) {
      await conn.editMessage(m.chat, statusKey, `❌ *Error en la transferencia.*`)
    }
  }
}

// Función auxiliar para editar mensajes (depende de tu versión de Baileys)
conn.editMessage = async (jid, key, text) => {
    return await conn.sendMessage(jid, { text, edit: key })
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getFacebookData(link) {
  try {
    const res = await fetch(`https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(link)}`)
    const json = await res.json()
    return json.status ? { hd: json.result.hd, sd: json.result.sd || json.result.video, audio: json.result.audio } : null
  } catch { return null }
}

handler.command = /^(fb|facebook|fbdl)$/i
export default handler
