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
// 🔍 SEARCH MOVIES
// ══════════════════════════════════════════════════════════════
async function searchMovies(query, site = 'sinhalasub') {
    const endpoints = [
        `${BASE_URL}/api/v1/movie/search?q=${encodeURIComponent(query)}&site=${site}`,
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=movie&site=${site}`,
        `${BASE_URL}/api/search/movie?q=${encodeURIComponent(query)}`,
        `${BASE_URL}/api/v1/movie?q=${encodeURIComponent(query)}`
    ];

    for (const url of endpoints) {
        try {
            console.log(`🔍 Trying: ${url}`);
            const { data, status } = await axios.get(url, {
                headers: HEADERS, timeout: 20000, validateStatus: () => true
            });

            if (status === 200 && data) {
                const results = data.results || data.data || data.movies || data.items || (Array.isArray(data) ? data : []);
                if (results.length) {
                    console.log(`✅ Search OK: ${results.length} results from ${url}`);
                    return results;
                }
            }
        } catch (e) {
            console.log(`❌ ${url}: ${e.message}`);
        }
    }
    throw new Error('Search API failed — no working endpoint found');
}

// ══════════════════════════════════════════════════════════════
// 🎬 GET MOVIE DETAILS + DOWNLOADS
// ══════════════════════════════════════════════════════════════
async function getMovieDetails(site, slug, quality = 'all') {
    const url = `${BASE_URL}/api/v1/movie/${site}-${slug}/download?quality=${quality}`;
    console.log(`🎬 Details: ${url}`);

    const { data, status } = await axios.get(url, {
        headers: HEADERS, timeout: 30000, validateStatus: () => true
    });

    if (status !== 200) throw new Error(`API returned ${status}`);
    if (!data) throw new Error('Empty response');
    if (data.error) throw new Error(data.error);

    console.log('══════ API RESPONSE ══════');
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    console.log('══════════════════════════');

    return data;
}

// ══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ══════════════════════════════════════════════════════════════
function extractSlug(item) {
    if (!item) return null;
    if (item.slug) return item.slug;
    if (item.url) {
        const parts = item.url.replace(/\/+$/, '').split('/').filter(Boolean);
        return parts[parts.length - 1] || null;
    }
    return null;
}

function extractSiteFromItem(item) {
    if (item.site) return item.site;
    if (item.source) return item.source;
    if (item.url) {
        if (item.url.includes('cinesubz')) return 'cinesubz';
        if (item.url.includes('dinka')) return 'dinkamovies';
        if (item.url.includes('dinak')) return 'dinkamovies';
    }
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
