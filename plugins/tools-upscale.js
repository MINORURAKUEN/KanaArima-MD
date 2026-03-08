import fs from "fs"
// ❌ import axios from "axios" (¡Eliminado!)
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  // Uso de encadenamiento opcional (?.) por si el usuario aún no está en la base de datos
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    // 1. Verificamos que sea una imagen
    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    await m.reply(tradutor.texto3)

    // 2. Procesamiento de la imagen
    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    if (!fileUrl) throw "Error al subir la imagen al servidor temporal."

    const enhancedImage = await upscaleWithStellar(fileUrl)

    // 3. Enviamos el resultado
    await conn.sendMessage(m.chat, { 
        image: enhancedImage, 
        caption: "✨ Mejora HD completada" 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`${tradutor.texto4} \n\n*Error:* ${e.message || e}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

// ✅ Refactorizado para usar la API nativa Fetch y manejar URLs correctamente
async function upscaleWithStellar(url) {
  try {
    // encodeURIComponent evita que la URL se rompa si contiene caracteres especiales
    const endpoint = `https://api.stellarwa.xyz/tools/upscale?url=${encodeURIComponent(url)}&key=BrunoSobrino`
    
    const response = await fetch(endpoint, {
      headers: { 'Accept': 'image/*' }
    })

    // Comprobamos si la API devolvió un error (ej. 404, 500)
    if (!response.ok) {
        throw new Error(`La API de Stellar devolvió el estado: ${response.status}`)
    }

    // Convertimos la respuesta a Buffer
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    throw new Error(`Fallo al mejorar la imagen: ${err.message}`)
  }
    }
