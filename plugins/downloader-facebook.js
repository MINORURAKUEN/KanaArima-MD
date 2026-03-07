import fetch from 'node-fetch'

let handler = async (m, { args, command, conn }) => {
  if (!args[0]) throw `*⚠️ Uso correcto: .${command} <enlace de Facebook>*`

  // Reacción de "Buscando": Usando sintaxis compatible
  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    const data = await getFacebookData(args[0])
    if (!data) throw 'No se encontró el video.'

    const options = []
    if (data.hd) options.push({ type: 'video', quality: 'HD', url: data.hd })
    if (data.sd) options.push({ type: 'video', quality: 'SD', url: data.sd })
    if (data.audio) options.push({ type: 'audio', quality: 'MP3', url: data.audio })

    let menu = `🎬 *CALIDADES DISPONIBLES*\n\n`
    options.forEach((opt, i) => menu += `${i + 1}. ${opt.type === 'video' ? '📺' : '🎧'} *${opt.quality}*\n`)
    menu += `\n_Responde con el número_`

    const { key } = await conn.reply(m.chat, menu, m)

    const filter = (res) => res.author === m.sender && res.quoted && res.quoted.id === key.id
    const collector = m.chat.createMessageCollector({ filter, time: 30000, max: 1 })

    collector.on('collect', async (msg) => {
      const sel = parseInt(msg.text) - 1
      if (!options[sel]) {
        return conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      }

      const { url, type } = options[sel]

      // Reacción de "Descargando"
      await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

      try {
        const res = await fetch(url)
        const buffer = await res.buffer()

        // Reacción de "Subiendo"
        await conn.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

        if (type === 'video') {
          await conn.sendFile(m.chat, buffer, 'fb.mp4', `✅ *Video descargado*`, m)
        } else {
          await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: m })
        }

        // Reacción de éxito
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      } catch (err) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Error al procesar el archivo.')
      }
    })

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`❌ *Error:* ${e.message || e}`)
  }
}

async function getFacebookData(link) {
  const encoded = encodeURIComponent(link)
  const apis = [
    `https://api.vreden.my.id/api/facebook?url=${encoded}`,
    `https://api.botcahx.eu.org/api/downloader/fbdown?url=${encoded}`
  ]
  for (const url of apis) {
    try {
      const res = await fetch(url)
      const json = await res.json()
      const resData = json.result || json.data
      if (resData) return {
        hd: resData.hd || null,
        sd: resData.sd || resData.url || (Array.isArray(resData) ? resData[0].url : null),
        audio: resData.audio || null
      }
    } catch { continue }
  }
  return null
}

handler.command = ['fb', 'facebook', 'fbdl']
export default handler
