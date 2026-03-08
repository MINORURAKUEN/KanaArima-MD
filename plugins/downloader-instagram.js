import axios from "axios";
import fs from "fs";

const handler = async (m, { conn, args, command, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  
  // Sistema de traducción
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.descargas_instagram;
  } catch {
    tradutor = { texto1: '✨ Ingrese un enlace de Instagram válido.' };
  }

  const url = args[0];
  if (!url) throw `${tradutor.texto1} \n\n*Ejemplo:*\n_${usedPrefix + command} https://www.instagram.com/reel/C8sWV3Nx_GZ/`;

  // Feedback visual
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });

  try {
    // MÉTODO 1: Scraper de Publer (Muy robusto)
    const img = await instagramDownload(url);
    
    if (img.status && img.data.length > 0) {
      await sendMedia(conn, m, img.data);
    } else {
      throw new Error("Fallo método principal");
    }

  } catch (err) {
    try {
      // MÉTODO 2: Respaldo con Delirius API
      const res = await axios.get(`${global.BASE_API_DELIRIUS}/download/instagram`, { 
        params: { url: url } 
      });
      const result = res.data.data;
      
      if (result && result.length > 0) {
        await sendMedia(conn, m, result);
      } else {
        throw new Error("Fallo método de respaldo");
      }
    } catch (finalErr) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('❌ No se pudo obtener el contenido. Asegúrate de que el enlace sea público.');
    }
  }
};

// Función auxiliar para enviar medios con la fuente KanaArima-MD
async function sendMedia(conn, m, data) {
  const limit = 5; // Evitar spam de carruseles largos
  const items = data.slice(0, limit);

  for (const item of items) {
    const isVideo = item.type === "video";
    const caption = `✅ *CONTENIDO DESCARGADO*\n*Fuente:* KanaArima-MD`;

    await conn.sendMessage(m.chat, { 
      [isVideo ? "video" : "image"]: { url: item.url },
      caption: caption,
      mimetype: isVideo ? "video/mp4" : "image/jpeg"
    }, { quoted: m });

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
}

// Configuración de comandos solicitada
handler.command = /^(instagram|ig)$/i;
handler.limit = false; // Gratis, sin diamantes

export default handler;

// Scraper Publer.io unificado
const instagramDownload = async (url) => {
  return new Promise(async (resolve) => {
    if (!url.match(/\/(reel|reels|p|stories|tv|s)\/[a-zA-Z0-9_-]+/i)) {
      return resolve({ status: false });
    }

    try {
      const headers = {
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://publer.io",
        "Referer": "https://publer.io/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      };

      let jobId = await (await axios.post("https://app.publer.io/hooks/media", { url, iphone: false }, { headers })).data.job_id;
      
      let status = "working";
      let jobStatusResponse;
      
      // Polling para esperar a que el video esté listo
      while (status !== "complete") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        jobStatusResponse = await axios.get(`https://app.publer.io/api/v1/job_status/${jobId}`, { headers });
        status = jobStatusResponse.data.status;
        if (status === "failed") return resolve({ status: false });
      }

      let data = jobStatusResponse.data.payload.map((item) => ({
        type: item.type === "photo" ? "image" : "video",
        url: item.path,
      }));

      resolve({ status: true, data });
    } catch (e) {
      resolve({ status: false, msg: e.message });
    }
  });
};
                         
