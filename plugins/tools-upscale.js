import fs from "fs"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    await m.reply(tradutor.texto3) // "Procesando..."

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    if (!fileUrl) throw "Error al subir la imagen al servidor temporal."

    // Llamamos a nuestra función blindada con 6 APIs
    const enhancedImage = await upscaleWithFreeAPI(fileUrl)

    await conn.sendMessage(m.chat, { 
        image: enhancedImage, 
        caption: "✨ Mejora HD completada con éxito" 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*[❗] ERROR:* ${e.message || e}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

// ✅ Función ultra-resistente con 6 APIs de respaldo
async function upscaleWithFreeAPI(url) {
  const encodedUrl = encodeURIComponent(url)
  
  // 🚀 El arsenal de 6 APIs rápidas y gratuitas
  const apis = [
    `https://api.siputzx.my.id/api/ai/remini?url=${encodedUrl}`,
    `https://api.ryzendesu.vip/api/ai/remini?url=${encodedUrl}`,
    `https://api.nyxs.pw/tools/remini?url=${encodedUrl}`,
    `https://api.vreden.my.id/api/remini?url=${encodedUrl}`,
    `https://api.dorratz.com/v2/image-upscale?url=${encodedUrl}`,
    `https://aemt.me/remini?url=${encodedUrl}`
  ]

  let lastError = ""

  for (const endpoint of apis) {
    try {
      // Agregamos un pequeño timeout de seguridad (opcional pero recomendado)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 segundos máximo por API

      const response = await fetch(endpoint, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
          lastError = `Estado ${response.status} en ${endpoint.split('/')[2]}`
          continue 
      }

      const contentType = response.headers.get("content-type") || ""

      // 🧠 Extractor inteligente de imágenes
      if (contentType.includes("application/json")) {
          const json = await response.json()
          
          // Buscamos el link en todas las estructuras comunes de estas 6 APIs
          let resultUrl = json.data?.url || json.data || json.url || json.result || json.image
          
          if (!resultUrl || typeof resultUrl !== 'string') continue 
          
          const imgResponse = await fetch(resultUrl)
          const arrayBuffer = await imgResponse.arrayBuffer()
          return Buffer.from(arrayBuffer)
          
      } else {
          // Si la API es directa y devuelve el Buffer de la imagen
          const arrayBuffer = await response.arrayBuffer()
          return Buffer.from(arrayBuffer)
      }
      
    } catch (err) {
      // Si la API tarda más de 20s o está caída, guarda el error y pasa a la siguiente
      lastError = err.name === 'AbortError' ? 'Tiempo de espera agotado' : err.message
      continue 
    }
  }
  
  // Si ocurrió un apocalipsis y las 6 APIs cayeron
  throw new Error(`Todas las APIs están caídas o saturadas. Último error: ${lastError}`)
}
