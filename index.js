const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const l = console.log;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage } = require('./data');
const fs = require('fs');
const ff = require('fluent-ffmpeg');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const StickersTypes = require('wa-sticker-formatter');
const util = require('util');
const { sms, downloadMediaMessage, AntiDelete } = require('./lib');
const FileType = require('file-type');
const axios = require('axios');
const { File } = require('megajs');
const { fromBuffer } = require('file-type');
const bodyparser = require('body-parser');
const os = require('os');
const Crypto = require('crypto');
const path = require('path');
const prefix = config.PREFIX;
const autoReplyHandler = require('./plugins/autoreply');

const ownerNumber = ['255612491554'];

const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const clearTempDir = () => {
  fs.readdir(tempDir, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      fs.unlink(path.join(tempDir, file), err => {
        if (err) throw err;
      });
    }
  });
};

// Clear the temp directory every 5 minutes
setInterval(clearTempDir, 5 * 60 * 1000);

//===================SESSION-AUTH============================
if (!fs.existsSync(__dirname + '/sessions/creds.json')) {
  if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
  const sessdata = config.SESSION_ID.replace("", '');
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(__dirname + '/sessions/creds.json', data, () => {
      console.log("Session downloaded ✅");
    });
  });
}

const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

//=============================================

// =================== ERROR HANDLERS ===================
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  if (error.errorcode === 'EKEYTYPE') {
    console.log('Cache key error suppressed, continuing...');
    return;
  }
  console.error('Fatal error, restarting...');
  setTimeout(() => {
    connectToWA();
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function connectToWA() {
  console.log("Connecting to WhatsApp ⏳️...");
  const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
  var { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version
  });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log('🧬 Installing Plugins');
      const path = require('path');
      fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() == ".js") {
          require("./plugins/" + plugin);
        }
      });
      console.log('Plugins installed successful ✅');
      console.log('Bot connected to whatsapp ✅');

      // Welcome message to bot owner
      let up = `╔═══════════════════════
║  *𝚆𝙴𝙻𝙲𝙾𝙼𝙴 𝚃𝙾 𝚂𝙸𝙻𝙰 𝙼𝙳*
╚═══════════════════════

┌─「 𝙱𝙾𝚃 𝙸𝙽𝙵𝙾 」━━━━━━━━━━━━━━━
│ 
│  *👋 Welcome!* Thank you for choosing
│  *⚡ SILA MD Premium WhatsApp Bot*
│  *🎯 Simple, Powerful & Feature-Rich*
│ 
│  *🔧 Your Prefix:* ${prefix}
│  *📊 Version:* 3.0.0 Premium
│  *🏆 Status:* Active & Running
│ 
└────────────────────

┌─「 🎯 𝙲𝙾𝙽𝙽𝙴𝙲𝚃 𝚆𝙸𝚃𝙷 𝚄𝚂 」━━━━━━━
│ 
│  *📢 Official Channel:*
│  https://whatsapp.com/channel/0029VbBG4gfISTkCpKxyMH02
│ 
│  *⭐ GitHub Repository:*
│  https://github.com/SILA-TECH/SILA-MD
│ 
└────────────────────

*🚀 Get Started:* Use *.menu* to see all commands

*𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`;

      try {
        await conn.sendMessage(conn.user.id, { 
          image: { url: `https://files.catbox.moe/jwmx1j.jpg` }, 
          caption: up,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363402325089913@newsletter',
              newsletterName: 'SILA MD',
              serverMessageId: 100
            }
          }
        });
      } catch (error) {
        console.error('Error sending welcome message:', error.message);
      }
    }
  });
  
  conn.ev.on('creds.update', saveCreds);

  // Initialize antidelete database
  try {
    await initializeAntiDeleteSettings();
    console.log('✅ AntiDelete database initialized');
  } catch (error) {
    console.error('❌ Error initializing AntiDelete:', error);
  }

  //============================== AntiDelete Handler

  conn.ev.on('messages.update', async updates => {
    for (const update of updates) {
      if (update.update.message === null) {
        console.log("🔍 Delete Detected");
        try {
          await AntiDelete(conn, updates);
        } catch (error) {
          console.error('Error in AntiDelete:', error.message);
          if (error.errorcode === 'EKEYTYPE') {
            console.log('Skipping anti-delete due to cache error');
          }
        }
      }
    }
  });
  
  //============================== Group Events Handler
  const { GroupEvents } = require('./lib/groupevents');
  conn.ev.on('group-participants.update', async (update) => {
    try {
      await GroupEvents(conn, update);
    } catch (error) {
      console.error('Error in GroupEvents:', error.message);
    }
  });
  
  //============================== Messages Handler (FIXED FOR ALL CHATS)
  conn.ev.on('messages.upsert', async (m) => {
    try {
      const mek = m.messages[0];
      if (!mek.message) return;
      
      // Handle different message types
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
        ? mek.message.ephemeralMessage.message 
        : mek.message;
      
      if (mek.message.viewOnceMessageV2)
        mek.message = mek.message.viewOnceMessageV2.message;
      
      // Get basic message info
      const from = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe ? conn.user.id : (mek.key.participant || from);
      const senderNumber = sender.split('@')[0];
      const botNumber = conn.user.id.split(':')[0];
      const pushname = mek.pushName || 'User';
      
      // FIX: Always process messages from all chats
      // Remove MODE restrictions for testing
      const shouldProcess = true; // Process all messages
      
      if (!shouldProcess) {
        return; // Skip if shouldn't process
      }
      
      // Auto read messages if enabled
      if (config.READ_MESSAGE === 'true') {
        try {
          await conn.readMessages([mek.key]);
        } catch (error) {
          console.error('Error marking message as read:', error.message);
        }
      }
      
      // Handle status updates
      if (mek.key && mek.key.remoteJid === 'status@broadcast') {
        if (config.AUTO_STATUS_SEEN === "true") {
          try {
            await conn.readMessages([mek.key]);
          } catch (error) {
            console.error('Error marking status as read:', error.message);
          }
        }
        
        if (config.AUTO_STATUS_REACT === "true") {
          const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗'];
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          try {
            await conn.sendMessage(mek.key.remoteJid, {
              react: {
                text: randomEmoji,
                key: mek.key,
              }
            });
          } catch (error) {
            console.error('Error sending status reaction:', error.message);
          }
        }
        
        if (config.AUTO_STATUS_REPLY === "true") {
          const user = mek.key.participant;
          const text = config.AUTO_STATUS_MSG || "Nice status!";
          try {
            await conn.sendMessage(user, { text: text }, { quoted: mek });
          } catch (error) {
            console.error('Error replying to status:', error.message);
          }
        }
        return; // Don't process status as regular messages
      }
      
      // Save message to database
      try {
        await saveMessage(mek);
      } catch (error) {
        console.error('Error saving message:', error.message);
      }
      
      // Process auto-replies (without prefix)
      try {
        await autoReplyHandler(conn, mek, { 
          from, 
          sender, 
          body: mek.message?.conversation || mek.message?.extendedTextMessage?.text || '',
          isGroup 
        });
      } catch (error) {
        console.error('Error in auto-reply handler:', error.message);
      }
      
      // Get message content
      const type = getContentType(mek.message);
      let body = '';
      
      if (type === 'conversation') {
        body = mek.message.conversation;
      } else if (type === 'extendedTextMessage') {
        body = mek.message.extendedTextMessage.text;
      } else if (type === 'imageMessage') {
        body = mek.message.imageMessage.caption || '';
      } else if (type === 'videoMessage') {
        body = mek.message.videoMessage.caption || '';
      } else if (type === 'audioMessage') {
        body = '';
      }
      
      const isCmd = body.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');
      const text = q;
      
      // Get group info if group
      let groupMetadata = {};
      let participants = [];
      let groupAdmins = [];
      let isBotAdmins = false;
      let isAdmins = false;
      
      if (isGroup) {
        try {
          groupMetadata = await conn.groupMetadata(from);
          participants = groupMetadata.participants || [];
          groupAdmins = participants.filter(p => p.admin).map(p => p.id);
          isBotAdmins = groupAdmins.includes(conn.user.id);
          isAdmins = groupAdmins.includes(sender);
        } catch (error) {
          console.error('Error getting group metadata:', error.message);
        }
      }
      
      const groupName = isGroup ? groupMetadata.subject : '';
      const botNumber2 = conn.user.id;
      const isMe = sender === conn.user.id;
      const isOwner = ownerNumber.includes(senderNumber) || isMe;
      const isReact = mek.message?.reactionMessage ? true : false;
      
      // Reply function
      const reply = (teks) => {
        conn.sendMessage(from, { text: teks }, { quoted: mek });
      };
      
      // Handle eval commands for owner
      if (isOwner && body && (body.startsWith('%') || body.startsWith('$'))) {
        try {
          let code = body.slice(1);
          if (!code) {
            reply(`Provide me with a query to run Master!`);
            return;
          }
          
          if (body.startsWith('%')) {
            let resultTest = eval(code);
            reply(util.format(resultTest || 'Executed'));
          } else if (body.startsWith('$')) {
            let resultTest = await eval(`(async() => { ${code} })()`);
            reply(util.format(resultTest || 'Executed'));
          }
        } catch (err) {
          reply(`Error: ${err.message}`);
        }
        return;
      }
      
      // Auto react features
      if (!isReact && senderNumber !== botNumber) {
        if (config.AUTO_REACT === 'true') {
          const reactions = ['😊', '👍', '😂', '💯', '🔥', '🙏', '🎉', '👏', '😎'];
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
          try {
            await conn.sendMessage(from, {
              react: {
                text: randomReaction,
                key: mek.key,
              }
            });
          } catch (error) {
            console.error('Error sending auto-react:', error.message);
          }
        }
        
        // Custom react
        if (config.CUSTOM_REACT === 'true') {
          const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
          try {
            await conn.sendMessage(from, {
              react: {
                text: randomReaction,
                key: mek.key,
              }
            });
          } catch (error) {
            console.error('Error sending custom react:', error.message);
          }
        }
        
        // Special react for owner
        if (senderNumber === "255612491554") {
          try {
            await conn.sendMessage(from, {
              react: {
                text: "👨‍💻",
                key: mek.key,
              }
            });
          } catch (error) {
            console.error('Error sending owner react:', error.message);
          }
        }
      }
      
      // Process commands
      if (isCmd) {
        const events = require('./command');
        const cmdName = command;
        
        if (cmdName) {
          const cmd = events.commands.find((cmd) => cmd.pattern === cmdName) || 
                      events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
          
          if (cmd) {
            // Send command reaction
            if (cmd.react) {
              try {
                await conn.sendMessage(from, { 
                  react: { text: cmd.react, key: mek.key } 
                });
              } catch (error) {
                console.error('Error sending command react:', error.message);
              }
            }
            
            // Execute command
            try {
              await cmd.function(conn, mek, { 
                from, quoted: mek, body, isCmd, command: cmdName, args, q, text, 
                isGroup, sender, senderNumber, botNumber2, botNumber: botNumber2, 
                pushname, isMe, isOwner, groupMetadata, groupName, participants, 
                groupAdmins, isBotAdmins, isAdmins, reply 
              });
            } catch (e) {
              console.error("[PLUGIN ERROR]", e.message);
              reply(`❌ Command error: ${e.message}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error in messages.upsert handler:', error.message);
    }
  });
  
  //=================================================== Helper Functions
  conn.decodeJid = jid => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
    } else return jid;
  };
  
  conn.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let vtype;
    if (options.readViewOnce) {
      message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message 
        ? message.message.ephemeralMessage.message 
        : (message.message || undefined);
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete (message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = { ...message.message.viewOnceMessage.message };
    }

    let mtype = Object.keys(message.message)[0];
    let content = await generateForwardMessageContent(message, forceForward);
    let ctype = Object.keys(content)[0];
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };
    
    const waMessage = await generateWAMessageFromContent(jid, content, options ? {
      ...content[ctype],
      ...options,
      ...(options.contextInfo ? {
        contextInfo: {
          ...content[ctype].contextInfo,
          ...options.contextInfo
        }
      } : {})
    } : {});
    
    await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
    return waMessage;
  };
  
  conn.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  };
  
  conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    let mime = '';
    let res = await axios.head(url);
    mime = res.headers['content-type'];
    
    if (mime.split("/")[1] === "gif") {
      return conn.sendMessage(jid, { 
        video: await getBuffer(url), 
        caption: caption, 
        gifPlayback: true, 
        ...options 
      }, { quoted, ...options });
    }
    
    let type = mime.split("/")[0] + "Message";
    if (mime === "application/pdf") {
      return conn.sendMessage(jid, { 
        document: await getBuffer(url), 
        mimetype: 'application/pdf', 
        caption: caption, 
        ...options 
      }, { quoted, ...options });
    }
    if (mime.split("/")[0] === "image") {
      return conn.sendMessage(jid, { 
        image: await getBuffer(url), 
        caption: caption, 
        ...options 
      }, { quoted, ...options });
    }
    if (mime.split("/")[0] === "video") {
      return conn.sendMessage(jid, { 
        video: await getBuffer(url), 
        caption: caption, 
        mimetype: 'video/mp4', 
        ...options 
      }, { quoted, ...options });
    }
    if (mime.split("/")[0] === "audio") {
      return conn.sendMessage(jid, { 
        audio: await getBuffer(url), 
        caption: caption, 
        mimetype: 'audio/mpeg', 
        ...options 
      }, { quoted, ...options });
    }
  };
  
  conn.parseMention = async (text) => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
  };
  
  conn.sendTextWithMentions = async (jid, text, quoted, options = {}) => {
    return conn.sendMessage(jid, { 
      text: text, 
      contextInfo: { 
        mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') 
      }, 
      ...options 
    }, { quoted });
  };
  
  conn.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {}) => {
    let buttonMessage = {
      text,
      footer,
      buttons,
      headerType: 2,
      ...options
    };
    conn.sendMessage(jid, buttonMessage, { quoted, ...options });
  };
  
  conn.sendContact = async (jid, numbers, quoted = '', opts = {}) => {
    let list = [];
    for (let i of numbers) {
      list.push({
        displayName: await conn.getName(i + '@s.whatsapp.net') || i,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await conn.getName(i + '@s.whatsapp.net') || i}\nFN:${i}\nTEL;waid=${i}:${i}\nEND:VCARD`,
      });
    }
    conn.sendMessage(jid, {
      contacts: {
        displayName: `${list.length} Contact`,
        contacts: list,
      },
      ...opts,
    }, { quoted });
  };
  
  conn.setStatus = (status) => {
    conn.query({
      tag: 'iq',
      attrs: {
        to: '@s.whatsapp.net',
        type: 'set',
        xmlns: 'status',
      },
      content: [
        {
          tag: 'status',
          attrs: {},
          content: Buffer.from(status, 'utf-8'),
        },
      ],
    });
    return status;
  };
}

app.get("/", (req, res) => {
  res.send("SILA MD STARTED ✅");
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));
setTimeout(() => {
  connectToWA();
}, 4000);
