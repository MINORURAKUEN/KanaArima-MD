import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, usedPrefix }) => {
  const text = args[0]
  
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:* ${usedPrefix + command} https://www.instagram.com/reel/DBRWEljp0cf/`

  if (!/instagram\.com\/(reel|p|tv|reels)/i.test(text)) throw '*❌ Enlace no válido.*'

  // Identificación en terminal
  const userTag = m.pushName || m.sender
  console.log(`\n[ APIFY-PROCESS ] Solicitud de: ${userTag}`)
  console.log(`[ TARGET ] ${text}`)
  
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })

  try {
    // 1. Configuración del Payload basado en tu JSON
    const requestBody = {
      "audioOnly": false,
      "ffmpeg": true,
      "proxy": { "useApifyProxy": true },
      "urls": [text],
      "quality": "1080"
    }

    // 2. Ejecución del Actor en Apify (Sustituye TU_APIFY_TOKEN)
    // Usamos el actor 'apify/instagram-scraper' o el que tengas configurado
    console.log(`[ TERMINAL ] Enviando tarea a Apify...`)
    
    const apiToken = "TU_APIFY_TOKEN_AQUI" // <--- IMPORTANTE: Pon tu Token de Apify aquí
    const runActor = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const runJson = await runActor.json()
    const runId = runJson.data.id
    console.log(`[ TERMINAL ] Tarea iniciada. ID: ${runId}`)

    // 3. Esperar y obtener el resultado del Key-Value Store
    // (Simplificado: asumiendo que el actor termina rápido o usando el dataset)
    // Para fines prácticos, consultamos el registro de salida
    const recordUrl = `https://api.apify.com/v2/key-value-stores/${runJson.data.defaultKeyValueStoreId}/records/OUTPUT?token=${apiToken}`
    
    console.log(`[ TERMINAL ] Esperando respuesta del almacén...`)
    
    // Pequeña pausa para que el scraper procese
    await new Promise(resolve => setTimeout(resolve, 5000))

    const response = await fetch(recordUrl)
    const resultData = await response.json()

    // 4. Extraer URL del video
    // Estructura típica de salida de Apify Instagram Scraper
    const videoUrl = resultData[0]?.videoUrl || resultData[0]?.displayUrl || resultData[0]?.url

    if (!videoUrl) {
      console.log(`[ ERROR ] No se encontró videoUrl en la respuesta final.`)
      throw 'No se pudo extraer el video de los registros de Apify.'
    }

    console.log(`[ BUFFER ] Descargando video final...`)
    const videoBuffer = await (await fetch(videoUrl)).buffer()

    await conn.sendMessage(m.chat, { 
      video: videoBuffer, 
      caption: `✅ *INSTAGRAM HD (APIFY)*\n*Fuente:* KanaArima-MD`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    console.log(`[ SUCCESS ] Video enviado con audio a ${userTag}\n`)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.log(`[ TERMINAL ERROR ] ${e.message}`)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(`❌ *Error en el proceso:* Las APIs de Apify podrían estar tardando demasiado o el token es inválido.`);
  }
}

handler.help = ['ig <url>']
handler.tags = ['downloader']
handler.command = /^(instagram|ig)$/i
handler.limit = false 

export default handler
