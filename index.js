import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const agent = new SmartJeepAgent(18);

// Debugging & State
let lastEmailError = "No errors yet.";
let lastRequestTime = "Never";
let requestCount = 0;
let lastGeneratedCode = "None";
let gmailStatus = "Checking...";
let drivers = {}; // FIXED: Restored this to prevent crashes

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'smartjeep302@gmail.com',
        pass: 'hdtd mcqp cuym lxsd'
    },
    tls: { rejectUnauthorized: false }
});

// Verify Gmail Connection on Startup
transporter.verify((error, success) => {
    if (error) {
        gmailStatus = "FAILED: " + error.message;
        console.error("Gmail Verify Error:", error);
    } else {
        gmailStatus = "VERIFIED (Ready to send)";
        console.log("Server is ready to take our messages");
    }
});

/**
 * GET /api/otp/status
 */
app.get('/api/otp/status', (req, res) => {
    res.json({ 
        status: "Online", 
        gmail: gmailStatus, // Check this!
        hits: requestCount,
        lastRequest: lastRequestTime,
        lastCodeSent: lastGeneratedCode,
        error: lastEmailError
    });
});

/**
 * POST /api/otp/send-email
 */
app.post('/api/otp/send-email', async (req, res) => {
    requestCount++;
    lastRequestTime = new Date().toLocaleString();
    const { email, code } = req.body;
    lastGeneratedCode = code;
    
    console.log(`[Backend] Request to send ${code} to ${email}`);
    
    res.json({ success: true });

    transporter.sendMail({
        from: '"SMARTJEEP" <smartjeep302@gmail.com>',
        to: email,
        subject: "SMARTJEEP Verification Code",
        text: `Your verification code is: ${code}`
    }).then(() => {
        lastEmailError = "None (Last Send Success)";
    }).catch(e => {
        lastEmailError = e.message;
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
    res.send(`SMARTJEEP is live. Gmail: ${gmailStatus}`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
