import fetch from 'node-fetch';
import FormData from 'form-data'; // ⚠️ Asegúrate de tener instalado este paquete: npm i form-data
import { fileTypeFromBuffer } from 'file-type';

/**
 * Upload file to Catbox (Primary) or Tmpfiles (Fallback)
 * Optimizados para evitar bloqueos en bots
 * @param {Buffer} buffer File Buffer
 * @return {Promise<string>}
 */
export default async (buffer) => {
  try {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' };
    
    // 1️⃣ PRIMER INTENTO: Catbox.moe (Muy estable y sin límites estrictos)
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, `tmp.${ext}`);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(), // Vital para que node-fetch entienda el FormData clásico
    });
    
    if (!res.ok) throw new Error(`Catbox HTTP Error: ${res.status}`);
    
    // Catbox devuelve la URL directamente en formato de texto
    const url = await res.text(); 
    if (url.startsWith('http')) return url.trim();
    
    throw new Error('Catbox no devolvió un enlace válido');

  } catch (error) {
    console.log('[uploadImage] Catbox falló, intentando con tmpfiles.org...', error.message);
    
    // 2️⃣ SEGUNDO INTENTO: tmpfiles.org (Respaldo confiable de 60 minutos)
    try {
      const form2 = new FormData();
      form2.append('file', buffer, 'tmp.jpg'); 

      const res2 = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: form2,
        headers: form2.getHeaders(),
      });
      
      const json2 = await res2.json();
      
      if (json2 && json2.status === 'success') {
        // Tmpfiles devuelve una URL de visor, le agregamos /dl/ para obtener la imagen directa
        return json2.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
      
      throw new Error('Tmpfiles no devolvió una respuesta exitosa');

    } catch (err2) {
      console.error('[uploadImage] Error fatal, no se pudo subir a ningún servidor:', err2.message);
      throw 'Fallo general al subir la imagen a la nube.'; // Lanzamos string para que el catch del comando lo lea limpio
    }
  }
};

