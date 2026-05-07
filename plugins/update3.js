const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const { exec } = require("child_process");

cmd({
  pattern: "update2",
  desc: "Download latest repo zip and update bot (skip config files)",
  category: "owner",
  filename: __filename
}, async (conn, m, msg, { reply, isOwner }) => {
  // Only allow bot owner to run this command
  if (!isOwner) return reply("*❌ This command is only for the bot owner.*");

  try {
    const repoOwner = "pathummalsara93-ux"; 
    const repoName = "sesesions";        
    const zipUrl = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/main.zip`;

    reply("*𝐃ᴏᴡɴʟᴏᴀᴅɪɴɢ 𝐋ᴀᴛᴇꜱᴛ 𝐔ᴘᴅᴀᴛᴇ...⏳*");

    const zipPath = path.join(__dirname, "update.zip");
    const writer = fs.createWriteStream(zipPath);
    const response = await axios({ url: zipUrl, method: "GET", responseType: "stream" });

    response.data.pipe(writer);

    writer.on("finish", async () => {
      reply("*𝐄xᴛʀᴀᴄᴛɪɴɢ 𝐔ᴘᴅᴀᴛᴇ...📦*");

      const skipFiles = ["index.js", "config.js", "app.json"];

      await fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on("entry", entry => {
          let entryName = entry.path.replace(`${repoName}-main/`, "");
          if (!entryName || skipFiles.includes(entryName)) {
            console.log(`⏭️ Skipped: ${entryName}`);
            entry.autodrain();
            return;
          }

          const filePath = path.join(__dirname, "..", entryName);
          if (entry.type === "Directory") {
            fs.mkdirSync(filePath, { recursive: true });
            entry.autodrain();
          } else {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            entry.pipe(fs.createWriteStream(filePath));
          }
        })
        .promise();

      fs.unlinkSync(zipPath);

      reply("*✅ 𝚄𝙿𝙳𝙰𝚃𝙴 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙴𝙳...! 🔁 Ｒᴇꜱᴛᴀʀᴛɪɴɢ DARK SHADOW ＭＤ...*");
      exec("pm2 restart all", (err) => {
        if (err) reply(`Update done ✅, but restart failed ❌:\n${err}`);
      });
    });

  } catch (err) {
    reply("❌ Update failed:\n" + err.message);
  }
});
