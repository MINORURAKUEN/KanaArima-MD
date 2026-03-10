import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} overflow`
    
    const baseUrl = `https://hentaila.com/buscar?s=${encodeURIComponent(text)}`
    
    // HEADERS TIPO GOOGLE CHROME (BYPASS CLOUDFLARE BÁSICO)
    const googleHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/'
    }

    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando contenido:* _${text}_\n🌐 *Fuente:* _HentaiLA (Google Engine)_...` 
    }, { quoted: m })

    try {
        const { data } = await axios.get(baseUrl, { headers: googleHeaders })
        const $ = cheerio.load(data)
        const results = []

        $('.hentai').each((i, el) => {
            if (i < 5) {
                let title = $(el).find('h2').text().trim() || $(el).find('.title').text().trim()
                let link = $(el).find('a').attr('href')
                let img = $(el).find('img').attr('src')
                if (title && link) results.push({ title, link, img })
            }
        })

        if (results.length === 0) return m.reply(`❌ *No se hallaron resultados.* Verifica el nombre.`)

        let caption = `🔞 *RESULTADOS H-CONTENT* 🔞\n`
        caption += `═══════════════════\n\n`

        results.forEach((res, index) => {
            caption += `*${index + 1}. 🎬 Título:* ${res.title}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Usa el link para ver el contenido._`

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
        m.reply('⚠️ *Cloudflare Error:* El sitio detectó el bot. Intenta de nuevo o usa una VPN en Termux.')
    }
}

handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler
