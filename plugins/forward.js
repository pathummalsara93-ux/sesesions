const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward a replied message (image, video, document, sticker, audio, text) to any JID.\nUsage: reply to a message and type .forward <jid>",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, quoted, reply, args, isOwner }) => {
    try {
        if (!isOwner) {
            return reply("❌ Only the bot owner can use this command.");
        }

        let targetJid = args.join(" ").trim();
        if (!targetJid) {
            return reply("❌ Please provide a JID.\nExample: `.forward 94771234567` or `.forward 1234567890@g.us`");
        }

        // Normalize JID
        if (!targetJid.includes('@') && !targetJid.includes(':')) {
            targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }

        if (!quoted) {
            return reply("❌ Reply to the message you want to forward.");
        }

        // Get the message key and type
        const quotedMsg = quoted;
        const msgKey = quotedMsg.key;
        const message = quotedMsg.message;

        if (!message) {
            return reply("❌ Could not read the quoted message.");
        }

        // Determine message type
        const type = Object.keys(message).find(key => 
            ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage', 
             'documentMessage', 'audioMessage', 'stickerMessage'].includes(key)
        );

        if (!type) {
            return reply("❌ Unsupported message type.");
        }

        let sendContent = {};

        // Handle text messages
        if (type === 'conversation') {
            sendContent = { text: message.conversation };
        } 
        else if (type === 'extendedTextMessage') {
            sendContent = { text: message.extendedTextMessage.text };
        }
        // Handle media messages by downloading and re-uploading
        else if (['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'].includes(type)) {
            const mediaMsg = message[type];
            const stream = await conn.downloadMediaMessage(quotedMsg);
            if (!stream) {
                return reply("❌ Failed to download media.");
            }

            // For sticker, audio, document, etc.
            if (type === 'stickerMessage') {
                sendContent = { sticker: stream };
            } 
            else if (type === 'audioMessage') {
                sendContent = {
                    audio: stream,
                    mimetype: mediaMsg.mimetype,
                    ptt: mediaMsg.ptt || false
                };
            }
            else if (type === 'documentMessage') {
                sendContent = {
                    document: stream,
                    fileName: mediaMsg.fileName || 'document',
                    mimetype: mediaMsg.mimetype,
                    caption: mediaMsg.caption || ''
                };
            }
            else if (type === 'imageMessage') {
                sendContent = {
                    image: stream,
                    caption: mediaMsg.caption || '',
                    mimetype: mediaMsg.mimetype
                };
            }
            else if (type === 'videoMessage') {
                sendContent = {
                    video: stream,
                    caption: mediaMsg.caption || '',
                    mimetype: mediaMsg.mimetype
                };
            }
        }

        await conn.sendMessage(targetJid, sendContent);
        await reply(`✅ Message forwarded to \`${targetJid}\``);
    } catch (e) {
        console.error(e);
        reply(`❌ Failed: ${e.message}`);
    }
});
