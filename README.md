# 🤖 Waxela - WhatsApp MD Bot

A powerful and easy-to-use WhatsApp Multi-Device (MD) bot built with **Baileys** and Node.js.

## ✨ Features

- 📱 Multi-Device support (WhatsApp Web)
- 🎯 Simple command system
- 📝 Auto-reply functionality
- 🔄 Easy to extend and customize
- 📊 Message logging
- 🚀 Fast and lightweight

## 📋 Prerequisites

- **Node.js** v16.x or higher
- **npm** or **yarn**
- WhatsApp account (for QR scanning)

## 🚀 Quick Start

### 1. Clone or Download the Repository

```bash
git clone https://github.com/waynewaxeladubz-hash/waxela-whatsapp-bot.git
cd waxela-whatsapp-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

```bash
cp .env.example .env
```

Edit `.env` with your settings if needed.

### 4. Start the Bot

```bash
npm start
```

A **QR code** will appear in your terminal. Scan it with your WhatsApp app (Settings → Linked Devices).

### 5. Development Mode (with auto-reload)

```bash
npm run dev
```

## 🎮 Available Commands

| Command | Description |
|---------|-------------|
| `!help` | Show all available commands |
| `!ping` | Check if bot is responsive |
| `!hello` | Get a friendly greeting |
| `!info` | Display bot information |
| `!echo <text>` | Echo back your message |

### Usage Example

```
User: !help
Bot: *Waxela Bot Commands* 🤖

!help - Show this menu
!ping - Check bot status
!hello - Get a greeting
!info - Bot information
!echo <text> - Echo your message
```

## 📁 Project Structure

```
waxela-whatsapp-bot/
├── index.js                 # Main bot logic
├── package.json            # Project dependencies
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── README.md               # This file
└── auth_info_md/           # Bot credentials (auto-generated)
```

## 🔧 Customization

### Add New Commands

Edit `index.js` and add cases to the `handleCommand()` function:

```javascript
case 'yourcommand':
    await sock.sendMessage(from, { text: 'Response text' });
    break;
```

### Send Different Media Types

```javascript
// Send image
await sock.sendMessage(from, { 
    image: { url: 'image_url_here' }, 
    caption: 'Image caption' 
});

// Send document
await sock.sendMessage(from, { 
    document: { url: 'file_url_here' }, 
    mimetype: 'application/pdf', 
    fileName: 'document.pdf' 
});

// Send audio
await sock.sendMessage(from, { 
    audio: { url: 'audio_url_here' }, 
    mimetype: 'audio/mpeg' 
});
```

## 🌐 Deployment

### Deploy on Heroku

1. Create a `Procfile`:
```
worker: npm start
```

2. Push to Heroku:
```bash
git push heroku main
```

### Deploy on Railway/Render/VPS

Similar process - ensure Node.js is available and run `npm install && npm start`.

## ⚠️ Important Notes

- **WhatsApp ToS**: Use responsibly. Avoid spam and automated harassment.
- **Rate Limiting**: WhatsApp may rate-limit or ban accounts used for bots.
- **Credentials**: The `auth_info_md/` folder contains session data. Keep it private and don't share it.
- **Education**: This project is for educational purposes.

## 🔗 Resources

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Node.js Documentation](https://nodejs.org/)

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 👨‍💻 Author

**waynewaxeladubz**

## 🤝 Contributing

Feel free to fork, submit issues, and create pull requests!

---

**Made with ❤️ by waynewaxeladubz**
