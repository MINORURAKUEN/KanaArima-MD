import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, text }) => {
  // Inicializar el almacenamiento de sesiones si no existe
  conn.fb_download = conn.fb_download || {}

  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  await m.reply('*[🔍] Analizando enlace y buscando calidades...*')
  
  try {
    const data = await getFacebookData(args[0])
    if (!data || (!data.hd && !data.sd)) throw 'No se encontraron formatos de video disponibles.'

    // Construir lista de opciones dinámicas
    let options = []
    if (data.hd) options.push({ type: 'video', quality: 'HD (Alta Definición)', url: data.hd })
    if (data.sd) options.push({ type: 'video', quality: 'SD (Calidad Estándar)', url: data.sd })
    if (data.audio) options.push({ type: 'audio', quality: 'Audio MP3', url: data.audio })

    let menu = `✅ *Video Detectado*\n\n`
    menu += `Responde a este mensaje con el *número* de la opción que deseas descargar:\n\n`
    
    options.forEach((opt, index) => {
      menu += `*${index + 1}.* 📥 ${opt.quality}\n`
    })

    menu += `\n_ID de sesión: ${m.sender.split('@')[0]}_`

    // Guardamos la sesión vinculada al ID del mensaje enviado
    const { key } = await conn.reply(m.chat, menu, m)
    conn.fb_download[m.sender] = { 
        options, 
        selecting: true, 
        lastMsg: key.id 
    }
    
  } catch (e) {
    console.error(e)
    return m.reply(`❌ *Error:* No se pudo procesar el video. Intenta con otro enlace.`)
  }
}

// Lógica para capturar la respuesta del usuario
handler.before = async (m, { conn }) => {
  // Validar que sea una respuesta a un mensaje previo del bot y que haya una sesión activa
  if (!m.quoted || !m.text || !conn.fb_download || !conn.fb_download[m.sender]) return
  if (!conn.fb_download[m.sender].selecting) return

  const session = conn.fb_download[m.sender]
  const choice = parseInt(m.text.trim()) - 1

  if (!isNaN(choice) && session.options[choice]) {
    const selected = session.options[choice]
    
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    await m.reply(`*🚀 Iniciando descarga de ${selected.quality}...*`)
    
    try {
      if (selected.type === 'video') {
        await conn.sendFile(m.chat, selected.url, 'fb_video.mp4', `✅ *Aquí tienes tu video en ${selected.quality}*`, m)
      } else {
        await conn.sendMessage(m.chat, { 
            audio: { url: selected.url }, 
            mimetype: 'audio/mpeg',
            fileName: 'fb_audio.mp3' 
        }, { quoted: m })
      }
      
      // Limpiar la sesión tras el éxito
      delete conn.fb_download[m.sender]
    } catch (err) {
      await m.reply('❌ Error al enviar el archivo. El enlace podría haber expirado.')
    }
  }
}

async function getFacebookData(link) {
  try {
    const res = await fetch(`https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(link)}`)
    const json = await res.json()
    if (!json.status) return null
    
    return {
      hd: json.result.hd || null,
      sd: json.result.sd || json.result.video || null,
      audio: json.result.audio || null
    }
  } catch {
    return null
  }
}

handler.command = /^(fb|facebook|fbdl)$/i
export default handler
