/**
 * AEROTERRA H2 — 3D CRASH VFX PARTICLES, TOUCHDOWN SMOKE & BLACK BOX MODAL
 * Architecture: 400-Particle Incandescent Explosion, Smoke Plume & Crash Report
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class CrashVfxParticles {
    constructor() {
      this.vfxGroup = null;
      this.explosionParticles = null;
      this.smokePlume = null;
      this.touchdownSmoke = null;
      this.vortexLeft = null;
      this.vortexRight = null;
      this.activeCrash = false;
      this.sparkCount = 400;
      this.sparkVelocities = [];
    }

    init(scene, THREE) {
      if (!scene || !THREE) return;
      this.THREE = THREE;
      this.scene = scene;

      this.vfxGroup = new THREE.Group();
      this.vfxGroup.name = 'Crash_VFX_Particles_Group';
      scene.add(this.vfxGroup);

      // 1. Crash Explosion 400 Incandescent Sparks
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPos = new Float32Array(this.sparkCount * 3);
      const sparkColors = new Float32Array(this.sparkCount * 3);
      this.sparkVelocities = [];

      for (let i = 0; i < this.sparkCount; i++) {
        sparkPos[i * 3]     = 0;
        sparkPos[i * 3 + 1] = -100; // hidden until explosion
        sparkPos[i * 3 + 2] = 0;

        sparkColors[i * 3]     = 1.0;
        sparkColors[i * 3 + 1] = Math.random() * 0.7 + 0.2; // orange-yellow
        sparkColors[i * 3 + 2] = 0.05;

        this.sparkVelocities.push({
          vx: (Math.random() - 0.5) * 35.0,
          vy: Math.random() * 28.0 + 8.0,
          vz: (Math.random() - 0.5) * 35.0,
          life: 0.0
        });
      }

      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
      sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

      const sparkMat = new THREE.PointsMaterial({
        size: 3.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.0
      });

      this.explosionParticles = new THREE.Points(sparkGeo, sparkMat);
      this.vfxGroup.add(this.explosionParticles);

      // 2. Black Billowing Smoke Plume
      const smokeCount = 120;
      const smokeGeo = new THREE.BufferGeometry();
      const smokePos = new Float32Array(smokeCount * 3);
      this.smokeVelocities = [];

      for (let i = 0; i < smokeCount; i++) {
        smokePos[i * 3]     = 0;
        smokePos[i * 3 + 1] = -100;
        smokePos[i * 3 + 2] = 0;
        this.smokeVelocities.push({
          vx: (Math.random() - 0.5) * 3.5,
          vy: Math.random() * 8.0 + 4.0,
          vz: (Math.random() - 0.5) * 3.5,
          life: Math.random()
        });
      }
      smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));

      const smokeMat = new THREE.PointsMaterial({
        size: 14.0,
        color: 0x18181b,
        transparent: true,
        opacity: 0.0
      });

      this.smokePlume = new THREE.Points(smokeGeo, smokeMat);
      this.vfxGroup.add(this.smokePlume);

      // 3. Touchdown White Tire Smoke Puff
      const touchGeo = new THREE.BufferGeometry();
      const touchPos = new Float32Array(40 * 3);
      for (let i = 0; i < 40; i++) {
        touchPos[i * 3]     = 0;
        touchPos[i * 3 + 1] = -100;
        touchPos[i * 3 + 2] = 0;
      }
      touchGeo.setAttribute('position', new THREE.BufferAttribute(touchPos, 3));
      const touchMat = new THREE.PointsMaterial({
        size: 8.0,
        color: 0xffffff,
        transparent: true,
        opacity: 0.0
      });
      this.touchdownSmoke = new THREE.Points(touchGeo, touchMat);
      this.vfxGroup.add(this.touchdownSmoke);

      console.log('[CrashVfxParticles] 3D Crash VFX & Particles engine initialized.');
    }

    triggerCrashExplosion(impactPos, crashReason) {
      if (!this.explosionParticles) return;
      this.activeCrash = true;

      const pArr = this.explosionParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.sparkCount; i++) {
        pArr[i * 3]     = impactPos.x;
        pArr[i * 3 + 1] = impactPos.y + 0.5;
        pArr[i * 3 + 2] = impactPos.z;

        this.sparkVelocities[i] = {
          vx: (Math.random() - 0.5) * 45.0,
          vy: Math.random() * 32.0 + 6.0,
          vz: (Math.random() - 0.5) * 45.0,
          life: 1.0
        };
      }
      this.explosionParticles.geometry.attributes.position.needsUpdate = true;
      this.explosionParticles.material.opacity = 0.95;

      if (this.smokePlume) {
        this.smokePlume.position.copy(impactPos);
        this.smokePlume.material.opacity = 0.75;
      }

      // Show Black Box Modal
      this.showBlackBoxReport(crashReason);
    }

    triggerTouchdownPuff(wheelsPos) {
      if (!this.touchdownSmoke) return;
      this.touchdownSmoke.position.copy(wheelsPos);
      this.touchdownSmoke.material.opacity = 0.85;

      const pArr = this.touchdownSmoke.geometry.attributes.position.array;
      for (let i = 0; i < 40; i++) {
        pArr[i * 3]     = (Math.random() - 0.5) * 4.0;
        pArr[i * 3 + 1] = Math.random() * 1.5;
        pArr[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      }
      this.touchdownSmoke.geometry.attributes.position.needsUpdate = true;

      setTimeout(() => {
        if (this.touchdownSmoke) this.touchdownSmoke.material.opacity = 0.0;
      }, 1200);
    }

    showBlackBoxReport(reason) {
      let modal = document.getElementById('black-box-crash-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'black-box-crash-modal';
        modal.className = 'glass-panel';
        modal.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 92%;
          max-width: 580px;
          background: rgba(10, 15, 30, 0.96);
          border: 2px solid #ef4444;
          box-shadow: 0 0 45px rgba(239, 68, 68, 0.45);
          border-radius: 16px;
          padding: 24px 28px;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
          color: #fff;
          backdrop-filter: blur(20px);
        `;

        modal.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(239,68,68,0.3); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">💥</span>
              <div>
                <h3 style="margin: 0; font-size: 16px; color: #ef4444; font-weight: 800; letter-spacing: 0.05em;">КРУШЕНИЕ НА ВЫСОТЕ 0 М (TERRAIN CRASH)</h3>
                <span style="font-size: 11px; color: #94a3b8;">AeroTerra H2 — Бортовой Самописец (Black Box Event)</span>
              </div>
            </div>
            <span style="background: rgba(239,68,68,0.2); color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">ACCIDENT REPORT</span>
          </div>

          <div style="background: rgba(24, 24, 27, 0.7); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 14px;">
            <h5 style="margin: 0 0 6px 0; color: #fca5a5; font-size: 12px; font-weight: 700;">ТОЧНАЯ ИНЖЕНЕРНАЯ ПРИЧИНА АВАРИИ:</h5>
            <p id="black-box-reason-text" style="margin: 0; font-size: 13px; line-height: 1.45; color: #e2e8f0;"></p>
          </div>

          <div style="font-size: 11.5px; color: #94a3b8; line-height: 1.4;">
            👑 Создатель проекта: <strong style="color: #ffd700;">Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО</strong> (sarikmusaev2006@gmail.com).<br>
            Физическая модель: 6-DOF Euler/Bernoulli со структурной прочностью планера CFRP T800.
          </div>

          <div style="display: flex; gap: 10px; margin-top: 6px;">
            <button id="btn-crash-air-reset" style="flex: 1; padding: 12px 14px; border-radius: 8px; background: #0284c7; border: 1px solid #38bdf8; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>🔄 Сброс в воздух (700 м)</span>
            </button>
            <button id="btn-crash-runway-reset" style="flex: 1; padding: 12px 14px; border-radius: 8px; background: #15803d; border: 1px solid #4ade80; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>🛫 Старт с ВПП (Шасси)</span>
            </button>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-crash-air-reset').addEventListener('click', () => {
          modal.style.display = 'none';
          if (window.AeroTerra6DOF) window.AeroTerra6DOF.resetToAir(700.0);
          if (typeof window.resetAircraftToSafeFlight === 'function') window.resetAircraftToSafeFlight();
        });

        document.getElementById('btn-crash-runway-reset').addEventListener('click', () => {
          modal.style.display = 'none';
          if (window.AeroTerra6DOF) window.AeroTerra6DOF.resetToRunway();
          if (typeof window.resetToRunway0m === 'function') window.resetToRunway0m();
        });
      }

      const reasonEl = document.getElementById('black-box-reason-text');
      if (reasonEl) {
        reasonEl.textContent = reason || 'Касание поверхности земли на высоте 0 м с убранными стойками шасси (GEAR: UP). Конструктивная перегрузка при ударе превысила предел прочности фюзеляжа CFRP T800.';
      }
      modal.style.display = 'flex';
    }

    update(dt) {
      if (!this.activeCrash && !this.explosionParticles) return;

      // Update Sparks
      if (this.explosionParticles && this.activeCrash) {
        const pArr = this.explosionParticles.geometry.attributes.position.array;
        let anyAlive = false;

        for (let i = 0; i < this.sparkCount; i++) {
          const v = this.sparkVelocities[i];
          if (v && v.life > 0.0) {
            anyAlive = true;
            v.life -= 0.65 * dt;

            pArr[i * 3]     += v.vx * dt;
            pArr[i * 3 + 1] += v.vy * dt;
            pArr[i * 3 + 2] += v.vz * dt;

            // Gravity
            v.vy -= 18.0 * dt;

            // Ground Bounce
            if (pArr[i * 3 + 1] < 0.2) {
              pArr[i * 3 + 1] = 0.2;
              v.vy = -v.vy * 0.45;
              v.vx *= 0.7;
              v.vz *= 0.7;
            }
          }
        }
        this.explosionParticles.geometry.attributes.position.needsUpdate = true;
        this.explosionParticles.material.opacity = Math.max(0, this.explosionParticles.material.opacity - 0.25 * dt);

        if (!anyAlive) {
          this.activeCrash = false;
        }
      }
    }
  }

  // Export Global Instance
  window.CrashVfxParticles = new CrashVfxParticles();
  console.log('[CrashVfxParticles] 3D Crash VFX & Black Box Report loaded successfully.');
})();
