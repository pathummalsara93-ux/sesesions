const { cmd, commands } = require('../command')
const axios = require('axios');
const cheerio = require('cheerio');
// cmd command ඔයාහෙ තියන විදියට require කරන්න ❤️

const headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};


async function getMovieDetailsAndDownloadLinks(query) {
  try {
    const response = await axios.get(`https://cinesubz.co/?s=${encodeURIComponent(query)}`, { headers1, maxRedirects: 5 });
    const html = response.data;
    const $ = cheerio.load(html);
    const films = [];
    $('article').each((i, element) => {
      const filmName = $(element).find('.details .title a').text().trim();
      const imageUrl = $(element).find('.image .thumbnail img').attr('src');
      const description = $(element).find('.details .contenido p').text().trim();
      const year = $(element).find('.details .meta .year').text().trim();
      const imdbText = $(element).find('.details .meta .rating:first').text().trim();
      const imdb = imdbText.replace('IMDb', '').trim();
      const movieLink = $(element).find('.image .thumbnail a').attr('href');
      films.push({ filmName, imageUrl, description, year, imdb, movieLink });
    });
    for (const film of films) {
      const moviePageResponse = await axios.get(film.movieLink, { headers1, maxRedirects: 5 });
      const moviePageHtml = moviePageResponse.data;
      const $$ = cheerio.load(moviePageHtml);
      const downloadLinks = [];
      $$('a[href^="https://cinesubz.co/api-"]').each((index, element) => {
        const link = $$(element).attr('href');
        const quality = $$(element).text().trim();
        const size = $$(element).closest('li').next().text().trim();
                downloadLinks.push({ link, quality, size });
      });
      film.downloadLinks = downloadLinks;
    }
    return films;
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    return [];
  }
}


async function scrapeModifiedLink(url) {
  try {
    const response = await axios.get(url, { headers1, maxRedirects: 5 });
    const $ = cheerio.load(response.data);
    let modifiedLink = $('#link').attr('href');
    if (!modifiedLink) {
      console.log("⚠️ Modified link not found!");
      return url; 
    }
    const urlMappings = [
      { search: ["https://google.com/server11/1:/", "https://google.com/server12/1:/", "https://google.com/server13/1:/"], replace: "https://cinescloud.cskinglk.xyz/server1/" },
      { search: ["https://google.com/server21/1:/", "https://google.com/server22/1:/", "https://google.com/server23/1:/"], replace: "https://cinescloud.cskinglk.xyz/server2/" },
      { search: ["https://google.com/server3/1:/"], replace: "https://cinescloud.cskinglk.xyz/server3/" },
      { search: ["https://google.com/server4/1:/"], replace: "https://cinescloud.cskinglk.xyz/server4/" }
    ];
    urlMappings.forEach(mapping => {
      mapping.search.forEach(searchUrl => {
        if (modifiedLink.includes(searchUrl)) {
          modifiedLink = modifiedLink.replace(searchUrl, mapping.replace);
        }
      });
    });
        modifiedLink = modifiedLink.replace(".mp4?bot=cscloud2bot&code=", "?ext=mp4&bot=cscloud2bot&code=")
                               .replace(".mp4", "?ext=mp4")
                               .replace(".mkv?bot=cscloud2bot&code=", "?ext=mkv&bot=cscloud2bot&code=")
                               .replace(".mkv", "?ext=mkv")
                               .replace(".zip", "?ext=zip");
    return modifiedLink;
  } catch (error) {
    console.error("❌ Error fetching the page:", error.message);
    return url; 
  }
}


async function fetchJsonData(data, url) { try { const response = await axios.post(url, data, { headers: { "Content-Type": "application/json" }, maxRedirects: 5 });
const htmlResponse = await axios.get(url);
const $ = cheerio.load(htmlResponse.data);
const fileSize = $('p.file-info:contains("File Size") span').text().trim();
response.data.fileSize = fileSize || "Unknown";
return response.data;
} catch (error) { console.error("❌ Error fetching JSON data:", error.message); return { error: error.message }; } }


