/**
 * AEROTERRA H2 — 3D ILS GLIDESLOPE GATES, PAPI LIGHTS & VOICE ATC DISPATCHER
 * Architecture: Instrument Landing System Cat III & GPWS Synthesized Radio Audio
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class ILSGlideslopeATC {
    constructor() {
      this.gatesGroup = null;
      this.papiGroup = null;
      this.gates = [];
      this.audioCtx = null;
      this.speechSynth = window.speechSynthesis || null;
      this.lastAltitudeCallout = 9999;
      this.ilsActive = true;
      this.soundEnabled = true;
    }

    init(scene, THREE) {
      if (!scene || !THREE) return;
      this.THREE = THREE;
      this.scene = scene;

      this.gatesGroup = new THREE.Group();
      this.gatesGroup.name = 'ILS_Glidepath_Gates_Group';
      scene.add(this.gatesGroup);

      // 1. Build 10 Glowing ILS Glidepath Gates along 3.0° Slope to Runway 09
      // Runway threshold is at (0, 1.25, 1200)
      const numGates = 10;
      const gateWidth = 42.0;
      const gateHeight = 24.0;
      const glideSlopeAngle = (3.0 * Math.PI) / 180.0; // 3 degrees

      const gateMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.75
      });

      for (let i = 1; i <= numGates; i++) {
        const distFromThreshold = i * 260.0;
        const gateZ = 1200.0 - distFromThreshold;
        const gateY = 1.25 + Math.tan(glideSlopeAngle) * distFromThreshold;

        const gateGeo = new THREE.BoxGeometry(gateWidth, gateHeight, 2.0);
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(0, gateY, gateZ);

        // Neon Chevrons pointing to center
        const chevronGeo = new THREE.BufferGeometry();
        const pts = [
          new THREE.Vector3(-gateWidth / 2, 0, 0),
          new THREE.Vector3(0, gateHeight / 4, 0),
          new THREE.Vector3(gateWidth / 2, 0, 0)
        ];
        chevronGeo.setFromPoints(pts);
        const chevron = new THREE.Line(chevronGeo, new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 }));
        chevron.position.set(0, 0, 0);
        gateMesh.add(chevron);

        this.gatesGroup.add(gateMesh);
        this.gates.push({
          mesh: gateMesh,
          z: gateZ,
          y: gateY,
          passed: false
        });
      }

      // 2. Build 4-Light PAPI Array (Precision Approach Path Indicator)
      this.papiGroup = new THREE.Group();
      this.papiGroup.position.set(-28.0, 1.35, 1150.0); // Beside threshold

      this.papiLights = [];
      for (let p = 0; p < 4; p++) {
        const lightBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.8, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x1e293b })
        );
        lightBox.position.set(p * 2.5, 0, 0);

        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), bulbMat);
        bulb.position.set(0, 0.45, 0);
        lightBox.add(bulb);

        this.papiGroup.add(lightBox);
        this.papiLights.push(bulb);
      }
      scene.add(this.papiGroup);

      console.log('[ILSGlideslopeATC] 3D ILS Glidepath gates & PAPI lights deployed.');
    }

    // --------------------------------------------------------------------------
    // AUDIO & ATC SPEECH SYNTHESIS
    // --------------------------------------------------------------------------
    _playRadioClick() {
      try {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.08);
      } catch (_) {}
    }

    speak(textEn, textRu) {
      if (!this.soundEnabled || !this.speechSynth) return;
      this._playRadioClick();

      // Cancel ongoing chatter for urgent alarms
      if (textEn.includes('Warning') || textEn.includes('Pull Up')) {
        this.speechSynth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(textEn);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Prefer English aviation voice
      const voices = this.speechSynth.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (enVoice) utterance.voice = enVoice;

      this.speechSynth.speak(utterance);

      // Show toast on-screen
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast(`📻 ATC: ${textEn} (${textRu || ''})`, 3500);
      }
    }

    // --------------------------------------------------------------------------
    // UPDATE GLIDESLOPE GATES & ALTITUDE CALLOUTS IN REAL TIME
    // --------------------------------------------------------------------------
    update(playerPos, playerAltAGL, isGearDown, vsi) {
      if (!this.gatesGroup || !playerPos) return;

      // 1. Gate Passed Check
      this.gates.forEach(gate => {
        const dz = Math.abs(playerPos.z - gate.z);
        const dy = Math.abs(playerPos.y - gate.y);
        const dx = Math.abs(playerPos.x);

        if (dz < 15.0 && dx < 25.0 && dy < 16.0 && !gate.passed) {
          gate.passed = true;
          gate.mesh.material.color.setHex(0x10b981); // Bright emerald flash
          this._playRadioClick();
        }
      });

      // 2. PAPI 4-Light Update
      // Calculate deviation from 3.0° glideslope
      if (this.papiLights && playerPos.z < 1200.0) {
        const distFromPapi = Math.max(10, 1200.0 - playerPos.z);
        const nominalAlt = 1.25 + Math.tan(3.0 * Math.PI / 180.0) * distFromPapi;
        const altDelta = playerPos.y - nominalAlt;

        // 4 White = Too high (> +15m)
        // 3 White 1 Red = Slightly high (+5m to +15m)
        // 2 White 2 Red = Perfectly on slope (±5m)
        // 1 White 3 Red = Slightly low (-5m to -15m)
        // 4 Red = Dangerously low (< -15m)
        const whiteHex = 0xffffff;
        const redHex = 0xff0033;

        if (altDelta > 15.0) {
          this.papiLights.forEach(b => b.material.color.setHex(whiteHex));
        } else if (altDelta > 5.0) {
          this.papiLights[0].material.color.setHex(whiteHex);
          this.papiLights[1].material.color.setHex(whiteHex);
          this.papiLights[2].material.color.setHex(whiteHex);
          this.papiLights[3].material.color.setHex(redHex);
        } else if (altDelta >= -5.0) {
          this.papiLights[0].material.color.setHex(whiteHex);
          this.papiLights[1].material.color.setHex(whiteHex);
          this.papiLights[2].material.color.setHex(redHex);
          this.papiLights[3].material.color.setHex(redHex);
        } else if (altDelta >= -15.0) {
          this.papiLights[0].material.color.setHex(whiteHex);
          this.papiLights[1].material.color.setHex(redHex);
          this.papiLights[2].material.color.setHex(redHex);
          this.papiLights[3].material.color.setHex(redHex);
        } else {
          this.papiLights.forEach(b => b.material.color.setHex(redHex));
        }
      }

      // 3. GPWS Altitude Callouts on Descent (vsi < -1.0 m/s)
      if (vsi < -1.0) {
        const callouts = [500, 200, 100, 50, 30, 10];
        for (let i = 0; i < callouts.length; i++) {
          const step = callouts[i];
          if (playerAltAGL <= step && this.lastAltitudeCallout > step) {
            this.lastAltitudeCallout = step;
            this.speak(`${step}!`, `${step} метров!`);

            // Check gear warning at 50m!
            if (step <= 50 && !isGearDown) {
              setTimeout(() => {
                this.speak('Warning! Landing gear not extended! Pull up!', 'Внимание! Шасси не выпущены! Взлёт!');
              }, 600);
            }
            break;
          }
        }
      } else if (playerAltAGL > 600.0) {
        this.lastAltitudeCallout = 9999;
      }
    }
  }

  // Export Global Instance
  window.ILSGlideslopeATC = new ILSGlideslopeATC();
  console.log('[ILSGlideslopeATC] 3D ILS Glideslope, PAPI & Voice ATC loaded successfully.');
})();
