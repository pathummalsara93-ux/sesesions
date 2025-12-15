const { cmd } = require('../command')

cmd({
    pattern: "send",
    desc: "Send your info to a given JID or group members",
    category: "owner",
}, async (conn, mek, m, { reply, q, isOwner }) => {

    if (!isOwner) return reply("❌ Owner only command!")

    const ownerName = "Pathum Malsara"
    const ownerNumber = "94773416478"
    const ownerDescription = "⚡ WhatsApp Bot Developer\n📌 LUXALGO BOT Owner\n📱 Contact for projects!"
    const ownerImage = "https://files.catbox.moe/joo2gt.jpg"

    const messageTemplate = (name, number, desc) => `╔══❖•ೋ° °ೋ•❖══╗
🌟 *LUXALGO BROADCAST SYSTEM* 🌟
╚══❖•ೋ° °ೋ•❖══╝

Movie GROUP 🎥

Sinhala Movie
Tamil Movie
Telagu Movie
Cartoon Movie
Romentic Movie
18+ Movie 🔞

*ඊට අමතරව ඔයා ඉල්ලන ඒවත් request කරාම අපි දෙනවා
*අපගේ සයිට් එකෙන් පහසුවෙන් ම එය සිදුකර ගත හැක*
👇👇👇👇👇
https://chat.whatsapp.com/EsBTIhmD5Jd8poIDWYbsZ5?mode=hqrc

${desc}

━━━━━━━━━━━━━━━
💬 _Message sent via automated bot_ 
`

    if (!q) return reply("❌ Please provide a JID or group ID!\nExample: `.sendinfo 9477xxxxxxx@s.whatsapp.net`")

    try {
        if (q.endsWith("@g.us")) {
            // If it's a group
            const groupMetadata = await conn.groupMetadata(q)
            const participants = groupMetadata.participants
            reply(`📤 Sending info to ${participants.length} members in group ${groupMetadata.subject}...`)

            for (let member of participants) {
                if (member.id.endsWith("@g.us")) continue
                await conn.sendMessage(member.id, {
                    image: { url: ownerImage },
                    caption: messageTemplate(ownerName, ownerNumber, ownerDescription)
                })
                await new Promise(r => setTimeout(r, 500))
            }
        } else {
            // Direct send to JID
            await conn.sendMessage(q, {
                image: { url: ownerImage },
                caption: messageTemplate(ownerName, ownerNumber, ownerDescription)
            })
        }

        reply("✅ Info sent successfully!")
    } catch (e) {
        console.error(e)
        reply("❌ Failed to send info!")
    }
})
