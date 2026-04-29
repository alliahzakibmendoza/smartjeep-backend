/**
 * SMARTJEEP Agentic AI Layer
 * Runs on Edge (Android Phone)
 * 
 * Features:
 * 1. Belief/Memory: Stores recent velocities and exponential moving average of passengers.
 * 2. Anticipation: Predicts seat openings if approaching a major terminal.
 * 3. Sensor Fusion: Contextualizes camera noise using the Door Sensor.
 */

export class SmartJeepAgent {
  constructor(maxCapacity = 18) {
    this.maxCapacity = maxCapacity;

    // ---------------------------------------------------------
    // AI BELIEF STATE (MEMORY)
    // ---------------------------------------------------------
    this.state = {
      believedPassengerCount: 0,
      recentSpeedsKmh: [], // Array to store last 5 speed readings
      isDoorOpen: false,
    };

    // Predefined geographic knowledge
    // Example: A major university where many passengers alight.
    this.knownHubs = [
      { name: "University/Mall Dropoff", lat: 14.5995, lng: 120.9842, radiusKm: 0.5 }
    ];
  }

  /**
   * 1. PERCEIVE: Receives raw input from sensors
   * @param {number} rawCameraCount - The instantaneous count from the CV model
   * @param {boolean} doorSensorOpen - Is the door currently open? (from ESP32 over cloud)
   * @param {number} currentSpeed - Speed in km/h from Phone GPS
   */
  perceive(rawCameraCount, doorSensorOpen, currentSpeed) {
    // Update basic states
    this.state.isDoorOpen = doorSensorOpen;
    
    // Maintain rolling memory of speed (last 5 ticks) to adapt to traffic
    if (currentSpeed >= 0) {
      this.state.recentSpeedsKmh.push(currentSpeed);
      if (this.state.recentSpeedsKmh.length > 5) {
        this.state.recentSpeedsKmh.shift(); 
      }
    }

    // Reason about camera noise using Event-Driven Filtering
    this._fusePassengerCount(rawCameraCount);
  }

  /**
   * 2. REASON: Fuses raw camera and door sensor data
   * Uses Exponential Moving Average (EMA) to prevent flickering.
   */
  _fusePassengerCount(rawCount) {
    // The "Alpha" variable determines how much we trust the new Camera data.
    // EVENT-DRIVEN LOGIC: If the door is open, we trust the camera more (alpha = 0.8)
    // If the door is closed, we barely trust the camera (alpha = 0.1) to avoid false positives from movement.
    const alpha = this.state.isDoorOpen ? 0.8 : 0.1;
    
    const previousBelief = this.state.believedPassengerCount;
    const newBelief = (rawCount * alpha) + (previousBelief * (1 - alpha));
    
    // Round to nearest whole person
    this.state.believedPassengerCount = Math.round(newBelief);
    
    // Cap at max capacity limits
    if (this.state.believedPassengerCount > this.maxCapacity) {
      this.state.believedPassengerCount = this.maxCapacity;
    } else if (this.state.believedPassengerCount < 0) {
      this.state.believedPassengerCount = 0;
    }
  }

  /**
   * Helper: Calculates distance between two coordinates in km
   */
  _getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 3. DECIDE: Generate Outputs based on Memory and Context
   * @param {object} currentLocation - {lat, lng} of the jeepney right now
   * @param {object} commuterLocation - {lat, lng} of the user asking for a ride
   * @returns {object} { crowdLevel, ETA_minutes, recommendation }
   */
  makeDecision(currentLocation, commuterLocation) {
    const currentPassengers = this.state.believedPassengerCount;
    
    // Output 1: Crowd Level
    let crowdLevel = "Available";
    if (currentPassengers >= this.maxCapacity) crowdLevel = "Full";
    else if (currentPassengers >= this.maxCapacity - 3) crowdLevel = "Near Full";

    // Output 2: Adaptive ETA
    const distanceToCommuter = this._getDistance(
      currentLocation.lat, currentLocation.lng,
      commuterLocation.lat, commuterLocation.lng
    );
    
    // Calculate average speed from memory. Fallback to 15km/h in traffic if no data.
    const avgSpeed = this.state.recentSpeedsKmh.length > 0 
      ? this.state.recentSpeedsKmh.reduce((a, b) => a + b) / this.state.recentSpeedsKmh.length 
      : 15;
    
    // Dynamic ETA based on historical traffic speed, not static limits
    const etaHours = distanceToCommuter / Math.max(avgSpeed, 1); // prevent divide by zero
    const etaMinutes = Math.round(etaHours * 60);

    // Output 3: Proactive Recommendation
    let recommendation = "Ride this jeepney.";
    
    if (crowdLevel === "Full") {
      // PROACTIVELY Reason: We are full, BUT are we near a major drop-off hub?
      const isNearHub = this.knownHubs.some(hub => {
        const dist = this._getDistance(currentLocation.lat, currentLocation.lng, hub.lat, hub.lng);
        return dist <= hub.radiusKm;
      });

      if (isNearHub) {
        recommendation = "Full right now, but approaching a major drop-off hub. Seats will likely open soon! Wait.";
      } else {
        recommendation = "Jeepney is Full. Please wait for another ride.";
      }
    } else if (crowdLevel === "Near Full") {
      recommendation = "Hurry! Seats are filling up fast.";
    }

    return {
      crowdLevel,
      passengers: currentPassengers,
      etaMinutes,
      recommendation
    };
  }
}

// ---------------------------------------------------------
// Example Usage / Test Run
// ---------------------------------------------------------
/*
  const ai = new SmartJeepAgent();
  
  // 1. Perceive
  // Camera sees 15 people. Door is Open. Driving at 12 km/h
  ai.perceive(15, true, 12);
  
  // 2. Commuter Requests Data
  const jeepLoc = { lat: 14.6000, lng: 120.9850 };
  const commuterLoc = { lat: 14.6100, lng: 120.9900 };
  
  // 3. Make Decision
  const decision = ai.makeDecision(jeepLoc, commuterLoc);
  console.log(decision); 
*/
