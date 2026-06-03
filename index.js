const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Owner configuration
const OWNER = {
    name: 'Wayne',
    number: '263787446219',
    phoneNumbers: ['263787446219', '263738381357']
};

// Bot configuration
const BOT_CONFIG = {
    name: 'Waxela',
    version: '1.0.0',
    channelLink: 'https://whatsapp.com/channel/0029Vb88O9WAu3aNi8xbiM2J',
    channelId: '0029Vb88O9WAu3aNi8xbiM2J@newsletter'
};

// Database file for storing users
const usersDbPath = path.join(__dirname, 'users.json');

// Initialize users database
const initUsersDb = () => {
    if (!fs.existsSync(usersDbPath)) {
        fs.writeFileSync(usersDbPath, JSON.stringify({ users: [], joinedAt: new Date() }, null, 2));
    }
};

// Read users from database
const readUsers = () => {
    try {
        const data = fs.readFileSync(usersDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { users: [] };
    }
};

// Save user to database
const saveUser = (userId, userName) => {
    const db = readUsers();
    const userExists = db.users.find(u => u.id === userId);
    
    if (!userExists) {
        db.users.push({
            id: userId,
            name: userName,
            addedAt: new Date().toISOString(),
            messageCount: 0
        });
        fs.writeFileSync(usersDbPath, JSON.stringify(db, null, 2));
        console.log(`✅ New user added: ${userName} (${userId})`);
        return true;
    }
    return false;
};

// Update user message count
const updateUserMessageCount = (userId) => {
    const db = readUsers();
    const user = db.users.find(u => u.id === userId);
    if (user) {
        user.messageCount += 1;
        fs.writeFileSync(usersDbPath, JSON.stringify(db, null, 2));
    }
};

// Check if user is owner
const isOwner = (phoneNumber) => {
    return OWNER.phoneNumbers.some(num => phoneNumber.includes(num));
};

// Format phone number
const formatPhoneNumber = (jid) => {
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
};

const startWaxelaBot = async () => {
    initUsersDb();
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_md');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log('🚀 Starting Waxela Bot...');
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        version,
        browser: ['Waxela Bot', 'Safari', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut);
            
            console.log('❌ Connection closed due to', reason, ', reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startWaxelaBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Waxela Bot is online!');
            console.log(`👤 Owner: ${OWNER.name} (${OWNER.number})`);
            console.log(`📱 Channel: ${BOT_CONFIG.channelLink}`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const sender = msg.pushName || 'User';
        const senderId = formatPhoneNumber(from);

        console.log(`📨 Message from ${sender}: ${messageText}`);

        // Save user to database
        saveUser(from, sender);
        updateUserMessageCount(from);

        // Check if sender is owner
        const senderIsOwner = isOwner(senderId);

        // Command handling
        if (messageText.startsWith('!')) {
            await handleCommand(sock, from, messageText, sender, senderIsOwner);
        } else {
            // Default response
            const welcomeText = senderIsOwner 
                ? `👑 Welcome back, Owner ${sender}! Type !help for commands.`
                : `👋 Hi ${sender}! I'm Waxela Bot. Type !help for commands.\n\n📱 Join our channel: ${BOT_CONFIG.channelLink}`;
            
            await sock.sendMessage(from, { text: welcomeText });
        }
    });

    // Handle group/channel updates
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            console.log(`📢 Group Update: ${update.id}`);
        }
    });
};

const handleCommand = async (sock, from, messageText, sender, senderIsOwner) => {
    const command = messageText.slice(1).split(' ')[0].toLowerCase();
    const args = messageText.slice(1).split(' ').slice(1).join(' ');

    switch (command) {
        case 'help':
            let helpText = `*Waxela Bot Commands* 🤖\n\n!help - Show this menu\n!ping - Check bot status\n!hello - Get a greeting\n!info - Bot information\n!echo <text> - Echo your message\n!users - Total users\n!channel - Get channel link`;
            
            if (senderIsOwner) {
                helpText += `\n\n*Owner Commands:*\n!stats - Bot statistics\n!userlist - List all users`;
            }
            
            await sock.sendMessage(from, { text: helpText });
            break;

        case 'ping':
            await sock.sendMessage(from, { text: '🏓 Pong! Bot is alive and responsive.' });
            break;

        case 'hello':
            await sock.sendMessage(from, { text: `👋 Hello ${sender}! Welcome to Waxela Bot.` });
            break;

        case 'info':
            await sock.sendMessage(from, { 
                text: `*Waxela Bot Info* 🎯\n\n🤖 Bot Name: ${BOT_CONFIG.name}\n📦 Version: ${BOT_CONFIG.version}\n✨ Status: Active\n👨‍💻 Owner: ${OWNER.name}\n📱 Channel: ${BOT_CONFIG.channelLink}` 
            });
            break;

        case 'echo':
            if (args) {
                await sock.sendMessage(from, { text: `🔊 ${args}` });
            } else {
                await sock.sendMessage(from, { text: '❌ Please provide text to echo. Usage: !echo <text>' });
            }
            break;

        case 'channel':
            await sock.sendMessage(from, { text: `📱 *Join our channel:*\n${BOT_CONFIG.channelLink}` });
            break;

        case 'users':
            const db = readUsers();
            await sock.sendMessage(from, { text: `👥 Total users using this bot: ${db.users.length}` });
            break;

        // Owner-only commands
        case 'stats':
            if (!senderIsOwner) {
                await sock.sendMessage(from, { text: '❌ You do not have permission to use this command.' });
                break;
            }
            const db1 = readUsers();
            const totalMessages = db1.users.reduce((sum, u) => sum + u.messageCount, 0);
            await sock.sendMessage(from, { 
                text: `*📊 Bot Statistics*\n\n👥 Total Users: ${db1.users.length}\n💬 Total Messages: ${totalMessages}\n🤖 Bot Version: ${BOT_CONFIG.version}\n⏰ Status: Online` 
            });
            break;

        case 'userlist':
            if (!senderIsOwner) {
                await sock.sendMessage(from, { text: '❌ You do not have permission to use this command.' });
                break;
            }
            const db2 = readUsers();
            let userList = `*📋 User List (${db2.users.length} users)*\n\n`;
            db2.users.slice(0, 10).forEach((u, i) => {
                userList += `${i + 1}. ${u.name || 'Unknown'} - Messages: ${u.messageCount}\n`;
            });
            if (db2.users.length > 10) {
                userList += `\n... and ${db2.users.length - 10} more users`;
            }
            await sock.sendMessage(from, { text: userList });
            break;

        default:
            await sock.sendMessage(from, { text: `❓ Unknown command: *${command}*\nType !help for available commands.` });
    }
};

startWaxelaBot().catch(err => {
    console.error('Error starting bot:', err);
    process.exit(1);
});
