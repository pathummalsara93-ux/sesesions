const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION - මේවා ඔයාගේ අවශ්‍යතාවයට වෙනස් කරන්න
// ═══════════════════════════════════════════════════════════
const API_BASE = "https://sinhalasub-api-nine.vercel.app";
const API_KEY  = "sk_ssub_unlimited_eny64b2kgt03r6y4"; // <--- ඔයාගේ API Key එක මෙතන දාන්න

// Default headers (API key එක header එකක් විදිහට යවනවා නම්)
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'x-api-key': API_KEY // API එකේ අවශ්‍යතාවය අනුව 'Authorization' හෝ 'apikey' ලෙසත් වෙනස් කරන්න
};

const FOOTER = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";

// එක user එකකට එකවර downloads 2ක් block කිරීමට
const userDownloads = new Map();

// ─────────────────────────────────────────────
// Helper 1: Thumbnail Buffer එකක් සෑදීම (sharp)
// ─────────────────────────────────────────────
async function getThumbnailBuffer(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
    } catch (e) {
        console.log("⚠️ Thumbnail error:", e.message);
        return null;
    }
}

// ─────────────────────────────────────────────
// Helper 2: User ගෙන් Number එකක් අහන Function එක
// ─────────────────────────────────────────────
async function askSelection(conn, from, mek, headerText, items, footer) {
    let list = `${headerText}\n\n`;
    items.forEach((v, i) => {
        const label = v.title || v.name || v.quality || v.episode || v.season || 'Item';
        const extra = v.size ? ` (${v.size})` : '';
        list += `*${i + 1}* ➪ ${label}${extra}\n`;
    });
    list += `\nReply with number${footer}`;

    const sent = await conn.sendMessage(from, { text: list }, { quoted: mek });

    return new Promise((resolve, reject) => {
        const handler = async (update) => {
            const msg = update.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;

            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const ctx = msg.message.extendedTextMessage?.contextInfo;

            // අදාල message එකට reply කරලද බලනවා
            if (ctx?.stanzaId !== sent.key.id) return;

            conn.ev.off("messages.upsert", handler);

            const idx = parseInt(body) - 1;
            if (isNaN(idx) || !items[idx]) {
                await conn.sendMessage(from, { text: `❎ Invalid selection. Please try again.${footer}` }, { quoted: msg });
                return reject(new Error("INVALID_SELECTION"));
            }
            resolve({ item: items[idx], msg });
        };

        conn.ev.on("messages.upsert", handler);

        // විනාඩියක් ඇතුලත reply නැත්නම් timeout වෙනවා
        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
            reject(new Error("TIMEOUT"));
        }, 60000);
    });
}

