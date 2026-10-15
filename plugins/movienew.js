const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// Track ongoing downloads per user
const userDownloads = new Map();

cmd({
    pattern: "movie",
    alias: ["cinesubz", "cinesubzmovie"],
    desc: "Download Cinesubz movies with details card",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {
    
    const footer = "\n\n🎬 𝐂𝐈𝐍𝐄𝐒𝐔𝐁𝐙 𝐌𝐎𝐕𝐈𝐄𝐒 🎞️";
    
    async function getThumbnailBuffer(url) {
        if (!url) return null;
        try {
            const { data } = await axios.get(url, { 
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return await sharp(data).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
        } catch (e) {
            console.log("⚠️ Thumbnail error:", e.message);
            return null;
        }
    }

    const query = args.join(" ").trim();
    if (!query) {
        await reply(`🎬 Please provide a movie name!\n\nExample: .movie Leo${footer}`);
        return;
    }

    try {
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

        // 🔍 SEARCH (Cinesubz)
        const searchUrl = `https://dtz-movie-script.vercel.app/api/movie/cinesubzsearch?q=${encodeURIComponent(query)}&page=1&limit=10`;
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔍 Search API Call:", searchUrl);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const searchRes = await axios.get(searchUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        // Try multiple possible paths for search results
        const results = 
            searchRes?.data?.results || 
            searchRes?.data?.data || 
            searchRes?.data?.data?.data || 
            searchRes?.data?.data?.results ||
            searchRes?.data;

        if (!Array.isArray(results) || !results.length) {
            await reply(`❌ No movies found.${footer}`);
            return;
        }

        // Build the search list
        let list = `〽️ *CINESUBZ SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.forEach((v, i) => {
            // Try common title fields
            const title = v.title || v.name || v.maintitle || v.movieTitle || `Item ${i + 1}`;
            list += `☣️${i + 1}❭❭⚬ ${title.split("|")[0].trim()}\n`;
        });
        list += `\nReply with number${footer}`;

        const searchImageUrl = "https://files.catbox.moe/knn0ft.jpg";
        const sent = await conn.sendMessage(from, {
            image: { url: searchImageUrl },
            caption: list
        }, { quoted: mek });
        const searchMsgId = sent.key.id;

        // 🔁 Search selection handler
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
                await conn.sendMessage(from, { text: `❎ Invalid number${footer}` }, { quoted: upmsg });
                return;
            }

            await conn.sendMessage(from, { react: { text: "📑", key: upmsg.key } });

            // 📑 GET DETAILS (Cinesubz)
            // Try common link fields from the search result
            const movieLink = selected.url || selected.link || selected.href || selected.movieUrl;
            if (!movieLink) {
                await conn.sendMessage(from, { text: `❌ No link found for this movie.${footer}` }, { quoted: upmsg });
                return;
            }

            const detailUrl = `https://dtz-movie-script.vercel.app/api/movie/cinesubzdetails?url=${encodeURIComponent(movieLink)}`;
            
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📑 Details API Call:", detailUrl);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            const detailRes = await axios.get(detailUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            // Try multiple possible paths for detail data
            const data = 
                detailRes?.data?.data || 
                detailRes?.data?.result || 
                detailRes?.data?.data?.data ||
                detailRes?.data;

            const movie = data?.mainDetails || data?.details || data?.movie || data;
            const links = 
                data?.downloadLinks || 
                data?.dllinks?.DownloadLinks || 
                data?.links || 
                data?.downloads ||
                movie?.downloadLinks;

            if (!movie || !links?.length) {
                await conn.sendMessage(from, { text: `❌ No details found.${footer}` }, { quoted: upmsg });
                return;
            }

            console.log("✅ Movie:", movie.maintitle || movie.title);
            console.log("✅ Qualities:", links.map(l => l.quality || l.label).join(", "));

            // 🖼️ DETAILS CARD
            let cap = `*☘️ ${movie.maintitle || movie.title || 'N/A'}*\n\n`;
            
            if (movie.imdbRating || movie.rating) cap += `*⭐ IMDb* ➟ *${movie.imdbRating || movie.rating}*\n`;
            if (movie.dateCreated || movie.releaseDate) cap += `*📅 Release* ➟ *${movie.dateCreated || movie.releaseDate}*\n`;
            if (movie.country) cap += `*🌎 Country* ➟ *${movie.country}*\n`;
            if (movie.runtime || movie.duration) cap += `*⏱️ Duration* ➟ *${movie.runtime || movie.duration}*\n`;
            if (movie.genres && movie.genres.length) cap += `*🎭 Genres* ➟ *${movie.genres.join(', ')}*\n`;
            if (movie.director) cap += `*👨🏻‍💼 Director* ➟ *${movie.director}*\n`;
            if (movie.cast) cap += `*🕵️‍♂️ Cast* ➟ *${movie.cast}*\n`;
            if (movie.description || movie.synopsis) cap += `\n*📖 Description:*\n*${movie.description || movie.synopsis}*\n`;
            
            cap += footer;

            const posterUrl = movie.imageUrl || movie.poster || movie.image;

            await conn.sendMessage(from, {
                image: posterUrl ? { url: posterUrl } : { url: "https://files.catbox.moe/knn0ft.jpg" },
                caption: cap
            }, { quoted: upmsg });

            // 📥 QUALITY SELECTION MESSAGE
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            links.forEach((d, i) => {
                qualityMsg += `*${i + 1}* ☛ ${d.quality || d.label || 'Quality'} (${d.size || 'N/A'})\n`;
            });
            qualityMsg += `\nReply with number${footer}`;

            const sentQuality = await conn.sendMessage(from, { text: qualityMsg }, { quoted: upmsg });
            const qualityMsgId = sentQuality.key.id;

            // 🔽 Download handler
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
                    await conn.sendMessage(from, { text: `❎ Invalid selection${footer}` }, { quoted: dlMsg });
                    return;
                }

                if (userDownloads.get(from)) {
                    await conn.sendMessage(from, { text: `⏳ Another download running...${footer}` }, { quoted: dlMsg });
                    return;
                }

                userDownloads.set(from, true);
                await conn.sendMessage(from, { react: { text: "✔️", key: dlMsg.key } });
                await conn.sendMessage(from, { text: `⏳ *Fetching download link...*\n\n🎬 ${movie.maintitle || movie.title}\n📺 ${target.quality || target.label} (${target.size || 'N/A'})\n\nPlease wait...${footer}` }, { quoted: dlMsg });

                try {
                    // ============ STEP 1: Get final download URL (Cinesubz) ============
                    const targetLink = target.link || target.url;
                    if (!targetLink) throw new Error("NO_LINK");

                    const dlApi = `https://dtz-movie-script.vercel.app/api/movie/cinesubzdown?url=${encodeURIComponent(targetLink)}`;
                    
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("🔍 Download API Call:");
                    console.log("   Quality:", target.quality || target.label);
                    console.log("   Size:", target.size);
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");

                    let dlRes;
                    try {
                        dlRes = await axios.get(dlApi, {
                            timeout: 60000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json, text/plain, */*'
                            }
                        });
                    } catch (apiErr) {
                        console.error("❌ Download API Error:");
                        console.error("   Status:", apiErr.response?.status);
                        console.error("   Data:", JSON.stringify(apiErr.response?.data || {}).slice(0, 500));
                        console.error("   Message:", apiErr.message);
                        
                        throw new Error(`API_ERROR_${apiErr.response?.status || 'NETWORK'}`);
                    }

                    console.log("✅ API Status:", dlRes.status);
                    console.log("✅ API Data:", JSON.stringify(dlRes.data).slice(0, 800));

                    // ============ STEP 2: Parse final URL (try multiple structures) ============
                    let finalUrl = 
                        dlRes?.data?.data?.link ||
                        dlRes?.data?.link ||
                        dlRes?.data?.data?.url ||
                        dlRes?.data?.url ||
                        dlRes?.link ||
                        dlRes?.url ||
                        dlRes?.data?.data?.data?.link ||
                        dlRes?.data?.data?.data?.url;

                    if (!finalUrl || typeof finalUrl !== 'string' || !finalUrl.startsWith('http')) {
                        console.error("❌ Invalid finalUrl:", finalUrl);
                        console.error("   Full response:", JSON.stringify(dlRes.data).slice(0, 1000));
                        throw new Error("NO_LINK");
                    }

                    console.log("✅ Final URL:", finalUrl.slice(0, 100) + "...");

                    // ============ STEP 3: Verify the URL works (HEAD request) ============
                    try {
                        const headRes = await axios.head(finalUrl, {
                            timeout: 15000,
                            maxRedirects: 5,
                            validateStatus: (s) => s < 500,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                        const size = headRes.headers['content-length'];
                        if (size) {
                            const sizeMB = (parseInt(size) / (1024 * 1024)).toFixed(2);
                            console.log(`📦 File size: ${sizeMB} MB`);
                            
                            if (parseInt(size) > 2 * 1024 * 1024 * 1024) {
                                throw new Error(`File too large: ${sizeMB}MB (max 2GB)`);
                            }
                        }
                    } catch (headErr) {
                        console.log("⚠️ HEAD check skipped:", headErr.message);
                    }

                    // ============ STEP 4: Send as document ============
                    await conn.sendMessage(from, { text: `📥 *Downloading...*\n\n🎬 ${movie.maintitle || movie.title}\n📺 ${target.quality || target.label}\n\n⏳ This may take 1-5 minutes...${footer}` }, { quoted: dlMsg });

                    const docCaption = `*${movie.maintitle || movie.title}*\n\n *Quality* *[${target.quality || target.label}]*\n ${footer}`;

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: `${(movie.maintitle || movie.title).replace(/[^a-z0-9]/gi, '_')}_${(target.quality || target.label).replace(/[^a-z0-9]/gi, '_')}.mp4`,
                        jpegThumbnail: await getThumbnailBuffer(posterUrl),
                        caption: docCaption
                    }, { quoted: dlMsg });

                    console.log("✅ Movie sent successfully!");

                } catch (err) {
                    console.error("❌ DOWNLOAD FAILED:");
                    console.error("   Message:", err.message);
                    console.error("   Stack:", err.stack);

                    // Detailed error messages
                    let errorMsg = "❌ Download failed.";
                    
                    if (err.message === "NO_LINK") {
                        errorMsg = "❌ API එකෙන් download link එකක් ලැබුනේ නෑ.\n\n🔁 වෙන quality එකක් try කරන්න.";
                    } else if (err.message === "API_ERROR_500") {
                        errorMsg = "⚠️ API Server Error (500)\n\n🔧 ඒ movie file එක ලොකු නිසා API timeout වුනා.\n⏱️ මිනිත්තු 2කින් නැවත try කරන්න.";
                    } else if (err.message === "API_ERROR_404") {
                        errorMsg = "❌ Movie file එක හම්බුනේ නෑ.\n\n🎬 වෙන quality එකක් try කරන්න.";
                    } else if (err.message === "API_ERROR_429") {
                        errorMsg = "⏰ Rate limit!\n\n⏱️ මිනිත්තු 2කින් නැවත try කරන්න.";
                    } else if (err.message === "API_ERROR_NETWORK") {
                        errorMsg = "🌐 API Server එකට connect වෙන්න බෑ.\n\n🔁 නැවත try කරන්න.";
                    } else if (err.message.includes("File too large")) {
                        errorMsg = `❌ ${err.message}\n\n📱 WhatsApp limit එක 2GB.\n🎬 පොඩි quality එකක් (480p / 720p) try කරන්න.`;
                    } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                        errorMsg = "⏱️ Timeout!\n\n📥 File එක ලොකු නිසා slow.\n🔁 නැවත try කරන්න හෝ පොඩි quality එකක් ගන්න.";
                    } else if (err.message.includes('ENOTFOUND')) {
                        errorMsg = "🌐 Server එක හම්බුනේ නෑ.\n\n🔁 නැවත try කරන්න.";
                    }

                    await conn.sendMessage(from, { text: `${errorMsg}${footer}` }, { quoted: dlMsg });
                } finally {
                    userDownloads.delete(from);
                }
            };

            conn.ev.on("messages.upsert", dlHandler);
        };

        conn.ev.on("messages.upsert", searchHandler);

    } catch (e) {
        console.error("❌ MAIN ERROR:", e.message);
        console.error("   Stack:", e.stack);
        await reply(`❌ API Error: ${e.message}${footer}`);
    }
});
