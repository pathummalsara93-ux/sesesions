const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Define fakevCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SILA AI 🎅",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SILA AI CHRISTMAS\nORG:SILA AI;\nTEL;type=CELL;type=VOICE;waid=255612491554:+255612491554\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "broadcast",
    alias: ["bc", "announce", "advertise"],
    desc: "Broadcast message to all users and groups",
    category: "owner",
    react: "📢",
    filename: __filename
}, 
async (conn, mek, m, { from, sender, reply, args, text, isOwner }) => {
    try {
        // Check if user is owner
        if (!isOwner) {
            await reply("*❌ This command is only for bot owner*");
            return;
        }

        // Check if there's a message to broadcast
        if (!text && !m.quoted) {
            const helpText = `╔═══════════════════════
║  *𝙱𝚁𝙾𝙰𝙳𝙲𝙰𝚂𝚃 𝙷𝙴𝙻𝙿*
╚═══════════════════════

┌─「 𝚄𝚂𝙰𝙶𝙴 」━━━━━━━━━━━━━━━
│ 
│  *📌 .bc <message>* - Broadcast text
│  *📌 .bc image <caption>* - Broadcast image
│  *📌 .bc video <caption>* - Broadcast video
│  *📌 .bc audio* - Broadcast audio
│  *📌 .bc document <caption>* - Broadcast document
│  *📌 .bc list* - Show statistics
│  *📌 .bc clear* - Clear all data
│ 
└────────────────────

*💡 Examples:*
• .bc Hello everyone! New update available.
• .bc image Check out our new feature!
• Reply to a message with .bc to forward it

*𝙿𝚘𝚠𝚎𝚛𝚎𝚢 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`;
            
            await conn.sendMessage(from, { text: helpText });
            return;
        }

        // Handle list command
        if (args.toLowerCase() === 'list') {
            const broadcastData = getBroadcastStats();
            const statsText = `╔═══════════════════════
║  *𝙱𝚁𝙾𝙰𝙳𝙲𝙰𝚂𝚃 𝚂𝚃𝙰𝚃𝚂*
╚═══════════════════════

┌─「 📊 𝚂𝚃𝙰𝚃𝙸𝚂𝚃𝙸𝙲𝚂 」━━━━━━━━━━
│ 
│  *👥 Total Users:* ${broadcastData.totalUsers}
│  *👥 Total Groups:* ${broadcastData.totalGroups}
│  *📅 Last Broadcast:* ${broadcastData.lastBroadcast || 'Never'}
│  *📨 Messages Sent:* ${broadcastData.totalMessages}
│ 
└────────────────────

*💬 Usage History:*
${broadcastData.history.length > 0 
    ? broadcastData.history.slice(-5).map((h, i) => 
        `*${i+1}.* ${h.type} - ${h.date}\n  ${h.message.substring(0, 30)}...`
      ).join('\n')
    : 'No broadcast history yet.'}

*𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`;
            
            await conn.sendMessage(from, { text: statsText });
            return;
        }

        // Handle clear command
        if (args.toLowerCase() === 'clear') {
            clearBroadcastData();
            await reply("*🗑️ Broadcast data cleared successfully*");
            return;
        }

        // Get all chats
        const chats = conn.chats.all();
        const users = [];
        const groups = [];

        // Separate users and groups
        chats.forEach(chat => {
            if (chat.id.includes('@g.us')) {
                groups.push(chat.id);
            } else if (chat.id.includes('@s.whatsapp.net') && !chat.id.includes('status')) {
                users.push(chat.id);
            }
        });

        const totalRecipients = users.length + groups.length;
        
        if (totalRecipients === 0) {
            await reply("*❌ No users or groups found to broadcast*");
            return;
        }

        // Confirmation message
        const confirmText = `╔═══════════════════════
║  *𝙱𝚁𝙾𝙰𝙳𝙲𝙰𝚂𝚃 𝙲𝙾𝙽𝙵𝙸𝚁𝙼𝙰𝚃𝙸𝙾𝙽*
╚═══════════════════════

┌─「 📨 𝚁𝙴𝙲𝙸𝙿𝙸𝙴𝙽𝚃𝚂 」━━━━━━━━━━
│ 
│  *👤 Total Users:* ${users.length}
│  *👥 Total Groups:* ${groups.length}
│  *📊 Total Recipients:* ${totalRecipients}
│ 
└────────────────────

*⚠️ Are you sure you want to send this broadcast?*

*Reply with:* 
• *yes* to proceed
• *no* to cancel

*𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`;

        await conn.sendMessage(from, { text: confirmText });

        // Wait for confirmation
        const confirmation = await waitForResponse(conn, from, sender, 30000); // 30 seconds timeout
        
        if (!confirmation || confirmation.toLowerCase() !== 'yes') {
            await conn.sendMessage(from, { 
                text: '*❌ Broadcast cancelled*' 
            });
            return;
        }

        // Start broadcast
        await conn.sendMessage(from, { 
            text: `*📤 Starting broadcast to ${totalRecipients} recipients...*` 
        });

        let successCount = 0;
        let failCount = 0;
        const startTime = Date.now();

        // Send to users
        for (const user of users) {
            try {
                await sendBroadcastMessage(conn, user, mek, text, m.quoted);
                successCount++;
                
                // Add small delay to avoid rate limiting
                await sleep(500);
            } catch (error) {
                console.error(`Failed to send to user ${user}:`, error.message);
                failCount++;
            }
        }

        // Send to groups
        for (const group of groups) {
            try {
                await sendBroadcastMessage(conn, group, mek, text, m.quoted);
                successCount++;
                
                // Add small delay to avoid rate limiting
                await sleep(1000);
            } catch (error) {
                console.error(`Failed to send to group ${group}:`, error.message);
                failCount++;
            }
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // Save broadcast history
        saveBroadcastHistory({
            type: m.quoted ? 'quoted' : 'text',
            message: text || 'Quoted message',
            date: new Date().toLocaleString(),
            success: successCount,
            failed: failCount,
            duration: duration
        });

        // Result message
        const resultText = `╔═══════════════════════
║  *𝙱𝚁𝙾𝙰𝙳𝙲𝙰𝚂𝚃 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙴𝙳*
╚═══════════════════════

┌─「 📊 𝚁𝙴𝚂𝚄𝙻𝚃𝚂 」━━━━━━━━━━━━━
│ 
│  *✅ Successful:* ${successCount}
│  *❌ Failed:* ${failCount}
│  *📊 Total:* ${totalRecipients}
│  *⏱️ Duration:* ${duration} seconds
│  *📅 Time:* ${new Date().toLocaleString()}
│ 
└────────────────────

*📈 Success Rate:* ${((successCount / totalRecipients) * 100).toFixed(2)}%

*🎯 Details:*
• Users: ${users.length}
• Groups: ${groups.length}
• Average: ${(duration / totalRecipients).toFixed(2)}s per message

*𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`;

        await conn.sendMessage(from, { text: resultText });

    } catch (error) {
        console.error('Error in broadcast command:', error);
        reply(`*❌ Broadcast Error:* ${error.message}`);
    }
});

