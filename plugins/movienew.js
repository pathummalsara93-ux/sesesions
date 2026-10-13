/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// ⭐ NPM Scraper Package
let scraper;
try {
    scraper = require('liyanaarachchi-sinhalasub-scraper-v2');
    console.log('✅ Sinhalasub scraper loaded');
} catch (e) {
    console.log('❌ Scraper package not installed:', e.message);
    console.log('📦 Run: npm install liyanaarachchi-sinhalasub-scraper-v2');
}

const userDownloads = new Map();

// ══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
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

// ⭐ Flexible function caller — different API names support
async function tryScraperMethods(obj, methods, ...args) {
    for (const method of methods) {
        if (typeof obj[method] === 'function') {
            try {
                const result = await obj[method](...args);
                if (result) {
                    console.log(`✅ scraper.${method}() worked`);
                    return result;
                }
            } catch (e) {
                console.log(`⚠️ scraper.${method}() failed: ${e.message}`);
            }
        }
    }
    return null;
}

// ══════════════════════════════════════════════════════════════
// 🎬 MOVIE COMMAND
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "movie",
    alias: ["ssub", "sinhalasubtitle", "film"],
    desc: "Download Sinhala subtitled movies via scraper",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {

    const footer = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";

    // ─────── Package check ───────
    if (!scraper) {
        return reply(`❌ *Scraper package not installed!*\n\nRun: \`npm install liyanaarachchi-sinhalasub-scraper-v2\`${footer}`);
    }

    const query = args.join(" ").trim();
    if (!query) {
        return reply(`🎬 Please provide a movie name!\n\nExample: .movie Leo${footer}`);
    }

    try {
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // ═══════════════════════════════════════════════════════
        // 🔍 STEP 1: SEARCH
        // ═══════════════════════════════════════════════════════
        console.log(`🔍 Searching: ${query}`);

        let results = await tryScraperMethods(
            scraper,
            ['searchMovie', 'search', 'searchSinhalaSub', 'searchSinhalasub'],
            query
        );

        // Handle different return formats
        if (results && typeof results === 'object' && !Array.isArray(results)) {
            results = results.results || results.data || results.movies || results.list || [];
        }

        if (!Array.isArray(results) || results.length === 0) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ No movies found for: *${query}*${footer}`);
        }

        console.log(`✅ Found ${results.length} results`);

        // ─────── Format results ───────
        let list = `〽️ *SINHALASUB SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.slice(0, 10).forEach((v, i) => {
            const title = (v.title || v.name || v.movie || 'Unknown').split("|")[0].trim();
            list += `☣️${i + 1}❭❭⚬ ${title}\n`;
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

            const movieUrl = selected.link || selected.url || selected.href;
            const movieTitle = (selected.title || selected.name || 'Movie').split("|")[0].trim();

            console.log(`📥 Getting details: ${movieUrl}`);

            // ═══════════════════════════════════════════════════
            // 📑 STEP 2: GET MOVIE DETAILS
            // ═══════════════════════════════════════════════════
            let movie = await tryScraperMethods(
                scraper,
                ['getMovieDetails', 'getDetails', 'getMovieInfo', 'movieDetails', 'details'],
                movieUrl
            );

            // Fallback — search result data
            if (!movie) {
                console.log('⚠️ Details failed, using search result data');
                movie = {
                    maintitle: movieTitle,
                    imageUrl: selected.image || selected.poster || null,
                    imdbRating: selected.rating || null,
                    dateCreated: selected.year || null,
                    genres: selected.genres || null
                };
            }

            // Handle nested response
            if (movie.mainDetails) movie = { ...movie, ...movie.mainDetails };

            const mainTitle = movie.maintitle || movie.title || movie.name || movieTitle;
            const imageUrl = movie.imageUrl || movie.image || movie.poster || null;

            // ─────── 🖼️ DETAILS CARD ───────
            let cap = `*☘️ ${mainTitle}*\n\n`;
            if (movie.imdbRating) cap += `*⭐ IMDb* ➟ *${movie.imdbRating}*\n`;
            if (movie.dateCreated || movie.year) cap += `*📅 Release* ➟ *${movie.dateCreated || movie.year}*\n`;
            if (movie.country) cap += `*🌎 Country* ➟ *${movie.country}*\n`;
            if (movie.runtime || movie.duration) cap += `*⏱️ Duration* ➟ *${movie.runtime || movie.duration}*\n`;
            const genres = movie.genres || movie.genre;
            if (genres) cap += `*🎭 Genres* ➟ *${Array.isArray(genres) ? genres.join(', ') : genres}*\n`;
            if (movie.director) cap += `*👨🏻‍💼 Director* ➟ *${movie.director}*\n`;
            if (movie.cast || movie.actors) cap += `*🕵️‍♂️ Cast* ➟ *${movie.cast || movie.actors}*\n`;
            if (movie.description || movie.plot) cap += `\n*📖 Description:*\n*${movie.description || movie.plot}*\n`;
            cap += footer;

            if (imageUrl && imageUrl.startsWith('http')) {
                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: cap
                }, { quoted: upmsg });
            } else {
                await conn.sendMessage(from, { text: cap }, { quoted: upmsg });
            }

            // ═══════════════════════════════════════════════════
            // 📥 STEP 3: GET DOWNLOAD LINKS
            // ═══════════════════════════════════════════════════
            console.log(`📥 Getting download links for: ${movieUrl}`);

            let downloadLinks = await tryScraperMethods(
                scraper,
                ['getDownloadLinks', 'downloadLinks', 'getLinks', 'getMovieDownloadLinks'],
                movieUrl
            );

            // Handle different formats
            if (downloadLinks && typeof downloadLinks === 'object' && !Array.isArray(downloadLinks)) {
                downloadLinks = downloadLinks.links || downloadLinks.downloads || downloadLinks.data || [];
            }

            if (!Array.isArray(downloadLinks) || downloadLinks.length === 0) {
                await conn.sendMessage(from, { react: { text: "❌", key: upmsg.key } });
                return conn.sendMessage(from, {
                    text: `❌ *No download links found*\n\n_Movie page: ${movieUrl}_${footer}`
                }, { quoted: upmsg });
            }

            console.log(`✅ Found ${downloadLinks.length} download links`);

            // ─────── 📋 QUALITY LIST ───────
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            downloadLinks.forEach((d, i) => {
                const quality = d.quality || d.label || d.title || `Option ${i + 1}`;
                const size = d.size ? ` (${d.size})` : '';
                qualityMsg += `*${i + 1}* ☛ ${quality}${size}\n`;
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
                    const finalUrl = target.link || target.url || target.download || target.href;
                    const quality = target.quality || target.label || target.title || 'Unknown';

                    if (!finalUrl || !finalUrl.startsWith('http')) {
                        throw new Error('Invalid download URL');
                    }

                    const safeName = mainTitle.replace(/[^\w\s\-]/g, '').trim().slice(0, 50);
                    const safeQuality = quality.replace(/[^\w\-]/g, '').trim();
                    const fileName = `${safeName}_${safeQuality}.mp4`;

                    const docCaption = `*${mainTitle}*\n\n*Quality* *[${quality}]*\n${footer}`;

                    console.log(`📤 Sending: ${fileName}`);
                    console.log(`🔗 URL: ${finalUrl}`);

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: fileName,
                        jpegThumbnail: await getThumbnailBuffer(imageUrl),
                        caption: docCaption
                    }, { quoted: dlMsg });

                    await conn.sendMessage(from, { react: { text: "✅", key: dlMsg.key } });
                    console.log(`✅ Movie sent: ${mainTitle} [${quality}]`);

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
