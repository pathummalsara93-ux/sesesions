const axios = require('axios');

const API_KEY = 'prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301';
const BASE_URL = 'https://api.prabath.top/api/v1/cinesubz';

module.exports = {
    name: 'movie',
    category: 'download',
    desc: 'Search and download movies from Cinesubz.',
    async execute(m, conn, { text, args }) {
        // 1. සෙවුම් පියවර (Search Step)
        if (text && !text.includes('http')) {
            try {
                const res = await axios.get(`${BASE_URL}/search?q=${text}&apikey=${API_KEY}`);
                if (!res.data.status || res.data.results.length === 0) return m.reply("❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");

                let sections = `🎬 *CINESUBZ MOVIE SEARCH*\n\nQuery: ${text}\n\n`;
                res.data.results.map((v, index) => {
                    sections += `*${index + 1}.* ${v.title}\n🔗 Link: ${v.url}\n\n`;
                });
                sections += `පහත Link එකක් Copy කර නැවත එවන්න.`;
                
                return await m.reply(sections);
            } catch (e) {
                return m.reply("🚫 Search API එකේ දෝෂයක් පවතී.");
            }
        }

        // 2. විස්තර සහ Quality ලබාගන්නා පියවර (Details Step)
        if (text && text.includes('cinesubz.lk/movies/')) {
            try {
                const res = await axios.get(`${BASE_URL}/movie?url=${text}&apikey=${API_KEY}`);
                const data = res.data;

                let details = `📑 *MOVIE DETAILS*\n\n`;
                details += `*Title:* ${data.title}\n`;
                details += `*Rating:* ${data.rating}\n`;
                details += `*Release:* ${data.date}\n\n`;
                details += `*DOWNLOAD LINKS:*\n`;

                data.dl_links.forEach((dl, i) => {
                    details += `\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 ${dl.link}`;
                });

                details += `\n\nඉහත ලැබුණු කැමති Quality එකක Link එක Copy කර එවන්න.`;

                return await conn.sendMessage(m.chat, { 
                    image: { url: data.image }, 
                    caption: details 
                }, { quoted: m });
            } catch (e) {
                return m.reply("🚫 Details API එකේ දෝෂයක් පවතී.");
            }
        }

        // 3. File එක එවීමේ පියවර (Direct Send Step)
        if (text && text.includes('cinesubz.lk/direct-download/')) {
            try {
                m.reply("⏳ ගොනුව සූදානම් කරමින් පවතී. කරුණාකර රැඳී සිටින්න...");

                const res = await axios.get(`${BASE_URL}/download?url=${text}&apikey=${API_KEY}`);
                const downloadData = res.data;

                if (!downloadData.status) return m.reply("❌ Download link එක ලබාගත නොහැක.");

                return await conn.sendMessage(m.chat, {
                    document: { url: downloadData.download_url },
                    mimetype: 'video/x-matroska',
                    fileName: `${downloadData.filename}.mkv`,
                    caption: `🎬 *${downloadData.filename}*\n⚖️ Size: ${downloadData.size}`
                }, { quoted: m });

            } catch (e) {
                return m.reply("🚫 File එක එවන අතරතුර දෝෂයක් විය. ගොනුව විශාල වැඩි විය හැක.");
            }
        }

        // Default Manual
        m.reply("භාවිතා කරන ආකාරය:\n1. *.movie [නම]* ලෙස සොයන්න.\n2. ලැබෙන ලැයිස්තුවෙන් link එක එවන්න.\n3. Quality link එක එවන්න.");
    }
};
