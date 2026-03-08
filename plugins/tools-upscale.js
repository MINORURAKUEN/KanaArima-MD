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

    // Usamos la nueva función con la API comunitaria
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

// ✅ Función inteligente que usa las APIs de la comunidad de GataBot/Mystic
async function upscaleWithFreeAPI(url) {
  try {
    // 🔗 API 1: Deliriuss (Muy usada en GataBot y Mystic)
    // Si esta falla en el futuro, puedes cambiarla por: `https://api.siputzx.my.id/api/ai/remini?url=`
    const endpoint = `https://deliriussapi-oficial.vercel.app/tools/remini?url=${encodeURIComponent(url)}`
    
    const response = await fetch(endpoint)

    if (!response.ok) {
        throw new Error(`La API comunitaria devolvió el estado: ${response.status}`)
    }

    // 🧠 Lógica inteligente: Revisamos si la API devolvió un JSON o la imagen directamente
    const contentType = response.headers.get("content-type")

    if (contentType && contentType.includes("application/json")) {
        // Si devuelve JSON (ej. { "data": "https://enlace-de-imagen.jpg" })
        const json = await response.json()
        const resultUrl = json.data || json.url || json.result // Soporta los formatos más comunes
        
        if (!resultUrl) throw new Error("La API no devolvió el enlace de la imagen.")
        
        // Descargamos la imagen ya mejorada
        const imgResponse = await fetch(resultUrl)
        const arrayBuffer = await imgResponse.arrayBuffer()
        return Buffer.from(arrayBuffer)
        
    } else {
        // Si la API devuelve la imagen directamente como Buffer
        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
    }
    
  } catch (err) {
    throw new Error(`Fallo en el servicio HD: ${err.message}`)
  }
}
