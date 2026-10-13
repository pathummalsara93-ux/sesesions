/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

const userDownloads = new Map();

// ══════════════════════════════════════════════════════════════
// 🔧 SAFE AXIOS — clean error messages
// ══════════════════════════════════════════════════════════════
async function safeAxios(url, options = {}) {
    try {
        const res = await axios.get(url, {
            timeout: 20000,
            ...options
        });
        return { ok: true, data: res.data };
    } catch (e) {
        // Clean error message — no huge stack trace
        const status = e.response?.status;
        const msg = e.response?.data?.error || e.message;
        return { ok: false, status, error: msg };
    }
}

cmd({
    pattern: "movie",
    alias: ["ssub", "sinhalasubtitle"],
    desc: "Download Sinhala subtitled movies",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {

    const footer = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";
    const API_BASE = 'https://vajira-mv-apikeys.netlify.app/api/sinhalasubs';
    const API_KEY = 'vajiraofficial';

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

    const query = args.join(" ").trim();
    if (!query) {
        await reply(`🎬 Please provide a movie name!\n\nExample: .movie Leo${footer}`);
        return;
    }

    try {
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // ─────── 🔍 SEARCH ───────
        const searchRes = await safeAxios(`${API_BASE}/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`);
        if (!searchRes.ok) {
            console.log(`⚠️ Search API failed: ${searchRes.error}`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ *Search failed.*\n\n_Reason:_ ${searchRes.error}${footer}`);
        }

        const results = searchRes.data?.data?.data?.data;
        if (!results?.length) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ No movies found for: *${query}*${footer}`);
        }

        // ─────── 📋 LIST ───────
        let list = `〽️ *SINHALASUB SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.forEach((v, i) => {
            list += `☣️${i + 1}❭❭⚬ ${v.title.split("|")[0].trim()}\n`;
        });
        list += `\nReply with number${footer}`;

        const sent = await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/knn0ft.jpg" },
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

            // ─────── 📑 DETAILS ───────
            const detailRes = await safeAxios(`${API_BASE}/movie?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`);
            if (!detailRes.ok) {
                console.log(`⚠️ Detail API failed: ${detailRes.error}`);
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *Details API failed.*\n\n_Reason:_ ${detailRes.error}${footer}`
                }, { quoted: upmsg });
            }

            const data = detailRes.data?.data?.data;
            const movie = data?.mainDetails;
            const links = data?.dllinks?.DownloadLinks;

            if (!movie || !links?.length) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, { text: `❌ No details found.${footer}` }, { quoted: upmsg });
            }

            // ─────── 🖼️ DETAILS CARD ───────
            let cap = `*☘️ ${movie.maintitle || 'N/A'}*\n\n`;
            if (movie.imdbRating) cap += `*⭐ IMDb* ➟ *${movie.imdbRating}*\n`;
            if (movie.dateCreated) cap += `*📅 Release* ➟ *${movie.dateCreated}*\n`;
            if (movie.country) cap += `*🌎 Country* ➟ *${movie.country}*\n`;
            if (movie.runtime) cap += `*⏱️ Duration* ➟ *${movie.runtime}*\n`;
            if (movie.genres?.length) cap += `*🎭 Genres* ➟ *${movie.genres.join(', ')}*\n`;
            if (movie.director) cap += `*👨🏻‍💼 Director* ➟ *${movie.director}*\n`;
            if (movie.cast) cap += `*🕵️‍♂️ Cast* ➟ *${movie.cast}*\n`;
            if (movie.description) cap += `\n*📖 Description:*\n*${movie.description}*\n`;
            cap += footer;

            await conn.sendMessage(from, {
                image: { url: movie.imageUrl },
                caption: cap
            }, { quoted: upmsg });

            // ─────── 📥 QUALITY LIST ───────
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            links.forEach((d, i) => {
                qualityMsg += `*${i + 1}* ☛ ${d.quality} (${d.size})\n`;
            });
            qualityMsg += `\nReply with number${footer}`;

            const sentQuality = await conn.sendMessage(from, { text: qualityMsg }, { quoted: upmsg });
            const qualityMsgId = sentQuality.key.id;

            // ═══════════════════════════════════════════════════════
            // 🔽 DOWNLOAD HANDLER
            // ═══════════════════════════════════════════════════════
            const dlHandler = async (dlUpdate) => {
                const dlMsg = dlUpdate.messages[0];
                if (!dlMsg.message || dlMsg.key.remoteJid !== from) return;

                const dlBody = dlMsg.message.conversation || dlMsg.message.extendedTextMessage?.text;
                const dlCtx = dlMsg.message.extendedTextMessage?.contextInfo;
                if (dlCtx?.stanzaId !== qualityMsgId) return;

                conn.ev.off("messages.upsert", dlHandler);

                const idx = parseInt(dlBody);
                const target = links[idx - 1];
                if (!target) {
                    return conn.sendMessage(from, { text: `❎ Invalid selection${footer}` }, { quoted: dlMsg });
                }

                if (userDownloads.get(from)) {
                    return conn.sendMessage(from, { text: `⏳ Another download running...${footer}` }, { quoted: dlMsg });
                }

                userDownloads.set(from, true);
                await conn.sendMessage(from, { react: { text: "⏳", key: dlMsg.key } });

                try {
                    // ⭐ Clean download request
                    const dlRes = await safeAxios(`${API_BASE}/download?url=${encodeURIComponent(target.link)}&apikey=${API_KEY}`);

                    // ⭐ If API fails — give user an alternative
                    if (!dlRes.ok) {
                        console.log(`⚠️ Download API failed (${dlRes.status}): ${dlRes.error}`);
                        await conn.sendMessage(from, { react: { text: "⚠️", key: dlMsg.key } });

                        return conn.sendMessage(from, {
                            text:
                                `⚠️ *Download API is currently down*\n\n` +
                                `📌 *Movie:* ${movie.maintitle}\n` +
                                `📊 *Quality:* ${target.quality}\n` +
                                `💾 *Size:* ${target.size}\n\n` +
                                `🔗 *Try direct link:*\n${target.link}\n\n` +
                                `_API error: ${dlRes.error || 'Server error'}_${footer}`
                        }, { quoted: dlMsg });
                    }

                    const finalUrl = dlRes.data?.data?.data?.link || dlRes.data?.link || dlRes.data?.url;
                    if (!finalUrl) throw new Error("No download link in response");

                    const docCaption = `*${movie.maintitle}*\n\n*Quality* *[${target.quality}]*\n${footer}`;

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: `${movie.maintitle}_${target.quality}.mp4`,
                        jpegThumbnail: await getThumbnailBuffer(movie.imageUrl),
                        caption: docCaption
                    }, { quoted: dlMsg });

                    await conn.sendMessage(from, { react: { text: "✅", key: dlMsg.key } });
                    console.log(`✅ Movie sent: ${movie.maintitle} [${target.quality}]`);

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
        await reply(`❌ API Error: _${e.message}_${footer}`);
    }
});
