import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {

if (!args[0]) {
return conn.reply(m.chat, `⚠️ Uso correcto:\n${usedPrefix + command} https://facebook.com/video`, m)
}

try {

let url = args[0]

let res = await fetch(`https://api.ryzendesu.vip/api/downloader/fb?url=${url}`)
let json = await res.json()

if (!json.status) throw 'No se pudo obtener el video'

let video = json.data.hd || json.data.sd

await conn.sendMessage(
m.chat,
{
video: { url: video },
caption: `📥 *Facebook Downloader*\n🔗 ${url}`
},
{ quoted: m }
)

} catch (e) {

conn.reply(m.chat, '❌ Error al descargar el video de Facebook', m)

}

}

handler.help = ['facebook <url>']
handler.tags = ['downloader']
handler.command = /^(fb|facebook|fbdl)$/i

export default handler
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
