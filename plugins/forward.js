const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward a replied message (text, image, video, document, sticker) to any JID.",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only bot owner can use this.");

        let targetJid = args.join(" ").trim();
        if (!targetJid) return reply("❌ Provide JID. Example: `.forward 94771234567`");
        if (!targetJid.includes('@')) targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        // Get the quoted message correctly
        let quotedMsg = m.quoted;
        if (!quotedMsg && mek.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
        }
        if (!quotedMsg) {
            return reply("❌ Reply to a message first.");
        }

        // Determine type
        const type = Object.keys(quotedMsg).find(key =>
            ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'].includes(key)
        );
        if (!type) return reply("❌ Unsupported message type.");

        let sendContent = {};
        if (type === 'conversation') {
            sendContent = { text: quotedMsg.conversation };
        } else if (type === 'extendedTextMessage') {
            sendContent = { text: quotedMsg.extendedTextMessage.text };
        } else {
            // For media, create a temporary message to download
            const mediaMsg = quotedMsg[type];
            const fakeMsg = {
                key: { remoteJid: from, fromMe: false, id: 'temp' },
                message: { [type]: mediaMsg }
            };
            const stream = await conn.downloadMediaMessage(fakeMsg);
            if (!stream) return reply("❌ Failed to download media.");

            if (type === 'imageMessage') sendContent = { image: stream, caption: mediaMsg.caption || '' };
            else if (type === 'videoMessage') sendContent = { video: stream, caption: mediaMsg.caption || '' };
            else if (type === 'documentMessage') sendContent = { document: stream, fileName: mediaMsg.fileName, mimetype: mediaMsg.mimetype, caption: mediaMsg.caption || '' };
            else if (type === 'stickerMessage') sendContent = { sticker: stream };
            else if (type === 'audioMessage') sendContent = { audio: stream, mimetype: mediaMsg.mimetype, ptt: mediaMsg.ptt || false };
        }

        await conn.sendMessage(targetJid, sendContent);
        await reply(`✅ Sent to ${targetJid}`);
    } catch (e) {
        console.error(e);
        reply(`❌ Forward failed: ${e.message}`);
    }
});
