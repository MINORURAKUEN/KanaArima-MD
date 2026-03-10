import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} One Piece`
    
    // Determinar si es AnimeAV1 o TioAnime
    let isAV1 = command.toLowerCase().includes('lat') || command.toLowerCase().includes('av1')
    let providerName = isAV1 ? 'AnimeAV1' : 'TioAnime'
    let baseUrl = isAV1 ? `https://animeav1.com/?s=${encodeURIComponent(text)}` : `https://tioanime.com/directorio?q=${encodeURIComponent(text)}`

    await m.reply(`🔍 Buscando "${text}" en ${providerName}...`)

    try {
        const { data } = await axios.get(baseUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
        })
        const $ = cheerio.load(data)
        const results = []

        if (isAV1) {
            // Selectores específicos para AnimeAV1
            $('.result-item').each((i, el) => {
                if (i < 3) {
                    let title = $(el).find('.title a').text().trim()
                    let link = $(el).find('.title a').attr('href')
                    let img = $(el).find('img').attr('src')
                    if (title && link) results.push({ title, link, img })
                }
            })
        } else {
            // Selectores para TioAnime
            $('.anime').each((i, el) => {
                if (i < 3) {
                    let title = $(el).find('.title').text().trim()
                    let link = 'https://tioanime.com' + $(el).find('a').attr('href')
                    let img = 'https://tioanime.com' + $(el).find('img').attr('src')
                    results.push({ title, link, img })
                }
            })
        }

        if (results.length === 0) return m.reply(`❌ No se encontraron resultados en ${providerName}.`)

        let caption = `📺 *RESULTADOS EN ${providerName.toUpperCase()}*\n\n`
        results.forEach((res, index) => {
            caption += `*${index + 1}.* ${res.title}\n🔗 ${res.link}\n\n`
        })

        // Enviar imagen del primer resultado
        let finalImg = results[0].img
        await conn.sendMessage(m.chat, { 
            image: { url: finalImg }, 
            caption: caption.trim() 
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('⚠️ Error al conectar con la página. Inténtalo de nuevo.')
    }
}

// Activadores para ambos sitios
handler.command = /^(descargaranimeSub|descargaranimeLat|descargaranimeAV1)$/i
handler.tags = ['anime']
handler.help = ['descargaranimeSub', 'descargaranimeLat']

export default handler
    
