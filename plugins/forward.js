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
            return reply("❌ Owner only command");
        }

        let jid = args[0];

        if (!jid) {
            return reply("❌ Example:\n.forward 94771234567");
        }

        // convert number -> jid
        if (!jid.includes("@")) {
            jid = jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        // replied message
        const quoted = m.quoted;

        if (!quoted) {
            return reply("❌ Reply to a message or media");
        }

        // detect type
        const type = quoted.mtype || Object.keys(quoted.message || {})[0];

        // TEXT
        if (type === "conversation" || type === "extendedTextMessage") {

            const text =
                quoted.text ||
                quoted.message?.conversation ||
                quoted.message?.extendedTextMessage?.text;

            await conn.sendMessage(jid, {
                text: text,
                mentions: [jid]
            });

        }

        // IMAGE
        else if (type === "imageMessage") {

            const buffer = await quoted.download();

            await conn.sendMessage(jid, {
                image: buffer,
                caption: quoted.caption || "",
                mentions: [jid]
            });

        }

        // VIDEO
        else if (type === "videoMessage") {

            const buffer = await quoted.download();

            await conn.sendMessage(jid, {
                video: buffer,
                caption: quoted.caption || "",
                mimetype: "video/mp4",
                mentions: [jid]
            });

        }

        // AUDIO
        else if (type === "audioMessage") {

            const buffer = await quoted.download();

            await conn.sendMessage(jid, {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: false
            });

        }

        // DOCUMENT
        else if (type === "documentMessage") {

            const buffer = await quoted.download();

            await conn.sendMessage(jid, {
                document: buffer,
                mimetype: quoted.mimetype,
                fileName: quoted.fileName || "file",
                caption: quoted.caption || ""
            });

        }

        // STICKER
        else if (type === "stickerMessage") {

            const buffer = await quoted.download();

            await conn.sendMessage(jid, {
                sticker: buffer
            });

        }

        // CONTACT
        else if (type === "contactMessage") {

            await conn.sendMessage(jid, {
                contacts: {
                    displayName: quoted.displayName,
                    contacts: [{
                        vcard: quoted.vcard
                    }]
                }
            });

        }

        // UNKNOWN
        else {

            // direct forward fallback
            await conn.sendMessage(jid, {
                forward: quoted.fakeObj
            });

        }

        // success reply
        await reply(`✅ Successfully forwarded to:\n${jid}`);

    } catch (err) {

        console.log(err);

        reply(`❌ Error:\n${err.message}`);

    }

});
