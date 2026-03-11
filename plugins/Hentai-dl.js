import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} overflow`
    
    // Nueva URL de búsqueda estándar para TioHentai/TioAnime
    const baseUrl = `https://tiohentai.com/directorio?b=${encodeURIComponent(text)}`

    // Mensaje de espera
    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando:* _${text}_\n🌐 *Fuente:* _TioHentai_...` 
    }, { quoted: m })

    try {
        const { data, request } = await axios.get(baseUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Referer': 'https://tiohentai.com/',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        })
        
        const $ = cheerio.load(data)
        const results = []

        // 🟢 CASO 1: El sitio redirigió directo a la página de la serie (ej. /hentai/overflow)
        const responseUrl = request.res.responseUrl || request.responseURL || ""
        if (responseUrl.includes('/hentai/')) {
            let title = $('h1.title').text().trim() || $('h1').text().trim() || text
            let img = $('.thumb img').attr('src') || $('img').attr('src')
            let link = responseUrl
            
            if (img && !img.startsWith('http')) img = 'https://tiohentai.com' + img
            results.push({ title, link, img })
        } 
        // 🟢 CASO 2: El sitio mostró una lista de resultados de búsqueda
        else {
            $('article.anime, .anime').each((i, el) => {
                if (i < 5) {
                    let title = $(el).find('h3, .title').text().trim()
                    let link = $(el).find('a').attr('href')
                    let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src')
                    
                    if (title && link) {
                        if (!link.startsWith('http')) link = 'https://tiohentai.com' + link
                        if (img && !img.startsWith('http')) img = 'https://tiohentai.com' + img
                        
                        results.push({ title, link, img })
                    }
                }
            })
        }

        // Si no se encontró nada
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
        console.error("❌ Error de búsqueda en TioHentai:", errCode)
        
        if (errCode === 403 || errCode === 503) {
            m.reply(`⚠️ *Error ${errCode}:* El sitio activó la protección anti-bots (Cloudflare).`)
        } else if (errCode === 404) {
            m.reply(`⚠️ *Error 404:* La ruta de búsqueda no existe.`)
        } else {
            m.reply(`⚠️ *Error:* El sitio no respondió (${errCode}). Intenta más tarde.`)
        }
    }
}

handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler

