import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace o búsqueda>*`

  const link = args[0]
  const isUrl = link.match(/https?:\/\//i)

  // 1. LÓGICA DE INSTAGRAM Y FACEBOOK
  if (isUrl && (link.includes('facebook.com') || link.includes('fb.watch') || link.includes('instagram.com'))) {
    await m.reply('*[⏳] Procesando enlace de Redes Sociales...*')
    try {
      let videoUrl = await tryApis(isUrl && (link.includes('facebook.com') || link.includes('fb.watch')) ? "fb" : "ig", link)
      if (!videoUrl) throw `*[ ❌ ] No se pudo obtener el video.*`
      await conn.sendFile(m.chat, videoUrl, 'video.mp4', `✅ *Descargado con éxito*`, m)
    } catch (e) {
      m.reply(`❌ *Error:* ${e.message || e}`)
    }
    return
  }

  // 2. LÓGICA DE TIKTOK (CON CORRECCIÓN DE JSON)
  if (!isUrl || link.includes('tiktok.com')) {
    await m.reply('*[⏳] Buscando/Procesando en TikTok...*')
    try {
      const baseURL = "https://api.vreden.my.id" 
      const apiKey = "Tu_Key_Aqui" // <--- ASEGÚRATE DE QUE ESTA KEY SEA VÁLIDA
      
      let apiUrl = isUrl 
        ? `${baseURL}/dl/tiktok?url=${link}&key=${apiKey}`
        : `${baseURL}/search/tiktok?query=${encodeURIComponent(args.join(" "))}&key=${apiKey}`

      const res = await fetch(apiUrl)
      
      // Validamos que la respuesta sea JSON antes de parsear
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw "La API de TikTok está temporalmente fuera de servicio (Mantenimiento)."
      }

      const json = await res.json()
      const data = isUrl ? json.data : json.data?.[0]

      if (!data || !data.dl) throw '🍒 No se encontraron resultados o el video es privado.'

      const { title, dl, duration, author, stats, music } = data
      const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload\n\n𖣣ֶㅤ֯⌗ 🌽 *Título:* ${title || 'Sin título'}\n𖣣ֶㅤ֯⌗ 🍒 *Autor:* ${author?.nickname || 'Desconocido'}\n𖣣ֶㅤ֯⌗ 🌾 *Vistas:* ${(stats?.views || 0).toLocaleString()}\n𖣣ֶㅤ֯⌗ 🪶 *Audio:* ${music?.title || 'Original'}`.trim()

      await conn.sendMessage(m.chat, { video: { url: dl }, caption }, { quoted: m })

    } catch (e) {
      console.error(e)
      m.reply(`❌ *Error en TikTok:* ${typeof e === 'string' ? e : 'La API no respondió correctamente. Intenta más tarde.'}`)
    }
  }
}

// FUNCIONES DE APOYO CON MANEJO DE JSON SEGURO
async function tryApis(type, link) {
  const encoded = encodeURIComponent(link)
  const apis = type === "fb" 
    ? [`https://api.botcahx.eu.org/api/dowloader/fbdown?url=${encoded}&apikey=BrunoSobrino`]
    : [`https://api.vreden.my.id/api/instagram?url=${encoded}`]

  for (const url of apis) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      const result = json.data?.url || json.result?.url || (Array.isArray(json.result) ? json.result[0].url : null)
      if (result) return result
    } catch { continue }
  }
  return null
}

handler.help = ['fb', 'ig', 'tk'].map(v => v + ' <enlace/búsqueda>')
handler.tags = ['downloader']
handler.command = ['fb', 'facebook', 'instagram', 'ig', 'igdl', 'tk', 'tiktok', 'tt']

export default handler
