import Parser from 'rss-parser'
let parser = new Parser()

const rssURL = 'https://rss-proxy.madbots.dev/api/w2f?v=0.1&url=https%3A%2F%2Fanimeav1.com%2F&link=.%2Fa%5B1%5D&context=%2F%2Fdiv%5B1%5D%2Fdiv%5B2%5D%2Fmain%5B1%5D%2Fsection%2Fdiv%5B1%5D%2Farticle&re=none&out=atom'

let handler = async (m, { conn }) => {
  try {
    let feed = await parser.parseURL(rssURL)

    if (!feed.items || feed.items.length === 0) {
      return conn.reply(m.chat, '⚠️ No hay noticias nuevas.', m)
    }

    // El primer item será nuestra portada
    let firstItem = feed.items[0]
    
    // Intentamos obtener la imagen de varias fuentes comunes en feeds Atom/RSS
    let image = firstItem.enclosure?.url || 
                firstItem.content?.match(/src="([^"]+)"/)?.[1] || 
                'https://animeav1.com/favicon.ico' // Imagen por defecto

    let text = `✨ *ÚLTIMOS LANZAMIENTOS* ✨\n\n`

    // Listamos los últimos 5
    feed.items.slice(0, 5).forEach((item, i) => {
      text += `${i === 0 ? '⭐' : '🔹'} *${item.title.trim()}*\n`
      text += `🔗 ${item.link}\n\n`
    })

    // Enviamos con foto (usando la imagen del primer post como miniatura)
    await conn.sendFile(m.chat, image, 'anime.jpg', text, m)

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ Error al obtener el feed con imagen.', m)
  }
}

handler.command = ['recentfeed', 'animeav1']

export default handler

