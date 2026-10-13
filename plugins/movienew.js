/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const cheerio = require('cheerio');

const userDownloads = new Map();

// ══════════════════════════════════════════════════════════════
// 🔧 SAFE AXIOS
// ══════════════════════════════════════════════════════════════
async function safeAxios(url, options = {}) {
    try {
        const res = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            ...options
        });
        return { ok: true, data: res.data };
    } catch (e) {
        const status = e.response?.status;
        const msg = e.response?.data?.error || e.message;
        return { ok: false, status, error: msg };
    }
}

// ══════════════════════════════════════════════════════════════
// 🔍 SCRAPE — Extract real download links from sinhalasub.lk
// ══════════════════════════════════════════════════════════════
async function scrapeDownloadLinks(sinhalasubUrl) {
    try {
        console.log(`🔍 Scraping: ${sinhalasubUrl}`);
        const res = await safeAxios(sinhalasubUrl);
        if (!res.ok) throw new Error(`Page fetch failed: ${res.error}`);

        const $ = cheerio.load(res.data);
        const foundLinks = [];

        // ─────────────────────────────────────────────
        // 🎯 Method 1: Look for common download buttons
        // ─────────────────────────────────────────────
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (!href) return;
            if (href.startsWith('#') || href.startsWith('javascript')) return;
            if (href.includes('sinhalasub.lk/links/')) return;

            // Match external hosts
            const hosts = [
                'drive.google.com', 'mega.nz', 'pixeldrain.com',
                '1drv.ms', 'onedrive.live.com', 'mediafire.com',
                'dropbox.com', 'disk.yandex', 'streamtape', 'dood'
            ];

            const isExternal = hosts.some(h => href.includes(h));

            // Match quality keywords
            const qualityMatch = text.match(/(\d{3,4}p|HD|FHD|SD|4K)/i);

            if (isExternal || qualityMatch) {
                foundLinks.push({
                    quality: qualityMatch ? qualityMatch[0] : (text || 'Download'),
                    url: href,
                    source: new URL(href).hostname
                });
            }
        });

        // ─────────────────────────────────────────────
        // 🎯 Method 2: Look for embedded iframes
        // ─────────────────────────────────────────────
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.startsWith('#')) {
                const hosts = ['drive.google', 'mega', 'pixeldrain', 'mediafire'];
                if (hosts.some(h => src.includes(h))) {
                    foundLinks.push({
                        quality: 'Embedded',
                        url: src,
                        source: 'iframe'
                    });
                }
            }
        });

        // ─────────────────────────────────────────────
        // 🎯 Method 3: Look for data attributes with links
        // ─────────────────────────────────────────────
        $('[data-link], [data-url], [data-href]').each((i, el) => {
            const link = $(el).attr('data-link') || $(el).attr('data-url') || $(el).attr('data-href');
            if (link && link.startsWith('http')) {
                foundLinks.push({
                    quality: $(el).text().trim() || 'Download',
                    url: link,
                    source: 'data-attr'
                });
            }
        });

        // ─────────────────────────────────────────────
        // 🎯 Method 4: Regex fallback — raw HTML scan
        // ─────────────────────────────────────────────
        if (foundLinks.length === 0) {
            const html = res.data;
            const regex = /https?:\/\/(?:drive\.google\.com|mega\.nz|pixeldrain\.com|mediafire\.com|1drv\.ms|dropbox\.com)[^\s"'<>]+/gi;
            const matches = html.match(regex) || [];
            matches.forEach(url => {
                foundLinks.push({
                    quality: 'Direct',
                    url: url.replace(/[\\'"]+$/, ''),
                    source: new URL(url).hostname
                });
            });
        }

        console.log(`✅ Found ${foundLinks.length} download links`);
        return foundLinks;
    } catch (e) {
        console.log(`❌ Scrape error: ${e.message}`);
        return [];
    }
}

// ══════════════════════════════════════════════════════════════
// 🎬 MOVIE COMMAND
// ══════════════════════════════════════════════════════════════
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
            const { data } = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
            return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
        } catch { return null; }
    }

    const query = args.join(" ").trim();
    if (!query) {
        return reply(`🎬 Please provide a movie name!\n\nExample: .movie Leo${footer}`);
    }

    try {
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // ─────── 🔍 SEARCH ───────
        const searchRes = await safeAxios(`${API_BASE}/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`);
        if (!searchRes.ok) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ *Search failed.*\n\n_${searchRes.error}_${footer}`);
        }

        const results = searchRes.data?.data?.data?.data;
        if (!results?.length) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ No movies found for: *${query}*${footer}`);
        }

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

            // ─────── 📑 DETAILS ───────
            const detailRes = await safeAxios(`${API_BASE}/movie?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`);
            if (!detailRes.ok) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, { text: `❌ Details failed: _${detailRes.error}_${footer}` }, { quoted: upmsg });
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

            // ═══════════════════════════════════════════════════
            // 🔽 DOWNLOAD HANDLER — DIRECT SCRAPE (no API)
            // ═══════════════════════════════════════════════════
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
                await conn.sendMessage(from, {
                    text: `🔍 *Fetching download link...*\n\n_Method: Direct Scrape_`
                }, { quoted: dlMsg });

                try {
                    // ⭐ DIRECT SCRAPE — sinhalasub.lk page එකෙන් link එක ගන්නවා
                    const scrapedLinks = await scrapeDownloadLinks(target.link);

                    let finalUrl = null;

                    // Best match හොයන්න — quality එකට closest
                    if (scrapedLinks.length > 0) {
                        // Quality match try
                        const q = target.quality || '';
                        const qNum = q.match(/(\d{3,4})p/)?.[1];
                        const matched = scrapedLinks.find(l =>
                            qNum && l.quality.includes(qNum + 'p')
                        );
                        finalUrl = matched?.url || scrapedLinks[0].url;
                    }

                    // ⭐ Fallback: Try Vajira API if scrape fails
                    if (!finalUrl) {
                        console.log('⚠️ Scrape failed, trying Vajira API...');
                        const dlRes = await safeAxios(`${API_BASE}/download?url=${encodeURIComponent(target.link)}&apikey=${API_KEY}`);
                        if (dlRes.ok) {
                            finalUrl = dlRes.data?.data?.data?.link || dlRes.data?.link;
                        }
                    }

                    // ⭐ Final check
                    if (!finalUrl) {
                        await conn.sendMessage(from, { react: { text: "⚠️", key: dlMsg.key } });
                        return conn.sendMessage(from, {
                            text:
                                `⚠️ *Download link එක හොයාගන්න බැහැ*\n\n` +
                                `📌 Movie: ${movie.maintitle}\n` +
                                `📊 Quality: ${target.quality}\n` +
                                `💾 Size: ${target.size}\n\n` +
                                `🔗 *Source page:*\n${target.link}\n\n` +
                                `_Site එකේ structure එක වෙනස් වෙලා ඇති. Admin ට කියන්න._${footer}`
                        }, { quoted: dlMsg });
                    }

                    // ─────── 📤 SEND DOCUMENT ───────
                    const docCaption = `*${movie.maintitle}*\n\n*Quality* *[${target.quality}]*\n${footer}`;
                    const fileName = `${movie.maintitle.replace(/[^\w\s\-]/g, '').trim()}_${target.quality}.mp4`;

                    console.log(`📤 Sending document: ${fileName}`);
                    console.log(`🔗 URL: ${finalUrl}`);

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: fileName,
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
        await reply(`❌ Error: _${e.message}_${footer}`);
    }
});
