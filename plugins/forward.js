const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward any message (text, image, video, interactive, url) to a JID. Reply and use .forward <jid>",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only bot owner can use this.");

        let targetJid = args.join(" ").trim();
        if (!targetJid) return reply("❌ Provide JID. Example: `.forward 94771234567`");
        if (!targetJid.includes('@')) targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        let quotedMsg = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) return reply("❌ Reply to a message first.");

        const type = Object.keys(quotedMsg)[0];

        // 1. interactiveAnnotations (image with buttons)
        if (type === 'interactiveAnnotations') {
            const data = quotedMsg.interactiveAnnotations;
            const imageUrl = data.url;
            const caption = data.caption || '';
            // Download image using axios
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            await conn.sendMessage(targetJid, {
                image: buffer,
                caption: caption
            });
            return reply(`✅ Forwarded interactive image to ${targetJid}`);
        }

        // 2. custom 'url' type (video)
        if (type === 'url') {
            const urlData = quotedMsg.url;
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

        // 3. Standard text
        if (type === 'conversation') {
            await conn.sendMessage(targetJid, { text: quotedMsg.conversation });
        }
        else if (type === 'extendedTextMessage') {
            await conn.sendMessage(targetJid, { text: quotedMsg.extendedTextMessage.text });
        }
        // 4. Standard media
        else if (['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage', 'audioMessage'].includes(type)) {
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
        }
        else {
            await conn.sendMessage(targetJid, { text: `⚠️ Unsupported type: ${type}\nRaw: ${JSON.stringify(quotedMsg).slice(0, 500)}` });
        }
        await reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
        console.error(e);
        reply(`❌ Failed: ${e.message}`);
    }
});
