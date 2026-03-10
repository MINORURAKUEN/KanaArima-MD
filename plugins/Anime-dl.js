import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} One Piece`
    
    // Determinar si es latino o sub basándose en el comando
    let type = command.toLowerCase().includes('lat') ? 'latino' : 'sub'
    let providerName = type === 'latino' ? 'Latanime' : 'TioAnime'
    let baseUrl = type === 'latino' ? 'https://latanime.org/buscar?q=' : 'https://tioanime.com/directorio?q='

    await m.reply(`🔍 Buscando "${text}" en ${providerName}...`)

    try {
        const { data } = await axios.get(`${baseUrl}${encodeURIComponent(text)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
        })
        const $ = cheerio.load(data)
        const results = []

        // Selectores según la web
        let selector = type === 'latino' ? '.animes .anime' : '.anime'
        
        $(selector).each((i, el) => {
            if (i < 3) {
                let title = $(el).find('.title').text().trim()
                let link = $(el).find('a').attr('href')
                let img = $(el).find('img').attr('src')

                if (link && !link.startsWith('http')) {
                    link = (type === 'sub' ? 'https://tioanime.com' : 'https://latanime.org') + link
                }
                results.push({ title, link, img })
            }
        })

        if (results.length === 0) return m.reply(`❌ No se encontraron resultados en ${providerName}.`)

        let caption = `📺 *RESULTADOS EN ${providerName.toUpperCase()}*\n\n`
        results.forEach((res, index) => {
            caption += `*${index + 1}.* ${res.title}\n🔗 ${res.link}\n\n`
        })

        // Enviar la imagen del primer resultado con la lista
        let finalImg = results[0].img
        if (finalImg && !finalImg.startsWith('http')) {
            finalImg = type === 'sub' ? 'https://tioanime.com' + finalImg : finalImg
        }

        await conn.sendMessage(m.chat, { 
            image: { url: finalImg }, 
            caption: caption.trim() 
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('⚠️ Hubo un error al conectar con la página.')
    }
}

// Estos son los activadores del comando
handler.command = /^(descargaranimeSub|descargaranimeLat)$/i
handler.tags = ['anime']
handler.help = ['descargaranimeSub', 'descargaranimeLat']

export default handler

