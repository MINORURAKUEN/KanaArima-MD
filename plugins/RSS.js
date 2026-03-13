import Parser from 'rss-parser'
let parser = new Parser()

// URL del proxy para AnimeAV1
const rssURL = 'https://rss-proxy.madbots.dev/api/w2f?v=0.1&url=https%3A%2F%2Fanimeav1.com%2F&link=.%2Fa%5B1%5D&context=%2F%2Fdiv%5B1%5D%2Fdiv%5B2%5D%2Fmain%5B1%5D%2Fsection%2Fdiv%5B1%5D%2Farticle&re=none&out=atom'

let handler = async (m, { conn }) => {
  try {
    // Obtenemos el feed de noticias
    let feed = await parser.parseURL(rssURL)

    if (!feed.items || feed.items.length === 0) {
      return conn.reply(m.chat, '⚠️ No hay noticias disponibles en este momento.', m)
    }

    let text = `✨ *ANIME AV1 - RECIENTES* ✨\n\n`

    // Listamos los 5 posts más recientes
    let items = feed.items.slice(0, 5)

    for (let item of items) {
      let title = item.title ? item.title.trim() : 'Sin título'
      
      text += `🔹 *${title}*\n`
      text += `🔗 ${item.link}\n`
      text += `──────────────────\n`
    }

    text += `\n_Usa .recentfeed para actualizar_`

    // Enviamos solo el mensaje de texto
    await conn.reply(m.chat, text, m)

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ Error al conectar con el servidor de AnimeAV1.', m)
  }
}

handler.help = ['animeav1']
handler.tags = ['anime']
handler.command = ['recentfeed', 'animeav1']

export default handler

