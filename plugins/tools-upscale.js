import fs from "fs"
import { FormData, Blob } from 'formdata-node' // Usamos las librerías que ya tienes instaladas

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

    // 1. Descargamos la imagen directo en memoria (Buffer)
    const imgBuffer = await q.download()
    
    // 2. MAGIA: Saltamos todas las APIs e inyectamos la imagen directo al motor de Vyro AI
    const enhancedImage = await directVyroUpscale(imgBuffer)

    // 3. Enviamos el resultado
    await conn.sendMessage(m.chat, { 
        image: enhancedImage, 
        caption: "✨ Mejora HD directa completada con éxito" 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*[❗] ERROR:* ${e.message || e}`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = /^(remini|hd|enhance)$/i

export default handler

// ==========================================
// 🚀 SOLUCIÓN DEFINITIVA: CONEXIÓN DIRECTA
// ==========================================
async function directVyroUpscale(buffer) {
  try {
    const formData = new FormData()
    // Aseguramos que el formato del buffer sea el correcto
    const bufferData = buffer.toArrayBuffer ? buffer.toArrayBuffer() : buffer
    const blob = new Blob([bufferData], { type: 'image/jpeg' })
    
    // Configuramos los parámetros que exige la app original
    formData.append('image', blob, 'image.jpg')
    formData.append('model_version', '1')

    const response = await fetch('https://inferenceengine.vyro.ai/enhance.vyro', {
      method: 'POST',
      body: formData,
      headers: {
        // 🎭 EL TRUCO: Disfrazamos la petición para que el servidor crea que viene de la app móvil oficial (okhttp)
        'User-Agent': 'okhttp/4.9.3',
        'Connection': 'Keep-Alive',
        'Accept-Encoding': 'gzip'
      }
    })

    if (!response.ok) {
        throw new Error(`El motor principal rechazó la conexión. Estado: ${response.status}`)
    }

    // Recibimos la imagen mejorada en formato crudo y la convertimos
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    throw new Error(`Fallo en la conexión directa: ${err.message}`)
  }
}
