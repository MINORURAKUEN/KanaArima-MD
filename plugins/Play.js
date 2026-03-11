import { ogmp3 } from '../src/libraries/youtubedl.js'
import yts from 'yt-search'
import fs from 'fs'

const userRequestTimes = new Map()
const MIN_DELAY = 5000

function checkRateLimit(userId) {
  const now = Date.now()
  const last = userRequestTimes.get(userId) || 0
  const diff = now - last
  if (diff < MIN_DELAY) {
    return { allowed: false, wait: Math.ceil((MIN_DELAY - diff) / 1000) }
  }
  userRequestTimes.set(userId, now)
  return { allowed: true, wait: 0 }
}

function sanitizeTitle(title) {
  return title?.replace(/[<>:"/\\|?*]/g, '').substring(0, 50) || 'Audio'
}

export default async function handler(sock, m, args) {
  try {
    const query = args.join(' ').trim()
    if (!query) return sock.sendMessage(m.chat, { text: '❗ Escribe el nombre o enlace del video.' }, { quoted: m })

    const rate = checkRateLimit(m.sender)
    if (!rate.allowed) {
      return sock.sendMessage(m.chat, {
        text: `⏳ Espera *${rate.wait}s* antes de usar este comando otra vez.`
      }, { quoted: m })
    }

    const videoId = ogmp3.isUrl(query) ? ogmp3.youtube(query) : null
    const search = videoId ? await yts.search(`https://youtu.be/${videoId}`) : await yts.search(query)
    const video = search.videos[0]
    const url = video.url

    await sock.sendMessage(m.chat, {
      image: { url: video.thumbnail },
      caption: `🎵 *Descargando audio...*\n\n📌 *Título:* ${sanitizeTitle(video.title)}\n⏱️ *Duración:* ${video.timestamp}`
    }, { quoted: m })

    const res = await ogmp3.download(url, '320', 'audio')
    if (!res.status) throw res.error || 'Error descargando audio'

    await sock.sendMessage(m.chat, {
      audio: { url: res.result.download },
      mimetype: 'audio/mpeg',
      fileName: `${sanitizeTitle(res.result.title)}.mp3`
    }, { quoted: m })

  } catch (e) {
    console.error('❌ Error en /play:', e)
    sock.sendMessage(m.chat, {
      text: `❌ Error descargando audio:\n${typeof e === 'string' ? e : e.message}`
    }, { quoted: m })
  }
              }
