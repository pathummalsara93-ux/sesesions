/*  ██████╗  █████╗ ████████╗██╗  ██╗██╗   ██╗███╗   ███╗
    ⚡ PATHUMTECH MD © PathumTech — DO NOT REMOVE 🛡️ */

'use strict';

const axios = require('axios');

const BASE_URL = process.env.LUXALGO_BASE_URL || 'https://luxalgo-api-keys.vercel.app';
const API_KEY  = process.env.LUXALGO_API_KEY  || 'luxalgo_unlimited_c9755cea52015b8bd49a881e';

const HEADERS = {
    'x-api-key': API_KEY,
    'Accept': 'application/json',
    'User-Agent': 'PATHUMTECH-MD/1.0'
};

// ══════════════════════════════════════════════════════════════
// 🔍 SEARCH
// ══════════════════════════════════════════════════════════════
async function searchMovies(query, site) {
    site = site || 'sinhalasub';

    const endpoints = [
        BASE_URL + '/api/v1/movie/search?q=' + encodeURIComponent(query) + '&site=' + site,
        BASE_URL + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=movie&site=' + site,
        BASE_URL + '/api/search/movie?q=' + encodeURIComponent(query),
        BASE_URL + '/api/v1/movie?q=' + encodeURIComponent(query)
    ];

    for (const url of endpoints) {
        try {
            console.log('🔍 Trying: ' + url);
            const res = await axios.get(url, {
                headers: HEADERS, timeout: 20000, validateStatus: () => true
            });

            if (res.status === 200 && res.data) {
                const results = res.data.results || res.data.data || res.data.movies || res.data.items || (Array.isArray(res.data) ? res.data : []);

                if (results.length) {
                    console.log('✅ Search OK: ' + results.length + ' results');
                    // ⭐ DEBUG — මුල් result එකේ structure එක print කරන්න
                    console.log('══════ FIRST RESULT ══════');
                    console.log(JSON.stringify(results[0], null, 2));
                    console.log('══════════════════════════');
                    return results;
                }
            }
        } catch (e) {
            console.log('❌ ' + url + ': ' + e.message);
        }
    }
    throw new Error('Search API failed');
}

// ══════════════════════════════════════════════════════════════
// 🎬 GET MOVIE DETAILS
// ══════════════════════════════════════════════════════════════
async function getMovieDetails(site, slug, quality) {
    quality = quality || 'all';
    const url = BASE_URL + '/api/v1/movie/' + site + '-' + slug + '/download?quality=' + quality;
    console.log('🎬 Details: ' + url);

    const res = await axios.get(url, {
        headers: HEADERS, timeout: 30000, validateStatus: () => true
    });

    if (res.status !== 200) throw new Error('API returned ' + res.status);
    if (!res.data) throw new Error('Empty response');
    if (res.data.error) throw new Error(res.data.error);

    console.log('══════ DETAILS RESPONSE ══════');
    console.log(JSON.stringify(res.data, null, 2).slice(0, 3000));
    console.log('══════════════════════════════');

    return res.data;
}

// ══════════════════════════════════════════════════════════════
// 🔧 FLEXIBLE HELPERS — හැම field name එකකට වැඩ කරනවා
// ══════════════════════════════════════════════════════════════
function extractSlug(item) {
    if (!item) return null;
    if (typeof item === 'string') return item;

    // ⭐ Try all possible field names
    const candidates = [
        item.slug,
        item.movieSlug,
        item.movie_slug,
        item.id,
        item.movie_id,
        item.movieId,
        item.key,
        item.permalink
    ];

    for (const c of candidates) {
        if (c && typeof c === 'string') return c;
    }

    // ⭐ URL එකෙන් slug එක ගන්න
    const urlCandidates = [item.url, item.link, item.href, item.path, item.uri];
    for (const u of urlCandidates) {
        if (u && typeof u === 'string') {
            const parts = u.replace(/\/+$/, '').split('/').filter(Boolean);
            if (parts.length) return parts[parts.length - 1];
        }
    }

    return null;
}

function extractSiteFromItem(item) {
    if (!item) return 'sinhalasub';
    if (item.site) return item.site;
    if (item.source) return item.source;

    const url = item.url || item.link || item.href || '';
    if (url.includes('cinesubz')) return 'cinesubz';
    if (url.includes('dinka') || url.includes('dinak')) return 'dinkamovies';

    return 'sinhalasub';
}

module.exports = {
    searchMovies,
    getMovieDetails,
    extractSlug,
    extractSiteFromItem,
    BASE_URL,
    API_KEY
};
