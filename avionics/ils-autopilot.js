/**
 * ============================================================================
 * AEROTERRA H2 — AVIONICS & AUTOPILOT SUITE
 * Module: avionics/ils-autopilot.js
 * 
 * Features:
 * - 3D ILS Glideslope Tunnel & Holographic Landing Gates (3.0° Glideslope)
 * - PAPI 4-Light Visual Optical Slope Alignment
 * - Synthetic Voice Assistant ("Bitching Betty" Audio Callouts)
 *   * Altitude Callouts: 100m, 50m, 30m, 10m, Retard, Touchdown!
 *   * Emergency Warnings: Stall, Over-G, Terrain Pull-Up, Crash
 *   * Operational Callouts: Water Drop, Hydrogen Boost, Flaps
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ILSAutopilot = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ILSAutopilotSuite {
    constructor() {
      this.ilsActive = false;
      this.voiceActive = true;
      this.gatesGroup = null;
      this.gateMeshes = [];
      this.lastSpokenAlt = null;
      this.lastCalloutTime = 0;
      this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      this.voiceCooldowns = {};
      this.audioCtx = null;
      this.initVoicePreference();
    }

    initVoicePreference() {
      try {
        const stored = localStorage.getItem('aeroterra_voice_callouts');
        if (stored !== null) {
          this.voiceActive = stored === 'true';
        }
      } catch (e) {
        this.voiceActive = true;
      }
    }

    toggleVoice() {
      this.voiceActive = !this.voiceActive;
      try {
        localStorage.setItem('aeroterra_voice_callouts', String(this.voiceActive));
      } catch (e) {}

      if (this.voiceActive) {
        this.speak('Voice assistant engaged', 'Голосовой ассистент включен', true);
      }
      return this.voiceActive;
    }

    /**
     * Initializes 3D ILS Landing Gates in Three.js scene
     * Runway threshold is assumed at (0, 1.25, -340) or (0, 1.25, 340)
     * Approach glideslope: 3.0 degrees
     */
    initILSGates(scene, terrainGroup, thresholdZ = -340) {
      if (!scene || typeof THREE === 'undefined') return;

      if (this.gatesGroup) {
        scene.remove(this.gatesGroup);
        this.gatesGroup = null;
        this.gateMeshes = [];
      }

      this.gatesGroup = new THREE.Group();
      this.gatesGroup.name = 'ILS_Glideslope_Gates';
      this.gatesGroup.visible = this.ilsActive;

      // 8 Gates spaced along the 3.0° glideslope
      // Glideslope angle: 3.0° -> tan(3.0°) ~= 0.0524 (52.4m height per 1000m distance)
      const slope = Math.tan(3.0 * Math.PI / 180);
      const gateDistances = [180, 400, 700, 1100, 1600, 2200, 3000, 4000];

      gateDistances.forEach((dist, idx) => {
        const gateZ = thresholdZ - dist; // Behind threshold for approach
        const gateY = 1.5 + (dist * slope);
        const width = 28 + (idx * 4); // Expands further away
        const height = 18 + (idx * 2.5);

        const gate = this.createGateMesh(width, height, idx, dist);
        gate.position.set(0, gateY, gateZ);
        gate.userData = {
          dist,
          gateY,
          gateZ,
          passed: false,
          gateIndex: idx
        };

        this.gateMeshes.push(gate);
        this.gatesGroup.add(gate);
      });

      if (terrainGroup) {
        terrainGroup.add(this.gatesGroup);
      } else {
        scene.add(this.gatesGroup);
      }
    }

    createGateMesh(width, height, index, distance) {
      const group = new THREE.Group();

      // Neon Hologram Box Wireframe
      const boxGeo = new THREE.BoxGeometry(width, height, 8);
      const edges = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: index === 0 ? 0x00ff9d : 0x00e5ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      const wire = new THREE.LineSegments(edges, wireMat);
      group.add(wire);

      // Glowing corner brackets
      const cornerGeo = new THREE.BoxGeometry(2.0, 2.0, 1.0);
      const cornerMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.9
      });

      const corners = [
        [-width / 2, -height / 2],
        [width / 2, -height / 2],
        [-width / 2, height / 2],
        [width / 2, height / 2]
      ];
      corners.forEach(([cx, cy]) => {
        const cMesh = new THREE.Mesh(cornerGeo, cornerMat);
        cMesh.position.set(cx, cy, 0);
        group.add(cMesh);
      });

      // Target centerline crosshair
      const crossGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3.5, 0, 0),
        new THREE.Vector3(3.5, 0, 0),
        new THREE.Vector3(0, -3.5, 0),
        new THREE.Vector3(0, 3.5, 0)
      ]);
      const crossMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.6 });
      const cross = new THREE.LineSegments(crossGeo, crossMat);
      group.add(cross);

      group.userData.wire = wire;
      return group;
    }

    toggleILS() {
      this.ilsActive = !this.ilsActive;
      if (this.gatesGroup) {
        this.gatesGroup.visible = this.ilsActive;
      }
      return this.ilsActive;
    }

    /**
     * Checks if plane passed through gates and pulses gate colors
     */
    updateILS(planePos) {
      if (!this.ilsActive || !this.gatesGroup || !planePos) return;

      this.gateMeshes.forEach((gate) => {
        const u = gate.userData;
        if (!u.passed && planePos.z >= u.gateZ && planePos.z <= u.gateZ + 40) {
          const dy = Math.abs(planePos.y - u.gateY);
          const dx = Math.abs(planePos.x);

          if (dx < 35 && dy < 25) {
            u.passed = true;
            // Pulse gate emerald green
            if (u.wire) {
              u.wire.material.color.setHex(0x00ff9d);
              u.wire.material.opacity = 1.0;
            }
            this.playTone(880, 0.12); // pleasant chime
          }
        }
      });
    }

    /**
     * Reset gates state on flight reset
     */
    resetGates() {
      this.gateMeshes.forEach((gate) => {
        gate.userData.passed = false;
        if (gate.userData.wire) {
          gate.userData.wire.material.color.setHex(0x00e5ff);
          gate.userData.wire.material.opacity = 0.85;
        }
      });
      this.lastSpokenAlt = null;
    }

    /**
     * Synthesizes Cockpit Voice Callouts via Web Speech API with Web Audio fallback
     * @param {string} textEn - English aviation phrasing
     * @param {string} textRu - Russian aviation phrasing
     * @param {boolean} force - Bypass cooldown
     */
    speak(textEn, textRu = null, force = false) {
      if (!this.voiceActive && !force) return;

      const now = Date.now();
      if (!force && this.voiceCooldowns[textEn] && now - this.voiceCooldowns[textEn] < 4500) {
        return; // debounce same phrase
      }
      this.voiceCooldowns[textEn] = now;

      if (this.speechSynth && typeof SpeechSynthesisUtterance !== 'undefined') {
        try {
          this.speechSynth.cancel(); // cancel previous queued
          const utter = new SpeechSynthesisUtterance(textEn);
          utter.rate = 1.15;
          utter.pitch = 1.05;
          utter.volume = 0.95;

          // Prefer standard English aviation voices
          const voices = this.speechSynth.getVoices ? this.speechSynth.getVoices() : [];
          const aeroVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Alex')));
          if (aeroVoice) utter.voice = aeroVoice;

          this.speechSynth.speak(utter);
          return;
        } catch (e) {
          // fallback to tone
        }
      }

      // Audio Tone Fallback
      this.playTone(660, 0.2);
    }

    /**
     * Automatic Altitude Callouts on descent / landing
     * @param {number} altAGL - Altitude above ground level in meters
     * @param {number} vsi - Vertical speed in m/s (negative = descending)
     */
    processAltitudeCallouts(altAGL, vsi) {
      if (!this.voiceActive) return;

      // Only call out when descending or approaching runway
      if (vsi >= 1.0) {
        this.lastSpokenAlt = null;
        return;
      }

      if (altAGL <= 105 && altAGL > 85 && this.lastSpokenAlt !== 100) {
        this.lastSpokenAlt = 100;
        this.speak('One hundred meters', 'Сто метров');
      } else if (altAGL <= 55 && altAGL > 40 && this.lastSpokenAlt !== 50) {
        this.lastSpokenAlt = 50;
        this.speak('Fifty meters', 'Пятьдесят');
      } else if (altAGL <= 35 && altAGL > 22 && this.lastSpokenAlt !== 30) {
        this.lastSpokenAlt = 30;
        this.speak('Thirty', 'Тридцать');
      } else if (altAGL <= 12 && altAGL > 5 && this.lastSpokenAlt !== 10) {
        this.lastSpokenAlt = 10;
        this.speak('Ten', 'Десять');
      } else if (altAGL <= 3.0 && altAGL > 1.2 && this.lastSpokenAlt !== 3) {
        this.lastSpokenAlt = 3;
        this.speak('Retard', 'Малый газ');
      }
    }

    calloutTouchdown() {
      this.speak('Touchdown', 'Посадка');
    }

    calloutStall() {
      this.playKlaxon();
      this.speak('Warning! Stall, Stall!', 'Внимание! Сваливание!');
    }

    calloutOverG() {
      this.speak('Over-G! Over-G!', 'Превышение перегрузки!');
    }

    calloutWaterDrop() {
      this.speak('Water drop released', 'Сброс воды произведен');
    }

    calloutBoost() {
      this.speak('Hydrogen boost active', 'Водородный буст включен');
    }

    calloutCrash(reason = 'Gear up') {
      this.playKlaxon();
      this.speak('Warning! Crash! Emergency fuselage landing!', 'Авария! Посадка на фюзеляж!');
    }

    getAudioContext() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    }

    playTone(freq = 440, duration = 0.15) {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    }

    playKlaxon() {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(450, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.35);
      } catch (e) {}
    }
  }

  return new ILSAutopilotSuite();
});
