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
    
    // Función de rescate con nuevos servidores verificados
    const banner = await upscaleFinalResort(fileUrl)

    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *IMAGEN OPTIMIZADA*` 
    }, { quoted: m })

  } catch (e) {
    console.error("Fallo total en HD:", e)
    m.reply(`❌ *SISTEMA SATURADO*\n\nNingún servidor de IA respondió. Esto pasa cuando hay demasiados usuarios usando el comando a nivel mundial. Reintenta en 5 minutos.`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

async function upscaleFinalResort(url) {
  const encoded = encodeURIComponent(url)
  
  // Lista de APIs frescas (Marzo 2026)
  const sources = [
    `https://api.zyzen.me/api/remini?url=${encoded}`,
    `https://api.diioffc.xyz/api/remini?url=${encoded}`,
    `https://api.btch.bz/api/remini?url=${encoded}`
  ]

  for (let api of sources) {
    try {
      const res = await axios.get(api, {
        responseType: "arraybuffer",
        timeout: 50000, // Damos más tiempo para procesar
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*'
        }
      })

      // Verificamos que no sea un buffer vacío o un error disfrazado
      if (res.status === 200 && res.data.byteLength > 2000) {
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Fallo en: ${api.split('/')[2]}`)
      continue 
    }
  }

  throw new Error("Servidores fuera de línea")
}
