const config = require('../config')
const {cmd , commands} = require('../command')
const os = require("os")

cmd({
    pattern: "settings",
    alias: ["setting"],
    desc: "settings the bot",
    category: "owner",
    react: "⚙",
    filename: __filename


},
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    try {
        let desc = `* _ 𝓓𝓐𝓡𝓚 𝓢𝓗𝓐𝓓𝓞𝓦 𝑺𝑬𝑻𝑻𝑰𝑵𝑮𝑺....⚙️_


╭══════════════════════○
┣━ *❮➀❯ 𝗪𝗢𝗥𝗞 𝗠𝗢𝗗𝗘 🧠💨*
> *❮➊.➊❯  Public Work__🫂*
> *❮➊.➋❯  Private Work__❗*
> *❮➊.➌❯  Group Only__👥*
> *❮➊.➍❯  Inbox Only__👤*
╭══════════════════════○
┣━ *❮➁❯ 𝗔𝗨𝗧𝗢 𝗩𝗢𝗜𝗖𝗘 🧠💨*
> *❮➋.➊❯ Auto Voice__ON 🔛*
> *❮➋.➋❯ Auto Voice__off 🔐*
╭══════════════════════○
┣━ *❮➂❯ 𝗔𝗨𝗧𝗢 𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗘𝗘𝗡 🧠💨*
> *❮➌.➊❯ Auto Read Status__ON 🔛*
> *❮➌.➋❯ Auto Read Status__off 🔐*
╭══════════════════════○
┣━ *❮➃❯ 𝗔𝗨𝗧𝗢 𝗦𝗧𝗜𝗖𝗞𝗘𝗥 🧠💨*
> *❮➍.➊❯ Auto sticker__ON 🔛*
> *❮➍.➋❯ Auto sticker__off 🔐*
╭══════════════════════○
┣━ *❮➄❯ 𝗔𝗨𝗧𝗢 𝗥𝗘𝗣𝗟𝗬 🧠💨*
> *❮➎.➊❯ Auto reply__ON 🔛*
> *❮➎.➋❯ Auto reply__off 🔐*
╭══════════════════════○
┣━ *❮➅❯ 𝗕𝗢𝗧 𝗢𝗡𝗟𝗜𝗡𝗘 𝗢𝗙𝗙𝗟𝗜𝗡𝗘 🧠💨*
> *❮➏.➊❯ Online__ON 🔛*
> *❮➏.➋❯ Online__off 🔐*
╭══════════════════════○
┣━ *❮➆❯ 𝗠𝗦𝗚 𝗥𝗘𝗔𝗗 🧠💨*
> *❮➐.➊❯ Read Msg__ON 🔛*
> *❮➐.➋❯ Read Msg__off 🔐*
╭══════════════════════○
┣━ *❮➇❯ 𝗠𝗦𝗚 𝗥𝗘𝗔𝗖𝗧 🧠💨*
> *❮➑.➊❯ Auto React__ON 🔛*
> *❮➑.➋❯ Auto React__off 🔐*
╭══════════════════════○
┣━ *❮➈❯ 𝗔𝗡𝗧𝗜 𝗟𝗜𝗡𝗞 🧠💨*
> *❮➒.➊❯ Anti Link__ON 🔛*
> *❮➒.➋❯ Anti Link__off 🔐*
> *❮➒.➌❯ Anti Link Remove ⛔*
╭══════════════════════○
┣━ *❮➉❯ 𝗔𝗨𝗧𝗢 𝗦𝗧𝗔𝗧𝗨𝗦 𝗥𝗘𝗔𝗖𝗧 🧠💨*
> *❮➓.➊❯ Anti Link__On 🔛*
> *❮❿.➋❯ Anti Link__Off 🔐*
╰═══════════════════════○


* *🔢 Reply Below This Number Change To DARK SHADOW Bot Change Setting*

> *🄿🄾🅆🄴🅁🄳 🅱🆈 DARK SHADOW-MD 😈*`;

        const vv = await conn.sendMessage(from, { image: { url: "https://i.ibb.co/3yL2ZL8d/2024-8-23-21h39m1s.jpg"}, caption: desc }, { quoted: mek });

        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg.message || !msg.message.extendedTextMessage) return;

            const selectedOption = msg.message.extendedTextMessage.text.trim();

            if (msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.stanzaId === vv.key.id) {
                switch (selectedOption) {
                    case '1.1':
                        reply(".update MODE:public" );
                        break;
                    case '1.2':               
                        reply(".update MODE:private");
                        break;
                    case '1.3':               
                          reply(".update MODE:group");
                      break;
                    case '1.4':     
                        reply(".update MODE:inbox");
                      break;
                    case '2.1':     
                        reply(".update AUTO_VOICE:true");
                        break;
                    case '2.2':     
                        reply(".update AUTO_VOICE:false");
                    break;
                    case '3.1':    
                        reply(".update AUTO_READ_STATUS:true");
                    break;
                    case '3.2':    
                        reply(".update AUTO_READ_STATUS:false");
                    break;                    
                    case '4.1':    
                        reply(".update AUTO_STICKER:true");
                    break;
                    case '4.2':    
                        reply(".update AUTO_STICKER:false");
                    break;                                        
                    case '5.1':    
                        reply(".update AUTO_REPLY:true");
                    break;
                    case '5.2':    
                        reply(".update AUTO_REPLY:false");
                    break;                        
                    case '6.1':    
                        reply(".update ALLWAYS_OFFLINE:true");
                    break; 
                    case '6.2':    
                        reply(".update ALLWAYS_OFFLINE:false");
                    break;                       
                    case '7.1':    
                        reply(".update READ_MESSAGE:true");
                    break;
                    case '7.2':    
                        reply(".update READ_MESSAGE:false");
                    break;
                    case '8.1':    
                        reply(".update config.AUTO_REACT:true");
                    break;
                    case '8.2':    
                        reply(".update config.AUTO_REACT:false");
                    break;
                    case '9.1':    
                        reply(".update ANTI_LINK:true");
                    break;
                    case '9.2':    
                        reply(".update ANTI_LINK:false");
                    break;
                    case '9.3':    
                        reply(".update ANTI_LINK:fales");
                    break;
                    case '10.1':
                        reply(".update AUTO_REACT_STATUS:true");
                    break;
                    case '10.2':
                        reply(".update AUTO_REACT_STATUS:fales");
                    break;
                    default:
                        reply("Invalid option. Please select a valid option🔴");
                }

            }
        });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply('An error occurred while processing your request.');
    }
});
