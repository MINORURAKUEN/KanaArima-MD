import fs from "fs"
import fetch from "node-fetch"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!/image\/(jpe?g|png)/.test(mime)) throw `⚠️ ${tradutor.texto1} ${usedPrefix + command}*`

    await m.reply(tradutor.texto3) // "Procesando..."

    // 1. Descargamos y subimos la imagen para obtener una URL (necesario para estas APIs)
    const img = await q.download()
    const url = await uploadImage(img)
    
    if (!url) throw "❌ Error al subir la imagen al servidor temporal."

    // 2. Intentamos con el sistema de relevos de GitHub MD
    const enhancedBuffer = await upscaleGithubMD(url)

    if (!enhancedBuffer) throw "❌ Todas las APIs de escalado están caídas en este momento."

    // 3. Enviamos el resultado final
    await conn.sendMessage(m.chat, { 
      image: enhancedBuffer, 
      caption: "✨ *Imagen mejorada con éxito*\n🚀 *Motor:* GitHub MD Upscaler" 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*[❗] ERROR:* ${e.message || e}`)
  }
}

/**
 * Sistema de APIs utilizado por los principales repositorios de GitHub
 */
async function upscaleGithubMD(url) {
  const encoded = encodeURIComponent(url)
  
  // Lista de APIs "Premium" gratuitas usadas en bots MD
  const apis = [
    `https://api.vreden.my.id/api/remini?url=${encoded}`,
    `https://api.stellarwa.xyz/tools/upscale?url=${encoded}&key=BrunoSobrino`,
    `https://api.botcahx.eu.org/api/tools/remini?url=${encoded}&apikey=BrunoSobrino`,
    `https://api.ryzendesu.vip/api/ai/remini?url=${encoded}`
  ]

  for (const api of apis) {
    try {
      const res = await fetch(api)
      if (!res.ok) continue

      const contentType = res.headers.get('content-type')
      
      // Si la API devuelve la imagen directamente (Buffer)
      if (contentType && contentType.includes('image')) {
        return Buffer.from(await res.arrayBuffer())
      } 
      
      // Si la API devuelve un JSON con el link de la imagen
      const json = await res.json()
      const finalUrl = json.result?.url || json.result || json.data?.url || json.url
      
      if (finalUrl && finalUrl.startsWith('http')) {
        const imgRes = await fetch(finalUrl)
        return Buffer.from(await imgRes.arrayBuffer())
      }
    } catch (err) {
      console.log(`⚠️ Falló una API, intentando la siguiente...`)
      continue
    }
  }
  return null
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = /^(remini|hd|enhance|upscale)$/i

export default handler
