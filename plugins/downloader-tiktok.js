import fs from 'fs'
import fetch from 'node-fetch'

const handler = async (m, { conn, text, args, usedPrefix, command }) => {

const datas = global
const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje
const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
const tradutor = _translate.plugins.descargas_tiktok

if (!text) throw `${tradutor.texto1} _${usedPrefix + command} https://tiktok.com/_`

if (!/tiktok\.com/.test(text))
throw `${tradutor.texto2} _${usedPrefix + command} https://tiktok.com/_`

try {

const apiUrl = `${api.url}/dl/tiktok?url=${text}&key=${api.key}`

const res = await fetch(apiUrl)

if (!res.ok) throw new Error(`API error ${res.status}`)

const json = await res.json()

const data = json.data

if (!data) throw new Error('Sin datos')

const {
title = 'Sin título',
dl,
duration,
author = {},
stats = {},
music = {},
} = data

const caption =
`ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ\n\n` +
`𖣣ֶㅤ֯⌗ ✿ ⬭ *Título:* ${title}\n` +
`𖣣ֶㅤ֯⌗ ★ ⬭ *Autor:* ${author.nickname || author.unique_id || 'Desconocido'}\n` +
`𖣣ֶㅤ֯⌗ ❖ ⬭ *Duración:* ${duration || 'N/A'}\n` +
`𖣣ֶㅤ֯⌗ ♡ ⬭ *Likes:* ${(stats.likes || 0).toLocaleString()}\n` +
`𖣣ֶㅤ֯⌗ ꕥ ⬭ *Comentarios:* ${(stats.comments || 0).toLocaleString()}\n` +
`𖣣ֶㅤ֯⌗ ❒ ⬭ *Vistas:* ${(stats.views || stats.plays || 0).toLocaleString()}\n` +
`𖣣ֶㅤ֯⌗ ☄︎ ⬭ *Compartidos:* ${(stats.shares || 0).toLocaleString()}\n` +
`𖣣ֶㅤ֯⌗ ⚡︎ ⬭ *Audio:* ${music.title ? music.title + ' -' : 'Desconocido'} ${music.author || ''}`

await conn.sendMessage(m.chat, {
video: { url: dl },
caption
}, { quoted: m })

} catch (e) {

throw `${tradutor.texto9}`

}

}

handler.command = /^(tiktok|ttdl|tiktokdl|tt|tiktoknowm)$/i

export default handler
