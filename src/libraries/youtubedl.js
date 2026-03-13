import axios from 'axios';
import crypto from 'crypto';

/**
 * Lógica del Scraper OGMP3
 * Maneja cifrado, bypass de restricciones y polling de estado
 */
const ogmp3 = {
   api: {
      base: "https://api3.apiapi.lat",
      endpoints: ["https://api5.apiapi.lat", "https://api.apiapi.lat", "https://api3.apiapi.lat"]
   },
   headers: {
      'authority': 'api.apiapi.lat',
      'accept': 'application/json',
      'origin': 'https://ogmp3.lat',
      'referer': 'https://ogmp3.lat/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
   },
   utils: {
      hash: () => crypto.randomBytes(16).toString('hex'),
      encoded: (str) => str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 1)).join(''),
      enc_url: (url) => url.split('').map(c => c.charCodeAt(0)).reverse().join(',')
   },
   ytId: (url) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=)|youtube\.com\/shorts\/)([^#&?]*).*/);
      return (match && match[1].length === 11) ? match[1] : null;
   },
   async download(link, type = 'video') {
      const id = this.ytId(link);
      const q = type === 'audio' ? '320' : '720';
      const baseApi = this.api.endpoints[Math.floor(Math.random() * this.api.endpoints.length)];
      
      try {
         const c = this.utils.hash(), d = this.utils.hash();
         const res = await axios.post(`${baseApi}/${c}/init/${this.utils.enc_url(link)}/${d}/`, {
            data: this.utils.encoded(link),
            format: type === 'audio' ? "0" : "1",
            mp3Quality: type === 'audio' ? q : null,
            mp4Quality: type === 'video' ? q : null,
            userTimeZone: "-300"
         }, { headers: this.headers });

         let data = res.data;

         // Sistema de Polling (Espera activa hasta que el archivo esté listo)
         if (data.s === "P" || !data.s) {
            for (let i = 0; i < 20; i++) {
               await new Promise(r => setTimeout(r, 2000));
               const check = await axios.post(`${baseApi}/${this.utils.hash()}/status/${this.utils.encoded(data.i)}/${this.utils.hash()}/`, { data: data.i }, { headers: this.headers });
               if (check.data.s === "C") { 
                  data = check.data; 
                  break; 
               }
            }
         }

         if (data.s !== "C") return { status: false, error: "El video es muy largo o el servidor no respondió." };

         return {
            status: true,
            title: data.t || "YouTube Media",
            quality: q,
            thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
            url: `${this.api.base}/${this.utils.hash()}/download/${this.utils.encoded(data.i)}/${this.utils.hash()}/`
         };
      } catch (e) { 
         return { status: false, error: e.message }; 
      }
   }
};

/**
 * Configuración del Comando para el Bot
 */
export const run = {
   usage: ['ytmp3', 'ytmp4', 'yta', 'ytv'],
   use: 'link',
   category: 'downloader',
   async: async (m, { client, args, isPrefix, command, Utils, Config }) => {
      try {
         // Validar link
         const url = args[0];
         if (!url || !ogmp3.ytId(url)) {
            return client.reply(m.chat, `⚠️ Modo de uso:\n${isPrefix + command} https://youtu.be/dQw4w9WgXcQ`, m);
         }

         // Reacción de espera
         await client.sendReact(m.chat, '🕒', m.key);

         // Identificar si el usuario quiere audio o video
         const isAudio = /mp3|yta/i.test(command);
         const type = isAudio ? 'audio' : 'video';

         // Obtener descarga
         const result = await ogmp3.download(url, type);

         if (!result.status) {
            return client.reply(m.chat, `❌ Error: ${result.error}`, m);
         }

         // Mensaje de información
         let caption = `乂  *Y O U T U B E  D L*\n\n`;
         caption += `	◦  *Título* : ${result.title}\n`;
         caption += `	◦  *Calidad* : ${result.quality}${isAudio ? 'kbps' : 'p'}\n`;
         caption += `	◦  *Formato* : ${type.toUpperCase()}\n\n`;
         caption += global.footer || '© Causas API';

         // Enviar miniatura con información del video
         await client.sendMessageModify(m.chat, caption, m, {
            largeThumb: true,
            thumbnail: await Utils.fetchAsBuffer(result.thumbnail)
         });

         // Enviar el archivo final (Audio como documento, Video como multimedia)
         return client.sendFile(m.chat, result.url, `${result.title}.${isAudio ? 'mp3' : 'mp4'}`, '', m, {
            document: isAudio,
            mimetype: isAudio ? 'audio/mpeg' : 'video/mp4'
         });

      } catch (e) {
         console.error(e);
         return client.reply(m.chat, `❌ Ocurrió un fallo inesperado.`, m);
      }
   },
   error: false,
   limit: true
};

