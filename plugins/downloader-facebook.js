import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  await m.reply('*[⏳] Procesando video de Facebook...*')

  try {
    const videoUrl = await getFacebookVideo(args[0])

    if (!videoUrl) throw '*[ ❌ ] Todos los servidores fallaron. El video puede ser privado o el link es inválido.*'

    await conn.sendFile(m.chat, videoUrl, 'facebook.mp4', '✅ *Aquí tienes tu video de Facebook*', m)

  } catch (e) {
    console.error(e)
    m.reply(`❌ *Ocurrió un error:* ${e.message || e}`)
  }
}

/**
 * Función que prueba múltiples APIs en cadena
 */
async function getFacebookVideo(link) {
  const encoded = encodeURIComponent(link)
  
  // Lista de APIs en orden de prioridad
  const apis = [
    `https://eliasar-yt-api.vercel.app/api/facebookdl?link=${encoded}`,
    `https://api.botcahx.eu.org/api/dowloader/fbdown?url=${encoded}&apikey=BrunoSobrino`,
    `https://api.vreden.my.id/api/facebook?url=${encoded}`
  ]

  for (const url of apis) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue

      const json = await res.json()
      
      // Adaptador para diferentes estructuras de JSON
      let result = null
      if (json.status && json.data && json.data.length > 0) {
        result = json.data[0].url // Estructura de Eliasaryt
      } else if (json.result) {
        result = json.result.url || json.result.video || (Array.isArray(json.result) ? json.result[0].url : null)
      }

      if (result && result.startsWith('http')) return result
    } catch (err) {
      console.log(`Fallo en una API, intentando la siguiente...`)
      continue 
    }
  }
  return null
}

handler.help = ['facebook', 'fb'].map(v => v + ' <enlace>')
handler.tags = ['downloader']
handler.command = ['fb', 'facebook', 'fbdl']

export default handler
