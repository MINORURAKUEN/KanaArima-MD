import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.reply(m.chat, `❗ *Uso correcto:*\n${usedPrefix + command} <anime>\n\n💡 *Ejemplo:*\n${usedPrefix + command} jigoku sensei nube`, m)
    }

    try {
        await conn.reply(m.chat, '⏳ *Buscando en TioAnime, espera un momento...*', m)

        // 1. Apuntamos al buscador de TioAnime
        let searchUrl = `https://tioanime.com/directorio?q=${encodeURIComponent(text)}`
        
        let res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        })
        
        if (!res.ok) throw new Error(`Error de conexión HTTP: ${res.status}`)
        
        let html = await res.text()
        let $ = cheerio.load(html)
        let resultados = []

        // 2. TioAnime usa la etiqueta <article> con la clase 'anime' para sus resultados
        $('article.anime').each((i, el) => {
            let title = $(el).find('h3.title').text()
            let linkPath = $(el).find('a').attr('href')
            
            if (title && linkPath) {
                // TioAnime a veces devuelve rutas relativas, así que agregamos el dominio
                let fullLink = 'https://tioanime.com' + linkPath
                resultados.push({ title, fullLink })
            }
        })

        if (resultados.length === 0) {
            return conn.reply(m.chat, `❌ No encontré ningún anime llamado *${text}* en TioAnime.`, m)
        }

        let msg = `╭━━━〔 RESULTADOS: TIOANIME 〕━━━⬣\n\n`
        let limite = Math.min(resultados.length, 5)

        for (let i = 0; i < limite; i++) {
            msg += `✦ *${resultados[i].title.trim()}*\n` // .trim() limpia espacios extra
            msg += `🔗 ${resultados[i].fullLink}\n\n`
        }

        msg += `╰━━━━━━━━━━━━━━━━━━⬣`

        await conn.reply(m.chat, msg, m)

    } catch (e) {
        console.error('Error en scraping animedl:', e)
        conn.reply(m.chat, '❌ Ocurrió un error al intentar conectarse a la página. Es posible que también esté bloqueada.', m)
    }
}

handler.help = ['animedl <anime>']
handler.tags = ['descargas']
handler.command = ['animedl', 'tioanime']

export default handler

