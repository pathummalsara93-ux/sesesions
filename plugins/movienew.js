const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════
const API_BASE = "https://sinhalasub-api-nine.vercel.app";
const API_KEY  = "sk_ssub_unlimited_eny64b2kgt03r6y4"; // <--- ඔයාගේ API Key එක

const FOOTER = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";

// 🚨 Track ongoing downloads per user (Timestamp එකක් විදිහට)
const userDownloads = new Map();

// ─────────────────────────────────────────────
// Helper 1: 502 Error / Timeout Fix
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
                console.log(`⚠️ 502/Timeout. Retrying...`);
                await new Promise(r => setTimeout(r, 3000));
            } else {
                throw err;
            }
        }
    }
}

// ─────────────────────────────────────────────
// Helper 2: Thumbnail Buffer Generator
// ─────────────────────────────────────────────
async function getThumbnailBuffer(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url.trim(), { responseType: "arraybuffer", timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
    } catch (e) { return null; }
}

// ─────────────────────────────────────────────
// Helper 3: Ask User for Selection (FIXED)
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
        let isFinished = false;

        const handler = async (update) => {
            if (isFinished) return;
            const msg = update.messages[0];
            if (!msg.message || msg.key.remoteJid !== from || msg.key.fromMe) return;

            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const ctx = msg.message.extendedTextMessage?.contextInfo;

            // අලුත් කමාන්ඩ් එකක් ආවොත් කලින් එක Cancel කරනවා
            if (body.startsWith('.') || body.startsWith('/') || body.startsWith('!')) {
                isFinished = true;
                conn.ev.off("messages.upsert", handler);
                clearTimeout(timeoutId);
                return reject(new Error("NEW_COMMAND"));
            }

            // අදාල මැසේජ් එකට reply කරලා නැත්නම් skip කරනවා
            if (ctx?.stanzaId !== sent.key.id) return;

            const idx = parseInt(body) - 1;
            if (isNaN(idx) || !items[idx]) {
                await conn.sendMessage(from, { text: `❎ Invalid number. Please reply again.${footer}` }, { quoted: msg });
                return; 
            }

            isFinished = true;
            conn.ev.off("messages.upsert", handler);
            clearTimeout(timeoutId);
            resolve({ item: items[idx], msg });
        };

        conn.ev.on("messages.upsert", handler);
        
        const timeoutId = setTimeout(() => {
            if (isFinished) return;
            isFinished = true;
            conn.ev.off("messages.upsert", handler);
            reject(new Error("TIMEOUT"));
        }, 120000); // විනාඩි 2ක් වෙලාව දෙනවා
    });
}

