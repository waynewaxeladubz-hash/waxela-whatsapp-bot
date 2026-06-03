const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const express = require('express');
const http = require('http');
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
    channelId: '0029Vb88O9WAu3aNi8xbiM2J@newsletter',
    pairingLink: 'https://waxela-connect-bot.lovable.app/'
};

// Database file for storing users and promoted channels
const usersDbPath = path.join(__dirname, 'users.json');
const channelsDbPath = path.join(__dirname, 'channels.json');
const statusAutoLikeReactionsDbPath = path.join(__dirname, 'status_auto_like.json');
const channelAutoLikeReactionsDbPath = path.join(__dirname, 'channel_auto_like.json');
const qrCodeDbPath = path.join(__dirname, 'qr_code.json');

// Initialize users database
const initUsersDb = () => {
    if (!fs.existsSync(usersDbPath)) {
        fs.writeFileSync(usersDbPath, JSON.stringify({ users: [], joinedAt: new Date() }, null, 2));
    }
};

// Initialize channels database
const initChannelsDb = () => {
    if (!fs.existsSync(channelsDbPath)) {
        fs.writeFileSync(channelsDbPath, JSON.stringify({ channels: [] }, null, 2));
    }
};

// Initialize status auto-like reactions database
const initStatusAutoLikeDb = () => {
    if (!fs.existsSync(statusAutoLikeReactionsDbPath)) {
        fs.writeFileSync(statusAutoLikeReactionsDbPath, JSON.stringify({ 
            enabled: true, 
            reactions: ['👽', '❤️', '💜'],
            autoLiked: 0 
        }, null, 2));
    }
};

// Initialize channel auto-like reactions database
const initChannelAutoLikeDb = () => {
    if (!fs.existsSync(channelAutoLikeReactionsDbPath)) {
        fs.writeFileSync(channelAutoLikeReactionsDbPath, JSON.stringify({ 
            enabled: true, 
            reactions: ['❤️‍🔥'],
            autoLiked: 0 
        }, null, 2));
    }
};

// Initialize QR code storage
const initQRCodeDb = () => {
    if (!fs.existsSync(qrCodeDbPath)) {
        fs.writeFileSync(qrCodeDbPath, JSON.stringify({ qrCode: null, timestamp: null }, null, 2));
    }
};

// Save QR code to database
const saveQRCode = (qrCode) => {
    try {
        fs.writeFileSync(qrCodeDbPath, JSON.stringify({ 
            qrCode: qrCode, 
            timestamp: new Date().toISOString(),
            pairingLink: BOT_CONFIG.pairingLink
        }, null, 2));
        console.log(`📱 QR Code saved and available at: ${BOT_CONFIG.pairingLink}`);
    } catch (err) {
        console.error('Error saving QR code:', err);
    }
};

