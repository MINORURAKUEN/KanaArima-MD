import Parser from 'rss-parser'
let parser = new Parser()

let rss = 'https://nyaa.si/?page=rss&q=anime'

let handler = async (m, { conn }) => {
  try {

    let feed = await parser.parseURL(rss)

    let text = `📡 *RSS ANIME RECIENTES*\n\n`

    let items = feed.items.slice(0, 5)

    for (let item of items) {
      text += `📺 ${item.title}\n`
      text += `🔗 ${item.link}\n\n`
    }

    conn.reply(m.chat, text, m)

  } catch (e) {
    console.log(e)
    conn.reply(m.chat, '❌ Error al obtener el RSS', m)
  }
}

handler.command = ['recentfeed']

export default handler
