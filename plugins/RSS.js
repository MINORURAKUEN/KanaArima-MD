import Parser from 'rss-parser';
import fs from 'fs';

const parser = new Parser();
const KUDASAI_RSS = 'https://somoskudasai.com/feed/';
const CONFIG_PATH = './rss_config.json';

// --- FUNCIONES DE PERSISTENCIA ---
function readConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        const initialConfig = { rss_enabled: false, last_link: "", target_chat: "" };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(initialConfig, null, 2));
        return initialConfig;
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// --- HANDLER PRINCIPAL ---
let handler = async (m, { conn, command, text, isOwner, isAdmin }) => {
    let config = readConfig();

    switch (command) {
        case 'rss':
            if (!isOwner && !isAdmin) return m.reply('❌ Este comando solo lo pueden usar Admins.');
            if (!text) return m.reply('Uso correcto:\n*.rss on* (Activar)\n*.rss off* (Desactivar)');

            if (text === 'on') {
                config.rss_enabled = true;
                config.target_chat = m.chat; // Se activará en el chat donde pongas el comando
                saveConfig(config);
                m.reply('✅ *Servicio de noticias Kudasai Activado*.\nLas noticias se enviarán automáticamente a este chat.');
            } else if (text === 'off') {
                config.rss_enabled = false;
                saveConfig(config);
                m.reply('❌ *Servicio de noticias Kudasai Desactivado*.');
            }
            break;

        case 'feeds':
            await m.reply('⌛ _Consultando últimas noticias de Kudasai..._');
            try {
                const feed = await parser.parseURL(KUDASAI_RSS);
                let txt = "⛩️ *ÚLTIMOS FEEDS DE KUDASAI* ⛩️\n\n";
                
                feed.items.slice(0, 5).forEach((item, i) => {
                    txt += `*${i + 1}.* ${item.title}\n🔗 ${item.link}\n\n`;
                });
                
                await conn.sendMessage(m.chat, { text: txt }, { quoted: m });
            } catch (e) {
                console.error(e);
                m.reply('❌ Error al conectar con el servidor de Kudasai.');
            }
            break;
    }
};

handler.command = ['rss', 'feeds'];
handler.tags = ['news', 'tools'];
handler.help = ['rss <on/off>', 'feeds'];

export default handler;

// --- LOOP AUTOMÁTICO (Cada 10 minutos) ---
// Nota: 'global.conn' debe estar disponible en tu bot para enviar mensajes automáticos
setInterval(async () => {
    try {
        const config = readConfig();
        if (!config.rss_enabled || !config.target_chat) return;

        const feed = await parser.parseURL(KUDASAI_RSS);
        const latest = feed.items[0];

        if (latest && latest.link !== config.last_link) {
            config.last_link = latest.link;
            saveConfig(config);

            const msg = `⛩️ *NUEVA NOTICIA DE KUDASAI* ⛩️\n\n` +
                        `📌 *Título:* ${latest.title}\n` +
                        `🔗 *Link:* ${latest.link}\n\n` +
                        `_Actualización automática_`;

            // Usamos global.conn que es el estándar en estos bots
            if (global.conn) {
                await global.conn.sendMessage(config.target_chat, { text: msg });
            }
        }
    } catch (e) {
        // Error silencioso para no ensuciar la consola de Termux
    }
}, 600000); // 10 minutos
