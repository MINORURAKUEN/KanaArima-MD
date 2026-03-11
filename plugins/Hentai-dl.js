import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*⚠️ Ejemplo:* ${usedPrefix}${command} overflow`
    
    // Mensaje inicial
    await conn.sendMessage(m.chat, { 
        text: `🔞 *Buscando:* _${text}_\n🌐 *Fuentes:* _TioHentai, HentaiLA, LatinoHentai_...` 
    }, { quoted: m })

    const query = encodeURIComponent(text)
    
    // Lista de proveedores con sus rutas de búsqueda más comunes
    const sources = [
        {
            name: 'TioHentai',
            url: `https://tiohentai.com/directorio?b=${query}`,
            domain: 'https://tiohentai.com'
        },
        {
            name: 'HentaiLA TV',
            url: `https://hentaila.tv/buscar?q=${query}`, 
            domain: 'https://hentaila.tv'
        },
        {
            name: 'HentaiLA Hub',
            url: `https://hentaila.com/buscar?q=${query}`,
            domain: 'https://hentaila.com'
        },
        {
            name: 'LatinoHentai',
            url: `https://latinohentai.vip/?s=${query}`,
            domain: 'https://latinohentai.vip'
        }
    ]

    // Función que extrae la información de una página específica
    const fetchSource = async (source) => {
        try {
            const { data } = await axios.get(source.url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                },
                timeout: 8000 // Tiempo máximo de espera por sitio (8 segundos)
            })
            const $ = cheerio.load(data)
            let localResults = []

            // Selectores genéricos que funcionan en la mayoría de estas webs
            $('article, .anime, .post, .item, .capitulo').each((i, el) => {
                if (localResults.length < 3) { // Extraer máximo 3 resultados por página para no saturar el mensaje
                    let title = $(el).find('h2, h3, h1, .title').text().trim()
                    let link = $(el).find('a').attr('href')
                    let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || $(el).find('img').attr('data-lazy-src')
                    
                    if (title && link && title.length > 2) {
                        // Limpiar URLs relativas
                        if (!link.startsWith('http')) link = source.domain + (link.startsWith('/') ? '' : '/') + link
                        if (img && !img.startsWith('http')) img = source.domain + (img.startsWith('/') ? '' : '/') + img
                        
                        localResults.push({ title, link, img, source: source.name })
                    }
                }
            })
            return localResults
        } catch (e) {
            // Si la página tiene Cloudflare o está caída, la ignora sin crashear el bot
            console.log(`⚠️ Ignorando ${source.name}: ${e.response ? e.response.status : e.message}`)
            return [] 
        }
    }

    try {
        let allResults = []
        
        // Ejecutar todas las búsquedas al mismo tiempo (Concurrencia)
        const responses = await Promise.all(sources.map(source => fetchSource(source)))
        
        // Combinar los resultados de todas las páginas
        responses.forEach(res => {
            allResults = allResults.concat(res)
        })

        // Filtrar vacíos y limitar a los primeros 10 resultados en total
        allResults = allResults.filter(r => r.title && r.link).slice(0, 10)

        if (allResults.length === 0) return m.reply(`❌ *No se hallaron coincidencias para:* _${text}_\nEs posible que los sitios estén bloqueando la búsqueda temporalmente.`)

        // --- DISEÑO DEL RESULTADO ---
        let caption = `🔞 *MULTI-SEARCH HENTAI* 🔞\n`
        caption += `═══════════════════\n\n`

        allResults.forEach((res, index) => {
            caption += `*${index + 1}. 🎬* ${res.title}\n`
            caption += `*🏢 Fuente:* ${res.source}\n`
            caption += `*🔗 Enlace:* ${res.link}\n`
            caption += `───────────────────\n\n`
        })

        caption += `💡 _Toca el enlace de tu preferencia para ver los detalles._`

        // Enviar imagen del primer resultado si existe
        if (allResults[0].img) {
            await conn.sendMessage(m.chat, { 
                image: { url: allResults[0].img }, 
                caption: caption.trim() 
            }, { quoted: m })
        } else {
            await m.reply(caption.trim())
        }

    } catch (e) {
        console.error("Error en Multi-Search:", e)
        m.reply(`⚠️ *Error general:* Hubo un problema procesando las páginas de búsqueda.`)
    }
}

handler.command = /^(descargarH)$/i
handler.tags = ['hentai']
handler.help = ['descargarH']

export default handler
