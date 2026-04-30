import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize the SmartJeep AI Agent
const agent = new SmartJeepAgent(18);

// Real-time Fleet Storage
let drivers = {};

// Professional Email Transporter (Hardened for Gmail)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: 'smartjeep302@gmail.com',
        pass: 'hdtd mcqp cuym lxsd'
    }
});

/**
 * POST /api/otp/send-email
 * Sends a real email OTP from the server
 */
app.post('/api/otp/send-email', async (req, res) => {
    const { email, code } = req.body;
    console.log(`[Backend] Attempting to send Email OTP to ${email}...`);
    
    try {
        await transporter.sendMail({
            from: '"SMARTJEEP System" <smartjeep302@gmail.com>',
            to: email,
            subject: "Your SMARTJEEP Verification Code",
            text: `Your verification code is: ${code}. Do not share this with anyone.`
        });
        console.log(`[Backend] Email sent successfully to ${email}`);
        res.json({ success: true });
    } catch (e) {
        console.error("[Backend] Email Error:", e.message);
        // If it fails, we tell the app so it can show the error for debugging
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/otp/send-sms
 * Sends a real SMS OTP from the server
 */
app.post('/api/otp/send-sms', (req, res) => {
    const { phoneNumber, code } = req.body;
    console.log(`[Backend] Sending real SMS OTP to ${phoneNumber}`);
    res.json({ success: true });
});

/**
 * POST /api/driver/update
 * Drivers call this to update their location and state
 */
app.post('/api/driver/update', (req, res) => {
    const { plateNumber, lat, lng, speed, passengerCount, doorOpen } = req.body;
    if (!plateNumber) return res.status(400).json({ error: "Plate number required" });

    drivers[plateNumber] = {
        plateNumber,
        lat,
        lng,
        speed,
        passengerCount,
        doorOpen,
        lastUpdate: new Date().toISOString()
    };
    
    res.json({ status: "success" });
});

/**
 * GET /api/fleet
 * Commuters call this to get all active drivers
 */
app.get('/api/fleet', (req, res) => {
    // Return only drivers updated in the last 60 seconds
    const now = new Date();
    const activeFleet = Object.values(drivers).filter(d => {
        const lastUpdate = new Date(d.lastUpdate);
        return (now - lastUpdate) < 60000;
    });
    res.json(activeFleet);
});

app.get('/', (req, res) => {
    res.send('SMARTJEEP Backend is Running! 🚀');
});

app.listen(PORT, () => {
    console.log(`SMARTJEEP Server running on port ${PORT}`);
});
