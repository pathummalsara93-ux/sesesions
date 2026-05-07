const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fw"],
    desc: "Forward replied message/media to a JID",
    react: "📤",
    category: "utility",
    filename: __filename
},
async (conn, mek, m, {
    from,
    args,
    reply,
    isOwner
}) => {

    try {

        if (!isOwner) {
            return reply("❌ Only owner can use this command");
        }

        let jid = args[0];

        if (!jid) {
            return reply("❌ Example:\n.forward 94771234567");
        }

        // Convert number -> WhatsApp JID
        if (!jid.includes("@")) {
            jid = jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        // Replied message
        const quoted = m.quoted;

        if (!quoted) {
            return reply("❌ Reply to a message or media");
        }

        // Detect message type
        const type =
            quoted.mtype ||
            Object.keys(quoted.message || {})[0];

        // =========================
        // TEXT MESSAGE
        // =========================

        if (
            type === "conversation" ||
            type === "extendedTextMessage"
        ) {

            const text =
                quoted.text ||
                quoted.message?.conversation ||
                quoted.message?.extendedTextMessage?.text ||
                " ";

            await conn.sendMessage(jid, {
                text: text,
                mentions: [jid]
            });

        }

        // =========================
        // IMAGE
        // =========================

        else if (type === "imageMessage") {

            const buffer = await conn.downloadMediaMessage(
                quoted,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                }
            );

            await conn.sendMessage(jid, {
                image: buffer,
                caption: quoted.caption || "",
                mentions: [jid]
            });

        }

        // =========================
        // VIDEO / MP4
        // =========================

        else if (type === "videoMessage") {

            const buffer = await conn.downloadMediaMessage(
                quoted,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                }
            );

            await conn.sendMessage(jid, {
                video: buffer,
                mimetype: "video/mp4",
                caption: quoted.caption || "",
                mentions: [jid]
            });

        }

        // =========================
        // AUDIO / MP3
        // =========================

        else if (type === "audioMessage") {

            const buffer = await conn.downloadMediaMessage(
                quoted,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                }
            );

            await conn.sendMessage(jid, {
                audio: buffer,
                mimetype: quoted.mimetype || "audio/mp4",
                ptt: quoted.ptt || false
            });

        }

        // =========================
        // DOCUMENT
        // =========================

        else if (type === "documentMessage") {

            const buffer = await conn.downloadMediaMessage(
                quoted,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                }
            );

            await conn.sendMessage(jid, {
                document: buffer,
                mimetype: quoted.mimetype,
                fileName: quoted.fileName || "file",
                caption: quoted.caption || ""
            });

        }

        // =========================
        // STICKER
        // =========================

        else if (type === "stickerMessage") {

            const buffer = await conn.downloadMediaMessage(
                quoted,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: conn.updateMediaMessage
                }
            );

            await conn.sendMessage(jid, {
                sticker: buffer
            });

        }

        // =========================
        // CONTACT CARD
        // =========================

        else if (type === "contactMessage") {

            await conn.sendMessage(jid, {
                contacts: {
                    displayName: quoted.displayName || "Contact",
                    contacts: [{
                        vcard: quoted.vcard
                    }]
                }
            });

        }

        // =========================
        // FALLBACK FOR UNKNOWN
        // =========================

        else {

            await conn.sendMessage(
                jid,
                {
                    forward: quoted.fakeObj
                },
                {
                    quoted: mek
                }
            );

        }

        // Success message
        await reply(`✅ Successfully forwarded to:\n${jid}`);

    } catch (err) {

        console.log(err);

        reply(`❌ Error:\n${err.message}`);

    }

});
