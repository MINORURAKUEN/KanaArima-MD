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

    // Notificar al usuario que el proceso inició
    await m.reply(tradutor.texto3)

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    // Ejecutar mejora de imagen
    const banner = await upscaleWithStellar(fileUrl)

    // Enviar resultado
    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *Imagen mejorada con éxito*` 
    }, { quoted: m })

  } catch (e) {
    console.error(e) // Para que tú veas el error real en la consola
    m.reply(`❌ ${tradutor.texto4}\n\n*Error:* ${e.message || e}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

async function upscaleWithStellar(url) {
  try {
    const endpoint = `https://api.stellarwa.xyz/tools/upscale?url=${encodeURIComponent(url)}&key=BrunoSobrino`
    
    const { data } = await axios.get(endpoint, {
      responseType: "arraybuffer",
      timeout: 60000, // Espera hasta 60 segundos
      headers: { 'Accept': 'image/*' }
    })

    return Buffer.from(data)
  } catch (err) {
    throw new Error("La API de mejora no respondió a tiempo o falló.")
  }
}
