import fs from "fs/promises" // ✅ Cambiado a promesas para no bloquear el bot
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  let tradutor; // Lo declaramos fuera para poder usarlo en el catch si es necesario

  try {
    // 1. Encadenamiento opcional ultra-seguro por si la DB aún no carga
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || "es"
    
    // 2. Lectura ASÍNCRONA del idioma (Mejora el rendimiento del bot)
    const fileContent = await fs.readFile(`./src/languages/${idioma}.json`, "utf-8")
    const _translate = JSON.parse(fileContent)
    tradutor = _translate.plugins.herramientas_hd

    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    // 3. Verificamos que sea una imagen compatible
    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    // Avisamos que el proceso inició
    await m.reply(tradutor.texto3)

    // 4. Procesamiento seguro de la imagen
    const img = await q.download()
    if (!img) throw "No se pudo extraer la imagen del mensaje." // Validación extra

    const fileUrl = await uploadImage(img)
    if (!fileUrl) throw "Error al subir la imagen a nuestro servidor temporal."

    const enhancedImage = await upscaleWithStellar(fileUrl)

    // 5. Enviamos el resultado
    await conn.sendMessage(m.chat, { 
        image: enhancedImage, 
        caption: "✨ Mejora HD completada" 
    }, { quoted: m })

  } catch (e) {
    console.error("[Comando HD Error]:", e)
    
    // Manejo de errores dinámico: si es un texto (nuestros throws), lo mandamos directo.
    const errorMsg = typeof e === "string" ? e : (e.message || "Error desconocido")
    const prefixError = tradutor?.texto4 ? tradutor.texto4 : "❌ *Ocurrió un error*"
    
    await m.reply(`${prefixError}\n\n*Detalle:* ${errorMsg}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

// ✅ La función se mantiene igual de genial que en tu refactorización
async function upscaleWithStellar(url) {
  try {
    const endpoint = `https://api.stellarwa.xyz/tools/upscale?url=${encodeURIComponent(url)}&key=BrunoSobrino`
    
    const response = await fetch(endpoint, {
      headers: { 'Accept': 'image/*' }
    })

    if (!response.ok) {
        throw new Error(`La API de Stellar devolvió el estado: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    throw new Error(`Fallo al conectar con la API de mejora: ${err.message}`)
  }
}
