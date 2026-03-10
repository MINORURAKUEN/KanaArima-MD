import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Si el usuario no escribe nada después del comando
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} overflow`
    
    const baseUrl = `https://hentaila.com/buscar?s=${encodeURIComponent(text)}`
    const providerName = 'HentaiLA'

    // Mensaje de espera decorado
    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando contenido:* _${text}_\n🌐 *Fuente:* _${providerName}_...` 
    }, { quoted: m })

    try {
        const { data } = await axios.get(baseUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        })
        const $ = cheerio.load(data)
        const results = []

        // Selectores específicos para HentaiLA
        $('.hentai').each((i, el) => {
            if (i < 5) { // Mostramos hasta 5 resultados
                let title = $(el).find('h2').text().trim() || $(el).find('.title').text().trim()
                let link = $(el).find('a').attr('href')
                let img = $(el).find('img').attr('src')
                
                if (title && link) {
                    results.push({ title, link, img })
                }
            }
        })

        if (results.length === 0) return m.reply(`❌ *No se hallaron resultados en ${providerName}*`)

        // --- DECORACIÓN DEL MENSAJE ---
        let caption = `🔞 *RESULTADOS H-CONTENT* 🔞\n`
        caption += `═══════════════════\n\n`

        results.forEach((res, index) => {
            caption += `*${index + 1}. 🎬 Título:* ${res.title}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Usa el link para ver el contenido en el navegador._`

        // Intentar enviar la imagen del primer resultado
        let firstImg = results[0].img
        if (firstImg) {
            await conn.sendMessage(m.chat, { 
                image: { url: firstImg }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        console.error(e)
        m.reply('⚠️ *Error:* El sitio podría estar caído o bloqueando la conexión de Termux.')
    }
}

// Configuración del comando
handler.command = /^(descargarH)$/i
handler.tags = ['hentai', 'premium']
handler.help = ['descargarH']

export default handler
              
