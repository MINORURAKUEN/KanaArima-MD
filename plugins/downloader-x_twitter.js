import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import * as cheerio from 'cheerio';

let enviando = false;

const handler = async (m, {conn, text, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.downloader_x_twitter;

  if (!text) throw `${tradutor.texto1} ${usedPrefix + command} https://twitter.com/auronplay/status/1586487664274206720?s=20&t=3snvkvwGUIez5iWYQAehpw`;
  if (enviando) return;
  enviando = true;

  try {
    await conn.sendMessage(m.chat, {text: global.wait}, {quoted: m}); 
    
    // Instanciamos el nuevo scraper
    const scraper = new TwitterDL();
    const res = await scraper.download(text); 
    
    if (!res || !res.downloads || res.downloads.length === 0) {
        enviando = false;
        throw tradutor.texto4 || "No se encontraron medios para descargar.";
    }

    const caption = res.title ? res.title : tradutor.texto2;
    
    // Verificamos si es un video comprobando si alguna URL contiene .mp4
    const isVideo = res.downloads.some(d => d.url.includes('.mp4'));

    if (isVideo) {
      // Si es video, SSSTwitter devuelve varias calidades. Elegimos la primera (suele ser la mejor/HD)
      const videoData = res.downloads.find(d => d.url.includes('.mp4')) || res.downloads[0];
      await conn.sendMessage(m.chat, {video: {url: videoData.url}, caption: caption}, {quoted: m});
      
    } else {
      // Si es foto, iteramos (por si es un hilo/carrusel de varias imágenes)
      for (let i = 0; i < res.downloads.length; i++) {
        // Solo enviamos el caption en la primera imagen para no hacer spam de texto
        const imgCaption = i === 0 ? caption : ''; 
        await conn.sendMessage(m.chat, {image: {url: res.downloads[i].url}, caption: imgCaption}, {quoted: m});
      }
    }
    
    enviando = false;
  } catch (e) {
    enviando = false;
    throw tradutor.texto3;
  }
};    

// 👇 AQUÍ ESTÁ EL CAMBIO: Ahora responde exactamente a "twitter" o "x" ignorando mayúsculas/minúsculas
handler.command = /^(twitter|x)$/i;
export default handler;

// ==========================================
// CLASE SCRAPER SSSTWITTER
// ==========================================
class TwitterDL {
    constructor() {
        this.client = axios.create({
            baseURL: 'https://ssstwitter.com',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Origin': 'https://ssstwitter.com',
                'Referer': 'https://ssstwitter.com/en-11'
            }
        });
    }

    async getToken() {
        const r = await this.client.get('/en-11');
        const $ = cheerio.load(r.data);
        const f = $('form[data-hx-post]');
        const v = f.attr('include-vals');
        const m = v.match(/tt:'([^']+)',ts:(\d+),source:'([^']+)'/);
        return { tt: m[1], ts: parseInt(m[2]), source: m[3] };
    }

    async download(url) {
        const t = await this.getToken();
        const fd = new FormData();
        fd.append('id', url);
        fd.append('locale', 'en');
        fd.append('tt', t.tt);
        fd.append('ts', t.ts.toString());
        fd.append('source', t.source);
        const h = {
            'HX-Request': 'true',
            'HX-Current-URL': 'https://ssstwitter.com/en-11',
            'HX-Target': 'target',
            ...fd.getHeaders()
        };
        const r = await this.client.post('/', fd, { headers: h });
        return this.parseLinks(r.data);
    }

    parseLinks(html) {
        const $ = cheerio.load(html);
        const links = [];
        $('.download-btn').each((i, b) => {
            const u = $(b).attr('href') || $(b).attr('data-directurl');
            const txt = $(b).text().trim();
            const q = txt.match(/(\d+x\d+)/)?.[1] || this.getQ(txt);
            if (u && u.startsWith('http')) {
                links.push({ quality: q, url: u });
            }
        });
        const title = $('.result-title').text().trim();
        const thumb = $('.result-thumbnail img').attr('src');
        return { 
            title: title || 'X Downloader', 
            thumbnail: thumb || '', 
            downloads: links 
        };
    }

    getQ(txt) {
        if (txt.includes('HD')) return 'HD';
        const resolutions = ['640x640', '540x540', '320x320'];
        for (const res of resolutions) {
            if (txt.includes(res)) return res;
        }
        return txt.match(/\d+x\d+/)?.[0] || 'Unknown';
    }
}