// ─────────────────────────────────────────────
// Helper 3: Document එකක් යැවීම (Error Handling සමඟ)
// ─────────────────────────────────────────────
async function sendDocument(conn, from, mek, url, title, quality, thumbUrl, footer) {
    const caption = `*${title}*\n\n*Quality:* [${quality}]\n${footer}`;
    try {
        await conn.sendMessage(from, {
            document: { url },
            mimetype: "video/mp4",
            fileName: `${title}_${quality}.mp4`.replace(/[^a-zA-Z0-9_.-]/g, '_'), // filename එක clean කරනවා
            jpegThumbnail: await getThumbnailBuffer(thumbUrl),
            caption
        }, { quoted: mek });
    } catch (err) {
        console.error("❌ Document send error:", err.message);
        await conn.sendMessage(from, { text: `❌ File එක යැවීමේදී ප්‍රශ්නයක් ආවා: ${err.message}${footer}` }, { quoted: mek });
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "movie",
    alias: ["film", "mv", "tv"],
    desc: "Search & Download Movies / TV Series (Sinhala Subtitles)",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {

    const query = args.join(" ").trim();
    if (!query) {
        return reply(`🎬 කරුණාකර Movie එකක් හෝ TV Series එකක් නම දෙන්න!\n\nExample: .movie Leo${FOOTER}`);
    }

    try {
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

        // ═══════════════════════════════════════
        // STEP 1: SEARCH (Movies + TV Series)
        // ═══════════════════════════════════════
        // API එකේ search endpoint එකට query එක සහ API key එක යවනවා
        const searchUrl = `${API_BASE}/api/v1/movies/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        console.log("🔍 Searching:", searchUrl);

        const searchRes = await axios.get(searchUrl, { headers: HEADERS, timeout: 30000 });

        // API response structure එක වෙනස් නම් මෙතන adjust කරන්න
        // උදාහරණයක් විදිහට: searchRes.data.results හෝ searchRes.data.data
        const results = searchRes?.data?.results || searchRes?.data?.data || searchRes?.data || [];

        if (!results || results.length === 0) {
            return reply(`❌ "${query}" සඳහා කිසිවක් හමු නොවීය.${FOOTER}`);
        }

        // ═══════════════════════════════════════
        // STEP 2: SEARCH LIST එක යැවීම සහ Selection එක ගැනීම
        // ═══════════════════════════════════════
        const searchItems = results.map(r => ({
            ...r,
            title: r.title || r.name || 'Unknown',
            link: r.link || r.url || r.href
        }));

        const { item: selected, msg: searchMsg } = await askSelection(
            conn, from, mek,
            `〽️ *SEARCH RESULTS*\n\n🔎 ${query.toUpperCase()}`,
            searchItems,
            FOOTER
        );

        await conn.sendMessage(from, { react: { text: "📑", key: searchMsg.key } });

        // ═══════════════════════════════════════
        // STEP 3: DETAILS ලබා ගැනීම (Movie හෝ TV)
        // ═══════════════════════════════════════
        // Type එක අනුව endpoint එක තීරණය කරනවා
        const isTV = (selected.type === 'tv' || selected.type === 'tvshows' || selected.link?.includes('/tv/') || selected.link?.includes('/tvshows/'));

        let detailUrl, epUrl;
        if (isTV) {
            // TV Series Details
            detailUrl = `${API_BASE}/api/v1/tv/details?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`;
            epUrl     = `${API_BASE}/api/v1/tv/episode-links?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`;
        } else {
            // Movie Details
            detailUrl = `${API_BASE}/api/v1/movies/details?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`;
        }

        console.log("📑 Fetching Details:", detailUrl);
        const detailRes = await axios.get(detailUrl, { headers: HEADERS, timeout: 30000 });
        const data = detailRes?.data?.data || detailRes?.data || detailRes;

        // Details card එකට අවශ්‍ය දත්ත
        const movie = data?.mainDetails || data?.movie || data;
        const posterUrl = movie?.poster || movie?.imageUrl || movie?.image || data?.poster;

        let cap = `*☘️ ${movie?.title || movie?.maintitle || 'N/A'}*\n\n`;
        if (movie?.rating)      cap += `*⭐ IMDb* ➟ *${movie.rating}*\n`;
        if (movie?.year)        cap += `*📅 Year* ➟ *${movie.year}*\n`;
        if (movie?.country)     cap += `*🌎 Country* ➟ *${movie.country}*\n`;
        if (movie?.runtime)     cap += `*⏱️ Duration* ➟ *${movie.runtime}*\n`;
        if (movie?.genres?.length) cap += `*🎭 Genres* ➟ *${movie.genres.join(', ')}*\n`;
        if (movie?.director)    cap += `*👨🏻‍💼 Director* ➟ *${movie.director}*\n`;
        if (movie?.cast)        cap += `*🕵️‍♂️ Cast* ➟ *${movie.cast}*\n`;
        if (movie?.description) cap += `\n*📖 Description:*\n${movie.description}\n`;
        cap += FOOTER;

        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: cap
        }, { quoted: searchMsg });

        // ═══════════════════════════════════════
        // STEP 4: DOWNLOAD OPTIONS (Movie හෝ TV)
        // ═══════════════════════════════════════
        if (isTV) {
            // ── TV SERIES FLOW ──
            console.log("📺 Fetching Episodes:", epUrl);
            const epRes = await axios.get(epUrl, { headers: HEADERS, timeout: 30000 });
            const episodes = epRes?.data?.episodes || epRes?.data?.data?.episodes || epRes?.data || [];

            if (!episodes || episodes.length === 0) {
                return conn.sendMessage(from, { text: `❌ මෙම Series එකට Episodes හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });
            }

            // Episodes, Seasons අනුව group කිරීම
            const seasons = {};
            episodes.forEach(ep => {
                const s = ep.season || 1;
                if (!seasons[s]) seasons[s] = [];
                seasons[s].push(ep);
            });

            const seasonNumbers = Object.keys(seasons).sort((a, b) => a - b);
            const seasonItems = seasonNumbers.map(s => ({ title: `Season ${s}`, season: parseInt(s) }));

            // Season එක තෝරන්න
            const { item: selectedSeason, msg: seasonMsg } = await askSelection(
                conn, from, searchMsg,
                `📺 *SELECT SEASON*`,
                seasonItems,
                FOOTER
            );

            const seasonEps = seasons[selectedSeason.season];

            // Episode එකක් තෝරන්න හෝ "Download All" තෝරන්න
            const epItems = seasonEps.map(ep => ({
                title: ep.title || `S${ep.season}E${ep.episode}`,
                link: ep.link || ep.url,
                season: ep.season,
                episode: ep.episode
            }));

            // Bulk download option එක add කරනවා
            epItems.push({ title: `📦 Download ALL ${seasonEps.length} episodes`, bulk: true });

            const { item: selectedEp, msg: epMsg } = await askSelection(
                conn, from, seasonMsg,
                `📥 *SELECT EPISODE* (Season ${selectedSeason.season})`,
                epItems,
                FOOTER
            );

            // ── BULK DOWNLOAD ──
            if (selectedEp.bulk) {
                await conn.sendMessage(from, { text: `📦 *Bulk download started!*\n${seasonEps.length} episodes එකින් එක යවනවා...${FOOTER}` }, { quoted: epMsg });

                for (let i = 0; i < seasonEps.length; i++) {
                    const ep = seasonEps[i];
                    try {
                        const dlUrl = `${API_BASE}/api/v1/tv/episode-links?url=${encodeURIComponent(ep.link)}&apikey=${API_KEY}`;
                        const dlRes = await axios.get(dlUrl, { headers: HEADERS, timeout: 60000 });
                        const finalUrl = dlRes?.data?.link || dlRes?.data?.data?.link || dlRes?.data?.url;

                        if (!finalUrl) continue;

                        await sendDocument(conn, from, epMsg, finalUrl, `${movie.title}_S${ep.season}E${ep.episode}`, `S${ep.season}E${ep.episode}`, posterUrl, FOOTER);
                    } catch (e) {
                        console.error(`Episode ${i+1} failed:`, e.message);
                        await conn.sendMessage(from, { text: `⚠️ Episode ${i+1} failed: ${e.message}${FOOTER}` }, { quoted: epMsg });
                    }
                }
                return;
            }

            // ── SINGLE EPISODE DOWNLOAD ──
            if (userDownloads.get(from)) {
                return conn.sendMessage(from, { text: `⏳ තවත් download එකක් දැනටමත් ක්‍රියාත්මක වෙමින් පවතී...${FOOTER}` }, { quoted: epMsg });
            }
            userDownloads.set(from, true);

            try {
                await conn.sendMessage(from, { text: `⏳ *Fetching download link...*\n\n🎬 ${movie.title}\n📺 S${selectedEp.season}E${selectedEp.episode}${FOOTER}` }, { quoted: epMsg });

                const dlUrl = `${API_BASE}/api/v1/tv/episode-links?url=${encodeURIComponent(selectedEp.link)}&apikey=${API_KEY}`;
                const dlRes = await axios.get(dlUrl, { headers: HEADERS, timeout: 60000 });
                const finalUrl = dlRes?.data?.link || dlRes?.data?.data?.link || dlRes?.data?.url;

                if (!finalUrl) throw new Error("NO_LINK");

                await sendDocument(conn, from, epMsg, finalUrl, movie.title, `S${selectedEp.season}E${selectedEp.episode}`, posterUrl, FOOTER);
            } catch (e) {
                await conn.sendMessage(from, { text: `❌ Download failed: ${e.message}${FOOTER}` }, { quoted: epMsg });
            } finally {
                userDownloads.delete(from);
            }

        } else {
            // ── MOVIE FLOW ──
            // Download Links ලබා ගැනීම
            const linksUrl = `${API_BASE}/api/v1/movies/download-links?url=${encodeURIComponent(selected.link)}&apikey=${API_KEY}`;
            console.log("🔗 Fetching Download Links:", linksUrl);

            const linksRes = await axios.get(linksUrl, { headers: HEADERS, timeout: 30000 });
            const links = linksRes?.data?.downloadLinks || linksRes?.data?.links || linksRes?.data?.data || linksRes?.data || [];

            if (!links || links.length === 0) {
                return conn.sendMessage(from, { text: `❌ මෙම Movie එකට Download Links හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });
            }

            // Quality එකක් තෝරන්න
            const qualityItems = links.map(l => ({
                title: l.quality || l.name || 'Unknown',
                link: l.link || l.url,
                quality: l.quality || l.name || 'Unknown',
                size: l.size
            }));

            const { item: selectedQuality, msg: qualityMsg } = await askSelection(
                conn, from, searchMsg,
                `📥 *SELECT QUALITY*`,
                qualityItems,
                FOOTER
            );

            // Download කිරීම
            if (userDownloads.get(from)) {
                return conn.sendMessage(from, { text: `⏳ තවත් download එකක් දැනටමත් ක්‍රියාත්මක වෙමින් පවතී...${FOOTER}` }, { quoted: qualityMsg });
            }
            userDownloads.set(from, true);

            try {
                await conn.sendMessage(from, { text: `⏳ *Downloading...*\n\n🎬 ${movie.title}\n📺 ${selectedQuality.quality}${FOOTER}` }, { quoted: qualityMsg });

                // Direct mirror link එක ලබා ගැනීම (resolve-link endpoint එක හරහා)
                const resolveUrl = `${API_BASE}/api/v1/movies/resolve-link?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`;
                console.log("🔗 Resolving Link:", resolveUrl);

                let finalUrl;
                try {
                    const resolveRes = await axios.get(resolveUrl, { headers: HEADERS, timeout: 60000 });
                    finalUrl = resolveRes?.data?.link || resolveRes?.data?.data?.link || resolveRes?.data?.url;
                } catch (resolveErr) {
                    console.log("⚠️ Resolve link failed, trying direct download redirect...");
                    // Resolve link fail වුනොත්, instant download redirect එක try කරනවා
                    const instantUrl = `${API_BASE}/api/v1/movies/download?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`;
                    const instantRes = await axios.get(instantUrl, { headers: HEADERS, timeout: 60000 });
                    finalUrl = instantRes?.data?.link || instantRes?.data?.data?.link || instantRes?.data?.url;
                }

                if (!finalUrl) throw new Error("NO_LINK");

                await sendDocument(conn, from, qualityMsg, finalUrl, movie.title, selectedQuality.quality, posterUrl, FOOTER);
            } catch (e) {
                let errorMsg = `❌ Download failed: ${e.message}`;
                if (e.message === "NO_LINK") errorMsg = "❌ API එකෙන් direct download link එකක් ලැබුනේ නෑ. වෙන quality එකක් try කරන්න.";
                if (e.message.includes("timeout")) errorMsg = "⏱️ Timeout! කරුණාකර පොඩි quality එකක් (480p / 720p) try කරන්න.";
                await conn.sendMessage(from, { text: `${errorMsg}${FOOTER}` }, { quoted: qualityMsg });
            } finally {
                userDownloads.delete(from);
            }
        }

    } catch (e) {
        console.error("❌ MAIN ERROR:", e.message);
        if (e.message === "TIMEOUT") {
            return reply(`⏰ ඔයා reply කළේ නෑ. කරුණාකර නැවත try කරන්න.${FOOTER}`);
        }
        await reply(`❌ Error: ${e.message}${FOOTER}`);
    }
});
