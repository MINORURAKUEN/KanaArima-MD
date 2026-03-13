import Parser from 'rss-parser'

// Configuramos el parser con un User-Agent de navegador real
let parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/atom+xml, text/xml'
    },
    timeout: 10000 // 10 segundos de espera antes de dar error
  }
})

const rssURL = 'https://rss-proxy.madbots.dev/api/w2f?v=0.1&url=https%3A%2F%2Fanimeav1.com%2F&link=.%2Fa%5B1%5D&context=%2F%2Fdiv%5B1%5D%2Fdiv%5B2%5D%2Fmain%5B1%5D%2Fsection%2Fdiv%5B1%5D%2Farticle&re=none&out=atom'

let handler = async (m, { conn }) => {
  try {
    // Intentamos obtener el feed
    let feed = await parser.parseURL(rssURL)

    if (!feed?.items?.length) {
      return conn.reply(m.chat, '⚠️ El servidor respondió pero no hay noticias nuevas.', m)
    }

    let text = `✨ *ANIME AV1 - RECIENTES* ✨\n\n`

    feed.items.slice(0, 5).forEach((item) => {
      text += `🔹 *${item.title.trim()}*\n`
      text += `🔗 ${item.link}\n`
      text += `──────────────────\n`
    })

    await conn.reply(m.chat, text.trim(), m)

  } catch (e) {
    console.error('RSS Error:', e)
    
    // Mensaje de error más detallado para debug
    let errorMessage = '❌ Error de conexión.\n\n'
    if (e.message.includes('403')) errorMessage += 'Causa: Acceso denegado (403).'
    else if (e.message.includes('404')) errorMessage += 'Causa: El proxy no encontró la página.'
    else if (e.message.includes('timeout')) errorMessage += 'Causa: Tiempo de espera agotado.'
    else errorMessage += `Detalle: ${e.message}`

    conn.reply(m.chat, errorMessage, m)
  }
}

handler.command = ['recentfeed', 'animeav1']

export default handler

