import fs from "fs"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    // 1. Validaciones
    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    await m.reply(tradutor.texto3) // "Procesando..."

    // 2. Descargamos la imagen de WhatsApp
    const img = await q.download()
    
    // 3. Subimos la imagen usando tu NUEVO uploadImage.js (Telegra.ph/Pomf2)
    const fileUrl = await uploadImage(img)
    if (!fileUrl) throw "Error al subir la imagen a la nube temporal. Intenta de nuevo."

    // 4. Pasamos la URL limpia por el sistema Anti-Caídas de 4 APIs
    const enhancedImage = await upscaleWithFreeAPI(fileUrl)

    // 5. Enviamos el resultado final
    await conn.sendMessage(m.chat, { 
        image: enhancedImage, 
        caption: "✨ Mejora HD completada con éxito" 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*[❗] ERROR:* ${e.message || e}`)
  }
}

// Configuración del comando
handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
// ✅ Regex para que el bot escuche correctamente los comandos
handler.command = /^(remini|hd|enhance)$/i

export default handler

// ==========================================
// 🛡️ FUNCIÓN ANTI-CAÍDAS CON BYPASS
// ==========================================
async function upscaleWithFreeAPI(url) {
  const encodedUrl = encodeURIComponent(url)
  
  // APIs actualizadas y funcionando
  const apis = [
    `https://api.siputzx.my.id/api/ai/remini?url=${encodedUrl}`,
    `https://api.dorratz.com/v2/image-upscale?url=${encodedUrl}`,
    `https://api.ryzendesu.vip/api/ai/remini?url=${encodedUrl}`,
    `https://deliriussapi-oficial.vercel.app/tools/remini?url=${encodedUrl}`
  ]

  let errores = []

  // Disfrazamos al bot de navegador web (Google Chrome)
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  }

  for (const endpoint of apis) {
    const apiName = endpoint.split('/')[2]
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s de límite

      const response = await fetch(endpoint, { headers, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
          errores.push(`${apiName}: Error ${response.status}`)
          continue 
      }

      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("application/json")) {
          const json = await response.json()
          let resultUrl = json.data?.url || json.data || json.url || json.result || json.image
          
          if (!resultUrl || typeof resultUrl !== 'string') {
              errores.push(`${apiName}: Sin link en JSON`)
              continue 
          }
          
          const imgResponse = await fetch(resultUrl, { headers })
          const arrayBuffer = await imgResponse.arrayBuffer()
          return Buffer.from(arrayBuffer)
          
      } else {
          const arrayBuffer = await response.arrayBuffer()
          return Buffer.from(arrayBuffer)
      }
      
    } catch (err) {
      errores.push(`${apiName}: ${err.name === 'AbortError' ? 'Timeout' : 'Caída'}`)
      continue 
    }
  }
  
  throw new Error(`\nTodas las APIs fallaron.\nReporte de daños:\n- ${errores.join('\n- ')}`)
  }
