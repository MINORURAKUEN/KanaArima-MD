import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace o búsqueda>*`

  const link = args[0]
  const isUrl = link.match(/https?:\/\//i)

  // 1. LÓGICA DE INSTAGRAM Y FACEBOOK (POR ENLACE)
  if (isUrl && (link.includes('facebook.com') || link.includes('fb.watch') || link.includes('instagram.com'))) {
    await m.reply('*[⏳] Procesando enlace de Redes Sociales...*')
    try {
      let videoUrl = null
      let type = link.includes('facebook.com') || link.includes('fb.watch') ? "Facebook" : "Instagram"

      if (type === "Facebook") videoUrl = await getFacebookVideo(link)
      else videoUrl = await getInstagramVideo(link)

      if (!videoUrl) throw `*[ ❌ ] No se pudo obtener el video de ${type}.*`
      await conn.sendFile(m.chat, videoUrl, 'video.mp4', `✅ *Video de ${type} descargado con éxito*`, m)
    } catch (e) {
      m.reply(`❌ *Error:* ${e.message || e}`)
    }
    return
  }

  // 2. LÓGICA DE TIKTOK (ENLACE O BÚSQUEDA)
  if (!isUrl || link.includes('tiktok.com')) {
    await m.reply('*[⏳] Buscando/Procesando en TikTok...*')
    try {
      // Definimos la URL de la API (Asegúrate de tener estas variables definidas o cámbiadas por tus valores reales)
      // Usaré placeholders basados en tu código
      const baseURL = "https://api.vreden.my.id" // Ejemplo de base
      const apiKey = "Tu_Key_Aqui" 
      
      let apiUrl = isUrl 
        ? `${baseURL}/dl/tiktok?url=${link}&key=${apiKey}`
        : `${baseURL}/search/tiktok?query=${encodeURIComponent(args.join(" "))}&key=${apiKey}`

      const res = await fetch(apiUrl)
      const json = await res.json()
      const data = isUrl ? json.data : json.data?.[0]

      if (!data) throw '🍒 No se encontraron resultados.'

      const { title, dl, duration, author, stats, music } = data
      const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ

𖣣ֶㅤ֯⌗ 🌽 *Título:* ${title || 'Sin título'}
𖣣ֶㅤ֯⌗ 🍒 *Autor:* ${author?.nickname || 'Desconocido'}
𖣣ֶㅤ֯⌗ 🍓 *Duración:* ${duration || 'N/A'}
𖣣ֶㅤ֯⌗ 🦩 *Likes:* ${(stats?.likes || 0).toLocaleString()}
𖣣ֶㅤ֯⌗ 🌾 *Vistas:* ${(stats?.views || 0).toLocaleString()}
𖣣ֶㅤ֯⌗ 🪶 *Audio:* ${music?.title || 'Original'}`.trim()

      const head = await fetch(dl, { method: 'HEAD' })
      if (head.headers.get('content-type').includes('video')) {
        await conn.sendMessage(m.chat, { video: { url: dl }, caption }, { quoted: m })
      } else {
        throw 'El contenido no es un video compatible.'
      }
    } catch (e) {
      m.reply(`❌ *Error en TikTok:* ${e.message || 'Servidor no disponible'}`)
    }
  }
}

/** * FUNCIONES DE APOYO (APIs DE RESPALDO)
 */
async function getFacebookVideo(link) {
  const apis = [
    `https://api.botcahx.eu.org/api/dowloader/fbdown?url=${encodeURIComponent(link)}&apikey=BrunoSobrino`,
    `https://eliasar-yt-api.vercel.app/api/facebookdl?link=${encodeURIComponent(link)}`
  ]
  return await tryApis(apis)
}

async function getInstagramVideo(link) {
  const apis = [
    `https://api.botcahx.eu.org/api/dowloader/igdl?url=${encodeURIComponent(link)}&apikey=BrunoSobrino`,
    `https://api.vreden.my.id/api/instagram?url=${encodeURIComponent(link)}`
  ]
  return await tryApis(apis)
}

async function tryApis(apis) {
  for (const url of apis) {
    try {
      const res = await fetch(url)
      const json = await res.json()
      let result = json.data?.url || json.result?.url || (Array.isArray(json.result) ? json.result[0].url : null)
      if (result) return result
    } catch { continue }
  }
  return null
}

handler.help = ['fb', 'ig', 'tk'].map(v => v + ' <enlace/búsqueda>')
handler.tags = ['downloader']
handler.command = ['fb', 'facebook', 'instagram', 'ig', 'igdl', 'tk', 'tiktok', 'tt']

export default handler
