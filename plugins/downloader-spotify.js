import axios from 'axios';

export default {
  command: ['spotify'],
  category: 'downloader',
  run: async ({ client, m, text }) => { 
    // ⚠️ Importante: Cambié 'conn' por 'client' en los envíos de mensaje, 
    // ya que 'client' es la variable que declaraste arriba en los parámetros.

    if (!text) return m.reply(`✎ Ingresa el nombre de una canción o una URL de Spotify.`);

    try {
      let songUrl;
      
      // Detección más amplia para cualquier tipo de URL de Spotify
      const isSpotifyUrl = text.match(/spotify\.com|spotify\.link/i);
      
      if (isSpotifyUrl) {
        // Extraemos solo la URL limpia por si el texto tiene otras palabras
        songUrl = text.match(/(https?:\/\/[^\s]+)/)[0];
      } else {
        const results = await spotifyxv(text);
        if (!results.length) return m.reply('❌ No se encontró la canción.');
        songUrl = results[0].url;
      }

      await m.reply('*[⏳] Procesando audio...*');

      // 1. Intentar descarga con la API de apicausas
      const apiKey = "causa-0e3eacf90ab7be15";
      const downloadApi = `https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodeURIComponent(songUrl)}`;
      
      let downloadUrl = null;
      let songTitle = 'audio_spotify';

      try {
        const { data: dlRes } = await axios.get(downloadApi);
        if (dlRes?.status && dlRes?.resultado) {
            downloadUrl = dlRes.resultado.url;
            songTitle = dlRes.resultado.titulo || songTitle;
        }
      } catch (e) {
        console.error('Error en API apicausas:', e.message);
      }

      // 2. Fallback a tu API original si la primera falla
      if (!downloadUrl) {
         // Aseguramos que 'api' no cause un crash si no está definida en este archivo
         if (typeof api === 'undefined') throw new Error('API Keys no definidas globalmente.');
         
         const res = await axios.get(`${api.url}/dl/spotify?url=${songUrl}&key=${api.key}`);
         const data = res.data?.data;
         
         if (!data || !data.download) return m.reply('✦ No se pudo obtener el enlace de descarga.');
         
         downloadUrl = data.download;
         songTitle = data.title || songTitle;
      }

      // 3. Envío directo del audio
      // Se eliminó el bloque de información y la firma para un diseño más limpio
      await client.sendMessage(m.chat, {
        audio: { url: downloadUrl },
        ptt: true, // Si quieres que se envíe como archivo de música normal en lugar de nota de voz, cambia esto a 'false'
        fileName: `${songTitle.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
        mimetype: 'audio/mpeg'
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      // Evitamos usar variables no definidas (como msgglobal) en el catch para no generar un doble crash
      await m.reply(`❌ Ocurrió un error inesperado al descargar la canción.`);
    }
  }
}

async function spotifyxv(query) {
  // Ajuste para soportar entornos donde 'api' no se importa directamente en este archivo
  const isApiDefined = typeof api !== 'undefined';
  
  // Usamos tu API original si está definida, sino un fallback público temporal para evitar crashes
  const apiUrl = isApiDefined 
    ? `${api.url}/search/spotify?query=${encodeURIComponent(query)}&key=${api.key}` 
    : `https://api.vreden.my.id/api/spotifysearch?query=${encodeURIComponent(query)}`;
  
  const res = await axios.get(apiUrl);
  
  // Adaptado para leer resultados de múltiples formatos de API (data o result)
  const data = res.data?.data || res.data?.result;
  
  if (!data || !data.length) return [];

  const firstTrack = data[0];

  return [{
    name: firstTrack.title,
    artista: [firstTrack.artist],
    album: firstTrack.album,
    duracion: firstTrack.duration,
    url: firstTrack.url || firstTrack.link,
    imagen: firstTrack.image || ''
  }];
}
