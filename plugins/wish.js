const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');

cmd({
    pattern: "year",
    alias: ["wish", "vish", "cv"],
    desc: "Check uptime and system status",
    category: "main",
    react: "🌞",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // Generate system status message
        const status = ` *ලැබුවා වූ සිංහල, හින්දු අලුත් අවුරුද්ද* ✨💫
> ඔබටත්, පවුලේ සියලු දෙනටාමත් , 
> සාමය සතුට පිරි. 🥹💖

> සුභම සුභ අලුත් අවුරුද්දක් වේවා 🙏✨


> ✍️ 𝓟𝓪𝓽𝓱𝓾𝓶 𝓜𝓪𝓵𝓼𝓪𝓻𝓪`;

        // Send the status message with an image
        await conn.sendMessage(from, { 
            image: { url: `https://files.catbox.moe/htsxv6.jpeg` },  // Image URL
            caption: status,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409414874042@newsletter',
                    newsletterName: 'සුභ අලුත් අවුරුද්දක් වේවා!',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in alive command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
