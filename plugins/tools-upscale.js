import fs from "fs"
import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime) throw `*${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `*${tradutor.texto2[0]}* (${mime}) ${tradutor.texto2[1]}`

    await m.reply(tradutor.texto3)

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    // Ejecutamos el sistema de múltiples intentos (Fallback)
    const banner = await upscaleSmart(fileUrl)

    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *Imagen mejorada con éxito*` 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`❌ *Todas las APIs de HD están caídas actualmente.*\n\nDetalle: ${e.message}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

/**
 * Sistema Inteligente de Reintentos
 * Prueba varias APIs hasta encontrar una activa
 */
async function upscaleSmart(url) {
  const encodedUrl = encodeURIComponent(url)
  
  // Lista de APIs disponibles en 2026 para Remini/HD
  const apis = [
    { name: 'Skidiyan', url: `https://api.skidiyan.xyz/api/remini?url=${encodedUrl}` },
    { name: 'Aisearch', url: `https://api.aisearch.icu/api/remini?url=${encodedUrl}` },
    { name: 'Dylux', url: `https://api.dhammasepun.my.id/api/remini?url=${encodedUrl}` },
    { name: 'Loli', url: `https://api.lolihunter.my.id/api/upscale?url=${encodedUrl}` }
  ]

  for (const api of apis) {
    try {
      console.log(`Intentando con API: ${api.name}`)
      const res = await axios.get(api.url, {
        responseType: "arraybuffer",
        timeout: 45000, // 45 segundos por intento
        headers: { 'Accept': 'image/*' }
      })
      
      if (res.data) return Buffer.from(res.data)
    } catch (err) {
      console.log(`API ${api.name} falló, saltando a la siguiente...`)
      continue // Si esta falla, el bucle sigue con la siguiente
    }
  }

  throw new Error("No se pudo conectar con ninguna API de inteligencia artificial.")
}
