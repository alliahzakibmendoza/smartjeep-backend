import express from 'express';
import cors from 'cors';
import { SmartJeepAgent } from './SmartJeepAgent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize the SmartJeep AI Agent
const agent = new SmartJeepAgent(18);

// Mock Database / State
let currentTelemetry = {
  rawCameraCount: 5,
  doorSensorOpen: false,
  currentSpeed: 20,
  jeepLoc: { lat: 14.5648, lng: 120.9932 },
  commuterLoc: { lat: 14.5635, lng: 120.9942 }
};

// Periodic AI perception update (Simulating real-time)
setInterval(() => {
    // Randomly fluctuate camera count and door state for simulation
    if (Math.random() > 0.8) {
        currentTelemetry.doorSensorOpen = !currentTelemetry.doorSensorOpen;
    }
    
    // Simulate some movement
    currentTelemetry.jeepLoc.lat += (Math.random() - 0.5) * 0.0001;
    currentTelemetry.jeepLoc.lng += (Math.random() - 0.5) * 0.0001;
    
    agent.perceive(
        currentTelemetry.rawCameraCount,
        currentTelemetry.doorSensorOpen,
        currentTelemetry.currentSpeed
    );
}, 3000);

// API Endpoints
app.get('/', (req, res) => {
    res.json({ message: "SMARTJEEP Localhost Backend is running!" });
});

/**
 * GET /api/telemetry
 * Returns the current fused AI state and decision
 */
app.get('/api/telemetry', (req, res) => {
    const decision = agent.makeDecision(currentTelemetry.jeepLoc, currentTelemetry.commuterLoc);
    res.json({
        ...currentTelemetry,
        ai_decision: decision,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/command
 * Sends a command to the "ESP32" (Mocked)
 */
app.post('/api/command', (req, res) => {
    const { command } = req.body;
    console.log(`[Backend] Command received for ESP32: ${command}`);
    res.json({ status: "success", command_sent: command });
});

app.listen(PORT, () => {
    console.log(`🚀 SMARTJEEP Backend running on http://localhost:${PORT}`);
});
