const config = require('../config')
const { cmd, commands } = require('../command');

// Define combined fakevCard with Christmas and regular version
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SILA AI 🎅",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SILA AI CHRISTMAS\nORG:SILA AI;\nTEL;type=CELL;type=VOICE;waid=255612491554:+255612491554\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "list",
    alias: ["listcmd","commands"],
    desc: "menu the bot",
    category: "menu",
    react: "⚡",
    filename: __filename
}, 
async (conn, mek, m, { from, reply }) => {
    try {

//================ MENU NEW DESIGN ================//

let dec = `
╔═══ ✦ *SILA MD — COMMAND MENU* ✦
║
╠══❯ 📥 *DOWNLOAD*
║ • .play
║ • .song
║ • .apk
║ • .video
║ • .fb
║ • .tk
║ • .ig
║ • .gdrive
║ • .twitter
║ • .img
║ • .darama
║ • .play2
║ • .video2
║ • .baiscope
║ • .mfire
║
╠══❯ 🎭 *ANIME*
║ • .yts
║ • .king
║ • .dog
║ • .anime
║ • .animegirl
║ • .loli
║
╠══❯ 🛈 *INFO*
║ • .alive
║ • .ping
║ • .menu
║ • .menu2
║ • .ai
║ • .system
║ • .owner
║ • .status
║ • .about
║ • .list
║ • .script
║
╠══❯ ⚙ *OTHER*
║ • .joke
║ • .fact
║ • .githubstalk
║ • .gpass
║ • .hack
║ • .srepo
║ • .define
║
╠══❯ 👥 *GROUP*
║ • .mute
║ • .unmute
║ • .left
║ • .remove
║ • .delete
║ • .add
║ • .kick
║ • .kickall
║ • .setgoodbye
║ • .setwelcome
║ • .promote
║ • .demote
║ • .tagall
║ • .hidetag
║ • .getpic
║ • .invite
║ • .revoke
║ • .joinrequests
║ • .allreq
║ • .lockgc
║ • .unlockgc
║ • .ginfo
║ • .disappear
║ • .senddm
║ • .joim
║ • .updategname
║ • .updategdesc
║
╠══❯ 👑 *OWNER*
║ • .update
║ • .restart
║ • .settings
║ • .repo
║ • .system
║ • .block
║ • .unblock
║ • .shutdown
║ • .clearchats
║ • .setpp
║ • .broadcast
║ • .jid
║ • .gjid
║
╠══❯ 🔄 *CONVERT*
║ • .sticker
║ • .tts
║ • .trt
║
╚══❯  ${config.DESCRIPTION}
`;

//================ SEND MENU ==================//

await conn.sendMessage(
from,
{
image: { url: `https://files.catbox.moe/jwmx1j.jpg` },
caption: dec,
contextInfo: {
mentionedJid: [m.sender],
forwardingScore: 999,
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: '120363402325089913@newsletter',
newsletterName: 'SILA MD',
serverMessageId: 143
}
}
},{ quoted: fakevCard }
);

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});
