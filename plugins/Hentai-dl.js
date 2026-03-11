import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} joshi luck`
    
    const domain = 'https://latinohentai.vip'
    const baseUrl = `${domain}/?s=${encodeURIComponent(text)}`

    // Mensaje de espera
    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando:* _${text}_\n🌐 *Fuente:* _LatinoHentai_...` 
    }, { quoted: m })

    try {
        const { data } = await axios.get(baseUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': domain
            }
        })
        
        const $ = cheerio.load(data)
        let result = null // Cambiamos de array a un solo objeto

        // Buscamos SOLO el primer resultado válido
        $('article, .post, .item, .video-block').each((i, el) => {
            if (!result) { // Si la variable result está vacía, atrapa el primero
                let title = $(el).find('h2, h3, h1, .title').text().trim()
                let link = $(el).find('a').attr('href')
                let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || $(el).find('img').attr('data-lazy-src')
                
                if (title && link) {
                    if (!link.startsWith('http')) link = domain + (link.startsWith('/') ? '' : '/') + link
                    if (img && !img.startsWith('http')) img = domain + (img.startsWith('/') ? '' : '/') + img
                    
                    result = { title, link, img } // Guardamos solo este
                }
            }
        })

        if (!result) return m.reply(`❌ *No se hallaron coincidencias para:* _${text}_ en LatinoHentai.`)

        // --- DISEÑO DEL RESULTADO ÚNICO ---
        let caption = `🔞 *LATINO-HENTAI SEARCH* 🔞\n`
        caption += `═══════════════════\n\n`
        caption += `*🎬 Título:* ${result.title}\n`
        caption += `*🔗 Enlace:* ${result.link}\n`
        caption += `───────────────────\n\n`
        caption += `💡 _Toca el enlace para ver los detalles._`

        // Enviar imagen del resultado único
        if (result.img) {
            await conn.sendMessage(m.chat, { 
                image: { url: result.img }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        let errCode = e.response ? e.response.status : e.message
        console.error("❌ Error de búsqueda en LatinoHentai:", errCode)
        m.reply(`⚠️ *Error:* El sitio no respondió (${errCode}). Intenta más tarde.`)
    }
}

handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler

