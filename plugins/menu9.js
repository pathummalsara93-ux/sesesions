const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
// Baileys එකෙන් prepareWAMessageMedia import කිරීම
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');


cmd({
    pattern: "menu9",
    desc: "Horizontal Scrolling Menu (No Image)",
    category: "menu",
    react: "🧬",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, pushname, reply }) => {
    try {
        const cards = [
            {
                body: { text: "🤖 *AI & OTHER COMMANDS*\nExplore Smart AI & Utility tools like GPT, News and more." },
                header: { title: "DARK SHADOW - AI", hasVideo: false },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OTHER MENU","id":".othermenu"}' }
                    ]
                }
            },
            {
                body: { text: "📥 *DOWNLOAD COMMANDS*\nDownload FB, YT, TikTok and Anime content easily." },
                header: { title: "DARK SHADOW - DOWNLOAD", hasVideo: false },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"DOWNLOAD MENU","id":".dlmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"ANIME MENU","id":".animemenu"}' }
                    ]
                }
            },
            {
                body: { text: "⚙️ *GROUP & OWNER*\nAdmin tools for managing groups and bot owner settings." },
                header: { title: "DARK SHADOW - ADMIN", hasVideo: false },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"GROUP MENU","id":".groupmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OWNER MENU","id":".ownermenu"}' }
                    ]
                }
            },
            {
                body: { text: "🎭 *FUN & CONVERT*\nTransform photos to stickers and enjoy funny commands." },
                header: { title: "DARK SHADOW - FUN", hasVideo: false },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"FUN MENU","id":".funmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"CONVERT MENU","id":".convertmenu"}' }
                    ]
                }
            }
        ];

        const message = {
            interactiveMessage: {
                header: { title: `👋 *HELLO ${pushname.toUpperCase()}*`, hasVideo: false },
                body: { text: "Welcome to DARK SHADOW MD. Please *Swipe Right* to browse our command categories and click buttons to select." },
                footer: { text: "© 2024 DARK SHADOW MD" },
                carouselMessage: {
                    cards: cards
                }
            }
        };

        // වැදගත්: viewOnceMessage එක ඇතුළේ යැවීමෙන් සාර්ථකව මැසේජ් එක ලැබෙනු ඇත.
        await conn.sendMessage(from, { 
            viewOnceMessage: { message: message } 
        }, { quoted: mek });

    } catch (e) {
        console.log("Carousel Error:", e);
        // reply argument එක තිබේ නම් පමණක් මෙය ක්‍රියාත්මක වේ
        if(reply) reply(`Error: ${e.message}`);
    }
});
