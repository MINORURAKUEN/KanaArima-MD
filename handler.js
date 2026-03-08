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
      // --- INICIALIZACIÓN DE USUARIO ---
      const user = global.db.data.users[m.sender];
      if (typeof user !== 'object') global.db.data.users[m.sender] = {};
      if (user) {
        const dick = {
          level: 0,
          limit: 20,
          money: 15,
          exp: 0,
          registered: false,
          language: 'es',
          // ... (aquí mantén toda tu lista de objetos original)
        };
        for (const dicks in dick) {
          if (user[dicks] === undefined || !user.hasOwnProperty(dicks)) user[dicks] = dick[dicks];
        }
      }

      // --- INICIALIZACIÓN DE CHATS (AQUÍ ESTÁ EL CAMBIO) ---
      const chat = global.db.data.chats[m.chat];
      if (typeof chat !== 'object') global.db.data.chats[m.chat] = {};
      if (chat) {
        const chats = { 
          isBanned: false,
          welcome: true,
          detect: true,
          rss: false, // <--- PROPIEDAD PARA EL BOT DE NOTICIAS
          antidelete: false,
          modohorny: true,
          audios: true,
          antiLink: false,
          game: true,
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
        const setttings = { 
          self: false,
          autoread: false,
          restrict: false,
          modoia: false
        };
        for (const setting in settings) {
          if (settings[setting] === undefined || !settings.hasOwnProperty(setting)) settings[setting] = setttings[setting];
        }
      }
    } catch (e) {
      console.error(e);
    }

    // --- IDIOMA Y TRADUCCIÓN ---
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    // (Asegúrate de tener los archivos JSON de idioma o comenta estas líneas si dan error)
    // const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))

    if (opts['nyimak']) return;
    if (!m.fromMe && opts['self']) return;
    if (opts['pconly'] && m.chat.endsWith('g.us')) return;
    if (opts['gconly'] && !m.chat.endsWith('g.us')) return;

    if (typeof m.text !== 'string') m.text = '';

    // --- PERMISOS ---
    const isROwner = [...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const isOwner = isROwner || m.fromMe;
    const isMods = isOwner || global.mods?.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);

    if (m.isBaileys) return;

    // --- PROCESAMIENTO DE COMANDOS ---
    let usedPrefix;
    let _user = global.db.data?.users?.[m.sender];
    const groupMetadata = m.isGroup ? await this.groupMetadata(m.chat).catch(_ => ({})) : {};
    const participants = (m.isGroup ? groupMetadata.participants : []) || [];
    const userAdmin = participants.find(u => u.id === m.sender) || {};
    const botAdmin = participants.find(u => u.id === this.user.jid) || {};
    const isAdmin = userAdmin?.admin || false;
    const isBotAdmin = botAdmin?.admin || false;

    // --- EJECUCIÓN DE PLUGINS ---
    for (const name in global.plugins) {
      let plugin = global.plugins[name];
      if (!plugin) continue;
      if (plugin.disabled) continue;

      const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
      let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix;
      let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map(p => {
        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
        return [re.exec(m.text), re];
      }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp()]]).find(p => p[1]);

      if (typeof plugin.before === 'function') {
        if (await plugin.before.call(this, m, {
          match, conn: this, participants, groupMetadata, user: _user, chat: global.db.data.chats[m.chat], isROwner, isOwner, isAdmin, isBotAdmin, isPrems: false, chatUpdate,
        })) continue;
      }

      if (typeof plugin !== 'function') continue;

      if ((usedPrefix = (match[0] || '')[0])) {
        let noPrefix = m.text.replace(usedPrefix, '');
        let [command, ...args] = noPrefix.trim().split` `.filter(v => v);
        args = args || [];
        let _allargs = args.join` `;
        command = (command || '').toLowerCase();
        let isFullP = !!usedPrefix;

        if (plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : typeof plugin.command === 'string' ? plugin.command === command : false) {
          
          // Verificar si el chat tiene el comando bloqueado o algo similar
          if (global.db.data.chats[m.chat].isBanned && !isROwner) return;

          let fail = plugin.fail || global.dfail;
          
          // Ejecutar el plugin
          try {
            await plugin.call(this, m, {
              conn: this, usedPrefix, noPrefix, args, command, text: _allargs, participants, groupMetadata, user: _user, chat: global.db.data.chats[m.chat], isROwner, isOwner, isAdmin, isBotAdmin, isPrems: false, chatUpdate,
            });
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
           }
