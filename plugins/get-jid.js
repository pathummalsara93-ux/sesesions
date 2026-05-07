const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["jid1", "jid2"],
    desc: "Get the raw JID (group JID in group, user JID in private). No extra text.",
    react: "📍",
    category: "group",
    filename: __filename,
}, async (conn, mek, m, { from, isGroup, sender, isOwner, reply }) => {
    try {
        if (!isGroup && !isOwner) {
            return reply("⚠️ Only the bot owner can use this in private chat.");
        }
        // Output ONLY the JID as plain text
        if (isGroup) {
            return reply(`${from}@g.us`);
        } else {
            return reply(`${sender}@s.whatsapp.net`);
        }
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});
