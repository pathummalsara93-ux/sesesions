const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// Track ongoing downloads per user
const userDownloads = new Map();

cmd({
    pattern: "movie",
    alias: ["ssub", "sinhalasubtitle"],
    desc: "Download Sinhala subtitled movies with details card",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, sender }) => {
    
    const footer = "\n\n🅻.🆃 𝐅𝐈𝐋𝐌 𝐇𝐔𝐁 ᵀⱽ ˢᵉʳⁱᵉˢ🎞️";
    
    async function getThumbnailBuffer(url) {
        if (!url) return null;
        try {
            const { data } = await axios.get(url, { responseType: "arraybuffer" });
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
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

        // 🔍 SEARCH
        const searchUrl = `https://vajira-mv-apikeys.netlify.app/api/sinhalasubs/search?q=${encodeURIComponent(query)}&apikey=vajiraofficial`;
        const searchRes = await axios.get(searchUrl);

        const results = searchRes?.data?.data?.data?.data;
        if (!results?.length) {
            await reply(`❌ No movies found.${footer}`);
            return;
        }

        // Build the search list with the new formatting
        let list = `〽️ *SINHALASUB SEARCH*\n\n🔎 ${query.toUpperCase()}\n\n`;
        results.forEach((v, i) => {
            list += `☣️${i + 1}❭❭⚬ ${v.title.split("|")[0].trim()}\n`;
        });
        list += `\nReply with number${footer}`;

        // Send the search results as an image with the list as caption
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

            // 📑 GET DETAILS
            const detailUrl = `https://vajira-mv-apikeys.netlify.app/api/sinhalasubs/movie?url=${encodeURIComponent(selected.link)}&apikey=vajiraofficial`;
            const detailRes = await axios.get(detailUrl);

            const data = detailRes?.data?.data?.data;
            const movie = data?.mainDetails;
            const links = data?.dllinks?.DownloadLinks;

            if (!movie || !links?.length) {
                await conn.sendMessage(from, { text: `❌ No details found.${footer}` }, { quoted: upmsg });
                return;
            }

            // 🖼️ DETAILS CARD – cast comes before description
            let cap = `☘️ *${movie.maintitle || 'N/A'}*\n\n`;
            
            if (movie.imdbRating) cap += `⭐ *IMDb:* ${movie.imdbRating}\n`;
            if (movie.dateCreated) cap += `📅 *Release:* ${movie.dateCreated}\n`;
            if (movie.country) cap += `🌎 *Country:* ${movie.country}\n`;
            if (movie.runtime) cap += `⏱️ *Duration:* ${movie.runtime}\n`;
            if (movie.genres && movie.genres.length) cap += `🎭 *Genres:* ${movie.genres.join(', ')}\n`;
            if (movie.director) cap += `👨🏻‍💼 *Director:* ${movie.director}\n`;
            if (movie.cast) cap += `🕵️‍♂️ *Cast:* ${movie.cast}\n`;
            // Description now appears AFTER cast
            if (movie.description) cap += `\n📖 *Description:*\n_${movie.description}_\n`;
            
            cap += footer;

            await conn.sendMessage(from, {
                image: { url: movie.imageUrl },
                caption: cap
            }, { quoted: upmsg });

            // 📥 QUALITY SELECTION MESSAGE
            let qualityMsg = `📥 *Select Quality to Download:*\n\n`;
            links.forEach((d, i) => {
                qualityMsg += `*${i + 1}* ☛ ${d.quality} (${d.size})\n`;
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

                try {
                    const dlApi = `https://vajira-mv-apikeys.netlify.app/api/sinhalasubs/download?url=${encodeURIComponent(target.link)}&apikey=vajiraofficial`;
                    const dlRes = await axios.get(dlApi);
                    const finalUrl = dlRes?.data?.data?.data?.link;
                    if (!finalUrl) throw new Error("No link");

                    // Document caption: *Title* [*Quality*] [*Size*] + footer
                    const docCaption = `*${movie.maintitle}* [*${target.quality}*] [*${target.size}*]${footer}`;

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: `${movie.maintitle}_${target.quality}.mp4`,
                        jpegThumbnail: await getThumbnailBuffer(movie.imageUrl),
                        caption: docCaption
                    }, { quoted: dlMsg });
                } catch (err) {
                    console.error(err);
                    await conn.sendMessage(from, { text: `❌ Download failed.${footer}` }, { quoted: dlMsg });
                } finally {
                    userDownloads.delete(from);
                }
            };

            conn.ev.on("messages.upsert", dlHandler);
        };

        conn.ev.on("messages.upsert", searchHandler);

    } catch (e) {
        console.error(e);
        await reply(`❌ API Error${footer}`);
    }
});
