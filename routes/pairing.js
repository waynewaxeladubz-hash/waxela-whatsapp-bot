const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const pairingDbPath = path.join(__dirname, '..', 'pairings.json');

// Initialize pairings database
const initPairingsDb = () => {
    if (!fs.existsSync(pairingDbPath)) {
        fs.writeFileSync(pairingDbPath, JSON.stringify({ pairings: [] }, null, 2));
    }
};

// Read pairings
const readPairings = () => {
    try {
        const data = fs.readFileSync(pairingDbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { pairings: [] };
    }
};

// Save pairing
const savePairing = (pairingData) => {
    const db = readPairings();
    db.pairings.push({
        ...pairingData,
        id: generateId(),
        status: 'active',
        createdAt: new Date().toISOString()
    });
    fs.writeFileSync(pairingDbPath, JSON.stringify(db, null, 2));
    return db.pairings[db.pairings.length - 1];
};

// Generate ID
const generateId = () => {
    return 'pairing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
};

// Get all pairings (admin only)
router.get('/pairings', (req, res) => {
    const pairings = readPairings();
    res.json({
        total: pairings.pairings.length,
        pairings: pairings.pairings.slice(-50) // Last 50 pairings
    });
});

// Get pairing by code
router.get('/pairing/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const pairings = readPairings();
    const pairing = pairings.pairings.find(p => p.pairingCode === code);
    
    if (!pairing) {
        return res.status(404).json({ error: 'Pairing code not found' });
    }
    
    res.json(pairing);
});

// Create new pairing
router.post('/pairing', (req, res) => {
    try {
        const { phone, username, pairingCode, userId, sessionId, botSession, deviceId } = req.body;
        
        if (!phone || !pairingCode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pairing = savePairing({
            phone,
            username: username || 'Anonymous',
            pairingCode,
            userId,
            sessionId,
            botSession,
            deviceId
        });

        console.log(`✅ New pairing created: ${phone} - ${pairingCode}`);
        
        res.json({
            success: true,
            message: 'Pairing code created successfully',
            pairing
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
router.get('/pairing-stats', (req, res) => {
    const pairings = readPairings();
    const uniqueUsers = new Set(pairings.pairings.map(p => p.phone)).size;
    const activePairings = pairings.pairings.filter(p => p.status === 'active').length;
    
    res.json({
        totalPairings: pairings.pairings.length,
        uniqueUsers,
        activePairings,
        lastPairing: pairings.pairings[pairings.pairings.length - 1] || null
    });
});

// Verify pairing
router.post('/verify-pairing', (req, res) => {
    try {
        const { code, sessionId } = req.body;
        const pairings = readPairings();
        const pairing = pairings.pairings.find(p => p.pairingCode === code);
        
        if (!pairing) {
            return res.status(404).json({ verified: false, error: 'Pairing not found' });
        }

        if (pairing.sessionId !== sessionId) {
            return res.status(401).json({ verified: false, error: 'Invalid session ID' });
        }

        // Update pairing status
        pairing.verifiedAt = new Date().toISOString();
        pairing.status = 'verified';
        fs.writeFileSync(pairingDbPath, JSON.stringify(pairings, null, 2));

        console.log(`✅ Pairing verified: ${pairing.phone}`);

        res.json({
            verified: true,
            message: 'Pairing verified successfully',
            pairing
        });
    } catch (err) {
        res.status(500).json({ verified: false, error: err.message });
    }
});

module.exports = router;
