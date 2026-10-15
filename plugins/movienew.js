/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

'use strict';

const { cmd } = require('../command');
const config = require('../config');
const { searchMovies, getMovieDetails, extractSlug, extractSiteFromItem } = require('../lib/luxalgo-api');

// ══════════════════════════════════════════════════════════════
// 🗂️ STATE MAPS
// ══════════════════════════════════════════════════════════════
if (!global.MOVIE_SEARCH_STATE) global.MOVIE_SEARCH_STATE = new Map();
if (!global.MOVIE_DETAIL_STATE) global.MOVIE_DETAIL_STATE = new Map();

const TIMEOUT = 10 * 60 * 1000;

// ══════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ══════════════════════════════════════════════════════════════
function fmtSize(bytes) {
    if (!bytes) return 'N/A';
    if (typeof bytes === 'string' && /[KMGT]B/i.test(bytes)) return bytes;
    const n = parseInt(bytes);
    if (!n || isNaN(n)) return String(bytes);
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return (n / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function fmtQuality(q) {
    const s = String(q).toLowerCase();
    if (s.includes('480')) return '📱 480p SD';
    if (s.includes('720')) return '💻 720p HD';
    if (s.includes('1080')) return '🖥️ 1080p FHD';
    if (s.includes('2160') || s.includes('4k')) return '🎞️ 4K UHD';
    return '📺 ' + q;
}

function truncate(s, n) {
    n = n || 500;
    if (!s) return '';
    s = String(s).trim();
    return s.length > n ? s.slice(0, n) + '...' : s;
}

// ══════════════════════════════════════════════════════════════
// 🎬 STEP 1: SEARCH — .movie <name>
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: 'movie',
    alias: ['mv', 'film', 'moviesearch'],
    react: '🎬',
    desc: 'Search movie & download',
    category: 'download',
    use: '.movie <name>',
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender, pushname }) => {
    try {
        const botName     = config.BOT_NAME || 'PATHUMTECH MD';
        const description = config.DESCRIPTION || '> © Powered by PathumTech 🖤';
        const userName    = pushname || 'User';

        if (!q) {
            const P = config.PREFIX || '.';
            let help = '';
            help += '╔══════════════════════════════════╗\n';
            help += '║   🎬  *MOVIE DOWNLOADER*  🎬\n';
            help += '╚══════════════════════════════════╝\n\n';
            help += '👋 Hello *' + userName + '*\n\n';
            help += '📌 *Usage:* `' + P + 'movie <name>`\n\n';
            help += '💡 *Example:*\n';
            help += '  `' + P + 'movie deadpool`\n';
            help += '  `' + P + 'movie avengers`\n\n';
            help += '🎯 *How it works:*\n';
            help += '  1️⃣ Movie name type කරන්න\n';
            help += '  2️⃣ Result එකට අංකයක් reply කරන්න\n';
            help += '  3️⃣ Quality එකට අංකයක් reply කරන්න\n';
            help += '  4️⃣ Movie file එක ලැබෙනවා ✅\n\n';
            help += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            help += '⚡ *' + botName + '* ⚡\n' + description;

            return reply(help);
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const results = await searchMovies(q.trim());

        if (!results || !results.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('❌ *No results found for:* `' + q + '`');
        }

        const top = results.slice(0, 10);

        let list = '';
        list += '╔══════════════════════════════════╗\n';
        list += '║   🎬  *MOVIE SEARCH RESULTS*  🎬\n';
        list += '╚══════════════════════════════════╝\n\n';
        list += '🔍 *Query:* `' + q + '`\n';
        list += '📊 *Found:* ' + results.length + ' results\n\n';
        list += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        top.forEach((r, i) => {
            const title = r.title || r.name || 'Unknown';
            const year  = r.year || '';
            const site  = extractSiteFromItem(r);
            list += '*' + (i + 1) + '.* 📽️ *' + title + '*\n';
            if (year) list += '     📅 ' + year + '\n';
            list += '     🌐 ' + site + '\n\n';
        });

        list += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        list += '💬 *Reply with a number (1-' + top.length + ')* to see movie details\n';
        list += '⏱️ _Expires in 10 minutes_\n\n';
        list += '⚡ *' + botName + '* ⚡\n' + description;

        const sent = await conn.sendMessage(from, { text: list }, { quoted: mek });

        global.MOVIE_SEARCH_STATE.set(from, {
            msgId: sent.key.id,
            results: top,
            timestamp: Date.now(),
            query: q
        });

        setTimeout(() => {
            const s = global.MOVIE_SEARCH_STATE.get(from);
            if (s && s.msgId === sent.key.id && Date.now() - s.timestamp >= TIMEOUT) {
                global.MOVIE_SEARCH_STATE.delete(from);
            }
        }, TIMEOUT);

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        console.log('✅ Search sent: ' + q + ' (' + top.length + ' results)');

    } catch (e) {
        console.error('❌ Search error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        try { await reply('❌ *Search failed:* ' + e.message); } catch (e2) {}
    }
});

// ══════════════════════════════════════════════════════════════
// 🎯 STEP 2 & 3: BODY HANDLER (reply catch)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: 'moviecatch',
    dontAddCommandList: true,
    on: 'body'
},
async (conn, mek, m, { from, body, sender, reply }) => {
    try {
        const text = (body || '').trim();
        if (!text) return;

        const num = parseInt(text);
        if (isNaN(num) || num < 1) return;

        const quotedId = mek.message && mek.message.extendedTextMessage
            && mek.message.extendedTextMessage.contextInfo
            && mek.message.extendedTextMessage.contextInfo.stanzaId;

        if (!quotedId) return;

        // STEP 2
        const searchState = global.MOVIE_SEARCH_STATE.get(from);
        if (searchState && searchState.msgId === quotedId) {
            const idx = num - 1;
            if (idx < 0 || idx >= searchState.results.length) {
                return reply('❌ Invalid number. Please reply with 1-' + searchState.results.length);
            }
            const picked = searchState.results[idx];
            await handleMovieDetails(conn, mek, from, sender, picked);
            return;
        }

        // STEP 3
        const detailState = global.MOVIE_DETAIL_STATE.get(from);
        if (detailState && detailState.msgId === quotedId) {
            const idx = num - 1;
            if (idx < 0 || idx >= detailState.downloads.length) {
                return reply('❌ Invalid number. Please reply with 1-' + detailState.downloads.length);
            }
            const link = detailState.downloads[idx];
            await handleDownload(conn, mek, from, sender, link, detailState.title);
            return;
        }

    } catch (e) {
        console.error('❌ moviecatch error:', e.message);
    }
});

