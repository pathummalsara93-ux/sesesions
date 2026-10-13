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
// 🔍 RESOLVE DOWNLOAD URL — follow redirects & verify content
// ══════════════════════════════════════════════════════════════
async function resolveDownloadUrl(url) {
    try {
        console.log(`🔍 Resolving: ${url}`);

        // ⭐ HEAD request — content-type + size check
        const headRes = await axios({
            method: 'HEAD',
            url: url,
            timeout: 15000,
            maxRedirects: 10,   // ⭐ Follow redirects!
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: () => true
        });

        const contentType = headRes.headers['content-type'] || '';
        const contentLength = parseInt(headRes.headers['content-length'] || '0');
        const finalUrl = headRes.request?.res?.responseUrl || url;

        console.log(`📋 Content-Type: ${contentType}`);
        console.log(`📦 Size: ${(contentLength / 1024 / 1024).toFixed(2)} MB`);
        console.log(`🔗 Final URL: ${finalUrl}`);

        // ✅ Real video file
        if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
            if (contentLength > 1024 * 1024) {   // > 1 MB
                return { ok: true, url: finalUrl, size: contentLength, type: contentType };
            }
            return { ok: false, error: `File too small: ${(contentLength / 1024).toFixed(0)} KB`, url: finalUrl };
        }

        // ❌ HTML page — try to extract real link
        if (contentType.includes('text/html')) {
            console.log('⚠️ HTML page detected — extracting real link...');

            const pageRes = await axios.get(finalUrl, {
                timeout: 15000,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const html = pageRes.data;

            // Extract meta refresh, direct links
            const patterns = [
                /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'\s>]+)/i,
                /(https?:\/\/[^\s"'<>]+\.(?:mp4|mkv|avi|mov)[^\s"'<>]*)/i,
                /(https?:\/\/[^\s"'<>]*drive\.google\.com[^\s"'<>]*)/i,
                /(https?:\/\/[^\s"'<>]*mega\.nz[^\s"'<>]*)/i,
                /(https?:\/\/[^\s"'<>]*pixeldrain\.com[^\s"'<>]*)/i,
                /(https?:\/\/[^\s"'<>]*mediafire\.com[^\s"'<>]*)/i,
                /window\.location\.href\s*=\s*["']([^"']+)["']/i,
                /location\.replace\(["']([^"']+)["']\)/i
            ];

            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    const extracted = match[1].replace(/&amp;/g, '&');
                    console.log(`✅ Extracted: ${extracted}`);
                    if (extracted !== url && extracted.startsWith('http')) {
                        // Recursively resolve
                        return await resolveDownloadUrl(extracted);
                    }
                }
            }

            return { ok: false, error: 'Could not extract video link from HTML page', url: finalUrl };
        }

        // ⚠️ Unknown content-type — but might still be video
        if (contentLength > 1024 * 1024) {
            return { ok: true, url: finalUrl, size: contentLength, type: contentType };
        }

        return { ok: false, error: `Unsupported: ${contentType}`, url: finalUrl };

    } catch (e) {
        console.log(`❌ Resolve error: ${e.message}`);
        return { ok: false, error: e.message, url };
    }
}

// ══════════════════════════════════════════════════════════════
// 🎬 MOVIE COMMAND
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "movie",
    alias: ["ssub", "sinhalasubtitle", "film"],
    desc: "Download Sinhala subtitled movies",
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

        // ─────── 🔍 SEARCH ───────
        console.log(`🔍 Searching: ${query}`);
        const results = await scraper.searchSinhalaSub(query);

        if (!results || !Array.isArray(results) || results.length === 0) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ No movies found for: *${query}*${footer}`);
        }

        let list = `〽️ *SINHALASUB SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.slice(0, 10).forEach((v, i) => {
            list += `☣️${i + 1}❭❭⚬ ${(v.title || 'Unknown').split("|")[0].trim()}\n`;
        });
        list += `\nReply with number${footer}`;

        const sent = await conn.sendMessage(from, {
            image: { url: DEFAULT_THUMB },
            caption: list
        }, { quoted: mek });
        const searchMsgId = sent.key.id;

        // ═══════════════════════════════════════════════════
        // 🔁 SEARCH SELECTION
        // ═══════════════════════════════════════════════════
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

            // ─────── 📥 GET DOWNLOAD LINKS ───────
            let downloadLinks;
            try {
                downloadLinks = await scraper.getMovieLinks(movieUrl);
            } catch (e) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *Failed to get links*\n\n_${e.message}_${footer}`
                }, { quoted: upmsg });
            }

            if (!downloadLinks || !downloadLinks.length) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *No download links found*${footer}`
                }, { quoted: upmsg });
            }

            // ─────── 📋 QUALITY LIST ───────
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            downloadLinks.forEach((d, i) => {
                qualityMsg += `*${i + 1}* ☛ ${d.label || d.quality || `Option ${i + 1}`}\n`;
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
                await conn.sendMessage(from, {
                    text: `🔍 *Resolving download link...*`
                }, { quoted: dlMsg });

                try {
                    const rawUrl = target.link || target.url || target.download;
                    const label = target.label || target.quality || 'Unknown';

                    if (!rawUrl || !rawUrl.startsWith('http')) {
                        throw new Error('Invalid URL from scraper');
                    }

                    // ⭐ RESOLVE — redirects + verify
                    const resolved = await resolveDownloadUrl(rawUrl);

                    // ❌ Link එක resolve කරන්න බැරි නම් → user ට link එක යවන්න
                    if (!resolved.ok) {
                        await conn.sendMessage(from, { react: { text: "⚠️", key: dlMsg.key } });

                        return conn.sendMessage(from, {
                            text:
                                `⚠️ *Direct download link එක නැහැ*\n\n` +
                                `📌 *Movie:* ${movieTitle}\n` +
                                `📊 *Quality:* ${label}\n\n` +
                                `🔗 *Manual link:*\n${rawUrl}\n\n` +
                                `_මේ link එක browser එකෙන් open කරන්න._\n` +
                                `_Reason: ${resolved.error}_${footer}`
                        }, { quoted: dlMsg });
                    }

                    // ✅ Resolved — send document
                    const sizeMB = (resolved.size / 1024 / 1024).toFixed(2);
                    console.log(`✅ Direct link resolved: ${sizeMB} MB`);

                    const safeName = movieTitle.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '_').trim().slice(0, 50);
                    const safeQuality = label.replace(/[^\w\-]/g, '').replace(/\s+/g, '_').trim().slice(0, 30);
                    const fileName = `${safeName}_${safeQuality}.mp4`;

                    const docCaption =
                        `*🎬 ${movieTitle}*\n\n` +
                        `*📊 Quality* ➟ *${label}*\n` +
                        `*💾 Size* ➟ *${sizeMB} MB*\n` +
                        `${footer}`;

                    await conn.sendMessage(from, {
                        document: { url: resolved.url },
                        mimetype: "video/mp4",
                        fileName: fileName,
                        jpegThumbnail: await getThumbnailBuffer(DEFAULT_THUMB),
                        caption: docCaption
                    }, { quoted: dlMsg });

                    await conn.sendMessage(from, { react: { text: "✅", key: dlMsg.key } });
                    console.log(`✅ Movie sent: ${fileName} (${sizeMB} MB)`);

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
