const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

const API_BASE = "https://sinhalasub-api-nine.vercel.app";
const API_KEY  = "sk_ssub_unlimited_eny64b2kgt03r6y4"; // <--- ඔයාගේ API Key එක මෙතන දාන්න

const FOOTER = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";
const userDownloads = new Map();

// Helper 1: 502 Error Fix
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(url, { timeout: 45000, headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' } });
            return res;
        } catch (err) {
            const is502 = err.response?.status === 502;
            const isTimeout = err.code === 'ECONNABORTED' || err.message.includes('timeout');
            if ((is502 || isTimeout) && i < retries - 1) {
                await new Promise(r => setTimeout(r, 3000));
            } else { throw err; }
        }
    }
}

// Helper 2: Thumbnail Buffer
async function getThumbnailBuffer(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url.trim(), { responseType: "arraybuffer", timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
    } catch (e) { return null; }
}

// Helper 3: Ask Selection
async function askSelection(conn, from, mek, headerText, items, footer) {
    let list = `${headerText}\n\n`;
    items.forEach((v, i) => { list += `*${i + 1}* ➪ ${v.englishTitle || v.title || 'Unknown'}${v.size ? ` [${v.size}]` : ''}\n`; });
    list += `\nReply with number${footer}`;
    const sent = await conn.sendMessage(from, { text: list }, { quoted: mek });

    return new Promise((resolve, reject) => {
        const handler = async (update) => {
            const msg = update.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (msg.message.extendedTextMessage?.contextInfo?.stanzaId !== sent.key.id) return;
            conn.ev.off("messages.upsert", handler);
            const idx = parseInt(body) - 1;
            if (isNaN(idx) || !items[idx]) {
                await conn.sendMessage(from, { text: `❎ Invalid selection.${footer}` }, { quoted: msg });
                return reject(new Error("INVALID_SELECTION"));
            }
            resolve({ item: items[idx], msg });
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => { conn.ev.off("messages.upsert", handler); reject(new Error("TIMEOUT")); }, 60000);
    });
}

// Helper 4: Send Document with Vercel Timeout Protection
async function sendDocument(conn, from, mek, url, title, quality, thumbUrl, footer) {
    if (url.includes('telegram.me') || url.includes('t.me')) {
        return conn.sendMessage(from, { text: `⚠️ මේක Telegram ලින්ක් එකක්. වෙන Quality එකක් තෝරන්න.${footer}` }, { quoted: mek });
    }

    const caption = `*${title}*\n\n*Quality:* [${quality}]\n${footer}`;
    try {
        console.log(`📥 Checking file size before download: ${url}`);
        
        // 1. ෆයිල් එකේ සයිස් එක චෙක් කිරීම (HEAD Request)
        let fileSize = 0;
        try {
            const head = await axios.head(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            fileSize = parseInt(head.headers['content-length'] || 0);
        } catch (e) {
            console.log("⚠️ Could not fetch file size, trying to download anyway...");
        }

        // වෙර්සෙල් එකේ ඉඩ අඩු නිසා 50MB ට වැඩි අයින් කරනවා
        if (fileSize > 50 * 1024 * 1024) { 
            throw new Error(`File too large (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Vercel limit is 50MB.`);
        }

        console.log(`📥 Starting file download to memory...`);
        
        // 2. ෆයිල් එක Buffer එකකට බාගැනීම (Stream වලට වඩා වේගවත්)
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000, // තත්පර 60ක්
            maxContentLength: 50 * 1024 * 1024, // උපරිම 50MB
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
        });

        const buffer = Buffer.from(response.data);
        console.log(`✅ Download complete. Size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB. Sending to WhatsApp...`);

        // 3. WhatsApp වලට යැවීම
        await conn.sendMessage(from, {
            document: buffer, // Buffer එක කෙලින්ම යවනවා
            mimetype: "video/mp4",
            fileName: `${title}_${quality}.mp4`.replace(/[^a-zA-Z0-9_.-]/g, '_'),
            jpegThumbnail: await getThumbnailBuffer(thumbUrl),
            caption
        }, { quoted: mek });
        
        console.log(`✅ Document sent successfully!`);

    } catch (err) {
        console.error("❌ Send error:", err.message);
        let errorMsg = `❌ File එක යැවීමේදී ප්‍රශ්නයක් ආවා: ${err.message}`;
        
        if (err.message.includes("File too large") || err.message.includes("maxContentLength")) {
            errorMsg = `❌ *මේ වීඩියෝ එක ලොකු වැඩියි!*\n\n⚠️ ඔයාගේ සර්වර් එකේ (Vercel) ලිමිට් එක නිසා 50MB ට වැඩි ෆයිල්ස් යවන්න බෑ.\n\n✅ විසඳුම: පොඩි Quality එකක් (480p) තෝරන්න, නැත්නම් සර්වර් එකකට (VPS) මාරු වෙන්න.`;
        } else if (err.message.includes("timeout")) {
            errorMsg = `⏱️ Timeout! Vercel එකේ වෙලාව ඉවර වුනා. පොඩි ෆයිල් එකක් තෝරන්න.`;
        }
        
        await conn.sendMessage(from, { text: `${errorMsg}${footer}` }, { quoted: mek });
    }
}

