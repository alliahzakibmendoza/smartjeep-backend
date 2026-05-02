import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'smartjeep302@gmail.com',
        pass: 'hdtd mcqp cuym lxsd'
    }
});

/**
 * GET /api/otp/status
 */
app.get('/api/otp/status', (req, res) => {
    res.json({ 
        status: "Online", 
        hits: requestCount,
        lastRequest: lastRequestTime,
        lastCodeSent: lastGeneratedCode,
        error: lastEmailError
    });
});

/**
 * GET /api/otp/test-email
 * Visit this to test the email from your browser!
 */
app.get('/api/otp/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: '"SMARTJEEP" <smartjeep302@gmail.com>',
            to: 'smartjeep302@gmail.com', // Sends a test to yourself
            subject: "Backend Test Email",
            text: "If you see this, your backend is working 100%!"
        });
        res.send("<h1>SUCCESS! Check your Gmail Inbox. ✅</h1>");
    } catch (e) {
        res.status(500).send(`<h1>FAILED: ${e.message} ❌</h1>`);
    }
});

/**
 * POST /api/otp/send-email
 */
app.post('/api/otp/send-email', async (req, res) => {
    requestCount++;
    lastRequestTime = new Date().toLocaleString();
    const { email, code } = req.body;
    lastGeneratedCode = code;
    
    // Respond instantly
    res.json({ success: true });

    // Send in background
    transporter.sendMail({
        from: '"SMARTJEEP" <smartjeep302@gmail.com>',
        to: email,
        subject: "SMARTJEEP Code",
        text: `Your code is: ${code}`
    }).then(() => {
        lastEmailError = "None (Last Send Successful)";
    }).catch(e => {
        lastEmailError = e.message;
        console.error("Email error:", e.message);
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

app.get('/', (req, res) => {
    res.send('SMARTJEEP Backend is Running! 🚀');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
