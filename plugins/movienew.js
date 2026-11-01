const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════
const API_BASE = "https://sinhalasub-api-nine.vercel.app";
const API_KEY  = "sk_ssub_unlimited_eny64b2kgt03r6y4"; // <--- ඔයාගේ API Key එක මෙතන දාන්න (sk_ssub_unlimited_...)

const FOOTER = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";
const userDownloads = new Map();

// ─────────────────────────────────────────────
// Helper 1: 502 Error Fix (Retry Logic)
// ─────────────────────────────────────────────
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`📡 API Call (Attempt ${i + 1}/${retries}):`, url);
            const res = await axios.get(url, { 
                timeout: 45000,
                headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' }
            });
            return res;
        } catch (err) {
            const is502 = err.response?.status === 502;
            const isTimeout = err.code === 'ECONNABORTED' || err.message.includes('timeout');
            
            if ((is502 || isTimeout) && i < retries - 1) {
                console.log(`⚠️ 502/Timeout Error. Retrying in 3s... (${retries - i - 1} left)`);
                await new Promise(r => setTimeout(r, 3000));
            } else {
                throw err;
            }
        }
    }
}

// ─────────────────────────────────────────────
// Helper 2: Thumbnail Buffer
// ─────────────────────────────────────────────
async function getThumbnailBuffer(url) {
    if (!url) return null;
    try {
        const cleanUrl = url.trim();
        const { data } = await axios.get(cleanUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────
// Helper 3: Ask user for selection (Reply)
// ─────────────────────────────────────────────
async function askSelection(conn, from, mek, headerText, items, footer) {
    let list = `${headerText}\n\n`;
    items.forEach((v, i) => {
        let label = v.englishTitle || v.title || v.name || 'Unknown';
        list += `*${i + 1}* ➪ ${label}${v.size ? ` [${v.size}]` : ''}\n`;
    });
    list += `\nReply with number${footer}`;

    const sent = await conn.sendMessage(from, { text: list }, { quoted: mek });

    return new Promise((resolve, reject) => {
        const handler = async (update) => {
            const msg = update.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;

            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const ctx = msg.message.extendedTextMessage?.contextInfo;

            if (ctx?.stanzaId !== sent.key.id) return;

            conn.ev.off("messages.upsert", handler);

            const idx = parseInt(body) - 1;
            if (isNaN(idx) || !items[idx]) {
                await conn.sendMessage(from, { text: `❎ Invalid selection.${footer}` }, { quoted: msg });
                return reject(new Error("INVALID_SELECTION"));
            }
            resolve({ item: items[idx], msg });
        };

        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
            reject(new Error("TIMEOUT"));
        }, 60000);
    });
}

// ─────────────────────────────────────────────
// Helper 4: Send Document
// ─────────────────────────────────────────────
async function sendDocument(conn, from, mek, url, title, quality, thumbUrl, footer) {
    const caption = `*${title}*\n\n*Quality:* [${quality}]\n${footer}`;
    try {
        await conn.sendMessage(from, {
            document: { url },
            mimetype: "video/mp4",
            fileName: `${title}_${quality}.mp4`.replace(/[^a-zA-Z0-9_.-]/g, '_'),
            jpegThumbnail: await getThumbnailBuffer(thumbUrl),
            caption
        }, { quoted: mek });
    } catch (err) {
        await conn.sendMessage(from, { text: `❌ File send error: ${err.message}${footer}` }, { quoted: mek });
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "movie",
    alias: ["film", "mv", "tv"],
    desc: "Search & Download Movies / TV Series",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {

    const query = args.join(" ").trim();
    if (!query) {
        return reply(`🎬 කරුණාකර Movie එකක් හෝ TV Series එකක් නම දෙන්න!\n\nExample: .movie Avatar${FOOTER}`);
    }

    try {
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

        // ═══════════════════════════════════════
        // STEP 1: SEARCH API
        // ═══════════════════════════════════════
        const searchUrl = `${API_BASE}/api/v1/movies/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        const searchRes = await fetchWithRetry(searchUrl);

        if (!searchRes.data?.success || !searchRes.data?.results?.length) {
            return reply(`❌ "${query}" සඳහා කිසිවක් හමු නොවීය.${FOOTER}`);
        }

        const results = searchRes.data.results;

        // ═══════════════════════════════════════
        // STEP 2: SEARCH LIST SELECTION
        // ═══════════════════════════════════════
        const { item: selected, msg: searchMsg } = await askSelection(
            conn, from, mek,
            `〽️ *SEARCH RESULTS*\n\n🔎 ${query.toUpperCase()}`,
            results,
            FOOTER
        );

        await conn.sendMessage(from, { react: { text: "📑", key: searchMsg.key } });
        const isTV = selected.type === 'tv' || selected.url?.includes('/tvshows/');

        // ═══════════════════════════════════════
        // STEP 3: DETAILS API
        // ═══════════════════════════════════════
        const detailEndpoint = isTV ? '/api/v1/tv/details' : '/api/v1/movies/details';
        const detailUrl = `${API_BASE}${detailEndpoint}?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`;
        
        const detailRes = await fetchWithRetry(detailUrl);
        const movie = detailRes.data?.movie || detailRes.data?.tvShow;

        if (!movie) {
            return conn.sendMessage(from, { text: `❌ Details හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });
        }

        // ── DETAILS CARD ──
        let cap = `*☘️ ${movie.englishTitle || movie.title || 'N/A'}*\n\n`;
        if (movie.imdbRating) cap += `*⭐ IMDb* ➟ *${movie.imdbRating}*\n`;
        if (movie.year)       cap += `*📅 Year* ➟ *${movie.year}*\n`;
        if (movie.duration)   cap += `*⏱️ Duration* ➟ *${movie.duration}*\n`;
        if (movie.genres?.length) cap += `*🎭 Genres* ➟ *${movie.genres.join(', ')}*\n`;
        if (movie.description) cap += `\n*📖 Description:*\n${movie.description}\n`;
        cap += FOOTER;

        const posterUrl = movie.poster ? movie.poster.trim() : null;

        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: cap
        }, { quoted: searchMsg });

        // ═══════════════════════════════════════
        // STEP 4: MOVIE / TV FLOW
        // ═══════════════════════════════════════
        if (isTV) {
            // ── TV SERIES FLOW ──
            const seasons = movie.seasons || [];
            if (!seasons.length) {
                return conn.sendMessage(from, { text: `❌ Seasons හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });
            }

            const seasonItems = seasons.map(s => ({ title: s.title || `Season ${s.seasonNumber}`, season: s }));
            const { item: selectedSeason, msg: seasonMsg } = await askSelection(
                conn, from, searchMsg,
                `📺 *SELECT SEASON*`,
                seasonItems,
                FOOTER
            );

            const seasonEps = selectedSeason.season.episodes || [];

            const epItems = seasonEps.map(ep => ({
                title: ep.title || `Episode ${ep.episodeNumber}`,
                slug: ep.slug,
                seasonNum: ep.seasonNumber,
                epNum: ep.episodeNumber,
                poster: ep.poster
            }));

            epItems.push({ title: `📦 Download ALL ${seasonEps.length} episodes`, bulk: true });

            const { item: selectedEp, msg: epMsg } = await askSelection(
                conn, from, seasonMsg,
                `📥 *SELECT EPISODE* (${selectedSeason.season.title})`,
                epItems,
                FOOTER
            );

            // ── BULK DOWNLOAD ──
            if (selectedEp.bulk) {
                await conn.sendMessage(from, { text: `📦 *Bulk download started!*\nEpisodes ${seasonEps.length}ක් එකින් එක යවනවා...${FOOTER}` }, { quoted: epMsg });

                for (let i = 0; i < seasonEps.length; i++) {
                    const ep = seasonEps[i];
                    try {
                        await conn.sendMessage(from, { text: `⏳ Fetching: ${ep.title}${FOOTER}` }, { quoted: epMsg });
                        
                        const dlUrl = `${API_BASE}/api/v1/tv/episode-links?slug=${ep.slug}&resolve=true&apikey=${API_KEY}`;
                        const dlRes = await fetchWithRetry(dlUrl);
                        
                        // API එකෙන් එන ලින්ක් එක ගන්න විදිහ හැඩගැස්සුවා
                        const finalUrl = dlRes.data?.link || dlRes.data?.directUrl || dlRes.data?.url || dlRes.data?.data?.link;

                        if (finalUrl) {
                            await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${ep.seasonNumber}E${ep.episodeNumber}`, ep.poster || posterUrl, FOOTER);
                        }
                    } catch (e) {
                        console.error(`Ep ${i+1} failed:`, e.message);
                    }
                    await new Promise(r => setTimeout(r, 3000));
                }
                return;
            }

            // ── SINGLE EPISODE DOWNLOAD ──
            if (userDownloads.get(from)) return conn.sendMessage(from, { text: `⏳ කලින් download එකක් යනවා...${FOOTER}` }, { quoted: epMsg });
            userDownloads.set(from, true);

            try {
                await conn.sendMessage(from, { text: `⏳ *Fetching download link...*${FOOTER}` }, { quoted: epMsg });
                const dlUrl = `${API_BASE}/api/v1/tv/episode-links?slug=${selectedEp.slug}&resolve=true&apikey=${API_KEY}`;
                const dlRes = await fetchWithRetry(dlUrl);
                const finalUrl = dlRes.data?.link || dlRes.data?.directUrl || dlRes.data?.url || dlRes.data?.data?.link;

                if (!finalUrl) throw new Error("NO_LINK");
                await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${selectedEp.seasonNum}E${selectedEp.epNum}`, selectedEp.poster || posterUrl, FOOTER);
            } catch (e) {
                await conn.sendMessage(from, { text: `❌ Download failed: ${e.message}${FOOTER}` }, { quoted: epMsg });
            } finally {
                userDownloads.delete(from);
            }

        } else {
            // ── MOVIE FLOW ──
            const linksUrl = `${API_BASE}/api/v1/movies/download-links?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`;
            
            let linksRes;
            try {
                linksRes = await fetchWithRetry(linksUrl);
            } catch (err) {
                return conn.sendMessage(from, { text: `⚠️ API සර්වර් එක රිස්පොන්ස් කරන්නේ නෑ (502).\n\n⏱️ තව විනාඩියකින් නැවත ට්‍රයි කරන්න.${FOOTER}` }, { quoted: searchMsg });
            }
            
            // 🚨 මෙතන තමයි අලුත් වෙනස්කම. ලොග් එකේ තිබ්බ JSON එකේ හැටියට 'links' array එක ගන්නවා
            const data = linksRes.data;
            let rawLinks = [];

            if (Array.isArray(data?.links)) {
                rawLinks = data.links;
            } else if (Array.isArray(data?.downloadLinks)) {
                rawLinks = data.downloadLinks;
            } else if (Array.isArray(data?.results?.data?.links)) { // සමහර වෙලාවට මේ විදිහටත් එන්න පුළුවන්
                rawLinks = data.results.data.links;
            }

            // ලින්ක් එක තියෙන තැන (portalUrl) හොයාගෙන map කරනවා
            const links = rawLinks.map(l => ({
                title: l.quality || 'Unknown',
                link: l.portalUrl || l.directUrl || l.url || l.link, // API එකේ ප්‍රධාන ලින්ක් එක portalUrl
                quality: l.quality || 'Unknown',
                size: l.size || 'N/A'
            })).filter(l => l.link); // ලින්ක් නැති ඒවා අයින් කරනවා

            if (!links || links.length === 0) {
                console.log("❌ No links found in response:", JSON.stringify(data).slice(0, 500));
                return conn.sendMessage(from, { text: `❌ Download Links හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });
            }

            // Quality තෝරන්න
            const qualityItems = links.map(l => ({
                title: `${l.quality} (${l.size})`,
                link: l.link,
                quality: l.quality
            }));

            const { item: selectedQuality, msg: qualityMsg } = await askSelection(
                conn, from, searchMsg,
                `📥 *SELECT QUALITY*`,
                qualityItems,
                FOOTER
            );

            if (userDownloads.get(from)) return conn.sendMessage(from, { text: `⏳ කලින් download එකක් යනවා...${FOOTER}` }, { quoted: qualityMsg });
            userDownloads.set(from, true);

            try {
                await conn.sendMessage(from, { text: `⏳ *Downloading...*\n\n🎬 ${movie.englishTitle}\n📺 ${selectedQuality.quality}${FOOTER}` }, { quoted: qualityMsg });

                const resolveUrl = `${API_BASE}/api/v1/movies/resolve-link?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`;
                let finalUrl;
                
                try {
                    const resolveRes = await fetchWithRetry(resolveUrl);
                    finalUrl = resolveRes.data?.link || resolveRes.data?.directUrl || resolveRes.data?.url || resolveRes.data?.data?.link;
                } catch (err) {
                    console.log("⚠️ Resolve failed, trying instant download...");
                    const instantUrl = `${API_BASE}/api/v1/movies/download?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`;
                    const instantRes = await fetchWithRetry(instantUrl);
                    finalUrl = instantRes.data?.link || instantRes.data?.directUrl || instantRes.data?.url || instantRes.data?.data?.link;
                }

                if (!finalUrl) throw new Error("NO_LINK");
                await sendDocument(conn, from, qualityMsg, finalUrl, movie.englishTitle, selectedQuality.quality, posterUrl, FOOTER);

            } catch (e) {
                let errMsg = `❌ Download failed: ${e.message}`;
                if (e.message === "NO_LINK") errMsg = "❌ API එකෙන් link එකක් ලැබුනේ නෑ. වෙන quality එකක් try කරන්න.";
                if (e.message.includes("timeout") || e.response?.status === 502) errMsg = "⚠️ API සර්වර් එක රිස්පොන්ස් කරන්නේ නෑ (502).\n\n⏱️ තව විනාඩියකින් නැවත ට්‍රයි කරන්න.";
                await conn.sendMessage(from, { text: `${errMsg}${FOOTER}` }, { quoted: qualityMsg });
            } finally {
                userDownloads.delete(from);
            }
        }

    } catch (e) {
        console.error("❌ MAIN ERROR:", e.message);
        if (e.message === "TIMEOUT") return reply(`⏰ ඔයා reply කළේ නෑ. නැවත try කරන්න.${FOOTER}`);
        await reply(`❌ Error: ${e.message}${FOOTER}`);
    }
});