// ══════════════════════════════════════════════════════════════
// 🎬 HANDLE DETAILS (STEP 2)
// ══════════════════════════════════════════════════════════════
async function handleMovieDetails(conn, mek, from, sender, picked) {
    const botName     = config.BOT_NAME || 'PATHUMTECH MD';
    const description = config.DESCRIPTION || '> © Powered by PathumTech 🖤';

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const site = extractSiteFromItem(picked);
        const slug = extractSlug(picked);
        if (!slug) throw new Error('Invalid movie slug');

        const apiData = await getMovieDetails(site, slug, 'all');

        const movie     = apiData.movie || apiData.data || apiData;
        const downloads = apiData.downloads || movie.downloads || apiData.links || [];

        if (!downloads.length) throw new Error('No download links available');

        const title    = movie.title || picked.title || 'Unknown';
        const year     = movie.year || picked.year || '';
        const rating   = movie.imdb || movie.rating || movie.imdb_rating || '';
        const duration = movie.duration || movie.runtime || '';
        const genres   = Array.isArray(movie.genres) ? movie.genres.join(' • ') : (movie.genre || '');
        const lang     = movie.language || movie.lang || '';
        const country  = movie.country || '';
        const director = movie.director || '';
        const cast     = Array.isArray(movie.cast) ? movie.cast.slice(0, 5).join(', ') : (movie.actors || '');
        const plot     = movie.plot || movie.description || movie.story || '';

        let card = '';
        card += '╔══════════════════════════════════╗\n';
        card += '║   🎬  *MOVIE DETAILS*  🎬\n';
        card += '╚══════════════════════════════════╝\n\n';
        card += '📽️ *' + title + '*\n\n';

        card += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
        card += '┃  📊  *INFORMATION*\n';
        card += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n';
        if (year)     card += '  📅 *Year:* `' + year + '`\n';
        if (rating)   card += '  ⭐ *IMDb:* `' + rating + '/10`\n';
        if (duration) card += '  ⏱️ *Duration:* `' + duration + '`\n';
        if (lang)     card += '  🗣️ *Language:* `' + lang + '`\n';
        if (country)  card += '  🌍 *Country:* `' + country + '`\n';
        if (genres)   card += '  🎭 *Genres:* `' + genres + '`\n';
        card += '\n';

        if (director) {
            card += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
            card += '┃  🎥  *DIRECTOR*\n';
            card += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n';
            card += '  👤 ' + director + '\n\n';
        }

        if (cast) {
            card += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
            card += '┃  ⭐  *MAIN CAST*\n';
            card += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n';
            card += '  🎭 ' + cast + '\n\n';
        }

        if (plot) {
            card += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
            card += '┃  📖  *STORY*\n';
            card += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n';
            card += '  ' + truncate(plot, 500) + '\n\n';
        }

        card += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
        card += '┃  📥  *DOWNLOAD OPTIONS*\n';
        card += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n';

        const cleanDownloads = downloads.slice(0, 10);
        cleanDownloads.forEach((d, i) => {
            const q = d.quality || d.quality_label || d.label || d.resolution || 'Unknown';
            const size = fmtSize(d.size || d.file_size || d.filesize || '');
            const prov = d.provider || d.host || d.server || 'Direct';
            card += '*' + (i + 1) + '.* ' + fmtQuality(q) + '\n';
            card += '     💾 Size: `' + size + '`\n';
            card += '     🔗 ' + prov + '\n\n';
        });

        card += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        card += '💬 *Reply with a number (1-' + cleanDownloads.length + ')* to download\n';
        card += '⏱️ _Expires in 10 minutes_\n\n';
        card += '⚡ *' + botName + '* ⚡\n' + description;

        const poster = movie.poster || movie.image || movie.thumbnail || picked.thumbnail || picked.image || '';

        let sent;
        if (poster && poster.startsWith('http')) {
            try {
                sent = await conn.sendMessage(from, {
                    image: { url: poster }, caption: card
                }, { quoted: mek });
            } catch (e) {
                console.log('⚠️ Poster failed:', e.message);
                sent = await conn.sendMessage(from, { text: card }, { quoted: mek });
            }
        } else {
            sent = await conn.sendMessage(from, { text: card }, { quoted: mek });
        }

        global.MOVIE_DETAIL_STATE.set(from, {
            msgId: sent.key.id,
            downloads: cleanDownloads,
            title: title,
            timestamp: Date.now()
        });

        setTimeout(() => {
            const s = global.MOVIE_DETAIL_STATE.get(from);
            if (s && s.msgId === sent.key.id && Date.now() - s.timestamp >= TIMEOUT) {
                global.MOVIE_DETAIL_STATE.delete(from);
            }
        }, TIMEOUT);

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('❌ Details error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        try { await reply('❌ *Failed:* ' + e.message); } catch (e2) {}
    }
}