// Helper function to send broadcast message
async function sendBroadcastMessage(conn, jid, mek, text, quoted) {
    const messageOptions = {
        ...fakevCard,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402325089913@newsletter',
                newsletterName: 'SILA MD',
                serverMessageId: 200
            }
        }
    };

    if (quoted) {
        // Forward quoted message
        const forwardedMessage = {
            key: {
                fromMe: false,
                remoteJid: jid,
                id: mek.key.id
            },
            message: quoted.message,
            messageTimestamp: mek.messageTimestamp
        };
        
        await conn.relayMessage(jid, forwardedMessage.message, {});
        
        // Add caption if provided
        if (text) {
            await conn.sendMessage(jid, { 
                text: `*📢 Broadcast Message:*\n\n${text}`,
                ...messageOptions
            });
        }
    } else if (text.toLowerCase().startsWith('image ') || text.toLowerCase().startsWith('video ') || 
               text.toLowerCase().startsWith('audio ') || text.toLowerCase().startsWith('document ')) {
        // Handle media broadcast
        const [type, ...captionParts] = text.split(' ');
        const caption = captionParts.join(' ') || '📢 Broadcast Message';
        
        if (type.toLowerCase() === 'image') {
            // Check if there's a quoted image
            if (quoted && quoted.message?.imageMessage) {
                await conn.sendMessage(jid, {
                    image: quoted.message.imageMessage,
                    caption: caption,
                    ...messageOptions
                });
            } else {
                // Send default image
                await conn.sendMessage(jid, {
                    image: { url: 'https://files.catbox.moe/jwmx1j.jpg' },
                    caption: caption,
                    ...messageOptions
                });
            }
        } else if (type.toLowerCase() === 'video') {
            // Similar logic for video
            await conn.sendMessage(jid, {
                video: { url: 'https://files.catbox.moe/example.mp4' },
                caption: caption,
                ...messageOptions
            });
        } else if (type.toLowerCase() === 'audio') {
            await conn.sendMessage(jid, {
                audio: { url: 'https://files.catbox.moe/zwkdda.mp3' },
                mimetype: 'audio/mpeg',
                ...messageOptions
            });
        } else if (type.toLowerCase() === 'document') {
            await conn.sendMessage(jid, {
                document: { url: 'https://files.catbox.moe/example.pdf' },
                mimetype: 'application/pdf',
                fileName: 'broadcast_document.pdf',
                caption: caption,
                ...messageOptions
            });
        }
    } else {
        // Send text message
        await conn.sendMessage(jid, { 
            text: `*📢 Broadcast Message*\n\n${text}\n\n*𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚂𝚒𝚕𝚊 𝚃𝚎𝚌𝚑*`,
            ...messageOptions
        });
    }
}

