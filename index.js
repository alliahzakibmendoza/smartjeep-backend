import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const agent = new SmartJeepAgent(18);

// Debugging
let lastEmailError = "No errors yet.";
let lastRequestTime = "Never";
let requestCount = 0;
let lastGeneratedCode = "None"; // NEW: Track the code here!

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

/**
 * GET /api/otp/status
 */
app.get('/api/otp/status', (req, res) => {
    res.json({ 
        status: "Online", 
        hits: requestCount,
        lastRequest: lastRequestTime,
        lastCodeSent: lastGeneratedCode, // You can see the code here!
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
    
    console.log(`[Backend] Sending ${code} to ${email}`);
    
    // Respond INSTANTLY to avoid app timeout
    res.json({ success: true, message: "Server received request" });

    // Send email in background
    transporter.sendMail({
        from: '"SMARTJEEP" <smartjeep302@gmail.com>',
        to: email,
        subject: "SMARTJEEP Code",
        text: `Your code is: ${code}`
    }).then(() => {
        console.log("Email sent successfully");
        lastEmailError = "None (Last Send Successful)";
    }).catch(e => {
        console.error("Email failed:", e.message);
        lastEmailError = e.message;
    });
});

let drivers = {};
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
    res.send(`SMARTJEEP Live. Total Hits: ${requestCount}`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
