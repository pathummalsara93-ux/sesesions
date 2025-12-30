const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
// Baileys එකෙන් prepareWAMessageMedia import කිරීම
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

cmd({
    pattern: "menu9",
    desc: "Horizontal Scrolling Menu (Fixed Structure)",
    category: "menu",
    react: "🧬",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, pushname }) => {
    try {
        const message = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: `👋 Hello ${pushname}\nSelect a category below:` },
                        footer: { text: "DARK SHADOW MD" },
                        header: { title: "DARK SHADOW MENU", hasVideo: false },
                        carouselMessage: {
                            cards: [
                                {
                                    body: { text: "Explore AI & Utility commands." },
                                    nativeFlowMessage: {
                                        buttons: [{
                                            name: "quick_reply",
                                            buttonParamsJson: '{"display_text":"AI MENU","id":".aimenu"}'
                                        }]
                                    }
                                },
                                {
                                    body: { text: "Download FB, YT, TikTok and more." },
                                    nativeFlowMessage: {
                                        buttons: [{
                                            name: "quick_reply",
                                            buttonParamsJson: '{"display_text":"DOWNLOAD MENU","id":".dlmenu"}'
                                        }]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        };

        // මෙහිදී Baileys internal functions මගින් generate කිරීම මගහැර කෙලින්ම යවමු
        await conn.relayMessage(from, message, { messageId: mek.key.id });

    } catch (e) {
        console.log("Carousel Error:", e);
    }
});
