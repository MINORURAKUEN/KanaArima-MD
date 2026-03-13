import yts from 'yt-search'
import fetch from 'node-fetch'

export const run = {
   usage: ['play', 'video', 'ytmp3', 'ytmp4'],
   hidden: ['play2', 'playvid', 'playvideo', 'yta', 'ytv'],
   use: 'query / link',
   category: 'downloader',
   async: async (m, { client, text, isPrefix, command, Config, users, Utils }) => {
      try {
         // 1. Validación de entrada
         if (!text) return client.reply(m.chat, Utils.example(isPrefix, command, 'lathi'), m)
         
         await client.sendReact(m.chat, '🕒', m.key)

         // 2. Búsqueda o detección de URL
         const isUrl = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(text)
         const search = await yts(isUrl ? text : text)
         const video = search.videos[0]
         if (!video) return client.reply(m.chat, '❌ No se encontró el video.', m)

         // 3. Determinar tipo de descarga (Audio o Video)
         const isVideo = /video|mp4|play2|playvid/i.test(command)
         const type = isVideo ? 'video' : 'audio'
         const apikey = "causa-0e3eacf90ab7be15"

         // 4. Llamada a la API de Apicausa
         const apiUrl = `https://rest.apicausas.xyz/api/v1/descargas/youtube?apikey=${apikey}&url=${encodeURIComponent(video.url)}&type=${type}`
         const res = await fetch(apiUrl)
         const json = await res.json()

         if (!json.status) return client.reply(m.chat, Utils.jsonFormat(json), m)

         // 5. Preparar datos de descarga (Compatibilidad con diferentes estructuras de JSON)
         const result = json.result || json.data
         const downloadUrl = result.url || result.download_url || result.download
         const size = result.size || '0 MB'

         // 6. Validación de límites de tamaño (Free vs Premium)
         const chSize = Utils.sizeLimit(size, users.premium ? Config.max_upload : Config.max_upload_free)
         const isOver = users.premium 
            ? `💀 El tamaño del archivo (${size}) excede el límite máximo permitido.` 
            : `⚠️ El archivo pesa ${size}. Los usuarios gratuitos solo pueden descargar hasta ${Config.max_upload_free} MB. ¡Hazte premium para subir el límite a ${Config.max_upload} MB!`
         
         if (chSize.oversize) return client.reply(m.chat, isOver, m)

         // 7. Caption informativo
         let caption = `乂  *Y T - ${type.toUpperCase()}*\n\n`
         caption += `	◦  *Título* : ${video.title}\n`
         caption += `	◦  *Tamaño* : ${size}\n`
         caption += `	◦  *Duración* : ${video.timestamp}\n`
         caption += `	◦  *Canal* : ${video.author.name}\n\n`
         caption += global.footer

         // 8. Envío del archivo
         const fileName = `${video.title}.${isVideo ? 'mp4' : 'mp3'}`
         const mime = isVideo ? 'video/mp4' : 'audio/mpeg'
         let isSize = size.replace(/[^0-9.]/g, '').trim()

         // Si pesa más de 99MB o es audio, lo mandamos como documento para mayor estabilidad
         if (parseFloat(isSize) > 99 || !isVideo) {
            await client.sendMessageModify(m.chat, caption, m, {
               largeThumb: true,
               thumbnail: await Utils.fetchAsBuffer(video.thumbnail)
            })
            
            return client.sendFile(m.chat, downloadUrl, fileName, '', m, {
               document: true,
               APIC: await Utils.fetchAsBuffer(video.thumbnail)
            }, {
               jpegThumbnail: await Utils.generateImageThumbnail(video.thumbnail)
            })
         }

         // Envío normal para videos ligeros
         client.sendFile(m.chat, downloadUrl, fileName, caption, m)

      } catch (e) {
         console.error(e)
         client.reply(m.chat, Utils.jsonFormat(e), m)
      }
   },
   error: false,
   limit: true,
   restrict: true
                }

