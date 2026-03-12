import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.reply(m.chat, `❗ *Uso correcto:*\n${usedPrefix + command} <anime>\n\n💡 *Ejemplo:*\n${usedPrefix + command} jigoku sensei nube`, m)
    }

    try {
        await conn.reply(m.chat, '⏳ *Buscando en AnimeFLV, espera un momento...*', m)

        // 1. URL corregida (sin la 's' en www)
        let searchUrl = `https://www.animeflv.net/browse?q=${encodeURIComponent(text)}`
        
        // Agregamos un "User-Agent" para simular que somos un navegador real y evitar bloqueos de Cloudflare
        let res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        })
        
        if (!res.ok) throw new Error(`Error de conexión HTTP: ${res.status}`)
        
        let html = await res.text()
        let $ = cheerio.load(html)
        let resultados = []

        // 2. Extraemos los resultados
        $('ul.ListAnimes li').each((i, el) => {
            let title = $(el).find('h3.Title').text()
            let linkPath = $(el).find('a').attr('href')
            
            if (title && linkPath) {
                // Dominio corregido aquí también
                let fullLink = 'https://www.animeflv.net' + linkPath
                resultados.push({ title, fullLink })
            }
        })

        if (resultados.length === 0) {
            return conn.reply(m.chat, `❌ No encontré ningún anime llamado *${text}*.`, m)
        }

        let msg = `╭━━━〔 RESULTADOS: ANIMEFLV 〕━━━⬣\n\n`
        let limite = Math.min(resultados.length, 5)

        for (let i = 0; i < limite; i++) {
            msg += `✦ *${resultados[i].title}*\n`
            msg += `🔗 ${resultados[i].fullLink}\n\n`
        }

        msg += `╰━━━━━━━━━━━━━━━━━━⬣`

        await conn.reply(m.chat, msg, m)

    } catch (e) {
        console.error('Error en scraping animedl:', e)
        conn.reply(m.chat, '❌ Ocurrió un error al intentar extraer los datos de la página. Es posible que la página esté protegiendo el acceso.', m)
    }
}

handler.help = ['animedl <anime>']
handler.tags = ['descargas']
handler.command = ['animedl', 'animeflv']

export default handler

