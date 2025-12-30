const { cmd } = require('../command');
const axios = require('axios');

const API_KEY = 'prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301';
const BASE_URL = 'https://api.prabath.top/api/v1/cinesubz';

// 1. Movie Search Command
cmd({
    pattern: "movie",
    alias: ["search"],
    desc: "Search movies from Cinesubz",
    category: "download",
    use: '<movie_name>',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("ℹ️ කරුණාකර චිත්‍රපටයේ නම ලබා දෙන්න. (උදා: .movie Avatar)");

        // Search API call
        const res = await axios.get(`${BASE_URL}/search?q=${encodeURIComponent(q)}&apikey=${API_KEY}`, { timeout: 60000 });
        
        if (!res.data.status || !res.data.results || res.data.results.length === 0) {
            return reply("❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය. කරුණාකර නම නිවැරදිදැයි බලන්න.");
        }

        let msg = `🎬 *CINESUBZ SEARCH RESULTS*\n\n`;
        res.data.results.map((v, i) => {
            msg += `*${i + 1}.* ${v.title}\n🔗 .infomv ${v.url}\n\n`;
        });
        msg += `💡 වැඩි විස්තර ලබාගැනීමට ඉහත .infomv සමඟ ඇති Link එක කොපි කර එවන්න.`;

        return await reply(msg);
    } catch (e) {
        console.error(e);
        return reply("🚫 API Error! කරුණාකර පසුව උත්සාහ කරන්න.");
    }
});

// 2. Movie Details & Quality List Command
cmd({
    pattern: "infomv",
    desc: "Get movie details and quality links",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes('cinesubz.lk/movies/')) return reply("❌ වලංගු Cinesubz Link එකක් ලබා දෙන්න.");

        // Movie Details API call
        const res = await axios.get(`${BASE_URL}/movie?url=${q}&apikey=${API_KEY}`, { timeout: 60000 });
        const d = res.data;

        if (!d.status) return reply("❌ විස්තර ලබාගැනීමට නොහැකි විය.");

        let desc = `🎬 *MOVIE DETAILS*\n\n`;
        desc += `*📌 Title:* ${d.title}\n`;
        desc += `*⭐ Rating:* ${d.rating}\n`;
        desc += `*📅 Release:* ${d.date}\n`;
        desc += `*🎭 Cast:* ${d.cast ? d.cast.join(', ') : 'N/A'}\n\n`;
        desc += `*📥 DOWNLOAD LINKS:*\n`;

        d.dl_links.forEach((dl, i) => {
            desc += `\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 .mvdl ${dl.link}`;
        });

        desc += `\n\n💡 Download කිරීමට අවශ්‍ය Quality එක ඉදිරියේ ඇති .mvdl command එක කොපි කර එවන්න.`;

        return await conn.sendMessage(from, { 
            image: { url: d.image }, 
            caption: desc 
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        return reply("🚫 Details ලබාගැනීමේදී දෝෂයක් විය.");
    }
});

// 3. Direct Download & Document Upload (MKV)
cmd({
    pattern: "mvdl",
    desc: "Direct download and send movie file",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes('cinesubz.lk/direct-download/')) return reply("❌ වලංගු Direct Download Link එකක් ලබා දෙන්න.");

        reply("⏳ ඔබේ ගොනුව සූදානම් කරමින් පවතී. මෙය විශාල ගොනුවක් නම් මද වේලාවක් ගත විය හැක...");

        // Download API call
        const res = await axios.get(`${BASE_URL}/download?url=${q}&apikey=${API_KEY}`, { timeout: 120000 });
        const data = res.data;

        if (!data.status || !data.download_url) return reply("❌ Download Link එක සකස් කිරීමට නොහැකි විය.");

        // Sending as a Document (MKV)
        await conn.sendMessage(from, {
            document: { url: data.download_url },
            mimetype: 'video/x-matroska',
            fileName: `${data.filename}.mkv`,
            caption: `✅ *Movie:* ${data.filename}\n⚖️ *Size:* ${data.size}\n\n*Downloaded by Bot*`
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        return reply("🚫 ගොනුව එවන අතරතුර දෝෂයක් විය. සමහර විට ගොනුව ඔබගේ Bot එකට දරාගත නොහැකි තරම් විශාල විය හැක.");
    }
});
