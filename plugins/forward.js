const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward any message (text, image, video, document, sticker, audio, url-type) to a JID. Reply and use .forward <jid>",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only bot owner can use this.");

        let targetJid = args.join(" ").trim();
        if (!targetJid) return reply("❌ Provide JID. Example: `.forward 94771234567`");
        if (!targetJid.includes('@')) targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        // Get replied message
        let quotedMsg = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) return reply("❌ Reply to a message first.");

        const type = Object.keys(quotedMsg)[0];

        // Special handling for 'url' type (custom media from some bots)
        if (type === 'url') {
            const urlData = quotedMsg.url;
            // Build a fake videoMessage structure so we can download it
            const fakeMsg = {
                key: { remoteJid: from, fromMe: false, id: 'fake' },
                message: {
                    videoMessage: {
                        url: urlData.url,
                        mimetype: urlData.mimetype || 'video/mp4',
                        fileSha256: urlData.fileSha256,
                        fileLength: urlData.fileLength,
                        mediaKey: urlData.mediaKey,
                        fileName: urlData.fileName || 'media.mp4',
                        caption: urlData.caption || '',
                        jpegThumbnail: urlData.jpegThumbnail
                    }
                }
            };
            const stream = await conn.downloadMediaMessage(fakeMsg);
            if (!stream) throw new Error("Download failed");
            await conn.sendMessage(targetJid, {
                video: stream,
                caption: urlData.caption || '',
                mimetype: urlData.mimetype || 'video/mp4',
                fileName: urlData.fileName || 'video.mp4'
            });
            return reply(`✅ Forwarded video to ${targetJid}`);
        }

        // Standard types
        if (type === 'conversation') {
            await conn.sendMessage(targetJid, { text: quotedMsg.conversation });
        } else if (type === 'extendedTextMessage') {
            await conn.sendMessage(targetJid, { text: quotedMsg.extendedTextMessage.text });
        } else if (['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage', 'audioMessage'].includes(type)) {
            const media = quotedMsg[type];
            const stream = await conn.downloadMediaMessage({
                key: { remoteJid: from, fromMe: false, id: 'fake' },
                message: { [type]: media }
            });
            if (!stream) throw new Error("Download failed");
            let content = {};
            if (type === 'imageMessage') content = { image: stream, caption: media.caption || '' };
            else if (type === 'videoMessage') content = { video: stream, caption: media.caption || '' };
            else if (type === 'documentMessage') content = { document: stream, fileName: media.fileName, mimetype: media.mimetype, caption: media.caption || '' };
            else if (type === 'stickerMessage') content = { sticker: stream };
            else if (type === 'audioMessage') content = { audio: stream, mimetype: media.mimetype, ptt: media.ptt || false };
            await conn.sendMessage(targetJid, content);
        } else {
            await conn.sendMessage(targetJid, { text: `⚠️ Unsupported type: ${type}\nRaw: ${JSON.stringify(quotedMsg)}` });
        }
        await reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
        console.error(e);
        reply(`❌ Failed: ${e.message}`);
    }
});
