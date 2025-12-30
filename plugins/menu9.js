const config = require('../config');
const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');
const axios = require('axios');

cmd({
    pattern: "menu9",
    desc: "Full Horizontal Scrolling Menu",
    category: "menu",
    react: "🧬",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, pushname, reply }) => {
    try {
        // පින්තූරය සකසා ගැනීම (Image Preparation)
        const imageUrl = "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg";
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');
        const { imageMessage } = await conn.prepareWAMessageMedia({ image: buffer }, { upload: conn.waUploadToServer });

        // කැරොසල් කාඩ්පත් සැකසීම
        const cards = [
            {
                body: { text: "🤖 *AI & UTILITIES*\nSmart AI tools and essential utility commands." },
                header: { title: "AI TOOLS", hasVideo: false, imageMessage: imageMessage },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OTHER MENU","id":".othermenu"}' }
                    ]
                }
            },
            {
                body: { text: "📥 *DOWNLOADERS*\nDownload videos and files from any platform." },
                header: { title: "DOWNLOAD MENU", hasVideo: false, imageMessage: imageMessage },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"DOWNLOADS","id":".dlmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"ANIME","id":".animemenu"}' }
                    ]
                }
            },
            {
                body: { text: "⚙️ *ADMIN & OWNER*\nManagement tools for group and bot owners." },
                header: { title: "MANAGEMENT", hasVideo: false, imageMessage: imageMessage },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"GROUP MENU","id":".groupmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"OWNER MENU","id":".ownermenu"}' }
                    ]
                }
            },
            {
                body: { text: "🎨 *CONVERT & FUN*\nCreate stickers and enjoy fun games." },
                header: { title: "ENTERTAINMENT", hasVideo: false, imageMessage: imageMessage },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"CONVERT MENU","id":".convertmenu"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"FUN MENU","id":".funmenu"}' }
                    ]
                }
            },
            {
                body: { text: "🌟 *REACTIONS & MAIN*\nSocial commands and main bot info." },
                header: { title: "SOCIAL", hasVideo: false, imageMessage: imageMessage },
                nativeFlowMessage: {
                    buttons: [
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"REACTIONS","id":".reactions"}' },
                        { name: "quick_reply", buttonParamsJson: '{"display_text":"MAIN MENU","id":".mainmenu"}' }
                    ]
                }
            }
        ];

        const message = {
            interactiveMessage: {
                header: { title: "👋 *DARK SHADOW MD MENU*", hasVideo: false },
                body: { text: `*Hello ${pushname},*\n\nWelcome to Dark Shadow MD. Please *Swipe Right* to browse our command categories.` },
                footer: { text: "© 2024 DARK SHADOW MD" },
                carouselMessage: {
                    cards: cards
                }
            }
        };

        await conn.sendMessage(from, { 
            viewOnceMessage: { message } 
        }, { quoted: mek });

    } catch (e) {
        console.log("Error in Menu9:", e);
        reply(`Error: ${e.message}`);
    }
});
