/**
 * AEROTERRA H2 — 3D FIRST-PERSON COCKPIT & DUAL GARMIN G3000 GLASS FLIGHT DECK
 * Architecture: True 3D Interactive Cockpit, Moving Yoke, PFD/MFD Canvas Displays & HUD
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class GarminG3000Cockpit {
    constructor() {
      this.cockpitGroup = null;
      this.yokeMesh = null;
      this.throttleLeverMesh = null;
      this.wiperLeft = null;
      this.wiperRight = null;
      this.pfdCanvas = null;
      this.pfdCtx = null;
      this.pfdTexture = null;
      this.mfdCanvas = null;
      this.mfdCtx = null;
      this.mfdTexture = null;
      this.wipersActive = false;
      this.wiperAngle = 0.0;
    }

    init(planeGroup, THREE) {
      if (!planeGroup || !THREE) return;
      this.THREE = THREE;

      this.cockpitGroup = new THREE.Group();
      this.cockpitGroup.name = 'Garmin_G3000_Cockpit_Interior';
      planeGroup.add(this.cockpitGroup);

      // Materials
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.2
      });

      const glareShieldMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.95,
        metalness: 0.05
      });

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.9,
        roughness: 0.15
      });

      const yokeLeatherMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.85
      });

      // 1. Cockpit Glare Shield & Dashboard
      const dashGeo = new THREE.BoxGeometry(1.35, 0.45, 1.1);
      const dashboard = new THREE.Mesh(dashGeo, panelMat);
      dashboard.position.set(0, 0.18, 1.25);
      this.cockpitGroup.add(dashboard);

      const glareGeo = new THREE.BoxGeometry(1.38, 0.08, 0.45);
      const glareShield = new THREE.Mesh(glareGeo, glareShieldMat);
      glareShield.position.set(0, 0.42, 1.05);
      glareShield.rotation.x = -0.15;
      this.cockpitGroup.add(glareShield);

      // Center Pedestal & Throttle Console
      const consoleGeo = new THREE.BoxGeometry(0.32, 0.45, 0.75);
      const centerConsole = new THREE.Mesh(consoleGeo, panelMat);
      centerConsole.position.set(0, -0.05, 0.85);
      this.cockpitGroup.add(centerConsole);

      // 2. Physical 3D Throttle Lever
      const throttlePivot = new THREE.Group();
      throttlePivot.position.set(0, 0.18, 0.82);
      const thrLever = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 12), chromeMat);
      thrLever.position.set(0, 0.1, 0);
      throttlePivot.add(thrLever);
      const thrKnob = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), glareShieldMat);
      thrKnob.position.set(0, 0.2, 0);
      throttlePivot.add(thrKnob);
      this.cockpitGroup.add(throttlePivot);
      this.throttleLeverMesh = throttlePivot;

      // 3. Physical 3D Flight Yoke / Control Column
      const yokeColumn = new THREE.Group();
      yokeColumn.position.set(-0.35, -0.02, 0.72);

      const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 16), chromeMat);
      colShaft.rotation.x = Math.PI / 4;
      colShaft.position.set(0, 0.15, -0.15);
      yokeColumn.add(colShaft);

      // Ergonomic Dual-Horn Yoke Wheel
      const yokeWheel = new THREE.Group();
      yokeWheel.position.set(0, 0.3, -0.3);

      const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), chromeMat);
      centerHub.rotateX(Math.PI / 2);
      yokeWheel.add(centerHub);

      // Gold Crown Crest on Yoke Center (Musayev Sardor)
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
      crest.position.set(0, 0, 0.02);
      yokeWheel.add(crest);

      // Left & Right Horns
      const hornGeo = new THREE.TorusGeometry(0.14, 0.022, 12, 24, Math.PI);
      const leftHorn = new THREE.Mesh(hornGeo, yokeLeatherMat);
      leftHorn.rotation.z = Math.PI / 2;
      leftHorn.position.set(-0.14, 0, 0);
      yokeWheel.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, yokeLeatherMat);
      rightHorn.rotation.z = -Math.PI / 2;
      rightHorn.position.set(0.14, 0, 0);
      yokeWheel.add(rightHorn);

      yokeColumn.add(yokeWheel);
      this.cockpitGroup.add(yokeColumn);
      this.yokeMesh = yokeWheel;
      this.yokeColumn = yokeColumn;

      // 4. Dual Garmin G3000 Canvas Glass Displays
      // Left Display: PFD (Primary Flight Display)
      this.pfdCanvas = document.createElement('canvas');
      this.pfdCanvas.width = 512;
      this.pfdCanvas.height = 384;
      this.pfdCtx = this.pfdCanvas.getContext('2d');
      this.pfdTexture = new THREE.CanvasTexture(this.pfdCanvas);

      const pfdScreenMat = new THREE.MeshBasicMaterial({ map: this.pfdTexture });
      const pfdScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), pfdScreenMat);
      pfdScreen.position.set(-0.35, 0.22, 1.05);
      pfdScreen.rotation.x = -0.15;
      this.cockpitGroup.add(pfdScreen);

      // Right Display: MFD (Multi-Function Display & H2 Schematic)
      this.mfdCanvas = document.createElement('canvas');
      this.mfdCanvas.width = 512;
      this.mfdCanvas.height = 384;
      this.mfdCtx = this.mfdCanvas.getContext('2d');
      this.mfdTexture = new THREE.CanvasTexture(this.mfdCanvas);

      const mfdScreenMat = new THREE.MeshBasicMaterial({ map: this.mfdTexture });
      const mfdScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), mfdScreenMat);
      mfdScreen.position.set(0.35, 0.22, 1.05);
      mfdScreen.rotation.x = -0.15;
      this.cockpitGroup.add(mfdScreen);

      // Windshield Frame Wipers
      const wiperGeo = new THREE.BoxGeometry(0.015, 0.42, 0.015);
      this.wiperLeft = new THREE.Mesh(wiperGeo, glareShieldMat);
      this.wiperLeft.position.set(-0.32, 0.52, 1.45);
      this.wiperLeft.rotation.z = -0.4;
      this.cockpitGroup.add(this.wiperLeft);

      this.wiperRight = new THREE.Mesh(wiperGeo, glareShieldMat);
      this.wiperRight.position.set(0.32, 0.52, 1.45);
      this.wiperRight.rotation.z = -0.4;
      this.cockpitGroup.add(this.wiperRight);

      console.log('[GarminG3000Cockpit] 3D First-Person Cockpit & Glass Avionics initialized.');
    }

    // --------------------------------------------------------------------------
    // RENDER PFD CANVAS (PRIMARY FLIGHT DISPLAY)
    // --------------------------------------------------------------------------
    renderPFD(flight6DOF) {
      if (!this.pfdCtx) return;
      const ctx = this.pfdCtx;
      const w = 512;
      const h = 384;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Artificial Horizon Pitch & Roll
      const pitchOffset = (flight6DOF ? flight6DOF.rot.x : 0) * 450.0;
      const rollAngle = (flight6DOF ? -flight6DOF.rot.z : 0);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rollAngle);
      ctx.translate(0, pitchOffset);

      // Sky Blue
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-w, -h * 2, w * 2, h * 2);
      // Ground Brown
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w, 0, w * 2, h * 2);
      // Horizon White Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();

      // Pitch Ladder Lines
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';

      [-20, -10, 10, 20].forEach(deg => {
        const y = -deg * 6.5;
        ctx.beginPath();
        ctx.moveTo(-45, y);
        ctx.lineTo(45, y);
        ctx.stroke();
        ctx.fillText(Math.abs(deg).toString(), -60, y + 5);
        ctx.fillText(Math.abs(deg).toString(), 60, y + 5);
      });
      ctx.restore();

      // Fixed Aircraft Reticle (Yellow Center Cross)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 45, h / 2);
      ctx.lineTo(w / 2 - 15, h / 2);
      ctx.lineTo(w / 2, h / 2 + 10);
      ctx.lineTo(w / 2 + 15, h / 2);
      ctx.lineTo(w / 2 + 45, h / 2);
      ctx.stroke();

      // Left Tape: Airspeed (IAS km/h)
      ctx.fillStyle = 'rgba(6, 12, 26, 0.85)';
      ctx.fillRect(8, 20, 90, h - 40);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 20, 90, h - 40);

      const ias = Math.round(flight6DOF ? flight6DOF.ias : 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${ias}`, 53, h / 2 + 6);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('IAS KM/H', 53, 40);

      // Right Tape: Altitude (MSL m)
      ctx.fillStyle = 'rgba(6, 12, 26, 0.85)';
      ctx.fillRect(w - 98, 20, 90, h - 40);
      ctx.strokeStyle = '#00f0ff';
      ctx.strokeRect(w - 98, 20, 90, h - 40);

      const alt = Math.round(flight6DOF ? flight6DOF.altMSL : 700);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${alt}`, w - 53, h / 2 + 6);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('ALT (M)', w - 53, 40);

      // Top Enunciator
      ctx.fillStyle = '#000000';
      ctx.fillRect(110, 8, w - 220, 28);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('H2-DEP | AP LEVEL | GPS', w / 2, 26);

      ctx.restore();
      this.pfdTexture.needsUpdate = true;
    }

    // --------------------------------------------------------------------------
    // RENDER MFD CANVAS (MULTI-FUNCTION DISPLAY & H2 DIAGRAM)
    // --------------------------------------------------------------------------
    renderMFD(flight6DOF, atmosphere) {
      if (!this.mfdCtx) return;
      const ctx = this.mfdCtx;
      const w = 512;
      const h = 384;

      ctx.save();
      ctx.fillStyle = '#060b16';
      ctx.fillRect(0, 0, w, h);

      // Header
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('AEROTERRA H2 — EICAS & H2 FUEL CELL 120kW', 16, 26);

      // Separator line
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 36);
      ctx.lineTo(w - 16, 36);
      ctx.stroke();

      // Hydrogen Cryo Tank Gauge
      const h2Pct = flight6DOF ? Math.round((flight6DOF.h2Remaining / 28.0) * 100) : 95;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px monospace';
      ctx.fillText(`H2 TANK IV (350 BAR): ${h2Pct}%`, 24, 75);

      ctx.fillStyle = 'rgba(14, 26, 60, 0.9)';
      ctx.fillRect(24, 85, 200, 18);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(24, 85, (200 * h2Pct) / 100, 18);

      // Fuel Cell Temp & Power
      const cellTemp = atmosphere ? atmosphere.metrics.cellTempC.toFixed(1) : '64.2';
      const cellPower = atmosphere ? atmosphere.metrics.powerOutputKw.toFixed(1) : '92.0';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`PEMFC TEMP: ${cellTemp} °C`, 24, 135);
      ctx.fillText(`POWER BUS:  ${cellPower} kW / 400V`, 24, 160);

      // Backup Battery Status
      const batSoc = atmosphere ? atmosphere.metrics.batterySocPct.toFixed(0) : '98';
      ctx.fillText(`LI-PO BUFFER: ${batSoc}% SOC (18.4 kWh)`, 24, 195);
      ctx.fillStyle = 'rgba(14, 26, 60, 0.9)';
      ctx.fillRect(24, 205, 200, 18);
      ctx.fillStyle = (batSoc < 30) ? '#ff4d00' : '#10b981';
      ctx.fillRect(24, 205, (200 * batSoc) / 100, 18);

      // 4x Motor DEP Status Diagram
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('DEP MOTORS RPM (4x 30kW):', 260, 75);

      const thr = flight6DOF ? flight6DOF.throttle : 0.75;
      const rpm = Math.round(600 + thr * 2400);

      ['M1 (L-OUT)', 'M2 (L-IN)', 'M3 (R-IN)', 'M4 (R-OUT)'].forEach((lbl, i) => {
        const isCut = (i === 0 && atmosphere && atmosphere.failures.engine1Out);
        ctx.fillStyle = isCut ? '#ff4d00' : '#10b981';
        ctx.fillText(`${lbl}: ${isCut ? 'OFF (0 RPM)' : `${rpm} RPM`}`, 260, 110 + i * 28);
      });

      // Sole Creator Branding on MFD
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('👑 Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО', 24, 345);
      ctx.fillStyle = '#8b9bb4';
      ctx.font = '11px monospace';
      ctx.fillText('CATIA V5 CAD • 6-DOF EULER DYNAMICS • VERCEL AI', 24, 365);

      ctx.restore();
      this.mfdTexture.needsUpdate = true;
    }

    // --------------------------------------------------------------------------
    // UPDATE COCKPIT ANIMATIONS IN REAL-TIME
    // --------------------------------------------------------------------------
    update(dt, flight6DOF, atmosphere, inputs = {}) {
      if (!this.cockpitGroup) return;

      // Move 3D Yoke with Roll & Pitch
      if (this.yokeMesh) {
        const rollInput = inputs.roll || 0;
        this.yokeMesh.rotation.z = -rollInput * 0.75;
      }
      if (this.yokeColumn) {
        const pitchInput = inputs.pitch || 0;
        this.yokeColumn.position.z = 0.72 - (pitchInput * 0.12);
      }

      // Move 3D Throttle Lever
      if (this.throttleLeverMesh && flight6DOF) {
        const targetRotX = (flight6DOF.throttle - 0.5) * 0.65;
        this.throttleLeverMesh.rotation.x = targetRotX;
      }

      // Windscreen Wipers Animation
      if (this.wipersActive) {
        this.wiperAngle += 5.0 * dt;
        const sweep = Math.sin(this.wiperAngle) * 0.65;
        if (this.wiperLeft) this.wiperLeft.rotation.z = sweep - 0.3;
        if (this.wiperRight) this.wiperRight.rotation.z = sweep - 0.3;
      }

      // Render 2D Glass Cockpit Avionics
      this.renderPFD(flight6DOF);
      this.renderMFD(flight6DOF, atmosphere);
    }
  }

  // Export Global Instance
  window.GarminG3000Cockpit = new GarminG3000Cockpit();
  console.log('[GarminG3000Cockpit] Garmin G3000 Glass Cockpit Avionics loaded successfully.');
})();
