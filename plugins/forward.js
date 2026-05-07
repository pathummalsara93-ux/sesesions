const { cmd } = require('../command');
const fs = require('fs');
const axios = require('axios');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward any message (text, image, video, document, sticker, audio, url-type) to a JID. Reply to a message and use .forward <jid>",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only bot owner can use this.");

        let targetJid = args.join(" ").trim();
        if (!targetJid) return reply("❌ Provide JID. Example: `.forward 94771234567`");
        if (!targetJid.includes('@')) targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        // Get quoted message (multiple possible locations)
        let quotedMsg = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) return reply("❌ Reply to a message first.");

        // Determine type (including custom 'url' type)
        let type = Object.keys(quotedMsg)[0];
        
        // If type is 'url', treat as a media message (video/image/document)
        if (type === 'url') {
            // The 'url' object contains directPath, fileSha256, mediaKey, etc.
            // We need to download using conn.downloadMediaMessage but with a fake message structure
            const urlObj = quotedMsg.url;
            // Create a fake message object that looks like a videoMessage
            const fakeMsg = {
                key: { remoteJid: from, fromMe: false, id: 'fake' },
                message: {
                    videoMessage: {
                        url: urlObj.url,
                        mimetype: urlObj.mimetype || 'video/mp4',
                        fileSha256: urlObj.fileSha256,
                        fileLength: urlObj.fileLength,
                        mediaKey: urlObj.mediaKey,
                        fileName: urlObj.fileName || 'media.mp4',
                        caption: urlObj.caption || '',
                        jpegThumbnail: urlObj.jpegThumbnail
                    }
                }
            };
            const stream = await conn.downloadMediaMessage(fakeMsg);
            if (!stream) throw new Error("Download failed");
            await conn.sendMessage(targetJid, {
                video: stream,
                caption: urlObj.caption || '',
                mimetype: urlObj.mimetype || 'video/mp4',
                fileName: urlObj.fileName || 'video.mp4'
            });
            await reply(`✅ Forwarded video to ${targetJid}`);
            return;
        }

        // Handle standard types (conversation, extendedTextMessage, imageMessage, etc.)
        if (type === 'conversation') {
            await conn.sendMessage(targetJid, { text: quotedMsg.conversation });
        } else if (type === 'extendedTextMessage') {
            await conn.sendMessage(targetJid, { text: quotedMsg.extendedTextMessage.text });
        } else if (['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage', 'audioMessage'].includes(type)) {
            const mediaMsg = quotedMsg[type];
            const stream = await conn.downloadMediaMessage({
                key: { remoteJid: from, fromMe: false, id: 'fake' },
                message: { [type]: mediaMsg }
            });
            if (!stream) throw new Error("Download failed");
            let sendContent = {};
            if (type === 'imageMessage') sendContent = { image: stream, caption: mediaMsg.caption || '' };
            else if (type === 'videoMessage') sendContent = { video: stream, caption: mediaMsg.caption || '' };
            else if (type === 'documentMessage') sendContent = { document: stream, fileName: mediaMsg.fileName, mimetype: mediaMsg.mimetype, caption: mediaMsg.caption || '' };
            else if (type === 'stickerMessage') sendContent = { sticker: stream };
            else if (type === 'audioMessage') sendContent = { audio: stream, mimetype: mediaMsg.mimetype, ptt: mediaMsg.ptt || false };
            await conn.sendMessage(targetJid, sendContent);
        } else {
            // Unknown type – send raw JSON for debugging
            await conn.sendMessage(targetJid, { text: `Unsupported type: ${type}\nRaw: ${JSON.stringify(quotedMsg)}` });
        }
        await reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
        console.error(e);
        reply(`❌ Failed: ${e.message}`);
    }
});
