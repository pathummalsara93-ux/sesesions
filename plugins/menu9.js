const config = require('../config');
const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');
const axios = require('axios');
// Baileys එකෙන් prepareWAMessageMedia import කිරීම
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

cmd({
    pattern: "menu9",
    desc: "Horizontal Scrolling Menu",
    category: "menu",
    react: "🧬",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, pushname, reply }) => {
    try {
        const cards = [
            {
                body: { text: "🤖 *AI & UTILITIES*\nSmart AI tools and essential utility commands." },
                header: { title: "AI TOOLS", hasVideo: false }, // Image එක ඉවත් කළා
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OTHER MENU","id":".othermenu"}' }
                    ]
                }
            },
            {
                body: { text: "📥 *DOWNLOADERS*\nDownload videos and files from any platform." },
                header: { title: "DOWNLOAD MENU", hasVideo: false },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"DOWNLOADS","id":".dlmenu"}' }
                    ]
                }
            }
        ];

        const message = {
            interactiveMessage: {
                header: { title: "👋 *DARK SHADOW MD*", hasVideo: false },
                body: { text: `Hello ${pushname},\nChoose a category:` },
                footer: { text: "© DARK SHADOW" },
                carouselMessage: { cards: cards }
            }
        };

        await conn.sendMessage(from, { viewOnceMessage: { message } }, { quoted: mek });
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
});
