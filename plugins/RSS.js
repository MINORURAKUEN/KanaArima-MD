import Parser from 'rss-parser';
import fs from 'fs';

const parser = new Parser();
const KUDASAI_RSS = 'https://somoskudasai.com/feed/';
const CONFIG_FILE = './rss_config.json';

// Inicializar archivo de configuración si no existe
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ rss_enabled: true, last_link: "" }));
}

const handler = async (m, { conn, command, text }) => {
    let config = JSON.parse(fs.readFileSync(CONFIG_FILE));

    if (command === 'rss') {
        if (!text) return m.reply('Uso: *.rss on* o *.rss off*');
        
        if (text === 'on') {
            config.rss_enabled = true;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            return m.reply('✅ Notificaciones de Kudasai: *ACTIVADAS*');
        } else if (text === 'off') {
            config.rss_enabled = false;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            return m.reply('❌ Notificaciones de Kudasai: *DESACTIVADAS*');
        }
    }

    if (command === 'feeds') {
        m.reply('⌛ Cargando noticias de Kudasai...');
        try {
            const feed = await parser.parseURL(KUDASAI_RSS);
            let txt = "*⛩️ ÚLTIMOS FEEDS DE KUDASAI ⛩️*\n\n";
            feed.items.slice(0, 5).forEach((item, i) => {
                txt += `${i + 1}. *${item.title}*\n🔗 ${item.link}\n\n`;
            });
            await conn.sendMessage(m.chat, { text: txt }, { quoted: m });
        } catch (e) {
            m.reply('❌ Error al conectar con el RSS.');
        }
    }
};

// Configuración del plugin para el bot
handler.command = ['rss', 'feeds'];
handler.tags = ['news'];
handler.help = ['rss <on/off>', 'feeds'];

export default handler;

/**
 * Lógica de auto-check (puedes meterla en main.js o dejarla aquí 
 * si tu bot carga plugins persistentes)
 */
setInterval(async () => {
    try {
        let config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        if (!config.rss_enabled) return;

        const feed = await parser.parseURL(KUDASAI_RSS);
        const latest = feed.items[0];

        if (latest.link !== config.last_link) {
            config.last_link = latest.link;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

            const msg = `*📢 NOTICIA NUEVA (KUDASAI)*\n\n*${latest.title}*\n\n${latest.link}`;
            
            // Reemplaza con el ID de tu grupo o chat principal
            // global.conn.sendMessage('tu_id_de_grupo@g.us', { text: msg });
        }
    } catch (e) {
        // Silencioso para no llenar la consola de Termux
    }
}, 600000); 
