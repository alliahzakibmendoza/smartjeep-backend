import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// "Cloud Database"
let users = {}; 
let drivers = {};
let lastRequestStatus = "No requests yet.";

// THE SECRET TUNNEL URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXA1gHB57GksbSF5f3y1TL8kexWUNWjk4IYkF0YkmP0PROGSbVLenkrhxNq2ObLO3A/exec";

/**
 * LOGIN (Checks if account exists)
 */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users[email];
    
    if (!user) {
        return res.status(404).json({ success: false, error: "NO ACCOUNT FOUND! Please click 'Sign Up' to create an account first." });
    }
    
    if (user.password !== password) {
        return res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
    }
    
    res.json({ success: true, user });
});

/**
 * SIGN UP
 */
app.post('/api/auth/signup', (req, res) => {
    const { email, password, name, role, plateNumber } = req.body;
    if (users[email]) return res.status(400).json({ success: false, error: "Account already exists! Please Login instead." });
    
    users[email] = { email, password, name, role, plateNumber, createdAt: new Date() };
    res.json({ success: true, message: "Account created on Cloud!" });
});

/**
 * SEND OTP (Stronger Fetch)
 */
app.post('/api/otp/send', async (req, res) => {
    const { email, code } = req.body;
    console.log(`[OTP] Attempting to send ${code} to ${email}...`);
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Google Script prefers text/plain or no header
            body: JSON.stringify({ email, code })
        });
        
        const result = await response.text();
        lastRequestStatus = `Last Send to ${email}: ${result}`;
        console.log(`[OTP] Success: ${result}`);
        res.json({ success: true });
    } catch (e) {
        lastRequestStatus = `Last Error: ${e.message}`;
        console.error(`[OTP] Failed: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/otp/status', (req, res) => {
    res.json({ 
        online: true, 
        registeredUsers: Object.keys(users).length, 
        lastAction: lastRequestStatus 
    });
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

app.get('/', (req, res) => res.send('SMARTJEEP Cloud Server is Running! 🚀'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
