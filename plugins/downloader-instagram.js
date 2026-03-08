import axios from "axios";
import fs from "fs";

// Función para pausar la ejecución
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handler = async (m, { conn, args, command, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.descargas_instagram;

  if (!args[0]) throw `${tradutor.texto1} _${usedPrefix + command} https://www.instagram.com/reel/...`;

  try {
    const img = await instagramDownload(args[0]);
    if (!img.status || !img.data.length) throw new Error("Fallo método principal");

    for (const item of img.data) {
      const type = item.type === "image" ? "image" : "video";
      await conn.sendMessage(m.chat, { [type]: { url: item.url } }, { quoted: m });
    }
  } catch (err) {
    try {
      // Fallback a API secundaria
      const res = await axios.get(`${global.BASE_API_DELIRIUS}/download/instagram`, { params: { url: args[0] }});
      const result = res.data.data;
      for (const item of result) {
        const type = item.type === "image" ? "image" : "video";
        await conn.sendMessage(m.chat, { [type]: { url: item.url } }, { quoted: m });
      }
    } catch (e) {
      throw `❌ No se pudo descargar el contenido. Intenta de nuevo más tarde.`;
    }
  }
};

handler.command = /^(instagramdl|instagram|igdl|ig)$/i;
export default handler;

async function instagramDownload(url) {
  if (!url.match(/\/(reel|reels|p|stories|tv|s)\/[a-zA-Z0-9_-]+/i)) {
    return { status: false, msg: "URL Inválida" };
  }

  try {
    const { data: jobData } = await axios.post("https://app.publer.io/hooks/media", { url, iphone: false });
    const jobId = jobData.job_id;
    
    let status = "working";
    let jobStatusResponse;
    let attempts = 0;

    // Bucle con límite de 15 intentos (aprox 22 segundos)
    while (status !== "complete" && attempts < 15) {
      await delay(1500); // Espera 1.5 segundos entre cada consulta
      jobStatusResponse = await axios.get(`https://app.publer.io/api/v1/job_status/${jobId}`);
      status = jobStatusResponse.data.status;
      attempts++;
    }

    if (status !== "complete") return { status: false };

    const data = jobStatusResponse.data.payload.map((item) => ({
      type: item.type === "photo" ? "image" : "video",
      url: item.path,
    }));

    return { status: true, data };
  } catch (e) {
    return { status: false, msg: e.message };
  }
}
