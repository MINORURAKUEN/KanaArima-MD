import Parser from 'rss-parser'
let parser = new Parser()

// Usando el feed oficial de la web
const rssURL = 'https://animeav1.com/feed/'

let handler = async (m, { conn }) => {
  try {
    // Obtenemos el feed directamente
    let feed = await parser.parseURL(rssURL)

    if (!feed.items || feed.items.length === 0) {
      return conn.reply(m.chat, '⚠️ No se encontraron publicaciones en el feed de AnimeAV1.', m)
    }

    let text = `✨ *ANIME AV1 - ÚLTIMAS ENTRADAS* ✨\n\n`

    // Tomamos los 5 más recientes
    let items = feed.items.slice(0, 5)

    for (let item of items) {
      let title = item.title ? item.title.trim() : 'Sin título'
      let date = item.pubDate ? new Date(item.pubDate).toLocaleDateString('es-ES') : ''
      
      text += `🔹 *${title}*\n`
      text += `📅 _${date}_\n`
      text += `🔗 ${item.link}\n`
      text += `──────────────────\n`
    }

    text += `\n*Fuente:* AnimeAV1`

    await conn.reply(m.chat, text, m)

  } catch (e) {
    console.error('Error en el Feed Directo:', e)
    conn.reply(m.chat, '❌ Error al leer el feed oficial. Inténtalo de nuevo más tarde.', m)
  }
}

handler.help = ['animeav1']
handler.tags = ['anime']
handler.command = ['recentfeed', 'animeav1']

export default handler

