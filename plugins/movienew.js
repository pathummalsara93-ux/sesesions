/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const scraper = require('liyanaarachchi-sinhalasub-scraper-v2');

const userDownloads = new Map();

// ══════════════════════════════════════════════════════════════
// 🔧 THUMBNAIL BUFFER
// ══════════════════════════════════════════════════════════════
async function getThumbnailBuffer(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 10000
        });
        return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
    } catch {
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
// 🎬 MOVIE COMMAND — Using NPM Package
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "movie",
    alias: ["ssub", "sinhalasubtitle", "film"],
    desc: "Download Sinhala subtitled movies (NPM scraper)",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {

    const footer = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";
    const DEFAULT_THUMB = "https://files.catbox.moe/knn0ft.jpg";

    const query = args.join(" ").trim();
    if (!query) {
        return reply(`🎬 Please provide a movie name!\n\nExample: .movie Deadpool${footer}`);
    }

    try {
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // ═══════════════════════════════════════════════════════
        // 🔍 STEP 1: SEARCH — scraper.searchSinhalaSub()
        // ═══════════════════════════════════════════════════════
        console.log(`🔍 Searching: ${query}`);

        const results = await scraper.searchSinhalaSub(query);

        if (!results || !Array.isArray(results) || results.length === 0) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ No movies found for: *${query}*${footer}`);
        }

        console.log(`✅ Found ${results.length} results`);

        // ─────── Format search results ───────
        let list = `〽️ *SINHALASUB SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.slice(0, 10).forEach((v, i) => {
            const title = (v.title || 'Unknown').split("|")[0].trim();
            list += `☣️${i + 1}❭❭⚬ ${title}\n`;
        });
        list += `\nReply with number${footer}`;

        const sent = await conn.sendMessage(from, {
            image: { url: DEFAULT_THUMB },
            caption: list
        }, { quoted: mek });
        const searchMsgId = sent.key.id;

        // ═══════════════════════════════════════════════════════
        // 🔁 SEARCH SELECTION HANDLER
        // ═══════════════════════════════════════════════════════
        const searchHandler = async (msgUpdate) => {
            const upmsg = msgUpdate.messages[0];
            if (!upmsg.message || upmsg.key.remoteJid !== from) return;

            const body = upmsg.message.conversation || upmsg.message.extendedTextMessage?.text;
            const ctx = upmsg.message.extendedTextMessage?.contextInfo;
            if (ctx?.stanzaId !== searchMsgId) return;

            conn.ev.off("messages.upsert", searchHandler);

            const num = parseInt(body);
            const selected = results[num - 1];
            if (!selected) {
                return conn.sendMessage(from, { text: `❎ Invalid number${footer}` }, { quoted: upmsg });
            }

            await conn.sendMessage(from, { react: { text: "📑", key: upmsg.key } });

            const movieTitle = (selected.title || 'Movie').split("|")[0].trim();
            const movieUrl = selected.link;

            console.log(`📥 Getting links: ${movieUrl}`);

            // ═══════════════════════════════════════════════════
            // 📥 STEP 2: GET DOWNLOAD LINKS — scraper.getMovieLinks()
            // ═══════════════════════════════════════════════════
            let downloadLinks;
            try {
                downloadLinks = await scraper.getMovieLinks(movieUrl);
            } catch (e) {
                console.log(`❌ getMovieLinks failed: ${e.message}`);
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *Failed to get download links*\n\n_${e.message}_${footer}`
                }, { quoted: upmsg });
            }

            if (!downloadLinks || !Array.isArray(downloadLinks) || downloadLinks.length === 0) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *No download links found*\n\n_Movie: ${movieTitle}_${footer}`
                }, { quoted: upmsg });
            }

            console.log(`✅ Found ${downloadLinks.length} download links`);

            // ─────── 🖼️ DETAILS CARD ───────
            let cap = `*☘️ ${movieTitle}*\n\n`;
            cap += `*📥 Available Downloads* ➟ *${downloadLinks.length} options*\n`;
            cap += `\n*🎬 Select a quality below:*${footer}`;

            await conn.sendMessage(from, {
                image: { url: DEFAULT_THUMB },
                caption: cap
            }, { quoted: upmsg });

            // ─────── 📋 QUALITY LIST ───────
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            downloadLinks.forEach((d, i) => {
                const label = d.label || d.quality || `Option ${i + 1}`;
                qualityMsg += `*${i + 1}* ☛ ${label}\n`;
            });
            qualityMsg += `\nReply with number${footer}`;

            const sentQuality = await conn.sendMessage(from, { text: qualityMsg }, { quoted: upmsg });
            const qualityMsgId = sentQuality.key.id;

            // ═══════════════════════════════════════════════════
            // 🔽 DOWNLOAD HANDLER
            // ═══════════════════════════════════════════════════
            const dlHandler = async (dlUpdate) => {
                const dlMsg = dlUpdate.messages[0];
                if (!dlMsg.message || dlMsg.key.remoteJid !== from) return;

                const dlBody = dlMsg.message.conversation || dlMsg.message.extendedTextMessage?.text;
                const dlCtx = dlMsg.message.extendedTextMessage?.contextInfo;
                if (dlCtx?.stanzaId !== qualityMsgId) return;

                conn.ev.off("messages.upsert", dlHandler);

                const idx = parseInt(dlBody);
                const target = downloadLinks[idx - 1];
                if (!target) {
                    return conn.sendMessage(from, { text: `❎ Invalid selection${footer}` }, { quoted: dlMsg });
                }

                if (userDownloads.get(from)) {
                    return conn.sendMessage(from, { text: `⏳ Another download running...${footer}` }, { quoted: dlMsg });
                }

                userDownloads.set(from, true);
                await conn.sendMessage(from, { react: { text: "⏳", key: dlMsg.key } });

                try {
                    const finalUrl = target.link || target.url || target.download;
                    const label = target.label || target.quality || 'Unknown';

                    if (!finalUrl || !finalUrl.startsWith('http')) {
                        throw new Error('Invalid download URL');
                    }

                    // ─────── 🧹 SAFE FILENAME ───────
                    const safeName = movieTitle
                        .replace(/[^\w\s\-]/g, '')
                        .replace(/\s+/g, '_')
                        .trim()
                        .slice(0, 50);

                    const safeQuality = label
                        .replace(/[^\w\-|]/g, '')
                        .replace(/\s+/g, '_')
                        .trim()
                        .slice(0, 30);

                    const fileName = `${safeName}_${safeQuality}.mp4`;

                    const docCaption =
                        `*🎬 ${movieTitle}*\n\n` +
                        `*📊 Quality* ➟ *${label}*\n` +
                        `${footer}`;

                    console.log(`📤 Sending: ${fileName}`);
                    console.log(`🔗 URL: ${finalUrl}`);

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: fileName,
                        jpegThumbnail: await getThumbnailBuffer(DEFAULT_THUMB),
                        caption: docCaption
                    }, { quoted: dlMsg });

                    await conn.sendMessage(from, { react: { text: "✅", key: dlMsg.key } });
                    console.log(`✅ Movie sent: ${movieTitle} [${label}]`);

                } catch (err) {
                    console.log(`❌ DL error: ${err.message}`);
                    await conn.sendMessage(from, { react: { text: "❌", key: dlMsg.key } });
                    await conn.sendMessage(from, {
                        text: `❌ *Download failed*\n\n_${err.message}_${footer}`
                    }, { quoted: dlMsg });
                } finally {
                    userDownloads.delete(from);
                }
            };

            conn.ev.on("messages.upsert", dlHandler);
        };

        conn.ev.on("messages.upsert", searchHandler);

    } catch (e) {
        console.log(`❌ Movie plugin error: ${e.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        await reply(`❌ Error: _${e.message}_${footer}`);
    }
});






