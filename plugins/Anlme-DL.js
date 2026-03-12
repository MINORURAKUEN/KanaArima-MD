import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Verificación de texto ingresado
    if (!text) {
        return conn.reply(m.chat, `❗ *Uso correcto:*\n${usedPrefix + command} <anime>\n\n💡 *Ejemplo:*\n${usedPrefix + command} one piece`, m)
    }

    try {
        // ⚠️ ADVERTENCIA: Debes reemplazar esta URL por una API real de descargas de anime.
        let api = `https://api.restfulapi.dev/anime/download?q=${encodeURIComponent(text)}`
        let res = await fetch(api)
        
        // Manejar errores de servidor (ej. error 500 o 404)
        if (!res.ok) throw new Error('Error en el servidor de la API')
            
        let json = await res.json()

        // 2. Verificar si hay resultados en general
        if (!json.result || json.result.length === 0) {
            return conn.reply(m.chat, `❌ No se encontraron resultados para *${text}*.`, m)
        }

        let msg = `╭━━━〔 DESCARGA ANIME 〕━━━⬣\n`
        msg += `✦ *Anime:* ${text}\n\n`
        
        let foundValidLinks = false // Variable para saber si encontramos Mega/Mediafire

        // 3. Filtrar y construir el mensaje
        for (let i of json.result) {
            let link = i.url
            // Verificamos que 'link' exista antes de usar .includes()
            if (link && (link.includes('mediafire') || link.includes('mega'))) {
                msg += `📺 *Capítulo ${i.episode || 'Desconocido'}*\n`
                msg += `🔗 ${link}\n\n`
                foundValidLinks = true
            }
        }

        msg += `╰━━━━━━━━━━━━━━━━━━⬣`

        // 4. Si no hubo links válidos de Mega/Mediafire, avisamos al usuario
        if (!foundValidLinks) {
            return conn.reply(m.chat, `❌ Se encontró el anime, pero no hay enlaces de *Mega* o *MediaFire* disponibles.`, m)
        }

        // 5. Enviar mensaje final
        await conn.reply(m.chat, msg, m)

    } catch (e) {
        // Imprimimos el error en la consola para que puedas debuggear si algo falla
        console.error('Error en comando animedl:', e)
        conn.reply(m.chat, '❌ Ocurrió un error al buscar el anime. Intenta de nuevo más tarde.', m)
    }
}

handler.help = ['animedl <anime>']
handler.tags = ['descargas']
handler.command = ['animedl']

export default handler