// ══════════════════════════════════════════════════════════════
// 📥 HANDLE DOWNLOAD (STEP 3)
// ══════════════════════════════════════════════════════════════
async function handleDownload(conn, mek, from, sender, link, movieTitle) {
    const botName     = config.BOT_NAME || 'PATHUMTECH MD';
    const description = config.DESCRIPTION || '> © Powered by PathumTech 🖤';

    try {
        const url = link.url || link.link || link.download_url || link.direct_link;
        if (!url) throw new Error('No download URL found');

        const quality = link.quality || link.quality_label || link.label || 'Unknown';
        const size    = fmtSize(link.size || link.file_size || '');
        const cleanTitle = String(movieTitle).replace(/[^\w\s\-\.]/g, '').replace(/\s+/g, '.').slice(0, 60);
        const fileName = cleanTitle + '.' + quality + '.mp4';

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        const progressMsg = await conn.sendMessage(from, {
            text:
                '╔════════════════════════════════╗\n' +
                '║   📥  *DOWNLOADING...*\n' +
                '╚════════════════════════════════╝\n\n' +
                '🎬 *' + movieTitle + '*\n' +
                '🎞️ Quality: `' + quality + '`\n' +
                '💾 Size: `' + size + '`\n\n' +
                '⏳ _Please wait..._\n\n' +
                '⚡ *' + botName + '* ⚡'
        }, { quoted: mek });

        await conn.sendMessage(from, {
            document: { url: url },
            mimetype: 'video/mp4',
            fileName: fileName,
            caption:
                '╔════════════════════════════════╗\n' +
                '║   ✅  *MOVIE DOWNLOADED*\n' +
                '╚════════════════════════════════╝\n\n' +
                '🎬 *' + movieTitle + '*\n' +
                '🎞️ Quality: `' + quality + '`\n' +
                '💾 Size: `' + size + '`\n\n' +
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                '⚡ *' + botName + '* ⚡\n' + description
        }, { quoted: mek });

        try { await conn.sendMessage(from, { delete: progressMsg.key }); } catch (e) {}

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('❌ Download error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        try {
            await reply(
                '❌ *Download failed!*\n\n' +
                '📛 Error: `' + e.message.slice(0, 200) + '`\n\n' +
                '💡 Tips:\n' +
                '• Link එක expire වෙලා වෙන්න පුළුවන්\n' +
                '• ආයෙ try කරන්න'
            );
        } catch (e2) {}
    }
}
