import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} One Piece`
    
    // Ajuste de lógica para los nuevos comandos
    let isLat = command.toLowerCase().includes('lat')
    let providerName = isLat ? 'AnimeDBS (Latino)' : 'TioAnime (Sub)'
    let baseUrl = isLat 
        ? `https://www.animedbs.online/?s=${encodeURIComponent(text)}` 
        : `https://tioanime.com/directorio?q=${encodeURIComponent(text)}`

    await conn.sendMessage(m.chat, { text: `✨ *Buscando:* _${text}_\n🌐 *Fuente:* _${providerName}_...` }, { quoted: m })

    try {
        const { data } = await axios.get(baseUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        })
        const $ = cheerio.load(data)
        const results = []

        if (isLat) {
            $('article').each((i, el) => {
                if (i < 3) {
                    let title = $(el).find('h2.entry-title a').text().trim() || $(el).find('.title a').text().trim()
                    let link = $(el).find('a').attr('href')
                    let img = $(el).find('img').attr('src')
                    if (title && link) results.push({ title, link, img })
                }
            })
        } else {
            $('.anime').each((i, el) => {
                if (i < 3) {
                    let title = $(el).find('.title').text().trim()
                    let link = $(el).find('a').attr('href')
                    let img = $(el).find('img').attr('src')
                    if (link && !link.startsWith('http')) link = 'https://tioanime.com' + link
                    if (img && !img.startsWith('http')) img = 'https://tioanime.com' + img
                    results.push({ title, link, img })
                }
            })
        }

        if (results.length === 0) return m.reply(`❌ *No se hallaron resultados en ${providerName}*`)

        let caption = `⭐ *ANIME SEARCH RESULT* ⭐\n`
        caption += `═══════════════════\n\n`

        results.forEach((res, index) => {
            caption += `*${index + 1}. 🎬 Título:* ${res.title}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Usa el link para ver los episodios_`

        let finalImg = results[0].img
        if (finalImg) {
            await conn.sendMessage(m.chat, { 
                image: { url: finalImg }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        console.error(e)
        m.reply('⚠️ *Error de conexión.* Intenta de nuevo más tarde.')
    }
}

// Actualización de los comandos
handler.command = /^(animedlsub|animedllat)$/i
handler.tags = ['anime']
handler.help = ['animedlsub', 'animedllat']

export default handler