// MAIN COMMAND
cmd({
    pattern: "movie8",
    alias: ["film", "mv", "tv"],
    desc: "Search & Download Movies",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {
    const query = args.join(" ").trim();
    if (!query) return reply(`🎬 කරුණාකර නමක් දෙන්න!${FOOTER}`);

    try {
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
        const searchRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`);
        
        if (!searchRes.data?.results?.length) return reply(`❌ හමු නොවීය.${FOOTER}`);
        
        const { item: selected, msg: searchMsg } = await askSelection(conn, from, mek, `〽️ *RESULTS*`, searchRes.data.results, FOOTER);
        const isTV = selected.type === 'tv' || selected.url?.includes('/tvshows/');

        const detailRes = await fetchWithRetry(`${API_BASE}${isTV ? '/api/v1/tv/details' : '/api/v1/movies/details'}?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`);
        const movie = detailRes.data?.movie || detailRes.data?.tvShow;
        if (!movie) return conn.sendMessage(from, { text: `❌ Details හමු නොවීය.${FOOTER}` }, { quoted: searchMsg });

        let cap = `*☘️ ${movie.englishTitle || movie.title}*\n\n*📅 Year:* ${movie.year || 'N/A'}\n*⏱️ Duration:* ${movie.duration || 'N/A'}\n*📖 Story:*\n${movie.description || 'N/A'}\n${FOOTER}`;
        await conn.sendMessage(from, { image: { url: movie.poster?.trim() }, caption: cap }, { quoted: searchMsg });

        if (isTV) {
            const seasons = movie.seasons || [];
            const { item: selectedSeason, msg: seasonMsg } = await askSelection(conn, from, searchMsg, `📺 *SEASONS*`, seasons.map(s => ({ title: s.title, season: s })), FOOTER);
            const seasonEps = selectedSeason.season.episodes || [];
            const epItems = seasonEps.map(ep => ({ title: ep.title, slug: ep.slug, seasonNum: ep.seasonNumber, epNum: ep.episodeNumber, poster: ep.poster }));
            epItems.push({ title: `📦 Download ALL`, bulk: true });

            const { item: selectedEp, msg: epMsg } = await askSelection(conn, from, seasonMsg, `📥 *EPISODES*`, epItems, FOOTER);

            if (selectedEp.bulk) {
                for (let ep of seasonEps) {
                    try {
                        const dl = await fetchWithRetry(`${API_BASE}/api/v1/tv/episode-links?slug=${ep.slug}&resolve=true&apikey=${API_KEY}`);
                        const finalUrl = dl.data?.link || dl.data?.directUrl || dl.data?.mirrors?.[0];
                        if (finalUrl) await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${ep.seasonNumber}E${ep.episodeNumber}`, ep.poster, FOOTER);
                    } catch (e) { console.log(`Ep failed: ${e.message}`); }
                    await new Promise(r => setTimeout(r, 3000));
                }
                return;
            }
            const dl = await fetchWithRetry(`${API_BASE}/api/v1/tv/episode-links?slug=${selectedEp.slug}&resolve=true&apikey=${API_KEY}`);
            const finalUrl = dl.data?.link || dl.data?.directUrl || dl.data?.mirrors?.[0];
            if (!finalUrl) throw new Error("NO_LINK");
            await sendDocument(conn, from, epMsg, finalUrl, movie.englishTitle, `S${selectedEp.seasonNum}E${selectedEp.epNum}`, selectedEp.poster, FOOTER);
        } else {
            const linksRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/download-links?url=${encodeURIComponent(selected.url)}&apikey=${API_KEY}`);
            const rawLinks = linksRes.data?.links || linksRes.data?.downloadLinks || [];
            
            const links = rawLinks.map(l => ({ title: `${l.quality} (${l.size})`, link: l.portalUrl || l.directUrl || l.url, quality: l.quality })).filter(l => l.link);
            if (!links.length) return conn.sendMessage(from, { text: `❌ No links found.${FOOTER}` }, { quoted: searchMsg });

            const { item: selectedQuality, msg: qualityMsg } = await askSelection(conn, from, searchMsg, `📥 *QUALITIES*`, links, FOOTER);

            await conn.sendMessage(from, { text: `⏳ *Resolving...*` }, { quoted: qualityMsg });
            const resolveRes = await fetchWithRetry(`${API_BASE}/api/v1/movies/resolve-link?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`);
            const finalUrl = resolveRes.data?.link || resolveRes.data?.directUrl || resolveRes.data?.mirrors?.[0];

            if (!finalUrl) throw new Error("NO_LINK");
            await sendDocument(conn, from, qualityMsg, finalUrl, movie.englishTitle, selectedQuality.quality, movie.poster, FOOTER);
        }
    } catch (e) {
        await reply(`❌ Error: ${e.message}${FOOTER}`);
    }
});
