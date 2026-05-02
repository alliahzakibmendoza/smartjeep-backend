import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Maximum Open CORS for Mobile Apps
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// Initialize the SmartJeep AI Agent
const agent = new SmartJeepAgent(18);

// Debugging Variables
let lastEmailError = "No errors yet.";
let lastRequestTime = "Never";
let requestCount = 0;

// Professional Email Transporter
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'smartjeep302@gmail.com',
        pass: 'hdtd mcqp cuym lxsd'
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * GET /api/otp/status
 * Check this to see if the phone is actually hitting the server
 */
app.get('/api/otp/status', (req, res) => {
    res.json({ 
        status: "Online", 
        requestCount: requestCount,
        lastRequestAt: lastRequestTime,
        lastError: lastEmailError
    });
});

/**
 * POST /api/otp/send-email
 */
app.post('/api/otp/send-email', async (req, res) => {
    requestCount++;
    lastRequestTime = new Date().toLocaleString();
    const { email, code } = req.body;
    
    console.log(`[Backend] Request #${requestCount} received for ${email}`);
    
    try {
        await transporter.sendMail({
            from: '"SMARTJEEP" <smartjeep302@gmail.com>',
            to: email,
            subject: "Verification Code",
            text: `Code: ${code}`
        });
        res.json({ success: true });
    } catch (e) {
        lastEmailError = e.message;
        console.error("Email error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * Other Endpoints
 */
app.post('/api/driver/update', (req, res) => {
    const { plateNumber, lat, lng, speed, passengerCount, doorOpen } = req.body;
    if (!plateNumber) return res.status(400).json({ error: "Plate number required" });
    drivers[plateNumber] = { ...req.body, lastUpdate: new Date().toISOString() };
    res.json({ status: "success" });
});

let drivers = {};
app.get('/api/fleet', (req, res) => {
    const now = new Date();
    const activeFleet = Object.values(drivers).filter(d => (now - new Date(d.lastUpdate)) < 60000);
    res.json(activeFleet);
});

app.get('/', (req, res) => {
    res.send(`SMARTJEEP Backend is Running! Hits: ${requestCount}`);
});

app.listen(PORT, () => {
    console.log(`SMARTJEEP Server running on port ${PORT}`);
});