// ─────────────────────────────────────────────
// Helper 4: Send Document (Unlimited Size - Stream Method)
// ─────────────────────────────────────────────
async function sendDocument(conn, from, mek, url, title, quality, thumbUrl, footer) {
    if (url.includes('telegram.me') || url.includes('t.me')) {
        return conn.sendMessage(from, { text: `⚠️ මේක Telegram ලින්ක් එකක්. වෙන Quality එකක් තෝරන්න.${footer}` }, { quoted: mek });
    }

    const caption = `*${title}*\n\n*Quality:* [${quality}]\n${footer}`;
    try {
        console.log(`📥 Starting file stream from: ${url}`);
        
        // Stream Method (50MB Limit එක අයින් කළා, ලොකු ෆයිල්ස් වලට RAM පිරෙන්නේ නෑ)
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 120000, 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Referer': 'https://pixeldrain.com/'
            }
        });

        await conn.sendMessage(from, {
            document: { stream: response.data },
            mimetype: "video/mp4",
            fileName: `${title}_${quality}.mp4`.replace(/[^a-zA-Z0-9_.-]/g, '_'),
            jpegThumbnail: await getThumbnailBuffer(thumbUrl),
            caption
        }, { quoted: mek });
        
        console.log(`✅ Document sent successfully!`);
    } catch (err) {
        console.error("❌ Send document error:", err.message);
        await conn.sendMessage(from, { text: `❌ File send error: ${err.message}\n\n(සමහර විට සර්වර් එකේ Timeout එකක් වෙන්න පුළුවන්. ආයේ ට්‍රයි කරන්න.)${footer}` }, { quoted: mek });
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

        // STEP 1: SEARCH
        const searchUrl = `${API_BASE}/api/v1/movies/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        const searchRes = await fetchWithRetry(searchUrl);

        if (!searchRes.data?.success || !searchRes.data?.results?.length) {
            return reply(`❌ "${query}" සඳහා කිසිවක් හමු නොවීය.${FOOTER}`);
        }

        // STEP 2: SEARCH LIST
        const { item: selected, msg: searchMsg } = await askSelection(
            conn, from, mek,
            `〽️ *SEARCH RESULTS*\n\n🔎 ${query.toUpperCase()}`,
            searchRes.data.results,
            FOOTER
        );

        await conn.sendMessage(from, { react: { text: "📑", key: searchMsg.key } });
        const isTV = selected.type === 'tv' || selected.url?.includes('/tvshows/');

        // STEP 3: DETAILS
        const detailEndpoint = isTV ? '/api/v1/tv/details' : '/api/v1/movies/details';
        const detailRes = await fetchWithRetry(`${API_BASE}${detailEndpoint}?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`);
        const movie = detailRes.data?.movie || detailRes.data?.tvShow;

        if (!movie) return conn.sendMessage(from, { text: `❌ Details හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });

        let cap = `*☘️ ${movie.englishTitle || movie.title || 'N/A'}*\n\n`;
        if (movie.imdbRating) cap += `*⭐ IMDb* ➟ *${movie.imdbRating}*\n`;
        if (movie.year)       cap += `*📅 Year* ➟ *${movie.year}*\n`;
        if (movie.duration)   cap += `*⏱️ Duration* ➟ *${movie.duration}*\n`;
        if (movie.genres?.length) cap += `*🎭 Genres* ➟ *${movie.genres.join(', ')}*\n`;
        if (movie.description) cap += `\n*📖 Description:*\n${movie.description}\n`;
        cap += FOOTER;

        const posterUrl = movie.poster ? movie.poster.trim() : null;
        await conn.sendMessage(from, { image: { url: posterUrl }, caption: cap }, { quoted: searchMsg });

        // STEP 4: FLOW
        if (isTV) {
            // ── TV SERIES ──
            const seasons = movie.seasons || [];
            if (!seasons.length) return conn.sendMessage(from, { text: `❌ Seasons හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });

            const { item: selectedSeason, msg: seasonMsg } = await askSelection(conn, from, searchMsg, `📺 *SELECT SEASON*`, seasons.map(s => ({ title: s.title || `Season ${s.seasonNumber}`, season: s })), FOOTER);
            const seasonEps = selectedSeason.season.episodes || [];

            const epItems = seasonEps.map(ep => ({ title: ep.title || `Episode ${ep.episodeNumber}`, slug: ep.slug, seasonNum: ep.seasonNumber, epNum: ep.episodeNumber, poster: ep.poster }));
            epItems.push({ title: `📦 Download ALL ${seasonEps.length} episodes`, bulk: true });

            const { item: selectedEp, msg: epMsg } = await askSelection(conn, from, seasonMsg, `📥 *SELECT EPISODE* (${selectedSeason.season.title})`, epItems, FOOTER);

            if (selectedEp.bulk) {
                await conn.sendMessage(from, { text: `📦 *Bulk download started!*\nEpisodes ${seasonEps.length}ක් එකින් එක යවනවා...${FOOTER}` }, { quoted: epMsg });
                for (let i = 0; i < seasonEps.length; i++) {
                    const ep = seasonEps[i];
                    try {
                        const dlRes = await fetchWithRetry(`${API_BASE}/api/v1/tv/episode-links?slug=${ep.slug}&resolve=true&apikey=${API_KEY}`);
                        const finalUrl = dlRes.data?.link || dlRes.data?.directUrl || dlRes.data?.url || dlRes.data?.mirrors?.[0];
                        if (finalUrl) await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${ep.seasonNumber}E${ep.episodeNumber}`, ep.poster || posterUrl, FOOTER);
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, 3000));
                }
                return;
            }

            // Single Episode
            const lockTime = userDownloads.get(from);
            if (lockTime && Date.now() - lockTime < 5 * 60 * 1000) return conn.sendMessage(from, { text: `⏳ කලින් download එකක් යනවා...${FOOTER}` }, { quoted: epMsg });
            userDownloads.set(from, Date.now());

            try {
                const dlRes = await fetchWithRetry(`${API_BASE}/api/v1/tv/episode-links?slug=${selectedEp.slug}&resolve=true&apikey=${API_KEY}`);
                const finalUrl = dlRes.data?.link || dlRes.data?.directUrl || dlRes.data?.url || dlRes.data?.mirrors?.[0];
                if (!finalUrl) throw new Error("NO_LINK");
                await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${selectedEp.seasonNum}E${selectedEp.epNum}`, selectedEp.poster || posterUrl, FOOTER);
            } catch (e) {
                await conn.sendMessage(from, { text: `❌ Download failed: ${e.message}${FOOTER}` }, { quoted: epMsg });
            } finally {
                userDownloads.delete(from);
            }

        } else {
            // ── MOVIE ──
            const linksRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/download-links?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`);
            let rawLinks = linksRes.data?.links || linksRes.data?.downloadLinks || linksRes.data?.results?.data?.links || [];

            const links = rawLinks.map(l => ({ title: l.quality || 'Unknown', link: l.portalUrl || l.directUrl || l.url || l.link, quality: l.quality || 'Unknown', size: l.size || 'N/A' })).filter(l => l.link);
            if (!links.length) return conn.sendMessage(from, { text: `❌ Download Links හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });

            const { item: selectedQuality, msg: qualityMsg } = await askSelection(conn, from, searchMsg, `📥 *SELECT QUALITY*`, links.map(l => ({ title: `${l.quality} (${l.size})`, link: l.link, quality: l.quality })), FOOTER);

            // Lock check
            const lockTime = userDownloads.get(from);
            if (lockTime && Date.now() - lockTime < 5 * 60 * 1000) return conn.sendMessage(from, { text: `⏳ කලින් download එකක් යනවා...${FOOTER}` }, { quoted: qualityMsg });
            userDownloads.set(from, Date.now());

            try {
                let finalUrl;
                try {
                    const resolveRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/resolve-link?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`);
                    finalUrl = resolveRes.data?.link || resolveRes.data?.directUrl || resolveRes.data?.url || resolveRes.data?.mirrors?.[0];
                } catch (err) {
                    const instantRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/download?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`);
                    finalUrl = instantRes.data?.link || instantRes.data?.directUrl || instantRes.data?.url || instantRes.data?.mirrors?.[0];
                }

                if (!finalUrl) throw new Error("NO_LINK");
                await sendDocument(conn, from, qualityMsg, finalUrl, movie.englishTitle, selectedQuality.quality, posterUrl, FOOTER);

            } catch (e) {
                let errMsg = `❌ Download failed: ${e.message}`;
                if (e.message === "NO_LINK") errMsg = "❌ API එකෙන් link එකක් ලැබුනේ නෑ. වෙන quality එකක් try කරන්න.";
                await conn.sendMessage(from, { text: `${errMsg}${FOOTER}` }, { quoted: qualityMsg });
            } finally {
                userDownloads.delete(from);
            }
        }

    } catch (e) {
        if (e.message === "TIMEOUT") return reply(`⏰ ඔයා reply කළේ නෑ. නැවත try කරන්න.${FOOTER}`);
        if (e.message === "NEW_COMMAND") return; 
        await reply(`❌ Error: ${e.message}${FOOTER}`);
    }
});
