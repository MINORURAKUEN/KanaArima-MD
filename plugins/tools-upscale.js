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

    // Validación de entrada
    if (!mime) throw `*${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `*${tradutor.texto2[0]}* (${mime}) ${tradutor.texto2[1]}`

    await m.reply(tradutor.texto3) // "Procesando imagen..."

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    // Nueva función con APIs actualizadas a marzo 2026
    const banner = await upscaleImage(fileUrl)

    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *Imagen mejorada con éxito*` 
    }, { quoted: m })

  } catch (e) {
    console.error("Error en Remini:", e)
    // Mostramos un error más limpio al usuario
    m.reply(`❌ ${tradutor.texto4}\n\n*Detalle:* El servicio de mejora de imagen está saturado o fuera de línea. Intenta de nuevo en unos minutos.`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

/**
 * Función optimizada para evitar los errores 401 y ENOTFOUND
 */
async function upscaleImage(url) {
  // Intentamos con la API de "Skidy" que es muy robusta para Remini
  try {
    const endpoint = `https://api.skidiyan.xyz/api/remini?url=${encodeURIComponent(url)}`
    
    const { data } = await axios.get(endpoint, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { 'Accept': 'image/*' }
    })

    return Buffer.from(data)
  } catch (err) {
    // Si falla la primera, usamos una de respaldo de "Aisearch" (muy estable)
    const backupUrl = `https://api.aisearch.icu/api/remini?url=${encodeURIComponent(url)}`
    const response = await axios.get(backupUrl, { 
        responseType: "arraybuffer",
        timeout: 60000 
    })
    return Buffer.from(response.data)
  }
}
