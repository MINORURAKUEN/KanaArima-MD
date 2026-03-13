import axios from 'axios';
import crypto from 'crypto';

// --- NÚCLEO LÓGICO (SCRAPER OGMP3) ---
const ogmp3 = {
  api: {
    base: "https://api3.apiapi.lat",
    endpoints: ["https://api5.apiapi.lat", "https://api.apiapi.lat", "https://api3.apiapi.lat"]
  },
  headers: {
    'authority': 'api.apiapi.lat',
    'content-type': 'application/json',
    'origin': 'https://ogmp3.lat',
    'referer': 'https://ogmp3.lat/',
    'user-agent': 'Postify/1.0.0'
  },
  utils: {
    // Genera hash aleatorio para los endpoints
    hash: () => crypto.randomBytes(16).toString('hex'),
    // Cifrado XOR simple para el ID del video
    encoded: (str) => str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 1)).join(''),
    // Revierte la URL y la convierte en códigos ASCII
    enc_url: (url) => url.split('').map(c => c.charCodeAt(0)).reverse().join(',')
  },
  isUrl: (str) => {
    return /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(str);
  },
  ytId: (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=)|youtube\.com\/shorts\/)([^#&?]*).*/);
    return (match && match[1].length === 11) ? match[1] : null;
  },
  async request(endpoint, data = {}) {
    const base = this.api.endpoints[Math.floor(Math.random() * this.api.endpoints.length)];
    try {
      const res = await axios.post(`${base}${endpoint}`, data, { headers: this.headers });
      return { status: true, data: res.data };
    } catch (e) {
      return { status: false, error: e.message };
    }
  },
  async download(link, type = 'video', quality) {
    const id = this.ytId(link);
    if (!id) return { status: false, error: "Link inválido" };

    const q = quality || (type === 'audio' ? '320' : '720');
    let retries = 0;

    while (retries < 15) {
      retries++;
      const c = this.utils.hash();
      const d = this.utils.hash();
      
      const payload = {
        data: this.utils.encoded(link),
        format: type === 'audio' ? "0" : "1",
        mp3Quality: type === 'audio' ? q : null,
        mp4Quality: type === 'video' ? q : null,
        userTimeZone: "-300"
      };

      // Paso 1: Inicializar la conversión
      const res = await this.request(`/${c}/init/${this.utils.enc_url(link)}/${d}/`, payload);
      if (!res.status) continue;

      let data = res.data;

      // Paso 2: Polling (Esperar a que el servidor termine)
      if (data.s === "P" || !data.s) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 1500));
          const check = await this.request(`/${this.utils.hash()}/status/${this.utils.encoded(data.i)}/${this.utils.hash()}/`, { data: data.i });
          if (check.status && check.data.s === "C") {
            data = check.data;
            break;
          }
        }
      }

      // Paso 3: Retornar resultado final
      if (data.s === "C") {
        return {
          status: true,
          title: data.t || "YouTube Media",
          id: id,
          quality: q,
          thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          download: `${this.api.base}/${this.utils.hash()}/download/${this.utils.encoded(data.i)}/${this.utils.hash()}/`
        };
      }
    }
    return { status: false, error: "No se pudo procesar la descarga." };
  }
};

// --- COMANDO PARA EL BOT ---
export const run = {
  usage: ['ytmp3', 'ytmp4'],
  hidden: ['yta', 'ytv'],
  use: 'link',
  category: 'downloader',
  async: async (m, { client, args, isPrefix, command, users, Config, Utils }) => {
    try {
      const url = args[0];
      if (!url || !ogmp3.isUrl(url)) {
        return client.reply(m.chat, `⚠️ Ingresa un link de YouTube.\n\nEjemplo: ${isPrefix + command} https://youtu.be/dQw4w9WgXcQ`, m);
      }

      client.sendReact(m.chat, '🕒', m.key);

      const isAudio = /yt?(a|mp3)/i.test(command);
      const type = isAudio ? 'audio' : 'video';
      
      // Llamada al scraper interno
      const result = await ogmp3.download(url, type);

      if (!result.status) return client.reply(m.chat, `❌ Error: ${result.error}`, m);

      // Formatear caption
      let caption = `乂  *Y T - ${type.toUpperCase()}*\n\n`;
      caption += `	◦  *Título* : ${result.title}\n`;
      caption += `	◦  *Calidad* : ${result.quality}${isAudio ? 'kbps' : 'p'}\n`;
      caption += `	◦  *Canal* : YouTube\n\n`;
      caption += global.footer;

      // Enviar previsualización
      await client.sendMessageModify(m.chat, caption, m, {
        largeThumb: true,
        thumbnail: await Utils.fetchAsBuffer(result.thumbnail)
      });

      // Enviar el archivo final
      return client.sendFile(m.chat, result.download, `${result.title}.${isAudio ? 'mp3' : 'mp4'}`, '', m, {
        document: isAudio,
        mimetype: isAudio ? 'audio/mpeg' : 'video/mp4'
      });

    } catch (e) {
      console.error(e);
      return client.reply(m.chat, `❌ Error crítico: ${e.message}`, m);
    }
  },
  limit: true
};

