/**
 * ============================================================================
 * AEROTERRA H2 — ADVANCED FLIGHT DYNAMICS & AERODYNAMICS ENGINE
 * Module: physics/aero-dynamics.js
 * 
 * Features:
 * - NACA 64-215 Airfoil Polar & Empirical Lift/Drag Surface Models
 * - McCormick Ground Effect Formulation (Height < 6m cushion)
 * - Distributed Electric Propulsion (DEP) Blown Wing Aerodynamics
 * - G-Load & Structural Acceleration Monitoring
 * - 3D Wingtip Vortices (Vapor Condensation Trails) Three.js System
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AeroDynamics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // NACA 64-215 Empirical Polar Discrete Nodes
  const NACA_64_215_NODES = [
    { alpha: -12.0, cl: -0.85, cd: 0.0380 },
    { alpha: -8.0,  cl: -0.52, cd: 0.0195 },
    { alpha: -4.0,  cl: -0.18, cd: 0.0092 },
    { alpha: 0.0,   cl:  0.22, cd: 0.0058 },
    { alpha: 4.0,   cl:  0.64, cd: 0.0076 },
    { alpha: 8.0,   cl:  1.05, cd: 0.0135 },
    { alpha: 12.0,  cl:  1.42, cd: 0.0240 },
    { alpha: 15.0,  cl:  1.61, cd: 0.0390 },
    { alpha: 16.5,  cl:  1.62, cd: 0.0520 }, // Stall onset
    { alpha: 18.0,  cl:  1.38, cd: 0.0880 },
    { alpha: 22.0,  cl:  0.92, cd: 0.1850 }
  ];

  class AeroDynamicsEngine {
    constructor() {
      this.specs = null;
      this.vorticesActive = false;
      this.vortexRibbons = null;
      this.vortexHistory = { left: [], right: [] };
      this.maxVortexPoints = 48;
      this.lastVortexSpawnTime = 0;
      this.loadSpecs();
    }

    async loadSpecs() {
      try {
        if (typeof window !== 'undefined' && window.fetch) {
          const res = await fetch('data/aircraft-specs.json');
          if (res.ok) {
            this.specs = await res.json();
          }
        }
      } catch (e) {
        // Fallback default
        this.specs = null;
      }
    }

    /**
     * Computes clean NACA 64-215 CL and CD via piecewise linear interpolation with smooth stall decay
     * @param {number} alphaDeg - Angle of Attack in degrees (-15 to +25)
     * @param {number} flapStage - Flaps deployment stage (0 = clean, 1 = 15°, 2 = 30°)
     * @returns {{ cl: number, cd: number, cm: number, isStall: boolean }}
     */
    getAirfoilCoefficients(alphaDeg, flapStage = 0) {
      const clampedAlpha = Math.max(-14, Math.min(24, alphaDeg));
      let cl = 0;
      let cd = 0.01;

      // Find interval
      let found = false;
      for (let i = 0; i < NACA_64_215_NODES.length - 1; i++) {
        const p1 = NACA_64_215_NODES[i];
        const p2 = NACA_64_215_NODES[i + 1];
        if (clampedAlpha >= p1.alpha && clampedAlpha <= p2.alpha) {
          const t = (clampedAlpha - p1.alpha) / (p2.alpha - p1.alpha);
          cl = p1.cl + t * (p2.cl - p1.cl);
          cd = p1.cd + t * (p2.cd - p1.cd);
          found = true;
          break;
        }
      }

      if (!found) {
        if (clampedAlpha < NACA_64_215_NODES[0].alpha) {
          cl = NACA_64_215_NODES[0].cl;
          cd = NACA_64_215_NODES[0].cd;
        } else {
          const last = NACA_64_215_NODES[NACA_64_215_NODES.length - 1];
          cl = last.cl;
          cd = last.cd;
        }
      }

      // Add Flaps increment (Fowler flap STOL effect: delta CL up to +0.85)
      const flapDeltaCL = flapStage * 0.42;
      const flapDeltaCD = flapStage * 0.038;
      cl += flapDeltaCL;
      cd += flapDeltaCD;

      const isStall = Math.abs(clampedAlpha) > 16.5;

      return {
        cl,
        cd,
        cm: -0.05 - (flapStage * 0.03),
        isStall
      };
    }

    /**
     * Calculates Ground Effect reduction factor based on McCormick / Wieselsberger formulation
     * Near ground (h < 6m), induced drag drops substantially and effective lift increases.
     * @param {number} altitudeAGL - Height of wings above ground in meters
     * @param {number} wingspan - Total wingspan in meters (12.4m for AeroTerra)
     * @returns {{ sigma: number, liftBoost: number, dragReduction: number }}
     */
    calculateGroundEffect(altitudeAGL, wingspan = 12.4) {
      const h = Math.max(0.4, altitudeAGL);
      const h_over_b = h / wingspan;

      // Wieselsberger factor: sigma = (16 * h/b)^2 / [ 1 + (16 * h/b)^2 ]
      const factor16 = 16.0 * h_over_b;
      const factorSq = factor16 * factor16;
      const sigma = Math.min(1.0, factorSq / (1.0 + factorSq));

      // Lift enhancement factor: up to +22% near surface (h/b < 0.15)
      const liftBoost = 1.0 + (1.0 - sigma) * 0.22;
      const dragReduction = sigma; // Induced drag multiplier

      return { sigma, liftBoost, dragReduction };
    }

    /**
     * Calculates Distributed Electric Propulsion (DEP) blown wing dynamic pressure enhancement
     * 4 electric propellers blow accelerated slipstream directly over 65% of the upper wing span.
     * @param {number} tas - True airspeed in m/s
     * @param {number} throttle - Engine throttle [0.0 to 1.0]
     * @param {number} maxThrustN - Maximum rated thrust in Newtons
     * @param {number} airDensity - Air density rho in kg/m3
     * @returns {{ effectiveAirspeed: number, dynamicPressureRatio: number, blownLiftBonus: number }}
     */
    calculateDEPBlownWing(tas, throttle, maxThrustN = 5200, airDensity = 1.225) {
      // Actuator disk slipstream velocity: V_slip = sqrt(V_inf^2 + 2*T / (rho * A_prop))
      // 4 props with D = 1.35m -> total swept area A = 4 * pi * (0.675)^2 = 5.72 m2
      const totalDiskArea = 5.72;
      const currentThrust = throttle * maxThrustN;
      const vSlipSq = (tas * tas) + ((2.0 * currentThrust) / (airDensity * totalDiskArea));
      const vSlip = Math.sqrt(Math.max(0.1, vSlipSq));

      // Blown area covers 65% of the wing surface
      const blownAreaRatio = 0.65;
      const effectiveAirspeed = tas * (1.0 - blownAreaRatio) + vSlip * blownAreaRatio;

      const qFree = 0.5 * airDensity * Math.pow(Math.max(1.0, tas), 2);
      const qBlown = 0.5 * airDensity * Math.pow(effectiveAirspeed, 2);
      const dynamicPressureRatio = qBlown / Math.max(0.1, qFree);
      const blownLiftBonus = (dynamicPressureRatio - 1.0) * 0.35;

      return {
        effectiveAirspeed,
        dynamicPressureRatio,
        blownLiftBonus: Math.max(0, blownLiftBonus)
      };
    }

    /**
     * Computes G-Load and structural fatigue stress
     * @param {number} liftForceN - Total aerodynamic lift in Newtons
     * @param {number} massKg - Current aircraft mass in kg
     * @param {number} bankAngleRad - Roll angle in radians
     * @param {number} pitchRateRadS - Pitch rate in rad/s
     * @param {number} speedMs - Forward speed in m/s
     * @returns {{ gLoad: number, isOverG: boolean, loadFactorWarning: boolean }}
     */
    calculateGLoad(liftForceN, massKg, bankAngleRad, pitchRateRadS = 0, speedMs = 40) {
      const g0 = 9.80665;
      const weightN = massKg * g0;

      // Coordinate load factor: n_z = Lift / Weight
      let nz = liftForceN / Math.max(10.0, weightN);

      // Centrifugal contribution in steady turning flight: 1 / cos(bank)
      const absBank = Math.min(Math.abs(bankAngleRad), 1.25); // max ~72°
      const turnG = 1.0 / Math.max(0.25, Math.cos(absBank));

      // Pitch pull-up load: n_pull = 1 + (V * q) / g
      const pitchG = (speedMs * pitchRateRadS) / g0;

      let gLoad = nz;
      if (Math.abs(pitchRateRadS) > 0.05) {
        gLoad += pitchG;
      }

      // Safe clamp
      gLoad = Math.max(-2.5, Math.min(9.0, gLoad));
      const isOverG = gLoad > 3.8 || gLoad < -1.5;
      const loadFactorWarning = gLoad > 3.0 || gLoad < -0.8;

      return {
        gLoad,
        isOverG,
        loadFactorWarning
      };
    }

    /**
     * Initializes 3D Wingtip Vortices Three.js Particle/Ribbon System
     * @param {THREE.Scene} scene - Active Three.js scene
     * @param {THREE.Group} aircraftGroup - Airplane 3D group
     */
    initWingtipVortices(scene, aircraftGroup) {
      if (!scene || !aircraftGroup || typeof THREE === 'undefined') return;

      this.scene = scene;
      this.aircraftGroup = aircraftGroup;

      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        wireframe: false,
        side: THREE.DoubleSide
      });

      // Create geometry buffers for ribbon trails
      this.trailLeftGeo = new THREE.BufferGeometry();
      this.trailRightGeo = new THREE.BufferGeometry();

      const maxVerts = this.maxVortexPoints * 2 * 3;
      this.trailLeftGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVerts), 3));
      this.trailRightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVerts), 3));

      this.trailLeftMesh = new THREE.Mesh(this.trailLeftGeo, trailMat.clone());
      this.trailRightMesh = new THREE.Mesh(this.trailRightGeo, trailMat.clone());

      scene.add(this.trailLeftMesh);
      scene.add(this.trailRightMesh);
      this.vorticesActive = true;
    }

    /**
     * Updates Wingtip Vortices Ribbons every frame
     * Triggered during high-G banking turns or high AoA
     */
    updateVortices(dt, gLoad, aoaDeg, airspeedKmh, planeWorldPos, planeQuaternion, wingspanHalf = 6.2) {
      if (!this.vorticesActive || !this.scene || typeof THREE === 'undefined') return;

      const isHighGTurn = Math.abs(gLoad) > 1.6;
      const isHighAoA = Math.abs(aoaDeg) > 9.5;
      const hasSpeed = airspeedKmh > 90;

      const shouldSpawnVortex = (isHighGTurn || isHighAoA) && hasSpeed;

      const now = performance.now();
      if (now - this.lastVortexSpawnTime > 35 && shouldSpawnVortex) {
        this.lastVortexSpawnTime = now;

        // Wingtip offsets in body frame
        const leftWingLocal = new THREE.Vector3(-wingspanHalf, 0.45, -0.6);
        const rightWingLocal = new THREE.Vector3(wingspanHalf, 0.45, -0.6);

        leftWingLocal.applyQuaternion(planeQuaternion).add(planeWorldPos);
        rightWingLocal.applyQuaternion(planeQuaternion).add(planeWorldPos);

        const intensity = Math.min(1.0, (Math.max(gLoad, 1.0) - 1.0) * 0.8 + (Math.abs(aoaDeg) / 18.0) * 0.5);

        this.vortexHistory.left.unshift({ pos: leftWingLocal, intensity, age: 0 });
        this.vortexHistory.right.unshift({ pos: rightWingLocal, intensity, age: 0 });

        if (this.vortexHistory.left.length > this.maxVortexPoints) this.vortexHistory.left.pop();
        if (this.vortexHistory.right.length > this.maxVortexPoints) this.vortexHistory.right.pop();
      }

      // Age trails and fade
      const updateTrail = (history, mesh, geo) => {
        if (!history || history.length < 2) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;

        const posAttr = geo.getAttribute('position');
        const posArr = posAttr.array;
        let vIdx = 0;

        for (let i = 0; i < history.length - 1; i++) {
          const pt = history[i];
          pt.age += dt;

          const width = 0.22 * pt.intensity * (1.0 + pt.age * 1.5);
          posArr[vIdx++] = pt.pos.x;
          posArr[vIdx++] = pt.pos.y - width / 2;
          posArr[vIdx++] = pt.pos.z;

          posArr[vIdx++] = pt.pos.x;
          posArr[vIdx++] = pt.pos.y + width / 2;
          posArr[vIdx++] = pt.pos.z;
        }

        geo.setDrawRange(0, (history.length - 1) * 2);
        posAttr.needsUpdate = true;

        // Prune old
        while (history.length > 0 && history[history.length - 1].age > 1.8) {
          history.pop();
        }
      };

      updateTrail(this.vortexHistory.left, this.trailLeftMesh, this.trailLeftGeo);
      updateTrail(this.vortexHistory.right, this.trailRightMesh, this.trailRightGeo);
    }
  }

  return new AeroDynamicsEngine();
});
