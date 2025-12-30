const { cmd, commands } = require('../command')
const axios = require("axios");

let userSession = {};

module.exports = {
  name: "movie",
  description: "Search and download movies from Cinesubz",
  async handle(m, client) {
    try {
      const text = m.text || "";

      // Step 1: Movie Search
      if (text.startsWith(".movie ")) {
        const query = text.replace(/^\.movie\s+/i, "").trim();
        if (!query) return client.sendMessage(m.from, "Please provide a movie name!");

        const res = await axios.get(`https://api.prabath.top/api/v1/cinesubz/search?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&query=${encodeURIComponent(query)}`);
        const movies = res.data.result;

        if (!movies || movies.length === 0) return client.sendMessage(m.from, "No movies found!");

        userSession[m.sender] = { step: "select_movie", movies };

        let listMsg = "🎬 *Search Results:*\n\n";
        movies.forEach((movie, i) => {
          listMsg += `${i+1}. ${movie.title} (${movie.year})\n`;
        });
        listMsg += "\nReply with the number of the movie to get details.";

        return client.sendMessage(m.from, { text: listMsg });
      }

      const session = userSession[m.sender];
      if (!session) return; // No session

      // Step 2: Movie Selection
      if (session.step === "select_movie") {
        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= session.movies.length)
          return client.sendMessage(m.from, "Invalid selection. Try again!");

        const movie = session.movies[index];
        session.step = "select_quality";
        session.selectedMovie = movie;

        const detailsRes = await axios.get(`https://api.prabath.top/api/v1/cinesubz/movie?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(movie.url)}`);
        const details = detailsRes.data.result;

        let detailMsg = `🎥 *${details.title}*\n\n`;
        detailMsg += `📅 Year: ${details.year}\n`;
        detailMsg += `⭐ Rating: ${details.rating}\n`;
        detailMsg += `🎭 Cast: ${details.cast.join(", ")}\n\n`;
        detailMsg += `Select quality to download:\n`;
        details.quality.forEach((q, i) => {
          detailMsg += `${i+1}. ${q.label} (${q.size})\n`;
        });
        detailMsg += "\nReply with the number of the quality.";

        session.qualities = details.quality;
        return client.sendMessage(m.from, { text: detailMsg });
      }

      // Step 3: Quality Selection & Download
      if (session.step === "select_quality") {
        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= session.qualities.length)
          return client.sendMessage(m.from, "Invalid selection. Try again!");

        const quality = session.qualities[index];

        const downloadRes = await axios.get(`https://api.prabath.top/api/v1/cinesubz/download?apikey=prabath_sk_13cc092cb53150d1054698f96d1c19bd6c160301&url=${encodeURIComponent(quality.url)}`);
        const fileData = downloadRes.data.result;

        await client.sendMessage(m.from, {
          document: { url: fileData.url },
          mimetype: "video/x-matroska",
          fileName: fileData.filename,
          caption: `📥 ${fileData.filename}\nSize: ${fileData.size}`
        });

        delete userSession[m.sender]; // Clear session
      }

    } catch (err) {
      console.error(err);
      client.sendMessage(m.from, "⚠️ Error occurred while processing your request.");
    }
  }
};
