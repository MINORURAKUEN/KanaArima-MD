import fs from 'fs';
import { sticker } from '../src/libraries/sticker.js';
import { toPTT } from '../src/libraries/converter.js'; // Tu conversor de notas de voz

const handler = (m) => m;

handler.all = async function(m, { conn }) {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.nv_global;

  const chat = global.db.data.chats[m.chat] || {};

  // Función para verificar si es el bot principal
  const checkPrimaryBot = () => {
    if (!chat.setPrimaryBot) return true;
    const normalizeJid = (jid) => jid?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const primaryJid = normalizeJid(chat.setPrimaryBot);
    const currentJid = global.conn?.user?.jid || '';
    const isPrimaryActive = () => {
      if (primaryJid === currentJid) return true;
      return global.conns?.some(bot => bot.user?.jid === primaryJid) || false;
    };
    if (isPrimaryActive()) return primaryJid === currentJid;
    delete chat.setPrimaryBot;
    return true; 
  };

  // Función mágica que convierte y envía la nota de voz PTT real
  const enviarNotaDeVoz = async (rutaMp3) => {
    try {
      await conn.sendPresenceUpdate('recording', m.chat);
      const audioBuffer = fs.readFileSync(rutaMp3);
      const pttConvertido = await toPTT(audioBuffer, 'mp3');
      await conn.sendMessage(m.chat, { 
        audio: pttConvertido.data, 
        mimetype: 'audio/ogg; codecs=opus', 
        ptt: true 
      }, { quoted: m });
    } catch (e) {
      console.error("❌ Error al enviar el PTT automático:", e);
    }
  };

  // Mensaje de invitación a grupo (dejamos este bloque tal cual)
  if ((m.mtype === 'groupInviteMessage' || m.text.startsWith('https://chat') || m.text.startsWith('Abre este enlace')) && !m.isBaileys && !m.isGroup && !chat.isBanned && !m.fromMe && checkPrimaryBot()) {
    const join = `${tradutor.texto1[0]} @${m.sender.split('@')[0]}, ${tradutor.texto1[1]} https://chat.whatsapp.com/LjJbmdO0qSDEKgB60qivZj`.trim();
    await conn.sendMessage(m.chat, {
      text: join.trim(), 
      mentions: [...join.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'), 
      contextInfo: {
        forwardingScore: 9999999, 
        isForwarded: true, 
        mentionedJid: [...join.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'), 
        externalAdReply: {
          showAdAttribution: true, containsAutoReply: true, renderLargerThumbnail: true, 
          title: global.titulowm2, mediaType: 1, thumbnail: global.imagen1, 
          mediaUrl: `https://www.atom.bio/theshadowbrokers-team`, 
          sourceUrl: `https://www.atom.bio/theshadowbrokers-team`
        }
      }
    }, { quoted: m });
  }

  // Comprobaciones de seguridad para evitar que el bot explote
  const canSendAudio = () => {
    if (chat.isBanned || !checkPrimaryBot()) return false;
    if (!global.db.data.chats[m.chat]?.audios) return false;
    const botSettings = global.db.data.settings[conn.user?.jid] || {};
    if (!botSettings.audios_bot && !m.isGroup) return false;
    return true;
  };

  // Si el mensaje no tiene texto, detenemos aquí
  if (!m.text) return !0;

  // 🎵 LISTA INTELIGENTE DE AUDIOS 🎵 (Limpio y sin errores de llaves)
  const audioList = [
    { regex: /^hola$/i, file: '01J673CQ9ZE93TRQKCKN9Q8Z0M.mp3' },
    { regex: /^que no$/i, file: '01J6745EH5251SV6HT327JJW9G.mp3' },
    { regex: /(anadieleimporta|a nadie le importa)/gi, file: '01J6734W48PG8EA14QW517QR2K.mp3' },
    { regex: /(araara|ara ara)/gi, file: '01J672TYT2TFVG5NT5QVPJ8XHX.mp3' },
    { regex: /(miarda de bot|mierda de bot|mearda de bot)/gi, file: '01J673T2Q92H3A0AW5B8RHA2N0.mp3' },
    { regex: /(bañate|Bañate|baÃ±ate)/gi, file: '01J672VZBZ488TCVYA7KBB3TFG.mp3' },
    { regex: /(baneado|Baneado)/gi, file: '01J672WYXHW6JM3T8PCNQHH6MN.mp3' },
    { regex: /(bebito fiu fiu|bff)/gi, file: '01J672XP5MW9J5APRSDFYRTTE9.mp3' },
    { regex: /(buenas noches|Boanoite|boanoite)/gi, file: '01J672YMA8AS2Z8YFMHB68GBQX.mp3' },
    { regex: /(buenas tardes|boatarde|Boatarde)/gi, file: '01J672ZCDK26GJZQ5GDP60TZ37.mp3' },
    { regex: /(buenos dias|buenos días)/gi, file: '01J6730WRS4KJEZ281N2KJR1SV.mp3' },
    { regex: /(chica lgante|Chicalgante|chical gante)/gi, file: '01J6732M2RT3F96FMJ3ZATCJYF.mp3' },
    { regex: /(diagnosticado con gay|diagnosticado gay|te diagnostico con gay)/gi, file: '01J6733KMK6VZ3TC806EK2PQV9.mp3' },
    { regex: /(es puto|eeesss putoo|es putoo|esputoo)/gi, file: '01J6737BBJJ3DN78NAMEKG13M8.mp3' },
    { regex: /(feliz cumpleaños|feliz cumpleaÃ±os|happy birthday)/gi, file: '01J67380VCFHSZ4BCE4CBBQFHC.mp3' },
    { regex: /(Fiesta del admin|fiesta del admin)$/gi, file: '01J672T4VQFK8ZSSD1G0MXMPD3.mp3' },
    { regex: /(fiesta del administrador)/gi, file: '01J6738VVZ6SVZRCP5V287SSB2.mp3' },
    { regex: /(fiesta del admin 3|atención grupo|atencion grupo|aviso importante)/gi, file: '01J6739GKKKN029YNX1TQ9CZR5.mp3' },
    { regex: /(gemidos|gemime|gime|gemi2)/gi, file: '01J673B4CRSS9Z2CX6E4R8MZPZ.mp3' },
    { regex: /(audio hentai|audiohentai)/gi, file: '01J673BTPKK29A7CVJW9WKXE9T.mp3' },
    { regex: /(sexo|Hora de sexo|hora de sexo)/gi, file: '01J673WHBVDXH4N0Q4WGBM568B.mp3' },
    { regex: /(laoracion|La biblia|La oración|la biblia)/gi, file: '01J6743DB5T555Y9YRAG5GSPVX.mp3' },
    { regex: /(Marica tu|cancion1|Marica quien)/gi, file: '01J6731R9N6N6453KVHC4MD8X2.mp3' },
    { regex: /(noche de paz|Noche de amor)/gi, file: '01J673YX9KHGTQ6V7V3Q3X3A1X.mp3' },
    { regex: /(Nyapasu|Nyanpasu|nyapasu|Gambure|Yabure)/gi, file: '01J67441AFAPG1YRQXDQ0VDTZB.mp3' },
    { regex: /(ho me vengo|oh me vengo|o me vengo)/gi, file: '01J674B3P6G2J8WYAV3N4YJ86E.mp3' },
    { regex: /(oni-chan|onichan|o-onichan)/gi, file: '01J6742QGC8P8910A8D990M7W2.mp3' },
    { regex: /(Pasa pack|vendes tu nudes|pasa video hot|pasa tu pack|pasa fotos hot|vendes tu pack)/gi, file: '01J6735MY23DV6ES9XHBP06K9R.mp3' },
    { regex: /(Quién es tu senpai botsito|Quien es tu senpai botsito|Quién es tu sempai botsito)/gi, file: '01J6749NAPVK16F3CEXTTMJAVS.mp3' },
    { regex: /(rawr|raawwr|rraawr|rawwr)/gi, file: '01J674623FTP8T6T00EQCXY5TG.mp3' },
    { regex: /(siu|siiuu|ssiiuu|siuuu|siiiuuuu|siuuuu|siiiiuuuuu)/gi, file: '01J6747RFN09GR42AXY18VFW10.mp3' },
    { regex: /(te amo|teamo)/gi, file: '01J6748B0RYBJWX5TBMWQZYX95.mp3' },
    { regex: /(ooo tio|tio que rico)/gi, file: '01J6741Q3F6EAM5ZCN28DY6XZ4.mp3' },
    { regex: /(un Pato|un pato que va caminando alegremente)/gi, file: '01J6744PY12JDH4PG59GDHFXV8.mp3' },
    { regex: /(UwU|uwu|Uwu|uwU|UWU)/gi, file: '01J674A7N7KNER6GY6FCYTTZSR.mp3' },
    { regex: /(vetealavrg|vete a la vrg|vete a la verga)/gi, file: '01J674BPFMHSJTJXN0M00YZ1YN.mp3' },
    { regex: /(fiesta viernes|viernes fiesta|viernes|Viernes)/gi, file: '01J674CES8KMWCBT6B9E597MFF.mp3' },
    { regex: /(vivan!!|vivan los novios|vivanlosnovios)/gi, file: '01J674D3S12JTFDETTNF12V4W8.mp3' },
    { regex: /(Yamete|yamete kudasai)/gi, file: '01J674DR0CB7BD43HHBN1CBBC8.mp3' },
    { regex: /(epico|esto va a ser epico)/gi, file: '01J6736ABXJQN1GSVF2XHP4NMK.mp3' },
    { regex: /(shitpost)/gi, file: '01J6746X6AJ09V48P28AZC22M2.mp3' },
    { regex: /(no digas eso papu)/gi, file: '01J67413BMA69VV48TWPCVCYS8.mp3' }
  ];

  // Recorremos la lista. Si el mensaje coincide, manda el audio y listo.
  if (canSendAudio()) {
    for (const audio of audioList) {
      if (audio.regex.test(m.text)) {
        await enviarNotaDeVoz(`./src/assets/audio/${audio.file}`);
        break; 
      }
    }
  }

  return !0;
};

export default handler;
