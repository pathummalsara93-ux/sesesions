const axios = require("axios");

let userSession = {};

module.exports = {
  name: "movie",
  description: "Search and download movies from Cinesubz",

  async handle(m, client) {
    try {
      const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        "";

      const text = body.trim();
      const sender = m.key.remoteJid;

      // 1️⃣ SEARCH
      if (text.startsWith(".movie ")) {
        const query = text.replace(/^\.movie\s+/i, "").trim();
        if (!query) return client.sendMessage(sender, { text: "❌ Please provide a movie name." });

        const res = await axios.get(
          `https://api.prabath.top/api/v1/cinesubz/search?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&query=${encodeURIComponent(query)}`
        );

        const movies = res.data.result;
        if (!movies || movies.length === 0)
          return client.sendMessage(sender, { text: "❌ No movies found." });

        userSession[sender] = { step: "select_movie", movies };

        let msg = "🎬 *Search Results*\n\n";
        movies.forEach((m, i) => {
          msg += `${i + 1}. ${m.title} (${m.year})\n`;
        });
        msg += "\nReply with the number to select.";

        return client.sendMessage(sender, { text: msg });
      }

      const session = userSession[sender];
      if (!session) return;

      // 2️⃣ SELECT MOVIE
      if (session.step === "select_movie") {
        const index = parseInt(text) - 1;
        if (isNaN(index) || !session.movies[index])
          return client.sendMessage(sender, { text: "❌ Invalid number." });

        const movie = session.movies[index];
        session.step = "select_quality";
        session.selectedMovie = movie;

        const res = await axios.get(
          `https://api.prabath.top/api/v1/cinesubz/movie?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(movie.url)}`
        );

        const d = res.data.result;

        let msg = `🎥 *${d.title}*\n\n`;
        msg += `📅 Year: ${d.year}\n`;
        msg += `⭐ Rating: ${d.rating}\n`;
        msg += `🎭 Cast: ${d.cast.join(", ")}\n\n`;
        msg += `📥 *Select quality:*\n`;

        d.quality.forEach((q, i) => {
          msg += `${i + 1}. ${q.label} (${q.size})\n`;
        });

        session.qualities = d.quality;
        return client.sendMessage(sender, { text: msg });
      }

      // 3️⃣ DOWNLOAD
      if (session.step === "select_quality") {
        const index = parseInt(text) - 1;
        if (!session.qualities[index])
          return client.sendMessage(sender, { text: "❌ Invalid selection." });

        const q = session.qualities[index];

        const res = await axios.get(
          `https://api.prabath.top/api/v1/cinesubz/download?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(q.url)}`
        );

        const file = res.data.result;

        await client.sendMessage(sender, {
          document: { url: file.url },
          mimetype: "video/x-matroska",
          fileName: file.filename,
          caption: `🎬 ${file.filename}\n📦 Size: ${file.size}`
        });

        delete userSession[sender];
      }

    } catch (e) {
      console.error(e);
      await client.sendMessage(m.key.remoteJid, { text: "⚠️ Error occurred. Try again later." });
    }
  }
};
