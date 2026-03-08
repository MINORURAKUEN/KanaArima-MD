import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Upload file to Telegra.ph (Primary) or Pomf2 (Fallback)
 * Libres de bloqueos para APIs de GataBot/Mystic
 * @param {Buffer} buffer File Buffer
 * @return {Promise<string>}
 */
export default async (buffer) => {
  const { ext, mime } = await fileTypeFromBuffer(buffer);
  
  // 1️⃣ PRIMER INTENTO: Telegra.ph (Muy rápido y sin bloqueos)
  try {
    const form = new FormData();
    // Compatibilidad con tu versión de buffer
    const bufferData = buffer.toArrayBuffer ? buffer.toArrayBuffer() : buffer;
    const blob = new Blob([bufferData], { type: mime });
    
    form.append('file', blob, 'tmp.' + ext);

    const res = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: form,
    });
    
    const json = await res.json();
    
    if (json && json[0] && json[0].src) {
      return 'https://telegra.ph' + json[0].src;
    }
    
    throw new Error('Telegra.ph no devolvió el enlace');

  } catch (error) {
    console.log('[uploadImage] Telegra.ph falló, intentando con Pomf2...');
    
    // 2️⃣ SEGUNDO INTENTO: Pomf2 (Respaldo si Telegram se cae)
    try {
      const form2 = new FormData();
      const bufferData2 = buffer.toArrayBuffer ? buffer.toArrayBuffer() : buffer;
      const blob2 = new Blob([bufferData2], { type: mime });
      
      // Pomf2 exige que el campo se llame 'files[]'
      form2.append('files[]', blob2, 'tmp.' + ext);

      const res2 = await fetch('https://pomf2.lain.la/upload.php', {
        method: 'POST',
        body: form2,
      });
      
      const json2 = await res2.json();
      
      if (json2 && json2.success && json2.files && json2.files[0].url) {
        return json2.files[0].url;
      }
      
      throw new Error('Pomf2 falló');

    } catch (err2) {
      console.error('[uploadImage] Error fatal, no se pudo subir a ningún servidor:', err2.message);
      throw new Error('Fallo general al subir la imagen a la nube.');
    }
  }
};
