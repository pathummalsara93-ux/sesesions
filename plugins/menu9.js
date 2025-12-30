const config = require('../config');

const { cmd, commands } = require('../command');

const os = require("os");

const { runtime } = require('../lib/functions');

const axios = require('axios');

cmd({
    pattern: "menu",
    desc: "Horizontal Scrolling Menu",
    category: "menu",
    react: "🧬",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, config }) => {
    try {
        // එක් එක් කැටගරිය සඳහා කාඩ්පත් (Cards) සැකසීම
        const cards = [
            {
                body: { text: "🤖 *AI & OTHER COMMANDS*\nExplore Smart AI & Utility tools." },
                header: { hasVideo: false, imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OTHER MENU","id":".othermenu"}' }
                    ]
                }
            },
            {
                body: { text: "📥 *DOWNLOAD COMMANDS*\nDownload FB, YT, TikTok and more." },
                header: { hasVideo: false, imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"DOWNLOAD MENU","id":".dlmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"ANIME MENU","id":".animemenu"}' }
                    ]
                }
            },
            {
                body: { text: "⚙️ *GROUP & OWNER*\nManage groups and bot settings." },
                header: { hasVideo: false, imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"GROUP MENU","id":".groupmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OWNER MENU","id":".ownermenu"}' }
                    ]
                }
            },
            {
                body: { text: "🎭 *FUN & CONVERT*\nMake stickers and enjoy fun games." },
                header: { hasVideo: false, imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"FUN MENU","id":".funmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"CONVERT MENU","id":".convertmenu"}' }
                    ]
                }
            }
        ];

        const message = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: { title: "👋 *DARK SHADOW MD MENU*", hasVideo: false },
                        body: { text: `Hello ${m.pushName || 'User'},\n\n*Swipe right or left* to see all categories and click buttons to see commands.` },
                        footer: { text: config.FOOTER || "DARK SHADOW MD" },
                        carouselMessage: {
                            cards: cards
                        }
                    }
                }
            }
        };

        await conn.sendMessage(from, message, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});
