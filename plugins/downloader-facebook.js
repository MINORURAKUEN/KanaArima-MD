import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de FB, IG o TikTok>*`

  await m.reply('*[⏳] Analizando enlace y procesando descarga...*')

  try {
    const link = args[0]
    let videoUrl = null
    let type = ""

    // Identificación del tipo de enlace
    if (link.includes('facebook.com') || link.includes('fb.watch')) {
      videoUrl = await getFacebookVideo(link)
      type = "Facebook"
    } else if (link.includes('instagram.com')) {
      videoUrl = await getInstagramVideo(link)
      type = "Instagram"
    } else if (link.includes('tiktok.com')) {
      videoUrl = await getTikTokVideo(link)
      type = "TikTok"
    } else {
      throw '*[ ❌ ] El enlace no es compatible. Soporta: FB, IG y TikTok.*'
    }

    if (!videoUrl) throw `*[ ❌ ] No se pudo obtener el video de ${type}. Intenta con otro enlace.*`

    await conn.sendFile(m.chat, videoUrl, 'video.mp4', `✅ *Video de ${type} descargado con éxito*`, m)

  } catch (e) {
    console.error(e)
    m.reply(`❌ *Error:* ${e.message || e}`)
  }
}

/** * LÓGICA DE EXTRACCIÓN (APIs DE RESPALDO)
 */

async function getFacebookVideo(link) {
  const encoded = encodeURIComponent(link)
  const apis = [
    `https://eliasar-yt-api.vercel.app/api/facebookdl?link=${encoded}`,
    `https://api.botcahx.eu.org/api/dowloader/fbdown?url=${encoded}&apikey=BrunoSobrino`,
    `https://api.vreden.my.id/api/facebook?url=${encoded}`
  ]
  return await tryApis(apis)
}

async function getInstagramVideo(link) {
  const encoded = encodeURIComponent(link)
  const apis = [
    `https://api.botcahx.eu.org/api/dowloader/igdl?url=${encoded}&apikey=BrunoSobrino`,
    `https://api.vreden.my.id/api/instagram?url=${encoded}`
  ]
  return await tryApis(apis)
}

async function getTikTokVideo(link) {
  const encoded = encodeURIComponent(link)
  const apis = [
    `https://api.botcahx.eu.org/api/dowloader/tiktok?url=${encoded}&apikey=BrunoSobrino`,
    `https://api.vreden.my.id/api/tiktok?url=${encoded}`
  ]
  return await tryApis(apis)
}

/**
 * Función genérica para probar múltiples APIs
 */
async function tryApis(apis) {
  for (const url of apis) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      
      let result = null
      // Adaptador universal de respuestas comunes
      if (json.status && json.data) {
          result = Array.isArray(json.data) ? json.data[0].url : (json.data.url || json.data.video)
      } else if (json.result) {
          result = json.result.video || json.result.url || (Array.isArray(json.result) ? json.result[0].url : null)
      }

      if (result && result.startsWith('http')) return result
    } catch { continue }
  }
  return null
}

handler.help = ['fb', 'ig', 'tk'].map(v => v + ' <enlace>')
handler.tags = ['downloader']
handler.command = ['fb', 'facebook', 'instagram', 'ig', 'igdl', 'tk', 'tiktok', 'tt']

export default handler
