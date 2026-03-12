import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {

if (!text) {
return conn.reply(m.chat, `❗ Uso correcto:\n${usedPrefix + command} <anime>\n\nEjemplo:\n.animedl one piece`, m)
}

try {

let api = `https://api.restfulapi.dev/anime/download?q=${encodeURIComponent(text)}`
let res = await fetch(api)
let json = await res.json()

if (!json.result || json.result.length === 0) {
return conn.reply(m.chat, '❌ No se encontraron descargas.', m)
}

let msg = `╭━━━〔 DESCARGA ANIME 〕━━━⬣\n`
msg += `✦ Anime: ${text}\n\n`

for (let i of json.result) {

let link = i.url

if (link.includes('mediafire') || link.includes('mega')) {
msg += `📺 Capítulo ${i.episode}\n`
msg += `🔗 ${link}\n\n`
}

}

msg += `╰━━━━━━━━━━━━━━━━━━⬣`

conn.reply(m.chat, msg, m)

} catch (e) {
conn.reply(m.chat, '❌ Error al buscar el anime.', m)
}

}

handler.help = ['animedl <anime>']
handler.tags = ['descargas']
handler.command = ['animedl']

export default handler
