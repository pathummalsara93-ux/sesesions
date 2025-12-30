const axios = require("axios");
const { cmd } = require("../command");

let userSession = {};

/* ===============================
   1️⃣ .movie COMMAND
================================ */
cmd({
  pattern: "movie",
  desc: "Search and download movies",
  category: "movie",
  filename: __filename
}, async (conn, mek, m, { args, from }) => {

  const query = args.join(" ");
  if (!query) {
    return conn.sendMessage(from, { text: "❌ Use: .movie avatar" }, { quoted: mek });
  }

  const res = await axios.get(
    `https://api.prabath.top/api/v1/cinesubz/search?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&query=${encodeURIComponent(query)}`
  );

  const movies = res.data.result;
  if (!movies || movies.length === 0)
    return conn.sendMessage(from, { text: "❌ No movies found!" }, { quoted: mek });

  userSession[from] = {
    step: "select_movie",
    movies
  };

  let msg = "🎬 *Search Results*\n\n";
  movies.forEach((m, i) => {
    msg += `${i + 1}. ${m.title} (${m.year})\n`;
  });

  msg += "\nReply with the number.";
  return conn.sendMessage(from, { text: msg }, { quoted: mek });
});


/* ===============================
   2️⃣ REPLY HANDLER (IMPORTANT)
================================ */
cmd({
  on: "text"
}, async (conn, mek, m, { body, from }) => {

  // ⛔ ignore commands like .movie
  if (body.startsWith(".")) return;

  if (!userSession[from]) return;

  const session = userSession[from];
  const text = body.trim();

  /* ---- STEP 1: select movie ---- */
  if (session.step === "select_movie") {
    const index = parseInt(text) - 1;
    if (!session.movies[index])
      return conn.sendMessage(from, { text: "❌ Invalid number" }, { quoted: mek });

    const movie = session.movies[index];
    session.step = "select_quality";

    const res = await axios.get(
      `https://api.prabath.top/api/v1/cinesubz/movie?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(movie.url)}`
    );

    const d = res.data.result;

    let msg = `🎥 *${d.title}*\n\n`;
    msg += `📅 Year: ${d.year}\n`;
    msg += `⭐ Rating: ${d.rating}\n`;
    msg += `🎭 Cast: ${d.cast.join(", ")}\n\n`;
    msg += `Select quality:\n`;

    d.quality.forEach((q, i) => {
      msg += `${i + 1}. ${q.label} (${q.size})\n`;
    });

    session.qualities = d.quality;
    return conn.sendMessage(from, { text: msg }, { quoted: mek });
  }

  /* ---- STEP 2: download ---- */
  if (session.step === "select_quality") {
    const index = parseInt(text) - 1;
    if (!session.qualities[index])
      return conn.sendMessage(from, { text: "❌ Invalid option" }, { quoted: mek });

    const q = session.qualities[index];

    const res = await axios.get(
      `https://api.prabath.top/api/v1/cinesubz/download?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(q.url)}`
    );

    const file = res.data.result;

    await conn.sendMessage(from, {
      document: { url: file.url },
      mimetype: "video/x-matroska",
      fileName: file.filename,
      caption: `🎬 ${file.filename}\n📦 ${file.size}`
    });

    delete userSession[from];
  }
});
