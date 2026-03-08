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

    // Llamamos a nuestra función blindada con bypass Anti-Bots
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

// ✅ Función unificada con Evasión Anti-Bots (Bypass Cloudflare) y APIs actualizadas
async function upscaleWithFreeAPI(url) {
  const encodedUrl = encodeURIComponent(url)
  
  // Lista limpia de APIs activas
  const apis = [
    `https://api.siputzx.my.id/api/ai/remini?url=${encodedUrl}`,
    `https://api.dorratz.com/v2/image-upscale?url=${encodedUrl}`,
    `https://api.ryzendesu.vip/api/ai/remini?url=${encodedUrl}`,
    `https://deliriussapi-oficial.vercel.app/tools/remini?url=${encodedUrl}`
  ]

  let errores = []

  // 🎭 Headers para engañar a Cloudflare y hacer creer que somos Google Chrome en una PC
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  }

  for (const endpoint of apis) {
    const apiName = endpoint.split('/')[2]
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) 

      // Enviamos la petición con nuestro "disfraz"
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
              errores.push(`${apiName}: No se encontró link en el JSON`)
              continue 
          }
          
          const imgResponse = await fetch(resultUrl, { headers })
          const arrayBuffer
        
