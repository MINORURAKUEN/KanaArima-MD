import axios from 'axios';

export default {
  command: ['spotify', 'Spotify', 'music'], // Soporte para mayúsculas
  category: 'downloader',
  run: async ({ client, m, text }) => {
    
    // Rastro en la consola para confirmar que el comando se lee
    console.log('[SPOTIFY] Comando detectado. Texto:', text);

    if (!text) return m.reply(`✎ Ingresa el nombre de una canción o una URL de Spotify.`);

    try {
      let songUrl;
      const isSpotifyUrl = text.match(/spotify\.com|spotify\.link/i);
      
      if (isSpotifyUrl) {
        songUrl = text.match(/(https?:\/\/[^\s]+)/)[0];
      } else {
        await m.reply('*[⏳] Buscando...*');
        // Búsqueda directa sin depender de la variable global 'api'
        const searchRes = await axios.get(`https://api.vreden.my.id/api/spotifysearch?query=${encodeURIComponent(text)}`);
        const searchData = searchRes.data?.result;
        
        if (!searchData || !searchData.length) return m.reply('❌ No se encontró la canción.');
        songUrl = searchData[0].url || searchData[0].link;
      }

      console.log('[SPOTIFY] URL de la canción:', songUrl);

      // Descarga directa con tu API Key
      const apiKey = "causa-0e3eacf90ab7be15";
      const downloadApi = `https://rest.apicausas.xyz/api/v1/descargas/spotify?apikey=${apiKey}&url=${encodeURIComponent(songUrl)}`;
      
      const { data: dlRes } = await axios.get(downloadApi);
      
      if (!dlRes?.status || !dlRes?.resultado?.url) {
          throw new Error('La API no devolvió el audio.');
      }

      const downloadUrl = dlRes.resultado.url;
      const songTitle = dlRes.resultado.titulo || 'audio_spotify';

      console.log('[SPOTIFY] Descargando y enviando audio...');

      // Envío limpio, solo el audio
      await client.sendMessage(m.chat, {
        audio: { url: downloadUrl },
        ptt: true,
        fileName: `${songTitle.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
        mimetype: 'audio/mpeg'
      }, { quoted: m });

      console.log('[SPOTIFY] Completado.');

    } catch (e) {
      console.error('[SPOTIFY ERROR]', e);
      await m.reply(`❌ Ocurrió un error al procesar la canción.`);
    }
  }
}
