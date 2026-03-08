const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();
const KUDASAI_RSS = 'https://somoskudasai.com/feed/';
const CONFIG_FILE = './config_rss.json';

// Función para leer/escribir configuración
const getConfig = () => JSON.parse(fs.readFileSync(CONFIG_FILE));
const setConfig = (data) => fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));

// --- DENTRO DE TU MANEJADOR DE MENSAJES ---
const command = body.split(' ')[0].toLowerCase(); // Ejemplo: .rss

switch (command) {
    case '.rss':
        const action = body.split(' ')[1]; // on u off
        let config = getConfig();
        
        if (action === 'on') {
            config.rss_enabled = true;
            setConfig(config);
            await sock.sendMessage(m.chat, { text: "✅ Notificaciones de Kudasai: *ACTIVADAS*" });
        } else if (action === 'off') {
            config.rss_enabled = false;
            setConfig(config);
            await sock.sendMessage(m.chat, { text: "❌ Notificaciones de Kudasai: *DESACTIVADAS*" });
        } else {
            await sock.sendMessage(m.chat, { text: "Uso: `.rss on` o `.rss off`" });
        }
        break;

    case '.feeds':
        // Este comando muestra las últimas 5 noticias manualmente
        await sock.sendMessage(m.chat, { text: "⌛ Cargando noticias de Kudasai..." });
        try {
            const feed = await parser.parseURL(KUDASAI_RSS);
            let txt = "*⛩️ ÚLTIMOS FEEDS DE KUDASAI ⛩️*\n\n";
            
            feed.items.slice(0, 5).forEach((item, i) => {
                txt += `${i + 1}. *${item.title}*\n🔗 ${item.link}\n\n`;
            });
            
            await sock.sendMessage(m.chat, { text: txt });
        } catch (e) {
            await sock.sendMessage(m.chat, { text: "❌ Error al conectar con el RSS." });
        }
        break;
                                   }
