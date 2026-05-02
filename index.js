import express from 'express';
import cors from 'cors';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const agent = new SmartJeepAgent(18);

// State
let lastEmailError = "No attempts yet.";
let lastRequestTime = "Never";
let requestCount = 0;
let lastGeneratedCode = "None";
let drivers = {};

// THE SECRET TUNNEL URL (Google Apps Script)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXA1gHB57GksbSF5f3y1TL8kexWUNWjk4IYkF0YkmP0PROGSbVLenkrhxNq2ObLO3A/exec";

/**
 * GET /api/otp/status
 */
app.get('/api/otp/status', (req, res) => {
    res.json({ 
        status: "Online", 
        hits: requestCount,
        lastRequest: lastRequestTime,
        lastCodeSent: lastGeneratedCode,
        error: lastEmailError,
        method: "Google Tunnel"
    });
});

/**
 * POST /api/otp/send-email
 * Uses the Google Apps Script Tunnel to send real emails!
 */
app.post('/api/otp/send-email', async (req, res) => {
    requestCount++;
    lastRequestTime = new Date().toLocaleString();
    const { email, code } = req.body;
    lastGeneratedCode = code;
    
    console.log(`[Backend] Sending ${code} to ${email} via Google Tunnel`);
    
    // Respond instantly
    res.json({ success: true });

    // Send via Tunnel in background
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
        
        if (response.ok) {
            lastEmailError = "None (Last Send Successful)";
            console.log("Email sent successfully via tunnel!");
        } else {
            const errText = await response.text();
            lastEmailError = "Tunnel Error: " + errText;
        }
    } catch (e) {
        lastEmailError = "Network Error: " + e.message;
        console.error("Tunnel Network Error:", e.message);
    }
});

app.post('/api/driver/update', (req, res) => {
    const { plateNumber } = req.body;
    if (plateNumber) drivers[plateNumber] = { ...req.body, lastUpdate: new Date().toISOString() };
    res.json({ status: "success" });
});

app.get('/api/fleet', (req, res) => {
    const now = new Date();
    const activeFleet = Object.values(drivers).filter(d => (now - new Date(d.lastUpdate)) < 60000);
    res.json(activeFleet);
});

app.get('/', (req, res) => {
    res.send('SMARTJEEP Backend (Tunnel Edition) is Running! 🚀');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
