const axios = require('axios');

// API Configuration
const API_KEY = 'prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301';
const BASE_URL = 'https://api.prabath.top/api/v1/cinesubz';

// 1. Movie Search Function
async function searchMovie(conn, m, text) {
    if (!text) return m.reply("කරුණාකර චිත්‍රපටයේ නම ඇතුළත් කරන්න. (උදා: .movie Avatar)");
    
    try {
        const response = await axios.get(`${BASE_URL}/search?q=${text}&apikey=${API_KEY}`);
        const data = response.data;

        if (!data.status || data.results.length === 0) return m.reply("කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");

        let msg = `🔍 *Search Results for:* ${text}\n\n`;
        data.results.map((v, index) => {
            msg += `*${index + 1}.* ${v.title}\n🔗 URL: ${v.url}\n\n`;
        });
        msg += `එම ලැයිස්තුවෙන් අදාළ අංකය හෝ URL එක ලබාදී විස්තර ලබාගන්න.`;
        
        return m.reply(msg);
    } catch (e) {
        console.error(e);
        m.reply("API එකේ දෝෂයක් පවතී.");
    }
}

// 2. Get Details & Qualities
async function getMovieDetails(conn, m, movieUrl) {
    try {
        const response = await axios.get(`${BASE_URL}/movie?url=${movieUrl}&apikey=${API_KEY}`);
        const data = response.data;

        if (!data.status) return m.reply("විස්තර ලබාගැනීමට නොහැකි විය.");

        let details = `🎬 *${data.title}*\n\n`;
        details += `⭐ Rating: ${data.rating}\n`;
        details += `📅 Release: ${data.date}\n`;
        details += `🎭 Cast: ${data.cast.join(', ')}\n\n`;
        details += `*Download Qualities:*\n`;

        data.dl_links.forEach((dl, i) => {
            details += `*${i + 1}.* ${dl.quality} (${dl.size})\n`;
        });

        // චිත්‍රපටයේ Poster එක සමඟ විස්තර යැවීම
        await conn.sendMessage(m.chat, { 
            image: { url: data.image }, 
            caption: details + `\nඅවශ්‍ය Quality එකට අදාළ අංකය හෝ Link එක Reply කරන්න.` 
        }, { quoted: m });

    } catch (e) {
        m.reply("Details ලබාගැනීමේදී දෝෂයක් සිදුවිය.");
    }
}

// 3. Download & Send File (MKV)
async function downloadAndSend(conn, m, qualityUrl) {
    try {
        m.reply("ඔබේ ගොනුව සූදානම් කරමින් පවතී, කරුණාකර රැඳී සිටින්න... ⏳");
        
        const response = await axios.get(`${BASE_URL}/download?url=${qualityUrl}&apikey=${API_KEY}`);
        const data = response.data;

        if (!data.status) return m.reply("Download link එක සකස් කිරීමට නොහැකි විය.");

        // Direct File එක යැවීම
        await conn.sendMessage(m.chat, {
            document: { url: data.download_url },
            mimetype: 'video/x-matroska',
            fileName: `${data.filename}.mkv`,
            caption: `✅ *Downloaded:* ${data.filename}`
        }, { quoted: m });

    } catch (e) {
        m.reply("File එක යැවීමේදී දෝෂයක් සිදුවිය. (ගොනුව විශාල වැඩි විය හැක)");
    }
}
