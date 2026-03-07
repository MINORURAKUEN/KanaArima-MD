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

    await m.reply(tradutor.texto3) // "Procesando imagen..."

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    
    // Sistema de reintentos con APIs verificadas 2026
    const banner = await forceUpscale(fileUrl)

    await conn.sendMessage(m.chat, { 
        image: banner, 
        caption: `✅ *HD FINALIZADO*` 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`❌ *Error Crítico:* Los servidores de IA están en mantenimiento. Intenta usar otro comando como .remini2 o espera unos minutos.`)
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

async function forceUpscale(url) {
  const encoded = encodeURIComponent(url)
  
  // Lista actualizada de Endpoints que NO requieren Key privada actualmente
  const endpoints = [
    `https://api.shizuka.site/remini?url=${encoded}`,
    `https://api.vreden.my.id/api/remini?url=${encoded}`,
    `https://api.aguzfamilia.me/api/remini?url=${encoded}`
  ]

  for (let api of endpoints) {
    try {
      const { data, status } = await axios.get(api, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (status === 200 && data.byteLength > 1000) {
        return Buffer.from(data)
      }
    } catch (err) {
      continue // Si una falla, salta a la siguiente sin avisar al usuario
    }
  }

  throw new Error("Servidores saturados")
}
