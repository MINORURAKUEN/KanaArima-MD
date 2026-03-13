import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn }) => {
  try {
    const { data } = await axios.get('https://tioanime.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(data)
    let episodes = []

    $('.episodes .list-unstyled li').each((i, el) => {
      if (i < 5) { 
        const title = $(el).find('.title').text().trim()
        const episodeNum = $(el).find('.episode').text().trim()
        const link = 'https://tioanime.com' + $(el).find('a').attr('href')
        let thumb = $(el).find('img').attr('src')
        
        if (thumb && !thumb.startsWith('http')) {
          thumb = 'https://tioanime.com' + thumb
        }
        
        episodes.push({ title, episodeNum, link, thumb })
      }
    })

    if (episodes.length === 0) return m.reply('⚠️ No se encontraron episodios.')

    let text = `📺 *TIOANIME - NOVEDADES* 📺\n\n`
    episodes.forEach((ep, i) => {
      text += `${i === 0 ? '⭐' : '🔹'} *${ep.title}*\n`
      text += `🆕 ${ep.episodeNum}\n`
      text += `🔗 ${ep.link}\n`
      text += `──────────────────\n`
    })

    const mainImage = episodes[0].thumb

    // INTENTO ENVIAR CON IMAGEN
    try {
      if (!mainImage) throw new Error('No hay imagen')
      await conn.sendFile(m.chat, mainImage, 'error.jpg', text.trim(), m)
    } catch (imgError) {
      // SI FALLA LA IMAGEN, ENVÍA SOLO TEXTO
      console.log('Fallo al enviar imagen, enviando solo texto...')
      await conn.reply(m.chat, text.trim(), m)
    }

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ Error al conectar con TioAnime.', m)
  }
}

handler.command = ['tioanime', 'recenttio']

export default handler

