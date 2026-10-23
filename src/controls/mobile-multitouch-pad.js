/**
 * AEROTERRA H2 — MULTI-TOUCH MOBILE CONTROLS & GAMEPAD API (PS5 / XBOX)
 * Architecture: Independent Touch Identifier Tracking & W3C Gamepad Polling
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class MobileMultiTouchPad {
    constructor() {
      this.active = false;
      this.joyTouchId = null;
      this.thrTouchId = null;

      // Stick inputs (-1.0 to +1.0)
      this.roll = 0.0;
      this.pitch = 0.0;
      this.yaw = 0.0;
      this.throttle = 0.75;

      // Gyroscope tilt state
      this.gyroActive = false;
      this.gyroZeroPitch = 0.0;
      this.gyroZeroRoll = 0.0;

      // Gamepad connected flag
      this.gamepadConnected = false;
    }

    init() {
      this._setupTouchListeners();
      this._setupGamepadAPI();
      this._setupGyroscope();
      console.log('[MobileMultiTouchPad] Multi-Touch & Gamepad API initialized.');
    }

    _setupTouchListeners() {
      const joyZone = document.getElementById('virtual-joystick-zone');
      const joyKnob = document.getElementById('virtual-joystick-knob');
      const thrTrack = document.getElementById('touch-throttle-track');
      const thrHandle = document.getElementById('touch-throttle-handle');
      const thrFill = document.getElementById('touch-throttle-fill');
      const thrPct = document.getElementById('touch-throttle-pct');

      // 1. Right Virtual Joystick (Pitch & Roll)
      if (joyZone && joyKnob) {
        const maxR = 55.0; // 135px box / 2 - knob offset

        const resetJoy = () => {
          this.joyTouchId = null;
          this.roll = 0.0;
          this.pitch = 0.0;
          this.yaw = 0.0;
          joyKnob.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          joyKnob.style.transform = 'translate(-50%, -50%)';
        };

        const updateJoy = (clientX, clientY) => {
          const rect = joyZone.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = clientX - cx;
          let dy = clientY - cy;

          const dist = Math.hypot(dx, dy);
          if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
          }

          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

          // dx < 0 -> Roll Left; dx > 0 -> Roll Right
          this.roll = Math.max(-1.0, Math.min(1.0, dx / maxR));
          this.yaw = this.roll * 0.75;

          // dy > 0 (Pull stick down/back) -> Pitch UP / Climb
          // dy < 0 (Push stick up/forward) -> Pitch DOWN / Dive
          this.pitch = Math.max(-1.0, Math.min(1.0, dy / maxR));
        };

        joyZone.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.joyTouchId === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            this.joyTouchId = t.identifier;
            joyKnob.style.transition = 'none';
            updateJoy(t.clientX, t.clientY);
          }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
          if (this.joyTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === this.joyTouchId) {
                e.preventDefault();
                updateJoy(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                break;
              }
            }
          }
        }, { passive: false });

        const endTouch = (e) => {
          if (this.joyTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === this.joyTouchId) {
                e.preventDefault();
                resetJoy();
                break;
              }
            }
          }
        };

        window.addEventListener('touchend', endTouch, { passive: false });
        window.addEventListener('touchcancel', endTouch, { passive: false });
      }

      // 2. Left Throttle Slider (0 to 100%)
      if (thrTrack && thrHandle) {
        const updateThrottle = (clientY) => {
          const rect = thrTrack.getBoundingClientRect();
          const relY = Math.max(0.0, Math.min(1.0, (rect.bottom - clientY) / rect.height));
          this.throttle = relY;

          const pct = Math.round(relY * 100);
          thrHandle.style.bottom = `${pct * 0.72}%`;
          if (thrFill) thrFill.style.height = `${pct}%`;
          if (thrPct) thrPct.textContent = `${pct}%`;
        };

        thrTrack.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.thrTouchId === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            this.thrTouchId = t.identifier;
            updateThrottle(t.clientY);
          }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
          if (this.thrTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === this.thrTouchId) {
                e.preventDefault();
                updateThrottle(e.changedTouches[i].clientY);
                break;
              }
            }
          }
        }, { passive: false });

        const endThr = (e) => {
          if (this.thrTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === this.thrTouchId) {
                e.preventDefault();
                this.thrTouchId = null;
                break;
              }
            }
          }
        };

        window.addEventListener('touchend', endThr, { passive: false });
        window.addEventListener('touchcancel', endThr, { passive: false });
      }

      // Throttle 100% and 0% buttons
      document.getElementById('btn-touch-thr-max')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.throttle = 1.0;
        if (thrHandle) thrHandle.style.bottom = '72%';
        if (thrFill) thrFill.style.height = '100%';
        if (thrPct) thrPct.textContent = '100%';
      });

      document.getElementById('btn-touch-thr-zero')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.throttle = 0.0;
        if (thrHandle) thrHandle.style.bottom = '0%';
        if (thrFill) thrFill.style.height = '0%';
        if (thrPct) thrPct.textContent = '0%';
      });
    }

    _setupGyroscope() {
      const btnGyro = document.getElementById('btn-touch-gyro');
      if (btnGyro) {
        btnGyro.addEventListener('click', () => {
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(res => {
              if (res === 'granted') {
                this._enableOrientation();
              }
            }).catch(() => this._enableOrientation());
          } else {
            this._enableOrientation();
          }
        });
      }
    }

    _enableOrientation() {
      this.gyroActive = true;
      window.addEventListener('deviceorientation', (e) => {
        if (!this.gyroActive) return;
        // Beta: front-to-back tilt [-180, 180] -> pitch
        // Gamma: left-to-right tilt [-90, 90] -> roll
        if (this.gyroZeroPitch === 0.0) this.gyroZeroPitch = e.beta || 45.0;
        if (this.gyroZeroRoll === 0.0) this.gyroZeroRoll = e.gamma || 0.0;

        const deltaPitch = (e.beta || 0) - this.gyroZeroPitch;
        const deltaRoll  = (e.gamma || 0) - this.gyroZeroRoll;

        // Apply tilt if not dragging manual stick
        if (this.joyTouchId === null) {
          this.pitch = Math.max(-1.0, Math.min(1.0, deltaPitch / 28.0));
          this.roll  = Math.max(-1.0, Math.min(1.0, deltaRoll / 32.0));
          this.yaw   = this.roll * 0.75;
        }
      });
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('📱 ГИРОСКОП АКТИВИРОВАН: НАКЛОНЯЙТЕ ТЕЛЕФОН КАК ШТУРВАЛ!', 4000);
      }
    }

    _setupGamepadAPI() {
      window.addEventListener('gamepadconnected', (e) => {
        this.gamepadConnected = true;
        console.log(`[Gamepad] Connected: ${e.gamepad.id}`);
        if (typeof window.showGlobalToast === 'function') {
          window.showGlobalToast(`🎮 ГЕЙМПАД ПОДКЛЮЧЕН: ${e.gamepad.id.slice(0, 24)}...`, 4000);
        }
      });

      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
      });
    }

    pollGamepad() {
      if (!navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      if (!gamepads || !gamepads[0]) return;

      const gp = gamepads[0];
      if (!gp) return;

      // Standard Gamepad Mapping:
      // Axis 0: Left Stick X (Roll)
      // Axis 1: Left Stick Y (Pitch)
      // Axis 2: Right Stick X (Yaw)
      // Buttons 6 (L2) & 7 (R2): Throttle down / Throttle up
      const deadzone = 0.08;
      const ax0 = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
      const ax1 = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

      if (this.joyTouchId === null && !this.gyroActive) {
        this.roll = ax0;
        this.pitch = ax1; // Pulling stick back (down) gives > 0 in standard gamepads
        this.yaw = (Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0) || (this.roll * 0.75);
      }

      // Triggers for Throttle
      if (gp.buttons[7] && gp.buttons[7].value > 0.1) {
        this.throttle = Math.min(1.0, this.throttle + gp.buttons[7].value * 0.02);
      }
      if (gp.buttons[6] && gp.buttons[6].value > 0.1) {
        this.throttle = Math.max(0.0, this.throttle - gp.buttons[6].value * 0.02);
      }
    }

    getInputs() {
      this.pollGamepad();
      return {
        roll: this.roll,
        pitch: this.pitch,
        yaw: this.yaw,
        throttle: this.throttle
      };
    }
  }

  // Export Global Instance
  window.MobileMultiTouchPad = new MobileMultiTouchPad();
  window.addEventListener('DOMContentLoaded', () => {
    window.MobileMultiTouchPad.init();
  });
})();
