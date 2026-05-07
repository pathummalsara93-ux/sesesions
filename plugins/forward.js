const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward any replied message (text, media, location, contact, poll, etc.) to a JID.",
    react: "📤",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Only owner.");

        let targetJid = args.join(" ").trim();
        if (!targetJid) return reply("❌ JID required.\nExample: `.forward 94771234567`");
        if (!targetJid.includes('@')) targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        // Get quoted message
        let quotedMsg = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) return reply("❌ Reply to a message.");

        const type = Object.keys(quotedMsg)[0];
        let sendContent = {};

        // Helper to add original timestamp (optional)
        const originalTimestamp = m.quoted?.messageTimestamp ? new Date(m.quoted.messageTimestamp * 1000).toLocaleString() : null;

        switch (type) {
            case 'conversation':
                sendContent = { text: quotedMsg.conversation };
                break;
            case 'extendedTextMessage':
                sendContent = { text: quotedMsg.extendedTextMessage.text };
                break;
            case 'imageMessage':
            case 'videoMessage':
            case 'documentMessage':
            case 'stickerMessage':
            case 'audioMessage': {
                const media = quotedMsg[type];
                const stream = await conn.downloadMediaMessage({
                    key: { remoteJid: from, fromMe: false, id: 'fake' },
                    message: { [type]: media }
                });
                if (!stream) throw new Error("Download failed");
                if (type === 'imageMessage') sendContent = { image: stream, caption: media.caption || '' };
                else if (type === 'videoMessage') sendContent = { video: stream, caption: media.caption || '' };
                else if (type === 'documentMessage') sendContent = { document: stream, fileName: media.fileName, mimetype: media.mimetype, caption: media.caption || '' };
                else if (type === 'stickerMessage') sendContent = { sticker: stream };
                else if (type === 'audioMessage') sendContent = { audio: stream, mimetype: media.mimetype, ptt: media.ptt || false };
                break;
            }
            case 'locationMessage': {
                const loc = quotedMsg.locationMessage;
                sendContent = { text: `📍 *Location*\nLat: ${loc.degreesLatitude}\nLng: ${loc.degreesLongitude}\n${loc.name ? 'Name: ' + loc.name : ''}${loc.address ? '\nAddress: ' + loc.address : ''}` };
                break;
            }
            case 'contactMessage': {
                const contact = quotedMsg.contactMessage;
                sendContent = { text: `👤 *Contact*\nName: ${contact.displayName}\nNumber: ${contact.vcard?.split('TEL:')[1]?.split('\n')[0] || 'unknown'}` };
                break;
            }
            case 'pollCreationMessage': {
                const poll = quotedMsg.pollCreationMessage;
                let pollText = `📊 *Poll:* ${poll.name}\nOptions:\n`;
                poll.options.forEach((opt, i) => pollText += `${i+1}. ${opt.optionName}\n`);
                sendContent = { text: pollText };
                break;
            }
            case 'groupInviteMessage': {
                const invite = quotedMsg.groupInviteMessage;
                sendContent = { text: `📎 *Group Invite*\nGroup: ${invite.groupName}\nInvite Code: ${invite.inviteCode}\nExpiry: ${invite.inviteExpiration || 'Never'}` };
                break;
            }
            default:
                // Try to convert to text
                sendContent = { text: `⚠️ Unsupported type: ${type}\nRaw: ${JSON.stringify(quotedMsg)}` };
        }

        // Optional: append original message time
        if (originalTimestamp && sendContent.text) {
            sendContent.text += `\n⏰ Original time: ${originalTimestamp}`;
        }

        await conn.sendMessage(targetJid, sendContent);
        await reply(`✅ Forwarded to \`${targetJid}\``);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});
