import fetch from 'node-fetch'

let handler = async (m, { args, command, conn, usedPrefix }) => {
  const text = args[0]
  
  // 1. Validación de entrada
  if (!text) throw `*¡Hola!* Por favor ingresa un enlace de Instagram.\n\n*Ejemplo:* ${usedPrefix + command} https://www.instagram.com/reel/C4Xy9u_r_1t/`

  const igLink = text
  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|reels|stories)\//i.test(igLink)) {
    throw '*❌ El enlace no parece ser de Instagram válido.*'
  }

  console.log(`\n[ LOG ] Iniciando descarga de Instagram para: ${igLink}`)
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })

  try {
    const encoded = encodeURIComponent(igLink)
    
    // Lista de APIs priorizadas
    const apis = [
      { name: 'Delirius API', url: `${global.BASE_API_DELIRIUS}/download/instagram?url=${encoded}` },
      { name: 'BotCaHX API', url: `https://api.botcahx.eu.org/api/dowloader/igdowloader?url=${encoded}&apikey=btc` },
      { name: 'Lolhuman API', url: `https://api.lolhuman.xyz/api/instagram?apikey=${global.lolkeysapi}&url=${encoded}` }
    ]

    let mediaData = null
    let selectedApi = ''

    // Bucle de intento (Fallback) con LOGS en terminal
    for (const api of apis) {
      try {
        console.log(`[ TERMINAL ] Intentando con: ${api.name}...`)
        const res = await fetch(api.url)
        if (!res.ok) {
          console.log(`[ TERMINAL ] ${api.name} respondió con error: ${res.status}`)
          continue
        }
        
        const json = await res.json()
        mediaData = json.data || json.result || null
        
        if (mediaData) {
          selectedApi = api.name
          console.log(`[ OK ] Datos obtenidos exitosamente de: ${api.name}`)
          break 
        }
      } catch (err) {
        console.log(`[ ERROR ] ${api.name} falló: ${err.message}`)
        continue 
      }
    }

    if (!mediaData) {
      console.log(`[ TERMINAL ] Error: Todas las APIs fallaron.`)
      throw '*[ ❌ ] No se pudo extraer el contenido de ninguna fuente.*'
    }

    // Normalizar resultados a un Array
    const results = Array.isArray(mediaData) ? mediaData : (typeof mediaData === 'string' ? [{ url: mediaData }] : [mediaData])
    console.log(`[ TERMINAL ] Se encontraron ${results.length} archivos para enviar.`)

    // 2. Envío de los archivos
    for (let i = 0; i < results.slice(0, 5).length; i++) {
      const item = results[i]
      const url = item.url || item
      if (!url || typeof url !== 'string') continue

      const isVideo = url.includes('.mp4') || url.includes('video') || (item.type && item.type.includes('video'))
      console.log(`[ ENVIANDO ] Archivo ${i + 1}: ${isVideo ? 'Video' : 'Imagen'}`)

      if (isVideo) {
        console.log(`[ BUFFER ] Descargando video para asegurar audio...`)
        const videoRes = await fetch(url)
        const buffer = await videoRes.buffer()
        
        await conn.sendMessage(m.chat, { 
          video: buffer, 
          caption: `✅ *VIDEO DESCARGADO*\n*Fuente:* KanaArima-MD`,
          mimetype: 'video/mp4'
        }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { 
          image: { url: url }, 
          caption: `✅ *IMAGEN DESCARGADA*\n*Fuente:* KanaArima-MD` 
        }, { quoted: m })
      }
      
      // Delay de seguridad
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    console.log(`[ TERMINAL ] Tarea finalizada con éxito.\n`)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.log(`[ TERMINAL ERROR ] ${e.message}`)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`❌ *Error:* ${e.message || 'Ocurrió un problema inesperado.'}`)
  }
}

handler.help = ['ig <enlace>', 'instagram <enlace>']
handler.tags = ['downloader']
handler.command = /^(instagram|ig)$/i
handler.limit = false 

export default handler
