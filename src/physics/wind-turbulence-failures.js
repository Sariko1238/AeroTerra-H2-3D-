/**
 * AEROTERRA H2 — WIND, TURBULENCE & SYSTEM FAILURES INJECTION ENGINE
 * Architecture: NASA Dryden Turbulence Model & Failure Assessment Matrix
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class WindTurbulenceFailures {
    constructor() {
      // Wind & Atmosphere Settings
      this.windSpeed = 0.0;       // m/s
      this.windDirection = 90.0;  // degrees (coming from East by default)
      this.crosswindActive = false;
      this.crosswindSpeed = 18.0; // 18 m/s severe crosswind test
      this.turbulenceIntensity = 0.15; // 0..1 scale
      this.thermalLift = 0.0;     // m/s vertical air column

      // Failures Matrix
      this.failures = {
        engine1Out: false,        // Left Outer Motor #1 cut
        pemfcOverheat: false,     // Fuel cell temp > 85°C
        batteryFallback: false,   // Backup Li-Po 18.4 kWh engaged
        wingIcing: false,         // Ice accretion on leading edge
        pitotBlock: false,        // Frozen pitot tube (erratic IAS)
        hydraulicLeak: false      // Flaps slow extension
      };

      // Live Engineering Telemetry Metrics for Professor Mode
      this.metrics = {
        liftKn: 0.0,
        dragKn: 0.0,
        thrustKn: 0.0,
        liftToDragRatio: 0.0,
        gLoad: 1.0,
        wingTipFlexMm: 0.0,
        rootMomentKnm: 0.0,
        h2ConsumptionGs: 0.0,
        powerOutputKw: 0.0,
        cellTempC: 62.5,
        batterySocPct: 98.0,
        asymYawMomentNm: 0.0,
        requiredRudderDeg: 0.0
      };

      // Random state for Dryden noise
      this._turbState = { u: 0, v: 0, w: 0 };
    }

    // Toggle specific failure modes
    toggleEngine1Failure() {
      this.failures.engine1Out = !this.failures.engine1Out;
      return this.failures.engine1Out;
    }

    toggleCrosswind18ms() {
      this.crosswindActive = !this.crosswindActive;
      this.windSpeed = this.crosswindActive ? this.crosswindSpeed : 0.0;
      this.windDirection = 90.0; // 90° pure perpendicular crosswind to Runway 09
      return this.crosswindActive;
    }

    togglePemfcOverheat() {
      this.failures.pemfcOverheat = !this.failures.pemfcOverheat;
      if (this.failures.pemfcOverheat) {
        this.failures.batteryFallback = true;
        this.metrics.cellTempC = 91.2;
      } else {
        this.failures.batteryFallback = false;
        this.metrics.cellTempC = 64.0;
      }
      return this.failures.pemfcOverheat;
    }

    toggleWingIcing() {
      this.failures.wingIcing = !this.failures.wingIcing;
      return this.failures.wingIcing;
    }

    resetAllFailures() {
      for (const key in this.failures) {
        this.failures[key] = false;
      }
      this.crosswindActive = false;
      this.windSpeed = 0.0;
      this.metrics.cellTempC = 64.0;
    }

    // --------------------------------------------------------------------------
    // UPDATE WIND & FAILURES EFFECTS ON FLIGHT DYNAMICS
    // --------------------------------------------------------------------------
    apply(flight6DOF, dt) {
      if (!flight6DOF || flight6DOF.crashed) return;

      const alt = Math.max(0, flight6DOF.pos.y);

      // 1. Dryden Stochastic Atmospheric Turbulence Model
      if (this.turbulenceIntensity > 0.01 && !flight6DOF.onGround) {
        const sigmaU = this.turbulenceIntensity * 1.8;
        const sigmaW = this.turbulenceIntensity * 1.4;

        // White noise integrated through low-pass filter
        this._turbState.u += ((Math.random() - 0.5) * sigmaU - this._turbState.u * 1.5) * dt;
        this._turbState.v += ((Math.random() - 0.5) * sigmaU - this._turbState.v * 1.5) * dt;
        this._turbState.w += ((Math.random() - 0.5) * sigmaW - this._turbState.w * 2.0) * dt;

        flight6DOF.vel.x += this._turbState.u * dt * 3.5;
        flight6DOF.vel.y += this._turbState.w * dt * 2.8;
        flight6DOF.vel.z += this._turbState.v * dt * 2.5;

        // Random attitude jolt in rough air
        flight6DOF.rot.z += this._turbState.u * 0.012 * dt;
        flight6DOF.rot.x += this._turbState.w * 0.010 * dt;
      }

      // 2. Crosswind & Thermal Updraft Effects
      if (this.windSpeed > 0.1 && !flight6DOF.onGround) {
        // Crosswind component on X axis (Runway heading is 0° North / 090° East)
        const windRad = (this.windDirection * Math.PI) / 180.0;
        const windX = -Math.sin(windRad) * this.windSpeed;
        const windZ = -Math.cos(windRad) * this.windSpeed;

        // Lateral drift of aircraft over ground
        flight6DOF.pos.x += windX * dt;
        flight6DOF.pos.z += windZ * dt;

        // Weathercock yaw alignment into relative wind
        if (flight6DOF.tas > 5.0) {
          const driftAngle = Math.atan2(windX, flight6DOF.tas);
          flight6DOF.beta = (driftAngle * 180.0) / Math.PI;
        }
      }

      // 3. Engine #1 Out (DEP Asymmetric Thrust Effect)
      if (this.failures.engine1Out && flight6DOF.modelId === 'aeroterra') {
        // Engine 1 is at y = -4.8m (left outer wing)
        // With engine 1 out, left thrust is 25% lower than right thrust
        const motorThrust = (flight6DOF.throttle * flight6DOF.specs.thrustMax) / 4.0;
        const asymArmM = 4.8; // meters from centerline
        const asymMomentNm = motorThrust * asymArmM;

        this.metrics.asymYawMomentNm = asymMomentNm;

        // Yaw moment turns plane to the LEFT (adverse yaw)
        // Unless pilot or stability augmentation applies right rudder!
        const yawDisturbanceRate = (asymMomentNm / 28000.0) * 0.65;
        flight6DOF.rot.y -= yawDisturbanceRate * dt;

        // Calculate required opposing rudder to maintain straight track
        this.metrics.requiredRudderDeg = Math.min(25.0, (yawDisturbanceRate * 180.0 / Math.PI) * 2.2);
      } else {
        this.metrics.asymYawMomentNm = 0.0;
        this.metrics.requiredRudderDeg = 0.0;
      }

      // 4. PEMFC Overheat & Battery Fallback
      if (this.failures.pemfcOverheat) {
        this.metrics.cellTempC = Math.min(96.0, this.metrics.cellTempC + 0.8 * dt);
        this.metrics.batterySocPct = Math.max(10.0, this.metrics.batterySocPct - (flight6DOF.throttle * 0.08 * dt));
        this.metrics.powerOutputKw = flight6DOF.throttle * 120.0;
        this.metrics.h2ConsumptionGs = 0.0; // Fuel cell cut off, battery powering motors!
      } else {
        this.metrics.cellTempC = 62.0 + (flight6DOF.throttle * 14.0);
        this.metrics.batterySocPct = Math.min(100.0, this.metrics.batterySocPct + 0.02 * dt);
        this.metrics.powerOutputKw = flight6DOF.throttle * 120.0;
        // Hydrogen consumption: ~2.8 kg/h at full cruise -> ~0.78 g/s
        this.metrics.h2ConsumptionGs = flight6DOF.throttle * 0.82;
      }

      // 5. Wing Icing Degradation
      if (this.failures.wingIcing) {
        // Adds extra parasite drag and reduces lift
        flight6DOF.vel.z *= Math.max(0, 1.0 - 0.08 * dt);
        flight6DOF.rot.x += 0.04 * dt; // Slight nose-heavy pitch down tendency
      }

      // 6. Synchronize Live Professor Lab Telemetry
      const q = 0.5 * 1.225 * Math.pow(flight6DOF.tas, 2);
      this.metrics.liftKn = ((flight6DOF.gLoad * flight6DOF.specs.massDry * 9.80665) / 1000.0);
      this.metrics.thrustKn = ((flight6DOF.throttle * flight6DOF.specs.thrustMax) / 1000.0);
      this.metrics.dragKn = Math.max(0.4, (this.metrics.thrustKn / Math.max(1.1, flight6DOF.gLoad * 0.8)));
      this.metrics.liftToDragRatio = (this.metrics.dragKn > 0) ? (this.metrics.liftKn / this.metrics.dragKn) : 18.0;
      this.metrics.gLoad = flight6DOF.gLoad;
      this.metrics.wingTipFlexMm = flight6DOF.wingFlexTipMm;
      this.metrics.rootMomentKnm = flight6DOF.wingFlexMomentKnm;
    }
  }

  // Export Global Instance
  window.WindTurbulenceFailures = WindTurbulenceFailures;
  window.AeroTerraAtmosphere = new WindTurbulenceFailures();
  console.log('[WindTurbulenceFailures] Atmosphere, Failures & Professor Engine loaded successfully.');
})();
