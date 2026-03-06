import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'

let handler = async (m, { args, conn, text, usedPrefix, command }) => {

const user = global.db.data.users[m.sender] || {}
const idioma = user.language || global.defaultLenguaje

const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
const tradutor = _translate.plugins.descargas_facebook

if (!text) throw `_*${tradutor.texto1[0]}*_\n\n*${tradutor.texto1[1]}*\n\n*${tradutor.texto1[2]}* ${usedPrefix + command} https://www.facebook.com/...`

const platform = 'facebook'

try {

const links = await fetchDownloadLinks(text, platform)

if (!links || links.length === 0) {
return conn.sendMessage(m.chat, { text: '*[ ❌ ] No se encontraron enlaces de descarga.*' }, { quoted: m })
}

let download = getDownloadLink(platform, links)

if (!download) {
return conn.sendMessage(m.chat, { text: '*[ ❌ ] Error al obtener el enlace de descarga.*' }, { quoted: m })
}

const ext = download.includes('.mp4') ? 'mp4' : 'jpg'
const caption = `📥 Descarga de ${platform} exitosa`

if (ext === 'mp4') {
await conn.sendMessage(m.chat, { video: { url: download }, caption }, { quoted: m })
} else {
await conn.sendMessage(m.chat, { image: { url: download }, caption }, { quoted: m })
}

} catch (error) {

console.log(error)

conn.sendMessage(
m.chat,
{ text: `*[❌] Error:*\n${error.message}` },
{ quoted: m }
)

}

}

handler.command = /^(facebook|fb|facebookdl|fbdl)$/i
handler.tags = ['downloader']
handler.help = ['facebook <url>']

export default handler


async function fetchDownloadLinks(text, platform) {

const { SITE_URL, form } = createApiRequest(text, platform)

const res = await axios.post(`${SITE_URL}api`, form.toString(), {
headers: {
'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
'Origin': SITE_URL,
'Referer': SITE_URL,
'User-Agent': 'Mozilla/5.0',
'X-Requested-With': 'XMLHttpRequest'
}
})

const html = res?.data?.html

if (!html || res?.data?.status !== 'success') {
return null
}

const $ = cheerio.load(html)
const links = []

$('a.btn[href^="http"]').each((_, el) => {

const link = $(el).attr('href')

if (link && !links.includes(link)) {
links.push(link)
}

})

return links

}


function createApiRequest(text, platform) {

const SITE_URL = 'https://instatiktok.com/'

const form = new URLSearchParams()

form.append('url', text)
form.append('platform', platform)
form.append('siteurl', SITE_URL)

return { SITE_URL, form }

}


function getDownloadLink(platform, links) {

if (platform === 'facebook') {
return links.at(-1)
}

if (platform === 'tiktok') {
return links.find(link => /hdplay/.test(link)) || links[0]
}

if (platform === 'instagram') {
return links
}

return null

}        return links;
    } else if (platform === 'tiktok') {
        return links.find(link => /hdplay/.test(link)) || links[0];
    } else if (platform === 'facebook') {
        return links.at(-1);
    }
    return null;
}
