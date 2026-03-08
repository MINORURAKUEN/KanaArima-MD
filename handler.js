import { generateWAMessageFromContent } from "baileys";
import { smsg } from './src/libraries/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import fs from 'fs';
import chalk from 'chalk';
import mddd5 from 'md5';
import ws from 'ws';

let mconn;

/**
 * @type {import("baileys")}
 */
const { proto } = (await import("baileys")).default;
const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(function () {
  clearTimeout(this);
  resolve();
}, ms));

/**
 * Handle messages upsert
 */
export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || [];
  this.uptime = this.uptime || Date.now();
  if (!chatUpdate) return;
  this.pushMessage(chatUpdate.messages).catch(console.error);
  let m = chatUpdate.messages[chatUpdate.messages.length - 1];
  if (!m) return;
  if (global.db.data == null) await global.loadDatabase();
  
  try {
    m = smsg(this, m) || m;
    if (!m) return;
    global.mconn = m;
    mconn = m;
    m.exp = 0;
    m.money = false;
    m.limit = false;

    try {
      // --- INICIALIZACIÓN DE USUARIOS (Tu lista "dick") ---
      const user = global.db.data.users[m.sender];
      if (typeof user !== 'object') global.db.data.users[m.sender] = {};
      if (user) {
        const dick = {
          afk: -1, wait: 0, afkReason: '', age: -1, agility: 16, anakanjing: 0, anakcentaur: 0, anakgriffin: 0, anakkucing: 0, anakkuda: 0, anakkyubi: 0, anaknaga: 0, anakpancingan: 0, anakphonix: 0, anakrubah: 0, anakserigala: 0, anggur: 0, anjing: 0, anjinglastclaim: 0, antispam: 0, antispamlastclaim: 0, apel: 0, aqua: 0, arc: 0, arcdurability: 0, arlok: 0, armor: 0, armordurability: 0, armormonster: 0, as: 0, atm: 0, autolevelup: true, axe: 0, axedurability: 0, ayam: 0, ayamb: 0, ayambakar: 0, ayamg: 0, ayamgoreng: 0, babi: 0, babihutan: 0, babipanggang: 0, bandage: 0, bank: 0, banned: false, BannedReason: '', Banneduser: false, banteng: 0, batu: 0, bawal: 0, bawalbakar: 0, bayam: 0, berlian: 10, bibitanggur: 0, bibitapel: 0, bibitjeruk: 0, bibitmangga: 0, bibitpisang: 0, botol: 0, bow: 0, bowdurability: 0, boxs: 0, brick: 0, brokoli: 0, buaya: 0, buntal: 0, cat: 0, catlastfeed: 0, catngexp: 0, centaur: 0, centaurexp: 0, centaurlastclaim: 0, centaurlastfeed: 0, clay: 0, coal: 0, coin: 0, common: 0, crystal: 0, cumi: 0, cupon: 0, diamond: 3, dog: 0, dogexp: 0, doglastfeed: 0, dory: 0, dragon: 0, dragonexp: 0, dragonlastfeed: 0, emas: 0, emerald: 0, esteh: 0, exp: 0, expg: 0, exphero: 0, expired: 0, eleksirb: 0, emasbatang: 0, emasbiasa: 0, fideos: 0, fishingrod: 0, fishingroddurability: 0, fortress: 0, fox: 0, foxexp: 0, foxlastfeed: 0, fullatm: 0, gadodado: 0, gajah: 0, gamemines: false, mute: false, ganja: 0, gardenboxs: 0, gems: 0, glass: 0, gold: 0, griffin: 0, griffinexp: 0, griffinlastclaim: 0, griffinlastfeed: 0, gulai: 0, gurita: 0, harimau: 0, haus: 100, healt: 100, health: 100, healtmonster: 100, hero: 1, herolastclaim: 0, hiu: 0, horse: 0, horseexp: 0, horselastfeed: 0, ikan: 0, ikanbakar: 0, intelligence: 10, iron: 0, jagung: 0, jagungbakar: 0, jeruk: 0, job: 'Pengangguran', joincount: 2, joinlimit: 1, judilast: 0, kaleng: 0, kambing: 0, kangkung: 0, kapak: 0, kardus: 0, katana: 0, katanadurability: 0, kayu: 0, kentang: 0, kentanggoreng: 0, kepiting: 0, kepitingbakar: 0, kerbau: 0, korbanngocok: 0, kubis: 0, kucing: 0, kucinglastclaim: 0, kuda: 0, kudalastclaim: 0, kumba: 0, kyubi: 0, kyubilastclaim: 0, labu: 0, laper: 100, lastadventure: 0, lastclaim: 0, legendary: 0, level: 0, limit: 20, money: 15, name: m.name, pancingan: 1, potion: 10, role: 'Novato', trash: 0, language: 'es', gameglx: {},
        };
        for (const dicks in dick) {
          if (user[dicks] === undefined || !user.hasOwnProperty(dicks)) user[dicks] = dick[dicks];
        }
      }

      // --- INICIALIZACIÓN DE CHATS (AQUÍ SE AGREGA RSS) ---
      const chat = global.db.data.chats[m.chat];
      if (typeof chat !== 'object') global.db.data.chats[m.chat] = {};
      if (chat) {
        const chats = {
          isBanned: false,
          welcome: true,
          detect: true,
          detect2: false,
          sWelcome: '',
          sBye: '',
          rss: false, // Propiedad para el plugin de noticias
          antidelete: false,
          modohorny: true,
          autosticker: false,
          audios: true,
          antiLink: false,
          antiLink2: false,
          modoadmin: false,
          simi: false,
          game: true,
          expired: 0,
          language: 'es',
        };
        for (const chatss in chats) {
          if (chat[chatss] === undefined || !chat.hasOwnProperty(chatss)) chat[chatss] = chats[chatss];
        }
      }

      // --- SETTINGS DEL BOT ---
      const settings = global.db.data.settings[this.user.jid];
      if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {};
      if (settings) {
        const setttings = { self: false, autoread: false, restrict: false, antiCall: false, modoia: false };
        for (const setting in setttings) {
          if (settings[setting] === undefined || !settings.hasOwnProperty(setting)) settings[setting] = setttings[setting];
        }
      }
    } catch (e) {
      console.error(e);
    }

    // --- LÓGICA DE TRADUCCIÓN E IDIOMA ---
    const idioma = global.db.data.users[m.sender]?.language || 'es';
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.handler.handler;

    // --- FILTROS DE MENSAJES ---
    if (opts['nyimak'] || (opts['self'] && !m.fromMe)) return;
    if (opts['pconly'] && m.chat.endsWith('g.us')) return;
    if (opts['gconly'] && !m.chat.endsWith('g.us')) return;

    if (typeof m.text !== 'string') m.text = '';

    const isROwner = [...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const isOwner = isROwner || m.fromMe;

    if (m.isBaileys) return;

    m.exp += Math.ceil(Math.random() * 10);

    // --- EJECUCIÓN DE PLUGINS ---
    let usedPrefix;
    const _user = global.db.data?.users?.[m.sender];
    const groupMetadata = m.isGroup ? await this.groupMetadata(m.chat).catch(_ => ({})) : {};
    const participants = (m.isGroup ? groupMetadata.participants : []) || [];
    const user = (m.isGroup ? participants.find((u) => u.id === m.sender) : {}) || {};
    const bot = (m.isGroup ? participants.find((u) => u.id === this.user.jid) : {}) || {};
    const isAdmin = user?.admin || false;
    const isBotAdmin = bot?.admin || false;

    for (const name in global.plugins) {
      let plugin = global.plugins[name];
      if (!plugin || plugin.disabled) continue;
      
      const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
      let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix;
      let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map((p) => {
        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
        return [re.exec(m.text), re];
      }) : [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]).find((p) => p[1]);

      if (typeof plugin.all === 'function') {
        try { await plugin.all.call(this, m, { chatUpdate }); } catch (e) { console.error(e); }
      }

      if (!match) continue;
      usedPrefix = match[0];
      let noPrefix = m.text.replace(usedPrefix, '');
      let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
      args = args || [];
      let _allArgs = args.join` `;
      let isIdCommand = (Array.isArray(plugin.command) ? plugin.command : [plugin.command]).some((cmd) => (cmd instanceof RegExp ? cmd.test(command) : cmd === command));

      if (!isIdCommand) continue;
      
      try {
        await plugin.call(this, m, {
          conn: this, usedPrefix, noPrefix, args, command, text: _allArgs, 
          isOwner, isAdmin, isBotAdmin, isROwner, participants, groupMetadata, user, bot,
        });
      } catch (e) {
        console.error(e);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// Watcher para recarga en caliente
let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  console.log(chalk.redBright("Update 'handler.js'"));
  import(`${file}?update=${Date.now()}`);
});
            
