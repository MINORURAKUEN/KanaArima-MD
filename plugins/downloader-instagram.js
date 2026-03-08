import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

// Configuración de Red (Tus datos de Soax)
const proxyUrl = "http://<api_key>:wifi;ca;;;toronto@proxy.soax.com:9137"
const agent = new HttpsProxyAgent(proxyUrl)

export default {
  command: ['instagram', 'ig', 'igdl'],
  category: 'downloader',
  run: async (client, m, { args, command }) => {
    
    // --- 🛡️ VALIDACIÓN DE PERMISOS ---
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const isOficialBot = botId === global.client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    
    if (!isOficialBot && botSettings.botprem === false && botSettings.botmod === false) {
      return client.reply(m.chat, `🌽 El comando *${command}* no está disponible en *Sub-Bots.*`, m)
    }

    const url = args[0]
    if (!url) return m.reply('🍒 Ingrese un enlace de *Instagram*.')
    if (!url.match(/instagram\.com\/(p|reel|share|tv|reels)\//)) {
      await m.react('❌')
      return m.reply('🌽 El enlace no es válido.')
    }

    await m.react('⏳')

    try {
      // --- 🚀 MÉTODO 1: API INTERNA + PROXY SOAX ---
      const shortcode = url.match(/(?:reels?|p|tv|s|share)\/([a-zA-Z0-9_-]+)/)[1]
      const headers = {
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'X-IG-App-ID': '124024574287414'
      }

      // Handshake (qe/sync) para evitar el bloqueo 403
      await fetch('https://i.instagram.com/api/v1/qe/sync/', { agent, headers })

      const res = await fetch(`https://i.instagram.com/api/v1/media/${shortcode}/info/`, { agent, headers })
      const data = await res.json()
      
      const item = data.items?.[0]
      if (item) {
        const videoUrl = item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url
        const type = item.media_type === 2 ? 'video' : 'image'
        
        await m.react('✅')
        return await client.sendMessage(m.chat, { 
          [type]: { url: videoUrl }, 
          caption: `ㅤ۟∩　ׅ　★ ໌　ׅ　🅘𝖦 🅓ownload　ׄᰙ`,
          fileName: `ig.${type === 'video' ? 'mp4' : 'jpg'}` 
        }, { quoted: m })
      }

      throw new Error("Proxy Fallido")

    } catch (e) {
      // --- 🛠️ MÉTODO 2: FALLBACK (HIKER O NEXEVO) ---
      try {
        const fallback = await fetch(`https://nexevo.onrender.com/download/instagram?url=${encodeURIComponent(url)}`)
        const json = await fallback.json()

        if (json.status && json.result?.dl) {
          await m.react('✅')
          return await client.sendMessage(m.chat, { 
            video: { url: json.result.dl }, 
            caption: `ㅤ۟∩　ׅ　★ ໌　ׅ　🅘𝖦 🅓ownload　ׄᰙ` 
          }, { quoted: m })
        }
      } catch (err) {
        await m.react('❌')
        return client.reply(m.chat, '🌽 No se pudo obtener el contenido después de varios intentos.', m)
      }
    }
  }
}