cmd({
  pattern: "film",
  alias: ["movie"],
  use: ".film <query>",
  desc: "Search and get details of films.",
  category: "search",
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
  try {
    if (!q) return reply('🔎 Please provide a film name.');
    
    await m.react('🎬');

    
    const os = require('os');
    let hostname;
    const hostNameLength = os.hostname().length;
    
    if (hostNameLength === 12) {
      hostname = "𝚁𝙴𝙿𝙻𝙸𝚃";
    } else if (hostNameLength === 36) {
      hostname = "𝙷𝙴𝚁𝙾𝙺𝚄";
    } else if (hostNameLength === 8) {
      hostname = "𝙺𝙾𝚈𝙴𝙱";
    } else {
      hostname = "𝚅𝙿𝚂 || 𝚄𝙽𝙺𝙽𝙾𝚆𝙽";
    }


                
    const films = await getMovieDetailsAndDownloadLinks(q);
    
    if (films.length === 0) {
      return reply('❌ No movies found for your query.');
    }


let filmListMessage = "📢 *\`DARK SHADOW\`*\n\n🎥 *Movie Search Results*\n*Reply Number ⤵️*\n\n";
const numberEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

films.forEach((film, index) => {
  let adjustedIndex = index + 1; 
  let emojiIndex = adjustedIndex.toString().split("").map(num => numberEmojis[num]).join("");
  filmListMessage += `${emojiIndex} *${film.filmName}*\n\n`;
});


    const sentMessage = await conn.sendMessage(from, { 
image:{url: "https://telegra.ph/file/1ece2e0281513c05d20ee.jpg"},
    caption: `${filmListMessage}`,
     contextInfo: {
               forwardingScore: 1,
                isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '',
          newsletterName: "𝐀𝐒𝐇𝐈𝐘𝐀-𝐌𝐃",
          serverMessageId: 999,
        }
        }
        }, { quoted: mek });
    
    await conn.sendMessage(from, { react: { text: "🔢", key: sentMessage.key } });
            
        conn.ev.on('messages.upsert', async (msgUpdate) => {
      const msg = msgUpdate.messages[0];
      if (!msg.message || !msg.message.extendedTextMessage) return;

      const selectedOption = msg.message.extendedTextMessage.text.trim();

      if (msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
        const selectedIndex = parseInt(selectedOption.trim()) - 1;

        if (selectedIndex >= 0 && selectedIndex < films.length) {

  await conn.sendMessage(from, { react: { text: "🔄", key: msg.key } });
          

                                                                      const film = films[selectedIndex];

let filmDetailsMessage = `📢 *\`DARK SHADOW\`*\n\n* *🎬 ${film.filmName}* (${film.year})\n`;
filmDetailsMessage += `* *⭐ IMDb: ${film.imdb}*\n`;
filmDetailsMessage += `* *📝 ${film.description}*\n\n`;

const filteredDownloadLinks = film.downloadLinks.filter(dl => !dl.quality.includes("Telegram"));

let jsonResponses = []; 

if (filteredDownloadLinks.length > 0) {
    filmDetailsMessage += `*Reply Number ⤵️*\n\n`;

    const numberEmojis1 = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

    for (const [index, dl] of filteredDownloadLinks.entries()) {
        const emojiIndex1 = (index + 1).toString().split("").map(num => numberEmojis1[num]).join(""); 

        const modifiedLink = await scrapeModifiedLink(dl.link);
        const jsonResponse = await fetchJsonData({ direct: true }, modifiedLink);

jsonResponses.push(jsonResponse);

        if (!jsonResponse.url) continue; 
        let cleanedQuality = dl.quality.replace(/(SD|HD|BluRay|FHD|WEBRip|WEB-DL|WEBDL|Direct)/gi, "").trim(); 

        filmDetailsMessage += `${emojiIndex1} *${cleanedQuality} - ${jsonResponse.fileSize}*\n`;
      
     }
} 

const sentMessage1 = await conn.sendMessage(from, { 
image:{url: `${film.imageUrl}`},
    caption: `${filmDetailsMessage}`,
     contextInfo: {
               forwardingScore: 1,
                isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '',
          newsletterName: "DARK SHADOW",
          serverMessageId: 999,
        }
        }
        }, { quoted: msg });

await conn.sendMessage(from, { react: { text: "🔢", key: sentMessage1.key } });



conn.ev.on('messages.upsert', async (msgUpdate) => {
    const msg1 = msgUpdate.messages[0];
    if (!msg1.message || !msg1.message.extendedTextMessage) return;

    const selectedOption = msg1.message.extendedTextMessage.text.trim();

    if (msg1.message.extendedTextMessage.contextInfo && msg1.message.extendedTextMessage.contextInfo.stanzaId === sentMessage1.key.id) {
        const selectedIndex1 = parseInt(selectedOption) - 1;

        if (selectedIndex1 >= 0 && selectedIndex1 < jsonResponses.length) {

await conn.sendMessage(from, { react: { text: "⬇️", key: msg1.key } });

           
  if (!jsonResponses[selectedIndex1].url) {
    await conn.sendMessage(from, { react: { text: "❌", key: msg1.key } });
    await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg1 });
    return;
}          
             

if (["𝙷𝙴𝚁𝙾𝙺𝚄", "𝙺𝙾𝚈𝙴𝙱"].includes(hostname)) {
    await conn.sendMessage(from, { react: { text: "🚫", key: msg1.key } });
    await conn.sendMessage(from, { text: `🚫 *Cannot send large files on ${hostname}.*\n\n⚠️ This platform has restrictions on sending large media files. Please use a VPS or a suitable server.` }, { quoted: msg1 });
    return;
}


let fileSizeMB = parseFloat(jsonResponses[selectedIndex1].fileSize) * (jsonResponses[selectedIndex1].fileSize.includes("GB") ? 1024 : 1);

if (fileSizeMB > 2000) {
   await conn.sendMessage(from, { react: { text: "🚫", key: msg1.key } });
     await conn.sendMessage(from, { text: `🚫 *Cannot send files larger than 2GB.*\n\n⚠️ WhatsApp supports only up to 2GB for file uploads. Try Low Quality` }, { quoted: msg1 });
    return;
}


await conn.sendMessage(from, { 
    document: { url: `${jsonResponses[selectedIndex1].url}` }, 
    mimetype: "video/mp4", 
    fileName: `${film.filmName}.mp4`,
    caption: `*🎥 ${film.filmName}*

* *⏳ Year ${film.year}*
* *⭐ Rating ${film.imdb}*
* *📦 Size ${jsonResponses[selectedIndex1].fileSize}*

> 📝 *${film.description}*` 
}, { quoted: msg1 });

await conn.sendMessage(from, { react: { text: "✅", key: msg1.key } });

        } else {
            await conn.sendMessage(from, { react: { text: "❌", key: msg1.key } });
            await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg1 });
        }
    }
});                                                                                                                                   } else {
            await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg });
        }
      }
    });

  } catch (error) {
    console.error(error);
    reply('⚠️ An error occurred while searching for films.');
  }
});
