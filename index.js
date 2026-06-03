const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
require('dotenv').config();

const startWaxelaBot = async () => {
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
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const sender = msg.pushName || 'User';

        console.log(`📨 Message from ${sender}: ${messageText}`);

        // Simple command handling
        if (messageText.startsWith('!')) {
            handleCommand(sock, from, messageText, sender);
        } else {
            // Default response
            await sock.sendMessage(from, { text: `👋 Hi ${sender}! I'm Waxela Bot. Type !help for commands.` });
        }
    });
};

const handleCommand = async (sock, from, messageText, sender) => {
    const command = messageText.slice(1).split(' ')[0].toLowerCase();
    const args = messageText.slice(1).split(' ').slice(1).join(' ');

    switch (command) {
        case 'help':
            await sock.sendMessage(from, { 
                text: `*Waxela Bot Commands* 🤖\n\n!help - Show this menu\n!ping - Check bot status\n!hello - Get a greeting\n!info - Bot information\n!echo <text> - Echo your message` 
            });
            break;

        case 'ping':
            await sock.sendMessage(from, { text: '🏓 Pong! Bot is alive and responsive.' });
            break;

        case 'hello':
            await sock.sendMessage(from, { text: `👋 Hello ${sender}! Welcome to Waxela Bot.` });
            break;

        case 'info':
            await sock.sendMessage(from, { 
                text: `*Waxela Bot Info* 🎯\n\n🤖 Bot Name: Waxela\n📦 Version: 1.0.0\n✨ Status: Active\n👨‍💻 Developer: waynewaxeladubz` 
            });
            break;

        case 'echo':
            if (args) {
                await sock.sendMessage(from, { text: `🔊 ${args}` });
            } else {
                await sock.sendMessage(from, { text: '❌ Please provide text to echo. Usage: !echo <text>' });
            }
            break;

        default:
            await sock.sendMessage(from, { text: `❓ Unknown command: *${command}*\nType !help for available commands.` });
    }
};

startWaxelaBot().catch(err => {
    console.error('Error starting bot:', err);
    process.exit(1);
});
