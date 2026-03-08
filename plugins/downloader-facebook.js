import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace o búsqueda>*`

  const link = args[0]
  const isUrl = link.match(/https?:\/\//i)
  
  await m.reply('*[⏳] Procesando solicitud...*')

  try {
    let result = null
    let type = ""

    // 1. LÓGICA DE IDENTIFICACIÓN
    if (isUrl && (link.includes('facebook.com') || link.includes('fb.watch'))) {
      type = "Facebook"
      result = await fetchAuto(link, 'fb')
    } else if (isUrl && link.includes('instagram.com')) {
      type = "Instagram"
      result = await fetchAuto(link, 'ig')
    } else {
      // 2. LÓGICA TIKTOK (POR ENLACE O BÚSQUEDA)
      type = "TikTok"
      result = await fetchTikTok(args, isUrl)
    }

    if (!result || !result.dl) throw `*[ ❌ ] No se pudo obtener el contenido de ${type}.*`

    const caption = `ㅤ۟∩　ׅ　★ ໌　ׅ　🅓ownloader ${type}　ׄᰙ\n\n` +
      `𖣣ֶㅤ֯⌗ 🌽 *Título:* ${result.title || 'Sin título'}\n` +
      `𖣣ֶㅤ֯⌗ 🍒 *Autor:* ${result.author || 'Desconocido'}\n` +
      `𖣣ֶㅤ֯⌗ 🪶 *Audio:* ${result.music || 'Original'}`.trim()

    await conn.sendMessage(m.chat, { video: { url: result.dl }, caption }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`❌ *Error:* ${e.message || 'Ocurrió un error inesperado.'}`)
  }
}

// FUNCIÓN PARA TIKTOK USANDO TUS APIS NUEVAS
async function fetchTikTok(args, isUrl) {
  const query = encodeURIComponent(isUrl ? args[0] : args.join(" "))
  const endpoints = [
    `https://sylphy.xyz/api/tiktok?url=${query}`,
    `https://api.stellarwa.xyz/api/tiktok?url=${query}`,
    `https://api.evogb.org/api/tiktok?url=${query}`
  ]

  for (let url of endpoints) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) continue

      const json = await res.json()
      const data = json.data || json.result
      
      if (data) {
        return {
          dl: data.video || data.dl || (Array.isArray(data) ? data[0].url : data.url),
          title: data.title || 'TikTok Video',
          author: data.author?.nickname || data.author || 'Desconocido',
          music: data.music?.title || data.music || 'Original'
        }
      }
    } catch { continue }
  }
  return null
}

// FUNCIÓN PARA FB/IG USANDO TUS APIS NUEVAS
async function fetchAuto(link, mode) {
  const query = encodeURIComponent(link)
  const endpoints = [
    `https://sylphy.xyz/api/${mode}dl?url=${query}`,
    `https://api.stellarwa.xyz/api/${mode}dl?url=${query}`,
    `https://api.evogb.org/api/${mode}dl?url=${query}`
  ]

  for (let url of endpoints) {
    try {
      const res = await fetch(url)
      const json = await res.json()
      const data = json.data || json.result
      if (data?.url || data?.video) {
        return { dl: data.url || data.video, title: data.title }
      }
    } catch { continue }
  }
  return null
}

handler.help = ['fb', 'ig', 'tk'].map(v => v + ' <enlace/búsqueda>')
handler.tags = ['downloader']
handler.command = /^(fb|facebook|instagram|ig|igdl|tk|tiktok|tt)$/i

export default handler
