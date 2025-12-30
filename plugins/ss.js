const { cmd } = require('../command');
const axios = require('axios');

// API Configuration
const API_KEY = 'prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301';
const BASE_URL = 'https://api.prabath.top/api/v1/sinhalasub';

// 1. Sinhalasub Search Command
cmd({
    pattern: "ss",
    alias: ["sinhalasub"],
    desc: "Search movies from sinhalasub.lk",
    category: "download",
    use: '<movie_name>',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("ℹ️ කරුණාකර චිත්‍රපටයේ නම ලබා දෙන්න. (උදා: .ss Leo)");

        const res = await axios.get(`${BASE_URL}/search?q=${encodeURIComponent(q)}&apikey=${API_KEY}`);
        
        if (!res.data.status || !res.data.results || res.data.results.length === 0) {
            return reply("❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");
        }

        let msg = `🎬 *SINHALASUB SEARCH RESULTS*\n\n`;
        res.data.results.map((v, i) => {
            msg += `*${i + 1}.* ${v.title}\n🔗 .ssinfo ${v.url}\n\n`;
        });
        msg += `💡 විස්තර සඳහා .ssinfo සමඟ ඇති Link එක එවන්න.`;

        return await reply(msg);
    } catch (e) {
        return reply("🚫 API Error! පසුව උත්සාහ කරන්න.");
    }
});

// 2. Sinhalasub Movie Info & Qualities
cmd({
    pattern: "ssinfo",
    desc: "Get sinhalasub movie details",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes('sinhalasub.lk')) return reply("❌ වලංගු Sinhalasub Link එකක් ලබා දෙන්න.");

        const res = await axios.get(`${BASE_URL}/movie?url=${q}&apikey=${API_KEY}`);
        const d = res.data;

        if (!d.status) return reply("❌ විස්තර ලබාගැනීමට නොහැකි විය.");

        let desc = `🎬 *${d.title}*\n\n`;
        desc += `⭐ *Rating:* ${d.rating}\n`;
        desc += `📅 *Release:* ${d.date}\n\n`;
        desc += `📑 *DOWNLOAD LINKS:*\n`;

        d.dl_links.forEach((dl, i) => {
            desc += `\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 .ssdl ${dl.link}`;
        });

        return await conn.sendMessage(from, { 
            image: { url: d.image }, 
            caption: desc + `\n\n💡 Download කිරීමට .ssdl සමඟ ඇති Link එක එවන්න.`
        }, { quoted: mek });

    } catch (e) {
        return reply("🚫 තොරතුරු ලබාගැනීමේදී දෝෂයක් විය.");
    }
});

// 3. Sinhalasub Direct MKV Downloader
cmd({
    pattern: "ssdl",
    desc: "Direct download sinhalasub movie as MKV",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Link එකක් අවශ්‍යයි.");

        reply("⏳ ඔබගේ Sinhalasub ගොනුව සූදානම් කරමින් පවතී. කරුණාකර රැඳී සිටින්න...");

        const res = await axios.get(`${BASE_URL}/download?url=${q}&apikey=${API_KEY}`);
        const data = res.data;

        if (!data.status || !data.download_url) return reply("❌ Download Link එක සකස් කිරීමට නොහැකි විය.");

        // Document එකක් (MKV) ලෙස යැවීම
        await conn.sendMessage(from, {
            document: { url: data.download_url },
            mimetype: 'video/x-matroska',
            fileName: `${data.filename}.mkv`,
            caption: `✅ *Movie:* ${data.filename}\n⚖️ *Size:* ${data.size}\n\n*Downloaded via Sinhalasub*`
        }, { quoted: mek });

    } catch (e) {
        return reply("🚫 ගොනුව එවීමට නොහැකි විය. (ගොනුව විශාල වැඩි වීම හෝ Server මදි වීම හේතුව විය හැක)");
    }
});
