import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, usedPrefix }) => {
  const text = args[0]
  
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:* ${usedPrefix + command} https://www.instagram.com/reel/DBRWEljp0cf/`

  // Validación de URL
  if (!/instagram\.com\/(reel|p|tv|reels)/i.test(text)) throw '*❌ Enlace no válido.*'

  console.log(`\n[ JSON-POST ] Solicitud iniciada por: ${m.pushName || m.sender}`)
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })

  try {
    // Configuramos el cuerpo de la petición según tu JSON
    const requestBody = {
      "audioOnly": false,
      "ffmpeg": true,
      "proxy": { "useApifyProxy": true },
      "urls": [text],
      "quality": "1080"
    }

    console.log(`[ TERMINAL ] Enviando JSON a la API...`)
    
    // Aquí usamos una API que acepte este formato POST (ajusta la URL según tu proveedor)
    const response = await fetch(`https://api.tu-servidor.com/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const json = await response.json()
    console.log(`[ TERMINAL ] Respuesta recibida: ${response.status}`)

    // Buscamos la URL del video en la respuesta (ajusta el mapeo según tu API)
    const videoUrl = json.url || json.result || (json.data && json.data[0].url)

    if (!videoUrl) {
      console.log(`[ ERROR ] No se encontró el enlace de descarga en el JSON de respuesta.`)
      throw 'No se pudo obtener el video con la calidad solicitada.'
    }

    console.log(`[ BUFFER ] Descargando video (Calidad: 1080p)...`)
    const videoRes = await fetch(videoUrl)
    const buffer = await videoRes.buffer()

    await conn.sendMessage(m.chat, { 
      video: buffer, 
      caption: `✅ *INSTAGRAM 1080P*\n*Fuente:* KanaArima-MD`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    console.log(`[ OK ] Video enviado con éxito a ${m.sender}\n`)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.log(`[ TERMINAL ERROR ] ${e.message}`)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`❌ *Error:* No se pudo procesar el video en alta calidad.`)
  }
}

handler.help = ['ig <url>']
handler.tags = ['downloader']
handler.command = /^(instagram|ig)$/i
handler.limit = false 

export default handler
