import fetch from 'node-fetch'
import * as cheerio from 'cheerio' // Importamos nuestra nueva herramienta

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.reply(m.chat, `❗ *Uso correcto:*\n${usedPrefix + command} <anime>\n\n💡 *Ejemplo:*\n${usedPrefix + command} naruto`, m)
    }

    try {
        // Avisamos al usuario que estamos buscando, el scraping puede tardar un par de segundos
        await conn.reply(m.chat, '⏳ *Buscando en la web, espera un momento...*', m)

        // 1. Hacemos la petición a la página de búsqueda de AnimeFLV
        let searchUrl = `https://wwws.animeflv.net/browse?q=${encodeURIComponent(text)}`
        let res = await fetch(searchUrl)
        
        if (!res.ok) throw new Error('No se pudo conectar con la página')
        
        // 2. Extraemos el HTML crudo de la página
        let html = await res.text()

        // 3. Cargamos el HTML en Cheerio para poder navegarlo
        let $ = cheerio.load(html)
        let resultados = []

        // 4. Inspeccionamos la estructura de AnimeFLV. 
        // Sus animes están dentro de una lista con la clase 'ListAnimes'
        $('ul.ListAnimes li').each((i, el) => {
            // Extraemos el título y el enlace de cada tarjeta de anime
            let title = $(el).find('h3.Title').text()
            let linkPath = $(el).find('a').attr('href')
            
            if (title && linkPath) {
                // Completamos la URL porque el href suele ser "/anime/naruto"
                let fullLink = 'https://wwws.animeflv.net' + linkPath
                resultados.push({ title, fullLink })
            }
        })

        // 5. Verificamos si encontramos algo
        if (resultados.length === 0) {
            return conn.reply(m.chat, `❌ No encontré ningún anime llamado *${text}* en AnimeFLV.`, m)
        }

        // 6. Armamos el mensaje final (limitamos a 5 resultados para no hacer spam)
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
        conn.reply(m.chat, '❌ Ocurrió un error al intentar extraer los datos de la página.', m)
    }
}

handler.help = ['animedl <anime>']
handler.tags = ['descargas']
handler.command = ['animedl', 'animeflv']

export default handler