// Helper function to wait for response
function waitForResponse(conn, from, sender, timeout = 30000) {
    return new Promise((resolve) => {
        const listener = async (m) => {
            if (m.key.remoteJid === from && m.key.participant === sender) {
                const response = m.message?.conversation || m.message?.extendedTextMessage?.text;
                if (response) {
                    clearTimeout(timeoutId);
                    conn.ev.off('messages.upsert', listener);
                    resolve(response);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            conn.ev.off('messages.upsert', listener);
            resolve(null);
        }, timeout);

        conn.ev.on('messages.upsert', listener);
    });
}

// Helper function to sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Broadcast data management
const broadcastFile = path.join(__dirname, '..', 'data', 'broadcast.json');

function getBroadcastStats() {
    try {
        if (fs.existsSync(broadcastFile)) {
            const data = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
            return data;
        }
    } catch (error) {
        console.error('Error reading broadcast stats:', error);
    }
    
    return {
        totalUsers: 0,
        totalGroups: 0,
        lastBroadcast: null,
        totalMessages: 0,
        history: []
    };
}

function saveBroadcastHistory(entry) {
    try {
        let data = getBroadcastStats();
        
        // Update stats
        data.lastBroadcast = new Date().toLocaleString();
        data.totalMessages += entry.success;
        
        // Add to history (keep last 50 entries)
        data.history.push(entry);
        if (data.history.length > 50) {
            data.history = data.history.slice(-50);
        }
        
        // Ensure directory exists
        const dir = path.dirname(broadcastFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(broadcastFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving broadcast history:', error);
    }
}

function clearBroadcastData() {
    try {
        const defaultData = {
            totalUsers: 0,
            totalGroups: 0,
            lastBroadcast: null,
            totalMessages: 0,
            history: []
        };
        
        fs.writeFileSync(broadcastFile, JSON.stringify(defaultData, null, 2));
    } catch (error) {
        console.error('Error clearing broadcast data:', error);
    }
}
