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
 * @param {import("baileys").BaileysEventMap<unknown>['messages.upsert']} groupsUpdate
 */
export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || [];
  this.uptime = this.uptime || Date.now();
  if (!chatUpdate) {
    return;
  }
  this.pushMessage(chatUpdate.messages).catch(console.error);
  let m = chatUpdate.messages[chatUpdate.messages.length - 1];
  if (!m) {
    return;
  }
  if (global.db.data == null) await global.loadDatabase();
  
  /* ------------------------------------------------*/
  try {
    m = smsg(this, m) || m;
    if (!m) {
      return;
    }
    global.mconn = m
    mconn = m
    m.exp = 0;
    m.money = false;
    m.limit = false;
    try {
      // TODO: use loop to insert data instead of this
      const user = global.db.data.users[m.sender]
      if (typeof user !== 'object') {
        global.db.data.users[m.sender] = {};
      }
      if (user) {
        // im gona cook this
        // why the fuck nobody put the code like this in 3 years??????
        // credit to mystic or skidy89
        const dick = {
          afk: -1,
          wait: 0,
          afkReason: '',
          age: -1,
          agility: 16,
          anakanjing: 0,
          anakcentaur: 0,
          anakgriffin: 0,
          anakkucing: 0,
          anakkuda: 0,
          anakkyubi: 0,
          anaknaga: 0,
          anakpancingan: 0,
          anakphonix: 0,
          anakrubah: 0,
          anakserigala: 0,
          anggur: 0,
          anjing: 0,
          anjinglastclaim: 0,
          antispam: 0,
          antispamlastclaim: 0,
          apel: 0,
          aqua: 0,
          arc: 0,
          arcdurability: 0,
          arlok: 0,
          armor: 0,
          armordurability: 0,
          armormonster: 0,
          as: 0,
          atm: 0,
          autolevelup: true,
          axe: 0,
          axedurability: 0,
          ayam: 0,
          ayamb: 0,
          ayambakar: 0,
          ayamg: 0,
          ayamgoreng: 0,
          babi: 0,
          babihutan: 0,
          babipanggang: 0,
          bandage: 0,
          bank: 0,
          banned: false,
          BannedReason: '',
          Banneduser: false,
          banteng: 0,
          batu: 0,
          bawal: 0,
          bawalbakar: 0,
          bayam: 0,
          berlian: 10,
          bibitanggur: 0,
          bibitapel: 0,
          bibitjeruk: 0,
          bibitmangga: 0,
          bibitpisang: 0,
          botol: 0,
          bow: 0,
          bowdurability: 0,
          boxs: 0,
          brick: 0,
          brokoli: 0,
          buaya: 0,
          buntal: 0,
          cat: 0,
          catlastfeed: 0,
          catngexp: 0,
          centaur: 0,
          centaurexp: 0,
          centaurlastclaim: 0,
          centaurlastfeed: 0,
          clay: 0,
          coal: 0,
          coin: 0,
          common: 0,
          crystal: 0,
          cumi: 0,
          cupon: 0,
          diamond: 3,
          dog: 0,
          dogexp: 0,
          doglastfeed: 0,
          dory: 0,
          dragon: 0,
          dragonexp: 0,
          dragonlastfeed: 0,
          emas: 0,
          emerald: 0,
          esteh: 0,
          exp: 0,
          expg: 0,
          exphero: 0,
          expired: 0,
          eleksirb: 0,
          emasbatang: 0,
          emasbiasa: 0,
          fideos: 0,
          fishingrod: 0,
          fishingroddurability: 0,
          fortress: 0,
          fox: 0,
          foxexp: 0,
          foxlastfeed: 0,
          fullatm: 0,
          gadodado: 0,
          gajah: 0,
          gamemines: false,
          mute: false,
          ganja: 0,
          gardenboxs: 0,
          gems: 0,
          glass: 0,
          gold: 0,
          griffin: 0,
          griffinexp: 0,
          griffinlastclaim: 0,
          griffinlastfeed: 0,
          gulai: 0,
          gurita: 0,
          harimau: 0,
          haus: 100,
          healt: 100,
          health: 100,
          healtmonster: 100,
          hero: 1,
          herolastclaim: 0,
          hiu: 0,
          horse: 0,
          horseexp: 0,
          horselastfeed: 0,
          ikan: 0,
          ikanbakar: 0,
          intelligence: 10,
          iron: 0,
          jagung: 0,
          jagungbakar: 0,
          jeruk: 0,
          job: 'Pengangguran',
          joincount: 2,
          joinlimit: 1,
          judilast: 0,
          kaleng: 0,
          kambing: 0,
          kangkung: 0,
          kapak: 0,
          kardus: 0,
          katana: 0,
          katanadurability: 0,
          kayu: 0,
          kentang: 0,
          kentanggoreng: 0,
          kepiting: 0,
          kepitingbakar: 0,
          kerbau: 0,
          kerjadelapan: 0,
          kerjadelapanbelas: 0,
          kerjadua: 0,
          kerjaduabelas: 0,
          kerjaduadelapan: 0,
          kerjaduadua: 0,
          kerjaduaempat: 0,
          kerjaduaenam: 0,
          kerjadualima: 0,
          kerjaduapuluh: 0,
          kerjaduasatu: 0,
          kerjaduasembilan: 0,
          kerjaduatiga: 0,
          kerjaduatujuh: 0,
          kerjaempat: 0,
          kerjaempatbelas: 0,
          kerjaenam: 0,
          kerjaenambelas: 0,
          kerjalima: 0,
          kerjalimabelas: 0,
          kerjasatu: 0,
          kerjasebelas: 0,
          kerjasembilan: 0,
          kerjasembilanbelas: 0,
          kerjasepuluh: 0,
          kerjatiga: 0,
          kerjatigabelas: 0,
          kerjatigapuluh: 0,
          kerjatujuh: 0,
          kerjatujuhbelas: 0,
          korbanngocok: 0,
          kubis: 0,
          kucing: 0,
          kucinglastclaim: 0,
          kuda: 0,
          kudalastclaim: 0,
          kumba: 0,
          kyubi: 0,
          kyubilastclaim: 0,
          labu: 0,
          laper: 100,
          lastadventure: 0,
          lastberbru: 0,
          lastberkebon: 0,
          lastbunga: 0,
          lastbunuhi: 0,
          lastcoins: 0,
          lastclaim: 0,
          lastcode: 0,
          lastcofre: 0,
          lastcrusade: 0,
          lastdaang: 0,
          lastdagang: 0,
          lastdiamantes: 0,
          lastduel: 0,
          lastdungeon: 0,
          lasteasy: 0,
          lastfight: 0,
          lastfishing: 0,
          lastgojek: 0,
          lastgrab: 0,
          lasthourly: 0,
          lasthunt: 0,
          lastjb: 0,
          lastkill: 0,
          lastlink: 0,
          lastlumber: 0,
          lastmancingeasy: 0,
          lastmancingextreme: 0,
          lastmancinghard: 0,
          lastmancingnormal: 0,
          lastmining: 0,
          lastmisi: 0,
          lastmonthly: 0,
          lastmulung: 0,
          lastnambang: 0,
          lastnebang: 0,
          lastngocok: 0,
          lastngojek: 0,
          lastopen: 0,
          lastpekerjaan: 0,
          lastpago: 0,
          lastpotionclaim: 0,
          lastramuanclaim: 0,
          lastspam: 0,
          lastrob: 0,
          lastroket: 0,
          lastseen: 0,
          lastSetStatus: 0,
          lastsironclaim: 0,
          lastsmancingclaim: 0,
          laststringclaim: 0,
          lastswordclaim: 0,
          lastturu: 0,
          lastwarpet: 0,
          lastweaponclaim: 0,
          lastweekly: 0,
          lastwork: 0,
          lbars: '[▒▒▒▒▒▒▒▒▒]',
          legendary: 0,
          lele: 0,
          leleb: 0,
          lelebakar: 0,
          leleg: 0,
          level: 0,
          limit: 20,
          limitjoinfree: 1,
          lion: 0,
          lionexp: 0,
          lionlastfeed: 0,
          lobster: 0,
          lumba: 0,
          magicwand: 0,
          magicwanddurability: 0,
          makanan: 0,
          makanancentaur: 0,
          makanangriffin: 0,
          makanankyubi: 0,
          makanannaga: 0,
          makananpet: 0,
          makananphonix: 0,
          makananserigala: 0,
          mana: 20,
          mangga: 0,
          misi: '',
          money: 15,
          monyet: 0,
          mythic: 0,
          naga: 0,
          nagalastclaim: 0,
          name: m.name,
          net: 0,
          nila: 0,
          nilabakar: 0,
          note: 0,
          ojekk: 0,
          oporayam: 0,
          orca: 0,
          pancingan: 1,
          panda: 0,
          pasangan: '',
          paus: 0,
          pausbakar: 0,
          pc: 0,
          pepesikan: 0,
          pet: 0,
          phonix: 0,
          phonixexp: 0,
          phonixlastclaim: 0,
          phonixlastfeed: 0,
          pickaxe: 0,
          pickaxedurability: 0,
          pillhero: 0,
          pisang: 0,
          pointxp: 0,
          potion: 10,
          premium: false,
          premiumTime: 0,
          ramuan: 0,
          ramuancentaurlast: 0,
          ramuangriffinlast: 0,
          ramuanherolast: 0,
          ramuankucinglast: 0,
          ramuankudalast: 0,
          ramuankyubilast: 0,
          ramuannagalast: 0,
          ramuanphonixlast: 0,
          ramuanrubahlast: 0,
          ramuanserigalalast: 0,
          registered: false,
          reglast: 0,
          regTime: -1,
          rendang: 0,
          rhinoceros: 0,
          rhinocerosexp: 0,
          rhinoceroslastfeed: 0,
          rock: 0,
          roket: 0,
          role: 'Novato',
          roti: 0,
          rtrofi: 'bronce',
          rubah: 0,
          rubahlastclaim: 0,
          rumahsakit: 0,
          sampah: 0,
          sand: 0,
          sapi: 0,
          sapir: 0,
          seedbayam: 0,
          seedbrokoli: 0,
          seedjagung: 0,
          seedkangkung: 0,
          seedkentang: 0,
          seedkubis: 0,
          seedlabu: 0,
          seedtomat: 0,
          seedwortel: 0,
          semangka: 0,
          serigala: 0,
          serigalalastclaim: 0,
          sewa: false,
          shield: 0,
          skill: '',
          skillexp: 0,
          snlast: 0,
          soda: 0,
          sop: 0,
          spammer: 0,
          spinlast: 0,
          ssapi: 0,
          stamina: 100,
          steak: 0,
          stick: 0,
          strength: 30,
          string: 0,
          stroberi: 0,
          superior: 0,
          suplabu: 0,
          sushi: 0,
          sword: 0,
          sworddurability: 0,
          tigame: 50,
          tiketcoin: 0,
          title: '',
          tomat: 0,
          tprem: 0,
          trash: 0,
          trofi: 0,
          troopcamp: 0,
          tumiskangkung: 0,
          udang: 0,
          udangbakar: 0,
          umpan: 0,
          uncoommon: 0,
          unreglast: 0,
          upgrader: 0,
          vodka: 0,
          wallet: 0,
          warn: 0,
          weapon: 0,
          weapondurability: 0,
          wolf: 0,
          wolfexp: 0,
          wolflastfeed: 0,
          wood: 0,
          wortel: 0,
          language: 'es',
          gameglx: {},
        }
      for (const dicks in dick) {
        if (user[dicks] === undefined || !user.hasOwnProperty(dicks)) {
          user[dicks] = dick[dicks] // god pls forgive me
        }
      }}
      const akinator = global.db.data.users[m.sender].akinator;
      if (typeof akinator !== 'object') {
        global.db.data.users[m.sender].akinator = {};
      }
      if (akinator) {
        const akiSettings = {
          sesi: false,
          server: null,
          frontaddr: null,
          session: null,
          signature: null,
          question: null,
          progression: null,
          step: null,
          soal: null,
        };
        for (const aki in akiSettings) {
          if (akinator[aki] === undefined || !akinator.hasOwnProperty(aki)) {
            akinator[aki] = akiSettings[aki] ?? {};
          }
        }
      }
      let gameglx = global.db.data.users[m.sender].gameglx
      if (typeof gameglx !== 'object') {
        global.db.data.users[m.sender].gameglx = {}
      }
      if (gameglx) {
        const gameGalaxy = { // i want to assign dick instead gameGalaxy
          status: false,
          notificacao: {
            recebidas: []
          },
          perfil: {
            xp: 112,
            nivel: {
              nome: 'Iniciante',
              id: 0,
              proximoNivel: 1
            },
            poder: 500,
            minerando: false,
            nome: null,
            username: null,
            id: null, // Id do Jogador
            idioma: 'pt-br',
            casa: {
              id: null, // id do grupo ou seja do planeta casa
              planeta: null,
              idpelonome: 'terra',
              colonia: {
                id: 1,
                nome: null,
                habitante: false,
                posicao: {
                  x: 0,
                  y: 0,
                }
              }
            },
            carteira: {
              currency: 'BRL',
              saldo: 1500,
            },
            localizacao: {
              status: false,
              nomeplaneta: null,  // id do grupo...
              id: null,
              idpelonome: null,
              viajando: false,
              posicao: {
                x: 0,
                y: 0,
              }
            },
            nave: {
              status: false,
              id: null,
              nome: null,
              velocidade: null,
              poder: null,
              valor: null,
            },
            bolsa: {
              itens: {
                madeira: 1,
                ferro: 1,
                diamante: 1,
                esmeralda: 2,
                carvao: 1,
                ouro: 1,
                quartzo: 1
              },
              naves: {
                status: false,
                compradas: []
              }
            },
            ataque: {
              data: {
                hora: 0,
                contagem: 0 
              },
              sendoAtacado: {
                status: false,
                atacante: null,
              },
              forcaAtaque: {
                ataque: 10
              }
            },
            defesa: {
              forca: 200,
              ataque: 30
            }
          }
        }
        for (const game in gameGalaxy) {
          if (gameglx[game] === undefined || !gameglx.hasOwnProperty(game)) {
            gameglx[game] = gameGalaxy[game] ?? {} // ctrl + v moment 
          }
        }
      }


      const chat = global.db.data.chats[m.chat];
      if (typeof chat !== 'object') {
        global.db.data.chats[m.chat] = {};
      }
      if (chat) {
        
      const chats = { // i want to assign dick instead chats
          isBanned: false,
          welcome: true,
          detect: true,
          detect2: false,
          sWelcome: '',
          sBye: '',
          sPromote: '',
          sDemote: '',
          antidelete: false,
          modohorny: true,
          autosticker: false,
          audios: true,
          antiLink: false,
          antiLink2: false,
          antiviewonce: false,
          antiToxic: false,
          antiTraba: false,
          antiArab: false,
          antiArab2: false,
          antiporno: false,
          modoadmin: false,
          simi: false,
          game: true,
          expired: 0,
          language: 'es',
          setPrimaryBot: '',
        }
        for (const chatss in chats) {
          if (chat[chatss] === undefined || !chat.hasOwnProperty(chatss)) {
            chat[chatss] = chats[chatss] ?? {}// ctrl + v moment
          }
        }
      }
      const settings = global.db.data.settings[this.user.jid];
      if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {};
      if (settings) {
       const setttings = { // yk the drill 
          self: false,
          autoread: false,
          autoread2: false,
          restrict: false,
          antiCall: false,
          antiPrivate: false,
          modejadibot: true,
          antispam: false,
          audios_bot: true,
          modoia: false
        };
        for (const setting in settings) {
          if (settings[setting] === undefined || !settings.hasOwnProperty(setting)) {
            settings[setting] = setttings[setting] ?? {} // ctrl + v moment
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje; // is null? np the operator ?? fix that (i hope)
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.handler.handler

    if (opts['nyimak']) {
      return;
    }
    if (!m.fromMe && opts['self']) {
      return;
    }
    if (opts['pconly'] && m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['gconly'] && !m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['swonly'] && m.chat !== 'status@broadcast') {
      return;
    }
    if (typeof m.text !== 'string') {
      m.text = '';
    }
    const isROwner = [...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const isOwner = isROwner || m.fromMe;
    const isMods = isOwner || global.mods.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const isPrems = isROwner || isOwner || isMods || global.db.data.users[m.sender].premiumTime > 0; // || global.db.data.users[m.sender].premium = 'true'

    if (opts['queque'] && m.text && !(isMods || isPrems)) {
      const queque = this.msgqueque; const time = 1000 * 5;
      const previousID = queque[queque.length - 1];
      queque.push(m.id || m.key.id);
      setInterval(async function () {
        if (queque.indexOf(previousID) === -1) clearInterval(this);
        await delay(time);
      }, time);
    }

    if (m.isBaileys || isBaileysFail && m?.sender === mconn?.conn?.user?.jid) {
      return;
    }

    m.exp += Math.ceil(Math.random() * 10);

    let usedPrefix;
    const _user = global.db.data && global.db.data.users && global.db.data.users[m.sender];
    const groupMetadata = m.isGroup ? { ...(conn.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}), ...(((conn.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants) && { participants: ((conn.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants || []).map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid })) }) } : {};
    //const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch((_) => null)) : {}) || {};
    const participants = ((m.isGroup ? groupMetadata.participants : []) || []).map(participant => ({ id: participant.jid, jid: participant.jid, lid: participant.lid, admin: participant.admin }));
    //const participants = (m.isGroup ? groupMetadata.participants : []) || [];
    const user = (m.isGroup ? participants.find((u) => conn.decodeJid(u.jid) === m.sender) : {}) || {}; // User Data
    const bot = (m.isGroup ? participants.find((u) => conn.decodeJid(u.jid) == this.user.jid) : {}) || {}; // Your Data
    const isRAdmin = user?.admin == 'superadmin' || false;
    const isAdmin = isRAdmin || user?.admin == 'admin' || false; // Is User Admin?
    const isBotAdmin = bot?.admin || false; // Are you Admin?

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
    for (const name in global.plugins) 
