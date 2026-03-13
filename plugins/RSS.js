import Parser from 'rss-parser'
let parser = new Parser()

global.rssAnime = global.rssAnime || {}

let rss = 'https://nyaa.si/?page=rss&q=one+piece'

async function checkRSS(conn) {
  try {
    let feed = await parser.parseURL(rss)
    let item = feed.items[0]

    for (let chat in global.rssAnime) {
      if (!global.rssAnime[chat].active) continue

      if (global.rssAnime[chat].last !== item.link) {
        global.rssAnime[chat].last = item.link

        conn.sendMessage(chat, {
          text: `📺 *Nuevo episodio detectado*\n\n${item.title}\n\n🔗 ${item.link}`
        })
      }
    }
  } catch (e) {
    console.log(e)
  }
}

setInterval(() => {
  if (global.conn) checkRSS(global.conn)
}, 300000) // cada 5 minutos

let handler = async (m, { conn, command }) => {

  if (!global.rssAnime[m.chat])
    global.rssAnime[m.chat] = { active: false, last: '' }

  if (command == 'rssanimeon') {
    global.rssAnime[m.chat].active = true
    conn.reply(m.chat, '✅ RSS anime activado en este chat', m)
  }

  if (command == 'rssanimeoff') {
    global.rssAnime[m.chat].active = false
    conn.reply(m.chat, '❌ RSS anime desactivado en este chat', m)
  }
}

handler.command = ['rssanimeon','rssanimeoff']
handler.admin = true

export default handler
