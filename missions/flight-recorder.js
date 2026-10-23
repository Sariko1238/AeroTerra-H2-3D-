/**
 * ============================================================================
 * AEROTERRA H2 — FLIGHT DATA RECORDER (BLACK BOX), 3D REPLAY & GAMEPAD API
 * Module: missions/flight-recorder.js
 * 
 * Features:
 * - 100ms High-Resolution Flight Data Ring Buffer (Black Box)
 * - Cinematic 3D Replay Playback Engine with Scrubber Timeline
 * - Real-Time Telemetry Graph Chart Visualizer
 * - HTML5 Gamepad API Support (PS5, Xbox, RC Flight Transmitters via USB)
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FlightRecorder = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class FlightRecorderModule {
    constructor() {
      this.buffer = [];
      this.maxFrames = 3000; // 3000 * 100ms = 300 seconds (5 mins)
      this.lastRecordTime = 0;
      this.isReplaying = false;
      this.replayIndex = 0;
      this.replaySpeed = 1.0;
      this.replayPaused = false;
      this.gamepadConnected = false;
      this.lastGamepadState = {};
      this.initGamepadListeners();
    }

    /**
     * Records a telemetry frame every 100ms
     */
    recordFrame(flightState) {
      if (this.isReplaying || !flightState) return;

      const now = performance.now();
      if (now - this.lastRecordTime < 95) return; // ~100ms throttle
      this.lastRecordTime = now;

      const frame = {
        t: now,
        alt: flightState.pos ? flightState.pos.y : 0,
        posX: flightState.pos ? flightState.pos.x : 0,
        posY: flightState.pos ? flightState.pos.y : 0,
        posZ: flightState.pos ? flightState.pos.z : 0,
        rotX: flightState.rot ? flightState.rot.x : 0,
        rotY: flightState.rot ? flightState.rot.y : 0,
        rotZ: flightState.rot ? flightState.rot.z : 0,
        ias: flightState.ias || 0,
        tas: flightState.tas || 0,
        vsi: flightState.vsi || 0,
        aoa: flightState.aoa || 0,
        gLoad: flightState.gLoad || 1.0,
        throttle: flightState.throttle || 0,
        flaps: flightState.flapsStage || 0,
        gearPos: flightState.gearPos !== undefined ? flightState.gearPos : 1.0
      };

      this.buffer.push(frame);
      if (this.buffer.length > this.maxFrames) {
        this.buffer.shift();
      }
    }

    startReplay() {
      if (this.buffer.length < 5) {
        if (typeof showToast === 'function') {
          showToast('⚠️ НЕДОСТАТОЧНО ДАННЫХ ДЛЯ ПОВТОРА (Совершите хотя бы короткий полёт)');
        }
        return false;
      }
      this.isReplaying = true;
      this.replayIndex = 0;
      this.replayPaused = false;
      this.replaySpeed = 1.0;
      this.showReplayUI(true);
      return true;
    }

    stopReplay() {
      this.isReplaying = false;
      this.showReplayUI(false);
    }

    getReplayFrame(dt) {
      if (!this.isReplaying || this.buffer.length === 0) return null;

      if (!this.replayPaused) {
        this.replayIndex += (dt / 0.1) * this.replaySpeed;
        if (this.replayIndex >= this.buffer.length - 1) {
          this.replayIndex = this.buffer.length - 1;
          this.replayPaused = true;
        }
      }

      const idxFloor = Math.floor(this.replayIndex);
      const idxCeil = Math.min(this.buffer.length - 1, idxFloor + 1);
      const alpha = this.replayIndex - idxFloor;

      const f1 = this.buffer[idxFloor];
      const f2 = this.buffer[idxCeil];

      if (!f1 || !f2) return f1 || null;

      // Smoothly interpolate between frames
      return {
        pos: {
          x: f1.posX + (f2.posX - f1.posX) * alpha,
          y: f1.posY + (f2.posY - f1.posY) * alpha,
          z: f1.posZ + (f2.posZ - f1.posZ) * alpha
        },
        rot: {
          x: f1.rotX + (f2.rotX - f1.rotX) * alpha,
          y: f1.rotY + (f2.rotY - f1.rotY) * alpha,
          z: f1.rotZ + (f2.rotZ - f1.rotZ) * alpha
        },
        ias: f1.ias + (f2.ias - f1.ias) * alpha,
        vsi: f1.vsi + (f2.vsi - f1.vsi) * alpha,
        aoa: f1.aoa + (f2.aoa - f1.aoa) * alpha,
        gLoad: f1.gLoad + (f2.gLoad - f1.gLoad) * alpha,
        throttle: f1.throttle + (f2.throttle - f1.throttle) * alpha,
        flaps: f1.flaps,
        gearPos: f1.gearPos
      };
    }

    showReplayUI(show) {
      let replayBar = document.getElementById('sim-replay-overlay-bar');
      if (!replayBar && show) {
        replayBar = document.createElement('div');
        replayBar.id = 'sim-replay-overlay-bar';
        replayBar.className = 'sim-replay-overlay-bar glass-panel';
        replayBar.innerHTML = `
          <div class="replay-bar-content">
            <span class="replay-badge"><i class="fa-solid fa-backward-step"></i> 3D REPLAY MODE</span>
            <button class="btn-replay-ctrl" id="btn-replay-play"><i class="fa-solid fa-pause"></i></button>
            <button class="btn-replay-ctrl" id="btn-replay-rewind"><i class="fa-solid fa-rotate-left"></i> -5s</button>
            <input type="range" class="replay-scrubber" id="sim-replay-scrubber" min="0" max="100" value="0">
            <span class="replay-time" id="sim-replay-time">00:00 / 00:00</span>
            <button class="btn-replay-speed" id="btn-replay-speed">1.0x</button>
            <button class="btn-replay-chart" id="btn-open-blackbox-chart" title="Показать телеметрию чёрного ящика"><i class="fa-solid fa-chart-line"></i> График</button>
            <button class="btn-replay-close" id="btn-replay-exit" title="Выйти из режима повтора"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `;
        document.getElementById('simulator-section')?.appendChild(replayBar);

        // Bind events
        document.getElementById('btn-replay-play')?.addEventListener('click', () => {
          this.replayPaused = !this.replayPaused;
          const btn = document.getElementById('btn-replay-play');
          if (btn) btn.innerHTML = this.replayPaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
        });

        document.getElementById('btn-replay-rewind')?.addEventListener('click', () => {
          this.replayIndex = Math.max(0, this.replayIndex - 50); // 5 sec
        });

        document.getElementById('btn-replay-speed')?.addEventListener('click', () => {
          if (this.replaySpeed === 1.0) this.replaySpeed = 2.0;
          else if (this.replaySpeed === 2.0) this.replaySpeed = 4.0;
          else this.replaySpeed = 1.0;
          document.getElementById('btn-replay-speed').textContent = `${this.replaySpeed.toFixed(1)}x`;
        });

        const scrubber = document.getElementById('sim-replay-scrubber');
        if (scrubber) {
          scrubber.addEventListener('input', (e) => {
            const pct = parseFloat(e.target.value) / 100;
            this.replayIndex = pct * (this.buffer.length - 1);
          });
        }

        document.getElementById('btn-open-blackbox-chart')?.addEventListener('click', () => {
          this.openBlackBoxChartModal();
        });

        document.getElementById('btn-replay-exit')?.addEventListener('click', () => {
          this.stopReplay();
        });
      }

      if (replayBar) {
        replayBar.style.display = show ? 'flex' : 'none';
      }
    }

    updateReplayUI() {
      if (!this.isReplaying || this.buffer.length === 0) return;
      const scrubber = document.getElementById('sim-replay-scrubber');
      const timeLbl = document.getElementById('sim-replay-time');
      if (scrubber && !scrubber.matches(':active')) {
        scrubber.value = Math.round((this.replayIndex / (this.buffer.length - 1)) * 100);
      }
      if (timeLbl) {
        const curSec = Math.floor(this.replayIndex * 0.1);
        const totSec = Math.floor(this.buffer.length * 0.1);
        const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        timeLbl.textContent = `${fmt(curSec)} / ${fmt(totSec)}`;
      }
    }

    /**
     * Renders Flight Data Recorder Chart Modal
     */
    openBlackBoxChartModal() {
      let modal = document.getElementById('sim-blackbox-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sim-blackbox-modal';
        modal.className = 'admin-modal-overlay';
        modal.style.zIndex = '12000';
        modal.innerHTML = `
          <div class="admin-modal-card glass-panel" style="max-width: 820px; width: 95%;">
            <div class="admin-modal-header">
              <div class="admin-header-title-wrap">
                <div class="admin-icon-badge"><i class="fa-solid fa-chart-line"></i></div>
                <div>
                  <div class="admin-modal-title">ЧЁРНЫЙ ЯЩИК — ТЕЛЕМЕТРИЯ ПОЛЁТА (FDR)</div>
                  <div class="admin-modal-subtitle">Графики высоты (ALT), приборной скорости (IAS) и перегрузки (G-Load)</div>
                </div>
              </div>
              <button class="btn-admin-close" id="btn-close-blackbox"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="padding: 16px;">
              <canvas id="fdr-chart-canvas" width="780" height="340" style="width: 100%; height: 340px; background: rgba(5, 10, 20, 0.7); border-radius: 8px; border: 1px solid rgba(0, 229, 255, 0.2);"></canvas>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('btn-close-blackbox')?.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      }

      modal.style.display = 'flex';
      this.drawBlackBoxChart();
    }

    drawBlackBoxChart() {
      const canvas = document.getElementById('fdr-chart-canvas');
      if (!canvas || this.buffer.length < 2) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 30; y < h - 30; y += 40) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
      }

      const len = this.buffer.length;
      const stepX = (w - 70) / (len - 1);

      // 1. Draw Altitude Curve (Cyan)
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      const maxAlt = Math.max(100, ...this.buffer.map(b => b.alt));
      this.buffer.forEach((b, i) => {
        const x = 50 + i * stepX;
        const y = h - 40 - (b.alt / maxAlt) * (h - 80);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 2. Draw Airspeed Curve (Green)
      ctx.strokeStyle = '#00ff9d';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const maxSpd = Math.max(100, ...this.buffer.map(b => b.ias));
      this.buffer.forEach((b, i) => {
        const x = 50 + i * stepX;
        const y = h - 40 - (b.ias / maxSpd) * (h - 80);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Legend
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`● ВЫСОТА (Макс: ${Math.round(maxAlt)} м)`, 60, 24);
      ctx.fillStyle = '#00ff9d';
      ctx.fillText(`● СКОРОСТЬ IAS (Макс: ${Math.round(maxSpd)} км/ч)`, 320, 24);
    }

    /**
     * HTML5 Gamepad API Support
     */
    initGamepadListeners() {
      if (typeof window === 'undefined') return;
      window.addEventListener('gamepadconnected', (e) => {
        this.gamepadConnected = true;
        if (typeof showToast === 'function') {
          showToast(`🎮 ДЖОЙСТИК ПОДКЛЮЧЕН: ${e.gamepad.id.slice(0, 28)}`);
        }
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
        if (typeof showToast === 'function') {
          showToast('🎮 ДЖОЙСТИК ОТКЛЮЧЕН');
        }
      });
    }

    /**
     * Polls connected gamepad axes and buttons
     * Returns mapped controls or null if no active gamepad
     */
    pollGamepad() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
      const gamepads = navigator.getGamepads();
      if (!gamepads) return null;

      let gp = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
          gp = gamepads[i];
          break;
        }
      }
      if (!gp) return null;

      // Deadzone filter
      const deadzone = (val, dz = 0.08) => (Math.abs(val) > dz ? val : 0);

      // Standard Mapping:
      // Axis 0: Left Stick X (Roll)
      // Axis 1: Left Stick Y (Pitch)
      // Axis 2: Right Stick X (Yaw / Rudder)
      // Axis 3: Right Stick Y (Throttle or Camera)
      const roll = deadzone(gp.axes[0] || 0);
      const pitch = deadzone(gp.axes[1] || 0);
      const yaw = deadzone(gp.axes[2] || gp.axes[4] || 0);

      // Triggers / Bumpers
      const btnWater = gp.buttons[0]?.pressed;  // A / Cross
      const btnGear = gp.buttons[2]?.pressed;   // X / Square
      const btnFlaps = gp.buttons[3]?.pressed;  // Y / Triangle
      const btnBoost = gp.buttons[5]?.pressed;  // R1 / RB
      const btnReset = gp.buttons[4]?.pressed;  // L1 / LB

      return {
        active: true,
        roll,
        pitch,
        yaw,
        btnWater,
        btnGear,
        btnFlaps,
        btnBoost,
        btnReset
      };
    }
  }

  return new FlightRecorderModule();
});
