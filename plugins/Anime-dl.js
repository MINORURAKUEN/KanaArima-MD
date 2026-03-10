const searchAnime = require('./anime-plugin'); // Tu archivo del plugin

// ... dentro de tu manejador de mensajes (ej. client.on o messages.upsert)
const messageText = text.trim();

// 1. Definimos las Regex (Aceptan prefijos opcionales . ! ? o ninguno)
const regexSub = /^[\.! \?]?descargaranimeSub\s+(.+)/i;
const regexLat = /^[\.! \?]?descargaranimeLat\s+(.+)/i;

// 2. Lógica para Subtitulado
if (regexSub.test(messageText)) {
    const query = messageText.match(regexSub)[1];
    await sock.sendMessage(jid, { text: `🔍 Buscando subtitulado: ${query}...` });
    
    const res = await searchAnime(query, 'sub');
    await enviarResultado(res, jid);
} 

// 3. Lógica para Latino
else if (regexLat.test(messageText)) {
    const query = messageText.match(regexLat)[1];
    await sock.sendMessage(jid, { text: `🎙️ Buscando en latino: ${query}...` });
    
    const res = await searchAnime(query, 'latino');
    await enviarResultado(res, jid);
}

// Función auxiliar para enviar la respuesta
async function enviarResultado(res, jid) {
    if (typeof res === 'string') {
        await sock.sendMessage(jid, { text: res });
    } else {
        const imageUrl = res.image.startsWith('http') ? res.image : `https://tioanime.com${res.image}`;
        await sock.sendMessage(jid, { 
            image: { url: imageUrl }, 
            caption: res.text 
        });
    }
}
