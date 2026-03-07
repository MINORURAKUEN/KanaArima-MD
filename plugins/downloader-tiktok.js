import axios from 'axios'
import cheerio from 'cheerio'
import fs from 'fs'

const handler = async (m, { conn, text, args, usedPrefix, command }) => {

  const datas = global
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.descargas_tiktok

  if (!text) throw `${tradutor.texto1} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`

  if (!/tiktok\.com/.test(text)) 
  throw `${tradutor.texto2} _${usedPrefix + command} https://vt.tiktok.com/ZSSm2fhLX/_`

  try {

    const links = await fetchDownloadLinks(text, 'tiktok')

    if (!links) throw new Error('No se pudieron obtener enlaces')

    const download = getDownloadLink('tiktok', links)

    if (!download) throw new Error('No se pudo obtener enlace')

    const cap = `${tradutor.texto8[0]} _${usedPrefix}tomp3_ ${tradutor.texto8[1]}`

    await conn.sendMessage(m.chat, {
      video: { url: download },
      caption: cap
    }, { quoted: m })

  } catch (e) {

    throw `${tradutor.texto9}`

  }

}

handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i
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

  if (!html || res?.data?.status !== 'success') return null

  const $ = cheerio.load(html)

  const links = []

  $('a.btn[href^="http"]').each((_, el) => {
    const link = $(el).attr('href')
    if (link && !links.includes(link)) links.push(link)
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

  if (platform === 'tiktok') {
    return links.find(link => /hdplay/.test(link)) || links[0]
  }

  return null

}        await client.sendMessage(m.chat, { video: { url: data.dl }, caption }, { quoted: m });
      } catch {
        m.reply(tradutor.texto9);
      }
    }
  },
};

// Auxiliar: Scraper Manual
async function fetchManualLinks(url) {
    const SITE_URL = 'https://instatiktok.com/';
    const form = new URLSearchParams({ url, platform: 'tiktok', siteurl: SITE_URL });
    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res?.data?.html;
    if (!html) return null;
    const $ = cheerio.load(html);
    const links = [];
    $('a.btn[href^="http"]').each((_, el) => { links.push($(el).attr('href')); });
    return links.length ? links : null;
}

// Generador de Caption
function genCaption(data, tradutor, usedPrefix) {
  const { title = 'TikTok Video', author = {}, stats = {}, music = {}, backup } = data;
  return `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload\n\n` +
         `𖣣ֶㅤ֯⌗ ✿ *Título:* ${title}\n` +
         `𖣣ֶㅤ֯⌗ ★ *Autor:* ${author.nickname || 'User'}\n` +
         `𖣣ֶㅤ֯⌗ ♡ *Likes:* ${(stats.likes || 0).toLocaleString()}\n` +
         `${backup ? `𖣣ֶㅤ֯⌗ ⚙️ *Source:* ${backup}` : ''}\n\n` +
         `_${tradutor.texto8[0]} *${usedPrefix}tomp3* ${tradutor.texto8[1]}_`;
}
