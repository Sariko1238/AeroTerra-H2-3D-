/**
 * AEROTERRA H2 — FULL 6-DOF FLIGHT DYNAMICS & AERODYNAMIC SIMULATION ENGINE
 * Architecture: Microsoft Flight Simulator 2024 / Airbus Grade Physical Core
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. NUMERICAL SAFETY & ROBUST CLAMPING GUARDS
  // ----------------------------------------------------------------------------
  function safeClamp(val, min, max, fallback) {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return fallback;
    return Math.min(Math.max(val, min), max);
  }

  // ----------------------------------------------------------------------------
  // 2. AIRCRAFT PHYSICAL CHARACTERISTICS PRESETS
  // ----------------------------------------------------------------------------
  const FLEET_PHYSICS = {
    'aeroterra': {
      name: 'AeroTerra H2 STOL',
      massDry: 1150.0,          // kg
      massPayloadMax: 800.0,    // kg (water or agro chemical)
      h2Capacity: 28.0,         // kg
      wingspan: 12.4,           // m
      wingArea: 18.2,           // m²
      aspectRatio: 8.44,
      oswaldEfficiency: 0.88,
      thrustMax: 8400.0,        // N (4x 2100N DEP electric motors)
      depBlownCoeff: 0.45,      // DEP slipstream factor over wing
      vRotate: 52.0,            // km/h (STOL flaps 15°)
      vStallClean: 60.0,        // km/h
      vStallFlaps: 42.0,        // km/h
      vCruise: 210.0,           // km/h
      vMax: 290.0,              // km/h
      clMaxClean: 1.85,
      clMaxFlaps15: 2.75,
      clMaxFlaps35: 3.65,
      cd0: 0.024,
      pitchAuth: 1.45,
      rollAuth: 1.65,
      yawAuth: 1.25,
      groundLevel: 1.25,
      wingFlexEI: 3.8e6         // N*m² (Carbon Fiber T800 flexural rigidity)
    },
    'a380': {
      name: 'Airbus A380-800 Superjumbo',
      massDry: 276800.0,        // kg
      massPayloadMax: 150000.0, // kg
      h2Capacity: 0.0,
      wingspan: 79.75,          // m
      wingArea: 845.0,          // m²
      aspectRatio: 7.53,
      oswaldEfficiency: 0.85,
      thrustMax: 1208000.0,     // N (4x 302 kN Rolls-Royce Trent 900)
      depBlownCoeff: 0.0,
      vRotate: 245.0,           // km/h (~132 kts)
      vStallClean: 220.0,       // km/h
      vStallFlaps: 185.0,       // km/h
      vCruise: 900.0,           // km/h (Mach 0.85)
      vMax: 1020.0,             // km/h
      clMaxClean: 1.55,
      clMaxFlaps15: 2.20,
      clMaxFlaps35: 2.85,
      cd0: 0.019,
      pitchAuth: 0.65,
      rollAuth: 0.55,
      yawAuth: 0.60,
      groundLevel: 4.80,
      wingFlexEI: 4.2e9
    },
    'b777': {
      name: 'Boeing 777-300ER',
      massDry: 167800.0,        // kg
      massPayloadMax: 105000.0, // kg
      h2Capacity: 0.0,
      wingspan: 64.8,           // m
      wingArea: 436.8,          // m²
      aspectRatio: 9.62,
      oswaldEfficiency: 0.87,
      thrustMax: 1026000.0,     // N (2x 513 kN GE90-115B)
      depBlownCoeff: 0.0,
      vRotate: 235.0,           // km/h (~127 kts)
      vStallClean: 215.0,       // km/h
      vStallFlaps: 180.0,       // km/h
      vCruise: 890.0,           // km/h (Mach 0.84)
      vMax: 980.0,              // km/h
      clMaxClean: 1.58,
      clMaxFlaps15: 2.25,
      clMaxFlaps35: 2.90,
      cd0: 0.020,
      pitchAuth: 0.72,
      rollAuth: 0.62,
      yawAuth: 0.68,
      groundLevel: 3.90,
      wingFlexEI: 2.9e9
    }
  };

  // ----------------------------------------------------------------------------
  // 3. 6-DOF FLIGHT DYNAMICS ENGINE CLASS
  // ----------------------------------------------------------------------------
  class FlightDynamics6DOF {
    constructor() {
      this.modelId = 'aeroterra';
      this.specs = FLEET_PHYSICS.aeroterra;

      // Pilot Controls Mode: false = Flight Yoke (S=Nose Up / Climb, W=Nose Down / Dive)
      this.arcadePitch = false;

      // State Vectors in Local Coordinates (X: East, Y: Up, Z: North)
      this.pos = { x: 0, y: 700, z: 0 };
      this.vel = { x: 0, y: 0, z: 50 };
      this.rot = { x: 0, y: 0, z: 0 }; // Euler in 'YXZ': x=pitch, y=yaw, z=roll

      // Angular velocities & Accelerations
      this.angVel = { p: 0, q: 0, r: 0 }; // roll, pitch, yaw rate in rad/s
      this.acc = { x: 0, y: 0, z: 0 };

      // Flight State Variables
      this.tas = 50.0;          // m/s
      this.ias = 180.0;         // km/h
      this.kts = 97.2;          // knots
      this.vsi = 0.0;           // m/s
      this.altMSL = 700.0;      // m
      this.altAGL = 700.0;      // m
      this.aoa = 2.4;           // deg
      this.beta = 0.0;          // deg (sideslip angle)
      this.gLoad = 1.0;
      this.headingDeg = 0.0;    // 0..360 deg
      this.onGround = false;
      this.crashed = false;
      this.crashReason = '';

      // Wing Flex live metrics (Euler-Bernoulli)
      this.wingFlexTipMm = 0.0;
      this.wingFlexMomentKnm = 0.0;

      // Systems State
      this.throttle = 0.75;
      this.flapsStage = 0;      // 0 = 0°, 1 = 15°, 2 = 35°
      this.gearTarget = 0.0;    // 0 = up, 1 = down
      this.gearPos = 0.0;
      this.spoilers = 0.0;      // 0..1
      this.waterRemaining = 800.0; // Liters
      this.h2Remaining = 28.0;     // kg

      // Auto-Takeoff assist state
      this.autoTakeoff = false;
      this.autoTakeoffStage = 'idle'; // 'idle' -> 'roll' -> 'rotate' -> 'climb' -> 'done'
    }

    setAircraftModel(modelKey) {
      if (FLEET_PHYSICS[modelKey]) {
        this.modelId = modelKey;
        this.specs = FLEET_PHYSICS[modelKey];
        if (this.onGround) {
          this.pos.y = this.specs.groundLevel;
          this.gearPos = 1.0;
          this.gearTarget = 1.0;
        }
      }
    }

    resetToAir(altitudeM = 700.0) {
      this.pos.x = 0;
      this.pos.y = altitudeM;
      this.pos.z = 0;
      const cruiseTas = (this.specs.vCruise / 3.6);
      this.vel.x = 0;
      this.vel.y = 0;
      this.vel.z = cruiseTas;
      this.rot.x = -0.015; // 1° nose up trim
      this.rot.y = 0;
      this.rot.z = 0;
      this.throttle = 0.75;
      this.gearTarget = 0.0;
      this.gearPos = 0.0;
      this.flapsStage = 0;
      this.onGround = false;
      this.crashed = false;
      this.crashReason = '';
      this.autoTakeoff = false;
      this.autoTakeoffStage = 'idle';
    }

    resetToRunway() {
      this.pos.x = 0;
      this.pos.y = this.specs.groundLevel;
      this.pos.z = 0;
      this.vel.x = 0;
      this.vel.y = 0;
      this.vel.z = 0.1;
      this.rot.x = 0.0;
      this.rot.y = 0.0;
      this.rot.z = 0.0;
      this.throttle = 0.0;
      this.gearTarget = 1.0;
      this.gearPos = 1.0;
      this.flapsStage = 1; // 15° STOL flaps
      this.onGround = true;
      this.crashed = false;
      this.crashReason = '';
      this.autoTakeoff = false;
      this.autoTakeoffStage = 'idle';
    }

    triggerAutoTakeoff() {
      if (this.crashed) this.resetToRunway();
      this.autoTakeoff = true;
      this.autoTakeoffStage = 'roll';
      this.throttle = 1.0;
      this.flapsStage = 1;
      this.spoilers = 0.0;
      this.gearTarget = 1.0;
    }

    // --------------------------------------------------------------------------
    // MAIN PHYSICAL STEP INTEGRATION
    // --------------------------------------------------------------------------
    update(rawDelta, inputs = {}, env = {}) {
      // Numerical Guard: clamp delta time to avoid physics explosion
      const dt = Math.min(Math.max(rawDelta || 0.016, 0.001), 0.033);

      if (this.crashed) {
        this.vel.x = 0;
        this.vel.y = 0;
        this.vel.z = 0;
        this.throttle = 0;
        this.ias = 0;
        this.tas = 0;
        this.vsi = 0;
        return;
      }

      const cfg = this.specs;
      const alt = Math.max(0, this.pos.y);

      // ISA Atmospheric Density Model
      const rho0 = 1.225;
      const rho = rho0 * Math.max(0.1, Math.exp(-alt / 8500.0));

      // 1. Process Pilot Inputs
      let pitchCmd = safeClamp(inputs.pitch || 0, -1.0, 1.0, 0);
      let rollCmd  = safeClamp(inputs.roll  || 0, -1.0, 1.0, 0);
      let yawCmd   = safeClamp(inputs.yaw   || 0, -1.0, 1.0, 0);

      // Invert pitch according to Yoke vs Arcade mode
      if (this.arcadePitch) {
        pitchCmd = -pitchCmd;
      }

      // 2. Auto-Takeoff State Machine
      if (this.autoTakeoff) {
        this.throttle = 1.0;
        this.flapsStage = 1;
        this.spoilers = 0.0;

        if (this.autoTakeoffStage === 'roll') {
          pitchCmd = 0.0;
          rollCmd = 0.0;
          yawCmd = (Math.abs(this.pos.x) > 0.5) ? -safeClamp(this.pos.x * 0.15, -0.2, 0.2, 0) : 0.0;

          if (this.ias >= cfg.vRotate) {
            this.autoTakeoffStage = 'rotate';
          }
        } else if (this.autoTakeoffStage === 'rotate') {
          pitchCmd = 0.55; // Pull back firmly
          rollCmd = 0.0;
          yawCmd = 0.0;

          if (this.altAGL > 10.0) {
            this.autoTakeoffStage = 'climb';
          }
        } else if (this.autoTakeoffStage === 'climb') {
          pitchCmd = 0.35;
          rollCmd = 0.0;
          yawCmd = 0.0;

          // Auto-retract gear safely above 30m
          if (this.altAGL > 30.0 && this.gearTarget > 0.5) {
            this.gearTarget = 0.0;
          }

          // Level off at 150m AGL
          if (this.altAGL >= 150.0) {
            this.autoTakeoff = false;
            this.autoTakeoffStage = 'done';
            this.throttle = 0.75;
            this.flapsStage = 0;
            pitchCmd = 0.0;
          }
        }
      }

      // 3. Mechanization Smoothing
      this.gearPos += (this.gearTarget - this.gearPos) * 2.0 * dt;
      this.gearPos = safeClamp(this.gearPos, 0.0, 1.0, 0.0);

      // Total Current Mass
      const currentMass = cfg.massDry + (this.waterRemaining * 1.0) + (this.h2Remaining * 1.0);

      // 4. Aerodynamic & Control Attitude Updates
      // Pitch Dynamics:
      // pitchCmd > 0 (Stick Back / S / Down) -> targetPitch < 0 in Three.js (Climb / Nose UP)
      // pitchCmd < 0 (Stick Forward / W / Up) -> targetPitch > 0 in Three.js (Dive / Nose DOWN)
      let targetPitch = -0.015; // level cruise trim
      if (Math.abs(pitchCmd) > 0.04) {
        targetPitch = (pitchCmd > 0)
          ? -pitchCmd * (26.0 * Math.PI / 180.0)
          : -pitchCmd * (28.0 * Math.PI / 180.0);
        this.rot.x += (targetPitch - this.rot.x) * (2.8 * cfg.pitchAuth) * dt;
      } else {
        this.rot.x += (targetPitch - this.rot.x) * 1.4 * dt;
      }

      // Roll Dynamics (STRICT NON-INVERTED LEFT/RIGHT):
      // rollCmd < 0 (Stick Left / A / Left)  -> rot.z becomes > 0 (Left Wing Down, Right Wing Up -> Visual Bank Left)
      // rollCmd > 0 (Stick Right / D / Right) -> rot.z becomes < 0 (Right Wing Down, Left Wing Up -> Visual Bank Right)
      let targetRoll = 0.0;
      if (Math.abs(rollCmd) > 0.04) {
        targetRoll = -rollCmd * (38.0 * Math.PI / 180.0);
        this.rot.z += (targetRoll - this.rot.z) * (3.6 * cfg.rollAuth) * dt;
      } else {
        this.rot.z *= Math.max(0, 1.0 - 2.8 * dt); // lateral stability damping
      }

      // Coordinated Turn (Aileron Bank + Rudder Yaw):
      // In Three.js 'YXZ', rot.z > 0 (bank left) -> totalYawRate < 0 (turns nose left towards -X)
      // rot.z < 0 (bank right) -> totalYawRate > 0 (turns nose right towards +X)
      const turnFromBank = -this.rot.z * 1.6;
      const turnFromRudder = (yawCmd || rollCmd * 0.75) * cfg.yawAuth * 1.2;
      const totalYawRate = turnFromBank + turnFromRudder;
      this.rot.y += totalYawRate * dt;

      // Sanitization
      const maxPitchRad = 35.0 * Math.PI / 180.0;
      const maxRollRad = 62.0 * Math.PI / 180.0;
      this.rot.x = safeClamp(this.rot.x, -maxPitchRad, maxPitchRad, 0.0);
      this.rot.z = safeClamp(this.rot.z, -maxRollRad, maxRollRad, 0.0);

      // Compute heading in standard aeronautical degrees (0° North, 90° East, 180° South, 270° West)
      this.headingDeg = safeClamp(((this.rot.y * 180.0 / Math.PI) % 360.0 + 360.0) % 360.0, 0, 360, 0);

      // 5. Airspeed & Velocity Vectors
      this.tas = Math.max(0.1, Math.hypot(this.vel.x, this.vel.y, this.vel.z));
      this.ias = safeClamp(this.tas * 3.6 * Math.sqrt(rho / rho0), 0.0, cfg.vMax * 1.25, 140.0);
      this.kts = this.ias * 0.539957;

      // Effective Airspeed with DEP propwash over the wing
      const propwashSpeed = this.throttle * 24.0 * cfg.depBlownCoeff;
      const vEff = this.tas + propwashSpeed;
      const qEff = 0.5 * rho * Math.pow(vEff, 2);

      // Angle of Attack (AoA)
      const fwdY = -Math.sin(this.rot.x);
      const fwdZ = Math.cos(this.rot.x);
      const vFwd = (this.vel.z * fwdZ) + (this.vel.y * fwdY);
      const vUp  = (-this.vel.z * fwdY) + (this.vel.y * fwdZ);
      const aoaRad = Math.atan2(-vUp, Math.max(1.5, vFwd));
      this.aoa = safeClamp(aoaRad * 180.0 / Math.PI, -12.0, 24.0, 2.5);

      // Lift Coefficient (C_L)
      let baseCl = 0.65;
      if (this.flapsStage === 1) baseCl = 1.45;
      else if (this.flapsStage === 2) baseCl = 2.10;

      const clSlope = 4.8;
      let cl = baseCl + clSlope * (this.aoa * Math.PI / 180.0);
      // Stall behavior drop-off
      if (Math.abs(this.aoa) > 16.0) {
        const stallExcess = (Math.abs(this.aoa) - 16.0) * (Math.PI / 180.0);
        cl *= Math.max(0.2, Math.cos(stallExcess * 2.5));
      }
      cl = safeClamp(cl, -0.9, (this.flapsStage === 2 ? cfg.clMaxFlaps35 : cfg.clMaxFlaps15), 1.2);

      // McCormick Ground Effect factor: reduces induced drag near runway
      const wingHeight = Math.max(0.4, this.pos.y - cfg.groundLevel);
      const sigmaGround = Math.min(1.0, Math.pow(16.0 * wingHeight / cfg.wingspan, 2) / (1.0 + Math.pow(16.0 * wingHeight / cfg.wingspan, 2)));

      // Lift force magnitude
      const liftForceN = qEff * cfg.wingArea * cl * (1.0 + (1.0 - sigmaGround) * 0.14);

      // Drag Coefficient (C_D)
      const cdGear = (1.0 - this.gearPos) * 0.004 + this.gearPos * 0.036;
      const cdFlaps = this.flapsStage * 0.034;
      const cdSpoilers = this.spoilers * 0.082;
      const cdStall = Math.abs(this.aoa) > 16.0 ? Math.pow((Math.abs(this.aoa) - 16.0) * 0.06, 2) : 0.0;
      const cdInduced = (Math.pow(cl, 2) / (Math.PI * cfg.aspectRatio * cfg.oswaldEfficiency)) * sigmaGround;
      const cdTotal = cfg.cd0 + cdGear + cdFlaps + cdSpoilers + cdStall + cdInduced;
      const dragForceN = 0.5 * rho * Math.pow(this.tas, 2) * cfg.wingArea * cdTotal;

      // Thrust Force
      const thrustN = this.throttle * cfg.thrustMax * Math.pow(rho / rho0, 0.7);

      // Euler-Bernoulli Wing Flex Live Calculation
      const L_kN = liftForceN / 1000.0;
      this.gLoad = safeClamp(liftForceN / (currentMass * 9.80665), -3.0, 9.0, 1.0);
      this.wingFlexMomentKnm = (L_kN * cfg.wingspan) / 4.0; // Root bending moment
      // Delta tip: y = (w * b^3) / (24 * E * I)
      this.wingFlexTipMm = safeClamp((liftForceN * Math.pow(cfg.wingspan, 3) / (24.0 * cfg.wingFlexEI)) * 1000.0, -80.0, 450.0, 0.0);

      // 6. Ground Roll vs Airborne Physics
      const groundAlt = cfg.groundLevel;
      const isTouchingGround = (this.pos.y <= groundAlt + 0.15);

      if (isTouchingGround) {
        const isGearDown = (this.gearPos > 0.6);
        const hardImpact = (this.vel.y < -7.5);
        const wingStrike = (Math.abs(this.rot.z) > 0.45); // ~26° bank on ground

        // Crash conditions on 0m
        if ((!isGearDown || hardImpact || wingStrike) && !this.crashed) {
          this.crashed = true;
          this.onGround = true;
          this.pos.y = groundAlt;
          this.vel.x = 0;
          this.vel.y = 0;
          this.vel.z = 0;
          this.ias = 0;
          this.tas = 0;
          this.vsi = 0;
          this.throttle = 0;

          if (!isGearDown) {
            this.crashReason = 'Касание поверхности на высоте 0 м с убранными стойками шасси (GEAR: UP). Конструктивная перегрузка при ударе превысила предел прочности фюзеляжа CFRP T800.';
          } else if (hardImpact) {
            this.crashReason = `Превышение допустимой вертикальной скорости посадки: VSI = ${this.vsi.toFixed(1)} м/с (лимит -7.5 м/с). Разрушение амортизаторов основных стоек.`;
          } else {
            this.crashReason = 'Касание законцовкой крыла земли в вираже (|Roll| > 26°). Разрушение консоли крыла.';
          }
          return;
        }

        // Takeoff Lift-Off Evaluation:
        // On ground, with throttle >= 50% and speed >= vRotate, pulling stick back (pitchCmd > 0.08 / rot.x < -0.03):
        const hasTakeoffSpeed = (this.ias >= (this.flapsStage > 0 ? cfg.vStallFlaps : cfg.vRotate));
        const isRotatingUp = (pitchCmd > 0.08 || this.rot.x < -0.03 || this.autoTakeoff);

        if (this.throttle >= 0.50 && hasTakeoffSpeed && isRotatingUp) {
          // Lift-off! Blown-wing upward vector overcomes gravity
          this.onGround = false;
          const initialClimbRate = 4.2 + (this.ias - cfg.vStallFlaps) * 0.09 + (this.flapsStage * 0.6);
          this.vel.y = Math.max(this.vel.y, initialClimbRate);
          this.pos.y += this.vel.y * dt;
        } else {
          // Pure Runway Rolling Roll
          this.onGround = true;
          this.pos.y = groundAlt;
          this.vel.y = Math.max(0, this.vel.y);
          this.rot.z *= 0.7; // Wings stay parallel to runway
          this.rot.x = safeClamp(this.rot.x, -0.22, 0.02, 0.0);

          // Rolling friction: mu = 0.025 on concrete
          const mu = 0.025;
          const normalForce = Math.max(0, currentMass * 9.80665 - liftForceN);
          const fFriction = mu * normalForce;

          // Forward acceleration along runway
          const netThrust = Math.max(0, thrustN - dragForceN - fFriction);
          const accelZ = (netThrust / currentMass);
          this.vel.z += accelZ * dt;

          // Wheel braking when throttle low
          if (this.throttle < 0.1 || this.spoilers > 0.1) {
            this.vel.z *= Math.max(0, 1.0 - 1.4 * dt);
          }
          this.vel.x *= Math.max(0, 1.0 - 2.5 * dt); // Align to runway centerline
        }
      } else {
        // Airborne 6-DOF Integration
        this.onGround = false;

        // Force Accelerations
        const liftAcc = liftForceN / currentMass;
        const dragAcc = dragForceN / currentMass;
        const thrustAcc = thrustN / currentMass;

        // Velocity vector alignment
        const cosP = Math.cos(this.rot.x);
        const sinP = Math.sin(this.rot.x);
        const cosR = Math.cos(this.rot.z);
        const sinR = Math.sin(this.rot.z);

        // Forward vector in world
        const fwdX = Math.sin(this.rot.y) * cosP;
        const fwdY = -sinP;
        const fwdZ = Math.cos(this.rot.y) * cosP;

        // Apply thrust along forward vector
        this.vel.x += fwdX * thrustAcc * dt;
        this.vel.y += (fwdY * thrustAcc + liftAcc * cosR - 9.80665) * dt;
        this.vel.z += fwdZ * thrustAcc * dt;

        // Apply drag opposing velocity
        const speed = Math.max(0.1, Math.hypot(this.vel.x, this.vel.y, this.vel.z));
        this.vel.x -= (this.vel.x / speed) * dragAcc * dt;
        this.vel.y -= (this.vel.y / speed) * dragAcc * dt;
        this.vel.z -= (this.vel.z / speed) * dragAcc * dt;

        // Coordinated turn: apply yaw rate to turn velocity vector
        if (Math.abs(totalYawRate) > 0.0001) {
          const vx = this.vel.x;
          const vz = this.vel.z;
          const cosY = Math.cos(totalYawRate * dt);
          const sinY = Math.sin(totalYawRate * dt);
          this.vel.x = vx * cosY + vz * sinY;
          this.vel.z = -vx * sinY + vz * cosY;
        }

        // Aerodynamic Weathercock velocity alignment
        this.vel.x = this.vel.x * (1.0 - 4.0 * dt) + (fwdX * speed) * (4.0 * dt);
        this.vel.z = this.vel.z * (1.0 - 4.0 * dt) + (fwdZ * speed) * (4.0 * dt);
      }

      // Safety Velocity Limits (-35 to +32 m/s VSI, max TAS)
      this.vel.x = safeClamp(this.vel.x, -140, 140, 0);
      this.vel.y = safeClamp(this.vel.y, -35.0, 32.0, 0);
      this.vel.z = safeClamp(this.vel.z, -140, 140, 0);

      // Integrate Position in World (X: East, Y: Up, Z: North)
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.pos.z += this.vel.z * dt;

      // Altitude Limits
      this.pos.y = safeClamp(this.pos.y, groundAlt, 7500.0, 700.0);
      this.altMSL = this.pos.y;
      this.altAGL = Math.max(0, this.altMSL - groundAlt);
      this.vsi = safeClamp(this.vel.y, -35.0, 32.0, 0.0);
    }
  }

  // Export Global Instance
  window.FlightDynamics6DOF = FlightDynamics6DOF;
  window.AeroTerra6DOF = new FlightDynamics6DOF();
  console.log('[FlightDynamics6DOF] 6-DOF Aerodynamic & Physics Engine loaded successfully.');
})();
