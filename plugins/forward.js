const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward a replied message (image, document, video, text) to a given JID.\nUsage: reply to a message and send .forward <jid>",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, quoted, reply, args, isOwner }) => {
    try {
        // Only owner can use this for safety
        if (!isOwner) {
            return reply("❌ Only the bot owner can use this command.");
        }

        const targetJidArg = args.join(" ").trim();
        if (!targetJidArg) {
            return reply("❌ Please provide a JID (e.g., `94771234567` or `1234567890@g.us`).\nExample: `.forward 94771234567`");
        }

        // Normalize JID: if it's a number without '@', add @s.whatsapp.net
        let targetJid = targetJidArg;
        if (!targetJid.includes('@') && !targetJid.includes(':')) {
            // Assume it's a phone number
            targetJid = `${targetJidArg.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }

        // Check if there is a quoted (replied) message
        if (!quoted) {
            return reply("❌ You need to reply to the message you want to forward.");
        }

        // Extract the quoted message
        const quotedMsg = quoted;
        const msgType = Object.keys(quotedMsg).find(key => 
            ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage', 'conversation', 'extendedTextMessage'].includes(key)
        );

        if (!msgType) {
            return reply("❌ Unsupported message type to forward.");
        }

        // Prepare message to send
        let forwardContent = {};
        
        if (msgType === 'conversation') {
            forwardContent = { text: quotedMsg.conversation };
        } else if (msgType === 'extendedTextMessage') {
            forwardContent = { text: quotedMsg.extendedTextMessage.text };
        } else if (msgType === 'imageMessage') {
            forwardContent = {
                image: { url: await conn.downloadMediaMessage(quotedMsg) },
                caption: quotedMsg.imageMessage.caption || '',
                mimetype: quotedMsg.imageMessage.mimetype
            };
        } else if (msgType === 'videoMessage') {
            forwardContent = {
                video: { url: await conn.downloadMediaMessage(quotedMsg) },
                caption: quotedMsg.videoMessage.caption || '',
                mimetype: quotedMsg.videoMessage.mimetype
            };
        } else if (msgType === 'documentMessage') {
            forwardContent = {
                document: { url: await conn.downloadMediaMessage(quotedMsg) },
                fileName: quotedMsg.documentMessage.fileName,
                mimetype: quotedMsg.documentMessage.mimetype,
                caption: quotedMsg.documentMessage.caption || ''
            };
        } else if (msgType === 'audioMessage') {
            forwardContent = {
                audio: { url: await conn.downloadMediaMessage(quotedMsg) },
                mimetype: quotedMsg.audioMessage.mimetype,
                ptt: quotedMsg.audioMessage.ptt || false
            };
        } else if (msgType === 'stickerMessage') {
            forwardContent = {
                sticker: { url: await conn.downloadMediaMessage(quotedMsg) }
            };
        } else {
            return reply("❌ Unsupported message type.");
        }

        // Send to target JID
        await conn.sendMessage(targetJid, forwardContent);
        await reply(`✅ Message forwarded successfully to \`${targetJid}\``);
    } catch (e) {
        console.error("Forward error:", e);
        reply(`❌ Failed to forward: ${e.message}\nMake sure the JID is valid and the bot can send messages to that target.`);
    }
});
