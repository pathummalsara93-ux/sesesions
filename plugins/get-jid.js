const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["jid1", "jid2"],
    desc: "Get both group JID and user JID (if in group) or just user JID (if private).",
    react: "📍",
    category: "group",
    filename: __filename,
}, async (conn, mek, m, { from, isGroup, sender, isOwner, reply }) => {
    try {
        // Permission check
        if (!isGroup && !isOwner) {
            return reply("⚠️ Only the bot owner can use this command in private chat.");
        }
        if (isGroup) {
            // Optionally, check if user is admin or owner (you can uncomment if needed)
            // if (!isAdmins && !isOwner) return reply("⚠️ Only group admins or owner can use this.");
            
            // Send both JIDs on separate lines
            const bothJids = `Group: ${from}@g.us\nUser: ${sender}@s.whatsapp.net`;
            return reply(bothJids);
        } else {
            // Private chat – only user JID
            return reply(`User: ${sender}@s.whatsapp.net`);
        }
    } catch (e) {
        console.error("Error:", e);
        reply(`❌ An error occurred: ${e.message}`);
    }
});
