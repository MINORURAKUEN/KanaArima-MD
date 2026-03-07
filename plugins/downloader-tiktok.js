import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, text }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  // Si el usuario solo envió el link, buscamos las opciones
  if (!text.includes('|')) {
    await m.reply('*[🔍] Buscando calidades disponibles...*')
    
    try {
      const data = await getFacebookData(args[0])
      if (!data) throw 'No se encontraron formatos disponibles.'

      let menu = `✅ *Video Encontrado*\n\n`
      menu += `Selecciona una opción respondiendo a este mensaje con el número:\n\n`
      
      // Mapeamos las opciones disponibles (HD, SD, Audio)
      const options = []
      if (data.hd) options.push({ type: 'video', quality: '720p/1080p (HD)', url: data.hd })
      if (data.sd) options.push({ type: 'video', quality: '360p (SD)', url: data.sd })
      if (data.audio) options.push({ type: 'audio', quality: 'Solo Audio (MP3)', url: data.audio })

      options.forEach((opt, index) => {
        menu += `${index + 1}. 📥 *${opt.quality}*\n`
      })

      // Guardamos temporalmente las URLs en la sesión del bot para usarlas al responder
      conn.fb_download = conn.fb_download || {}
      conn.fb_download[m.sender] = { link: args[0], options }

      return m.reply(menu)
      
    } catch (e) {
      return m.reply(`❌ *Error:* ${e.message || e}`)
    }
  }
}

// Lógica para detectar la respuesta del usuario (esto iría en un 'before' o manejado por el index)
handler.before = async (m, { conn }) => {
  if (!m.quoted || !m.text || !conn.fb_download || !conn.fb_download[m.sender]) return
  
  const choices = conn.fb_download[m.sender].options
  const choice = parseInt(m.text) - 1

  if (choices[choice]) {
    const selected = choices[choice]
    await m.reply(`*[⏳] Descargando ${selected.quality}...*`)
    
    if (selected.type === 'video') {
      await conn.sendFile(m.chat, selected.url, 'fb.mp4', `✅ *Calidad: ${selected.quality}*`, m)
    } else {
      await conn.sendMessage(m.chat, { audio: { url: selected.url }, mimetype: 'audio/mp4' }, { quoted: m })
    }
    
    delete conn.fb_download[m.sender] // Limpiar memoria
  }
}

/**
 * Función que obtiene el objeto con todas las calidades
 */
async function getFacebookData(link) {
  const encoded = encodeURIComponent(link)
  // Usaremos una API que devuelva un objeto estructurado
  const res = await fetch(`https://api.vreden.my.id/api/facebook?url=${encoded}`)
  const json = await res.json()

  if (!json.status) return null

  // Retornamos un objeto estandarizado
  return {
    hd: json.result.hd || null,
    sd: json.result.sd || json.result.video || null,
    audio: json.result.audio || null
  }
}

handler.command = ['fb', 'facebook', 'fbdl']
export default handler
