const { cmd, commands } = require('../command')
const axios = require('axios')

const API_KEY = 'prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301'

// --- 1. Search & Detail Command ---
cmd({
    pattern: "movie",
    desc: "Search movies and get download links.",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("කරුණාකර චිත්‍රපටයක නම ලබා දෙන්න. (උදා: .movie Avatar)")

        // පියවර 1: Search කිරීම
        if (!q.includes('cinesubz.lk')) {
            const res = await axios.get(`https://api.prabath.top/api/v1/cinesubz/search?q=${q}&apikey=${API_KEY}`)
            const results = res.data.results
            if (!results || results.length === 0) return reply("❌ කිසිවක් හමු නොවීය.")

            let msg = `🎬 *CINESUBZ SEARCH RESULTS*\n\n`
            results.map((v, i) => {
                msg += `*${i + 1}.* ${v.title}\n🔗 Link: ${v.url}\n\n`
            })
            msg += `💡 විස්තර ලබාගැනීමට ඉහත Link එකක් Copy කර .movie [link] ලෙස එවන්න.`
            return reply(msg)
        }

        // පියවර 2: Movie Details ලබාගැනීම
        if (q.includes('/movies/')) {
            const res = await axios.get(`https://api.prabath.top/api/v1/cinesubz/movie?url=${q}&apikey=${API_KEY}`)
            const d = res.data

            let desc = `🎬 *${d.title}*\n\n`
            desc += `⭐ Rating: ${d.rating}\n`
            desc += `📅 Date: ${d.date}\n\n`
            desc += `*DOWNLOAD LINKS:*\n`

            d.dl_links.forEach((dl, i) => {
                desc += `\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 .mvdl ${dl.link}`
            })

            return await conn.sendMessage(from, { image: { url: d.image }, caption: desc }, { quoted: mek })
        }
    } catch (e) {
        console.log(e)
        reply("🚫 API Error or Timeout!")
    }
})

// --- 2. Direct Download Command ---
cmd({
    pattern: "mvdl",
    desc: "Download movie file.",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes('cinesubz.lk/direct-download/')) {
            return reply("❌ වලංගු Direct Link එකක් ලබා දෙන්න.")
        }

        reply("⏳ ගොනුව සූදානම් කරමින් පවතී. කරුණාකර රැඳී සිටින්න...")
        const res = await axios.get(`https://api.prabath.top/api/v1/cinesubz/download?url=${q}&apikey=${API_KEY}`)
        const data = res.data

        if (!data.status) return reply("❌ Link එක සකස් කළ නොහැක.")

        await conn.sendMessage(from, {
            document: { url: data.download_url },
            mimetype: 'video/x-matroska',
            fileName: `${data.filename}.mkv`,
            caption: `✅ *Downloaded:* ${data.filename}\n⚖️ *Size:* ${data.size}`
        }, { quoted: mek })

    } catch (e) {
        console.log(e)
        reply("🚫 File එක එවීමට නොහැකි විය. (Server limits නිසා විය හැක)")
    }
})
