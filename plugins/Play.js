import yts from 'yt-search'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client
    let query = text || args.join(' ')
    
    if (!query) return socket.sendMessage(m.chat, { text: `《✧》 Escribe el nombre o URL del video.` }, { quoted: m })

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')

    try {
        const search = await yts(query)
        const video = search.videos[0]
        if (!video) throw new Error('No se encontró ningún video.')

        // --- CONFIGURACIÓN DE FORMATO Y TIPO ---
        const isVideo = /play2|mp4|video|ytmp4|ytmp4doc/.test(command)
        const isDoc = /doc|documento|ytmp3doc|ytmp4doc/.test(command)
        const type = isVideo ? 'video' : 'audio'
        
        // Limpieza de caracteres prohibidos para nombres de archivo en WhatsApp
        const cleanTitle = video.title.replace(/[\\/:*?"<>|]/g, '')
        
        const caption = `╭━━━〔 🎵 YOUTUBE ${type.toUpperCase()} 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ ⏱ *Duración:* ${video.timestamp}
┃ 👀 *Vistas:* ${video.views.toLocaleString()}
┃ 👤 *Canal:* ${video.author.name}
┃ 🔗 *Link:* ${video.url}
╰━━━━━━━━━━━━━━━━⬣`.trim()

        // Enviar miniatura e info
        await socket.sendMessage(m.chat, { image: { url: video.thumbnail }, caption }, { quoted: m })
        await socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        let downloadUrl = null
        let metodo = ""

        // 1. INTENTO CON API RESTCAUSAS (Prioridad)
        try {
            const apiRes = await fetch(`https://rest.apicausas.xyz/api/v1/descargas/youtube?url=${encodeURIComponent(video.url)}&apikey=causa-0e3eacf90ab7be15`)
            const json = await apiRes.json()
            // Buscamos el link en las posibles estructuras de respuesta
            downloadUrl = json.result?.download || json.result?.url || json.data?.url || json.url
            if (downloadUrl) metodo = `Descargado vía: *RestCausas API* ✅`
        } catch (e) {
            console.log("Error API RestCausas:", e.message)
        }

        // --- FUNCIÓN INTERNA PARA ENVIAR EL ARCHIVO ---
        const sendFile = async (source) => {
            const ext = isVideo ? 'mp4' : 'mp3'
            const fileName = `${cleanTitle}.${ext}`
            const mimetype = isVideo ? 'video/mp4
                
