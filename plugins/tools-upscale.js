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

    // Validación de que sea una imagen
    if (!mime) throw `*${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `*${tradutor.texto2[0]}* (${mime}) ${tradutor.texto2[1]}`

    // Mensaje de "Procesando..."
    await m.reply(tradutor.texto3)

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    // Llamada a la nueva función con API operativa
    const banner = await upscaleImage(fileUrl)

    // Envío de la imagen resultante
    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *Imagen mejorada con éxito*` 
    }, { quoted: m })

  } catch (e) {
    console.error("Error en Remini:", e)
    // Mensaje de error más descriptivo para el usuario
    const errorMsg = e.response?.status === 401 ? "La llave de acceso (API Key) ha expirado." : e.message
    m.reply(`❌ ${tradutor.texto4}\n\n*Detalle:* ${errorMsg}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

/**
 * Función para mejorar imagen usando una API alternativa
 * Se cambió la API de Stellar (401 error) por Alyachan/Aisearch
 */
async function upscaleImage(url) {
  try {
    // Usamos un endpoint alternativo común en bots de 2026
    const endpoint = `https://api.alyachan.dev/api/remini?image=${encodeURIComponent(url)}&apikey=Gata-Dios`
    
    const response = await axios.get(endpoint, {
      responseType: "arraybuffer",
      timeout: 90000, // 90 segundos porque el HD es lento
      headers: { 
        'Accept': 'image/*'
      }
    })

    return Buffer.from(response.data)
  } catch (err) {
    // Si la anterior falla, intentamos con una segunda opción de respaldo
    const backupEndpoint = `https://api.zenkey.my.id/api/ai/remini?url=${encodeURIComponent(url)}`
    const resBackup = await axios.get(backupEndpoint, { responseType: "arraybuffer" })
    return Buffer.from(resBackup.data)
  }
}
