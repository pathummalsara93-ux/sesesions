const config = require('../config');
const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');
const axios = require('axios');

cmd({
    pattern: "menu9",
    desc: "Horizontal Scrolling Menu",
    category: "menu",
    react: "🧬",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, pushname, reply }) => {
    try {
        const cards = [
            {
                body: { text: "🤖 *AI & OTHER COMMANDS*\nExplore Smart AI & Utility tools." },
                header: { 
                    title: "AI & UTILS",
                    hasVideo: false, 
                    imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } 
                },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OTHER MENU","id":".othermenu"}' }
                    ]
                }
            },
            {
                body: { text: "📥 *DOWNLOAD COMMANDS*\nDownload FB, YT, TikTok and more." },
                header: { 
                    title: "DOWNLOADER",
                    hasVideo: false, 
                    imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } 
                },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"DOWNLOAD MENU","id":".dlmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"ANIME MENU","id":".animemenu"}' }
                    ]
                }
            },
            {
                body: { text: "⚙️ *GROUP & OWNER*\nManage groups and bot settings." },
                header: { 
                    title: "ADMIN TOOLS",
                    hasVideo: false, 
                    imageMessage: { url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg" } 
                },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"GROUP MENU","id":".groupmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OWNER MENU","id":".ownermenu"}' }
                    ]
                }
            }
        ];

        const message = {
            interactiveMessage: {
                header: { title: "👋 *DARK SHADOW MD*", hasVideo: false },
                body: { text: `Hello ${pushname},\n\n*Swipe right or left* to see categories.` },
                footer: { text: "DARK SHADOW MD" }, // config.FOOTER වෙනුවට කෙලින්ම නම දැම්මා
                carouselMessage: {
                    cards: cards
                }
            }
        };

        // Message එක send කිරීම
        await conn.sendMessage(from, { 
            viewOnceMessage: { message } 
        }, { quoted: mek });

    } catch (e) {
        console.log("Error in Menu9:", e);
        // මෙතැන reply එක arguments වල තිබෙන නිසා දැන් error එකක් එන්නේ නැහැ
        reply(`Error: ${e.message}`);
    }
});
