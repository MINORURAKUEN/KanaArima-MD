import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} overflow`
    
    const domain = 'https://latinohentai.vip'
    // Ruta de búsqueda estándar para LatinoHentai
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
        const results = []

        // Selectores amplios para capturar los resultados en LatinoHentai
        $('article, .post, .item, .video-block').each((i, el) => {
            if (results.length < 5) { // Límite de 5 resultados
                let title = $(el).find('h2, h3, h1, .title').text().trim()
                let link = $(el).find('a').attr('href')
                // Buscar la imagen en varios atributos posibles
                let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || $(el).find('img').attr('data-lazy-src')
                
                if (title && link) {
                    // Completar URLs relativas si es necesario
                    if (!link.startsWith('http')) link = domain + (link.startsWith('/') ? '' : '/') + link
                    if (img && !img.startsWith('http')) img = domain + (img.startsWith('/') ? '' : '/') + img
                    
                    results.push({ title, link, img })
                }
            }
        })

        if (results.length === 0) return m.reply(`❌ *No se hallaron coincidencias para:* _${text}_ en LatinoHentai.`)

        // --- DISEÑO DEL RESULTADO ---
        let caption = `🔞 *LATINO-HENTAI SEARCH* 🔞\n`
        caption += `═══════════════════\n\n`

        results.forEach((res, index) => {
            caption += `*${index + 1}. 🎬 Título:* ${res.title}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Toca el enlace para ver los detalles._`

        // Enviar imagen del primer resultado si existe
        if (results[0].img) {
            await conn.sendMessage(m.chat, { 
                image: { url: results[0].img }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        let errCode = e.response ? e.response.status : e.message
        console.error("❌ Error de búsqueda en LatinoHentai:", errCode)
        
        if (errCode === 403 || errCode === 503) {
            m.reply(`⚠️ *Error ${errCode}:* LatinoHentai tiene activa su protección anti-bots (Cloudflare) y bloqueó la búsqueda.`)
        } else {
            m.reply(`⚠️ *Error:* El sitio no respondió (${errCode}). Intenta más tarde.`)
        }
    }
}

handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler
        