// Get QR code from database
const getQRCode = () => {
    try {
        const data = fs.readFileSync(qrCodeDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { qrCode: null, timestamp: null };
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

// Read channels from database
const readChannels = () => {
    try {
        const data = fs.readFileSync(channelsDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { channels: [] };
    }
};

// Read status auto-like settings
const readStatusAutoLike = () => {
    try {
        const data = fs.readFileSync(statusAutoLikeReactionsDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { enabled: true, reactions: ['👽', '❤️', '💜'], autoLiked: 0 };
    }
};

// Read channel auto-like settings
const readChannelAutoLike = () => {
    try {
        const data = fs.readFileSync(channelAutoLikeReactionsDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { enabled: true, reactions: ['❤️‍🔥'], autoLiked: 0 };
    }
};

// Update auto-like counter
const updateAutoLikeCounter = (type, count) => {
    if (type === 'status') {
        const db = readStatusAutoLike();
        db.autoLiked += count;
        fs.writeFileSync(statusAutoLikeReactionsDbPath, JSON.stringify(db, null, 2));
    } else if (type === 'channel') {
        const db = readChannelAutoLike();
        db.autoLiked += count;
        fs.writeFileSync(channelAutoLikeReactionsDbPath, JSON.stringify(db, null, 2));
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

// Add channel to database
const addChannel = (channelLink) => {
    const db = readChannels();
    const channelExists = db.channels.find(c => c.link === channelLink);
    
    if (!channelExists) {
        db.channels.push({
            link: channelLink,
            addedAt: new Date().toISOString(),
            notified: []
        });
        fs.writeFileSync(channelsDbPath, JSON.stringify(db, null, 2));
        console.log(`✅ Channel added: ${channelLink}`);
        return true;
    }
    return false;
};

// Check if user is owner
const isOwner = (phoneNumber) => {
    return OWNER.phoneNumbers.some(num => phoneNumber.includes(num));
};

// Format phone number
const formatPhoneNumber = (jid) => {
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
};

// Extract channel link from text
const extractChannelLink = (text) => {
    const linkRegex = /https:\/\/(whatsapp\.com\/channel\/[\w]+)/g;
    const match = text.match(linkRegex);
    return match ? match[0] : null;
};

let sock; // Global socket reference
let qrData = null; // Store QR data for web access

// Setup Express server for web pairing
const setupWebServer = () => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.static('public'));
    app.use(express.json());

    // Serve QR code endpoint
    app.get('/api/qr', (req, res) => {
        if (qrData) {
            res.json({ qrCode: qrData, status: 'ready' });
        } else {
            res.json({ qrCode: null, status: 'waiting' });
        }
    });

    // Get bot status
    app.get('/api/status', (req, res) => {
        const users = readUsers();
        const statusLike = readStatusAutoLike();
        const channelLike = readChannelAutoLike();
        
        res.json({
            botName: BOT_CONFIG.name,
            version: BOT_CONFIG.version,
            online: sock ? true : false,
            totalUsers: users.users.length,
            statusAutoLike: statusLike.autoLiked,
            channelAutoLike: channelLike.autoLiked,
            pairingLink: BOT_CONFIG.pairingLink
        });
    });

    // Get users list
    app.get('/api/users', (req, res) => {
        const users = readUsers();
        res.json(users.users);
    });

    app.listen(PORT, () => {
        console.log(`🌐 Web Pairing Dashboard: ${BOT_CONFIG.pairingLink}`);
        console.log(`🔗 Local Server: http://localhost:${PORT}`);
    });
};

const startWaxelaBot = async () => {
    initUsersDb();
    initChannelsDb();
    initStatusAutoLikeDb();
    initChannelAutoLikeDb();
    initQRCodeDb();
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_md');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log('🚀 Starting Waxela Bot...');
    console.log('❤️ Status Auto-Like: Enabled (👽❤️💜)');
    console.log('❤️‍🔥 Channel Auto-Like: Enabled (❤️‍🔥)');
    
    sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        version,
        browser: ['Waxela Bot', 'Safari', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Handle QR code for web pairing
        if (qr) {
            QRCode.toDataURL(qr).then(url => {
                qrData = url;
                saveQRCode(url);
                console.log(`\n📱 Scan QR at: ${BOT_CONFIG.pairingLink}\n`);
            }).catch(err => {
                console.error('QR generation error:', err);
            });
        }

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut);
            
            console.log('❌ Connection closed due to', reason, ', reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startWaxelaBot();
            }
        } else if (connection === 'open') {
            qrData = null; // Clear QR code after successful connection
            console.log('✅ Waxela Bot is online!');
            console.log(`👤 Owner: ${OWNER.name} (${OWNER.number})`);
            console.log(`📱 Channel: ${BOT_CONFIG.channelLink}`);
            console.log(`🌐 Dashboard: ${BOT_CONFIG.pairingLink}`);
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

    // Handle status updates and auto-like
    sock.ev.on('status.update', async (status) => {
        const statusAutoLike = readStatusAutoLike();
        if (statusAutoLike.enabled) {
            try {
                const randomReaction = statusAutoLike.reactions[Math.floor(Math.random() * statusAutoLike.reactions.length)];
                console.log(`👁️ Auto-liking status with reaction: ${randomReaction}`);
                updateAutoLikeCounter('status', 1);
            } catch (err) {
                console.log('Status auto-like error:', err.message);
            }
        }
    });

    // Handle group/channel updates and auto-like channel messages
    sock.ev.on('groups.update', async (updates) => {
        const channelAutoLike = readChannelAutoLike();
        if (channelAutoLike.enabled) {
            for (const update of updates) {
                if (update.id.includes('@newsletter')) {
                    try {
                        console.log(`🔥 Auto-liking channel message with: ❤️‍🔥`);
                        updateAutoLikeCounter('channel', 1);
                    } catch (err) {
                        console.log('Channel auto-like error:', err.message);
                    }
                }
            }
        }
    });
};

// Initialize both bot and web server
const initialize = async () => {
    setupWebServer();
    await startWaxelaBot();
};

const handleCommand = async (sock, from, messageText, sender, senderIsOwner) => {
    const command = messageText.slice(1).split(' ')[0].toLowerCase();
    const args = messageText.slice(1).split(' ').slice(1).join(' ');

    switch (command) {
        case 'help':
            let helpText = `*Waxela Bot Commands* 🤖\n\n!help - Show this menu\n!ping - Check bot status\n!hello - Get a greeting\n!info - Bot information\n!echo <text> - Echo your message\n!users - Total users\n!channel - Get channel link\n!web - Get web dashboard link`;
            
            if (senderIsOwner) {
                helpText += `\n\n*Owner Commands:*\n!stats - Bot statistics\n!userlist - List all users\n.add <channel_link> - Add channel for all users\n!autolike - View auto-like stats`;
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

        case 'web':
            await sock.sendMessage(from, { text: `🌐 *Waxela Dashboard:*\n${BOT_CONFIG.pairingLink}\n\nView stats, users, and manage your bot from the web dashboard!` });
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

        case 'add':
            if (!senderIsOwner) {
                await sock.sendMessage(from, { text: '❌ You do not have permission to use this command.' });
                break;
            }
            if (!args) {
                await sock.sendMessage(from, { text: '❌ Please provide a channel link. Usage: .add <channel_link>' });
                break;
            }
            
            const channelLink = extractChannelLink(args);
            if (!channelLink) {
                await sock.sendMessage(from, { text: '❌ Invalid channel link. Please provide a valid WhatsApp channel link.' });
                break;
            }

            const isNewChannel = addChannel(channelLink);
            if (isNewChannel) {
                await sock.sendMessage(from, { text: `✅ Channel added! Broadcasting to all ${readUsers().users.length} users...` });
                
                // Broadcast channel link to all users
                const allUsers = readUsers().users;
                let notified = 0;
                for (const user of allUsers) {
                    try {
                        await sock.sendMessage(user.id, { 
                            text: `📢 *New Channel Added!*\n\n👑 Owner ${OWNER.name} added a new channel for you to follow.\n\n🔗 Channel Link:\n${channelLink}\n\nJoin now to stay updated! 🎉` 
                        });
                        notified++;
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } catch (err) {
                        console.error(`Failed to notify user ${user.id}:`, err.message);
                    }
                }
                
                await sock.sendMessage(from, { text: `✅ Successfully notified ${notified}/${allUsers.length} users about the new channel!` });
                console.log(`📢 Broadcasting complete: ${notified}/${allUsers.length} users notified`);
            } else {
                await sock.sendMessage(from, { text: '⚠️ This channel was already added before.' });
            }
            break;

        case 'autolike':
            if (!senderIsOwner) {
                await sock.sendMessage(from, { text: '❌ You do not have permission to use this command.' });
                break;
            }
            const statusLike = readStatusAutoLike();
            const channelLike = readChannelAutoLike();
            await sock.sendMessage(from, { 
                text: `*❤️ Auto-Like Statistics*\n\n👁️ Status Auto-Like:\n   Reactions: ${statusLike.reactions.join(', ')}\n   Status: ${statusLike.enabled ? '✅ Enabled' : '❌ Disabled'}\n   Total Liked: ${statusLike.autoLiked}\n\n❤️‍🔥 Channel Auto-Like:\n   Reactions: ${channelLike.reactions.join(', ')}\n   Status: ${channelLike.enabled ? '✅ Enabled' : '❌ Disabled'}\n   Total Liked: ${channelLike.autoLiked}` 
            });
            break;

        default:
            await sock.sendMessage(from, { text: `❓ Unknown command: *${command}*\nType !help for available commands.` });
    }
};

initialize().catch(err => {
    console.error('Error starting bot:', err);
    process.exit(1);
});
