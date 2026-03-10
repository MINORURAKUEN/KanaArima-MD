import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Si el usuario no escribe nada, muestra el ejemplo que pediste
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} joshi luck`
    
    const baseUrl = `https://tiohentai.com/buscar?s=${encodeURIComponent(text)}`
    const providerName = 'TioHentai'

    // Mensaje de espera con estética limpia
    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando:* _${text}_\n🌐 *Fuente:* _${providerName}_...` 
    }, { quoted: m })

    try {
        const { data } = await axios.get(baseUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        })
        const $ = cheerio.load(data)
        const results = []

        // Selectores optimizados para la estructura de TioHentai
        $('article.anime, .thumb, .hentai').each((i, el) => {
            if (i < 5) {
                let title = $(el).find('h3, .title, h2').text().trim()
                let link = $(el).find('a').attr('href')
                let img = $(el).find('img').attr('src')
                
                if (title && link) {
                    // Normalizar enlaces e imágenes
                    if (!link.startsWith('http')) link = 'https://tiohentai.com' + link
                    if (img && !img.startsWith('http')) img = 'https://tiohentai.com' + img
                    
                    results.push({ title, link, img })
                }
            }
        })

        if (results.length === 0) return m.reply(`❌ *No se hallaron coincidencias para:* _${text}_`)

        // --- DISEÑO DEL RESULTADO ---
        let caption = `🔞 *TIO-HENTAI SEARCH* 🔞\n`
        caption += `═══════════════════\n\n`

        results.forEach((res, index) => {
            caption += `*${index + 1}. 🎬 Título:* ${res.title}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Toca el enlace para ver los detalles._`

        // Enviar imagen del primer resultado (si existe)
        if (results[0].img) {
            await conn.sendMessage(m.chat, { 
                image: { url: results[0].img }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        console.error(e)
        m.reply('⚠️ *Error:* El sitio no respondió. Verifica tu conexión o intenta más tarde.')
    }
}

// Configuración de comando y tags
handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler
