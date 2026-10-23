/**
 * AEROTERRA H2 — PROCEDURAL 3D AIRCRAFT FLEET GENERATOR
 * Architecture: Photorealistic PBR Fleet (AeroTerra H2, Airbus A380-800, Boeing 777-300ER)
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class FleetModels3D {
    constructor() {
      this.currentModel = 'aeroterra';
    }

    // --------------------------------------------------------------------------
    // 1. AEROTERRA H2 — HYDROGEN-ELECTRIC STOL TWIN-BOOM (BY MUSAYEV SARDOR)
    // --------------------------------------------------------------------------
    createAeroTerraH2(THREE) {
      const root = new THREE.Group();
      root.name = 'AeroTerra_H2_Root';

      // PBR Materials
      const carbonWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.22,
        metalness: 0.12,
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
        reflectivity: 0.95
      });

      const carbonDarkMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.35,
        metalness: 0.25,
        clearcoat: 0.5
      });

      const canopyGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.45,
        roughness: 0.05,
        metalness: 0.9,
        transmission: 0.85,
        ior: 1.52
      });

      const h2TankMat = new THREE.MeshPhysicalMaterial({
        color: 0x00f0ff,
        emissive: 0x0088cc,
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85
      });

      const chromeMetalMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.92,
        roughness: 0.18
      });

      const rubberMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.9,
        metalness: 0.05
      });

      // 1. Central Fuselage Pod (Smooth streamlined aerodynamic cabin)
      const fuseGeo = new THREE.CylinderGeometry(0.55, 0.62, 5.2, 32);
      fuseGeo.rotateX(Math.PI / 2);
      fuseGeo.scale(1.0, 1.15, 1.0);
      const fuselage = new THREE.Mesh(fuseGeo, carbonWhiteMat);
      fuselage.castShadow = true;
      fuselage.receiveShadow = true;
      root.add(fuselage);

      // Nose Cone with EO/IR Camera Turret
      const noseGeo = new THREE.ConeGeometry(0.48, 1.4, 32);
      noseGeo.rotateX(Math.PI / 2);
      const nose = new THREE.Mesh(noseGeo, carbonWhiteMat);
      nose.position.set(0, -0.04, 3.3);
      root.add(nose);

      const turretGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const turret = new THREE.Mesh(turretGeo, carbonDarkMat);
      turret.position.set(0, -0.42, 3.4);
      root.add(turret);

      // Tail Fairing
      const tailConeGeo = new THREE.ConeGeometry(0.58, 1.8, 32);
      tailConeGeo.rotateX(-Math.PI / 2);
      const tailCone = new THREE.Mesh(tailConeGeo, carbonWhiteMat);
      tailCone.position.set(0, 0.02, -3.5);
      root.add(tailCone);

      // Cockpit Canopy
      const canopyGeo = new THREE.SphereGeometry(0.52, 24, 18);
      canopyGeo.scale(0.85, 0.72, 1.9);
      const canopy = new THREE.Mesh(canopyGeo, canopyGlassMat);
      canopy.position.set(0, 0.44, 1.3);
      root.add(canopy);

      // Transparent Bay with Illuminated Cryogenic LH2 Tanks
      const bayGeo = new THREE.BoxGeometry(0.85, 0.65, 1.9);
      const bayMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        transmission: 0.75
      });
      const bay = new THREE.Mesh(bayGeo, bayMat);
      bay.position.set(0, 0.32, -0.65);
      root.add(bay);

      [-0.22, 0.22].forEach(xOff => {
        const tankGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.6, 20);
        tankGeo.rotateX(Math.PI / 2);
        const tank = new THREE.Mesh(tankGeo, h2TankMat);
        tank.position.set(xOff, 0.32, -0.65);
        root.add(tank);
      });

      // 2. High-Wing Center Section (NACA 64-215 Profile)
      const wingCenterGeo = new THREE.BoxGeometry(3.6, 0.16, 1.55);
      const wingCenter = new THREE.Mesh(wingCenterGeo, carbonWhiteMat);
      wingCenter.position.set(0, 0.58, 0.1);
      wingCenter.castShadow = true;
      root.add(wingCenter);

      // Dynamic Wing Flex Pivots (Euler-Bernoulli Outer Wings)
      const wingLeftPivot = new THREE.Group();
      wingLeftPivot.position.set(-1.8, 0.58, 0.1);
      root.add(wingLeftPivot);

      const wingRightPivot = new THREE.Group();
      wingRightPivot.position.set(1.8, 0.58, 0.1);
      root.add(wingRightPivot);

      // Left Outer Wing + Winglet
      const outerWingGeo = new THREE.BoxGeometry(4.4, 0.14, 1.35);
      outerWingGeo.translate(-2.2, 0, 0);
      const leftOuterWing = new THREE.Mesh(outerWingGeo, carbonWhiteMat);
      leftOuterWing.castShadow = true;
      wingLeftPivot.add(leftOuterWing);

      const wingletGeo = new THREE.BoxGeometry(0.08, 0.85, 0.7);
      const leftWinglet = new THREE.Mesh(wingletGeo, carbonDarkMat);
      leftWinglet.position.set(-4.4, 0.4, 0.15);
      wingLeftPivot.add(leftWinglet);

      // Right Outer Wing + Winglet
      const outerWingGeoR = new THREE.BoxGeometry(4.4, 0.14, 1.35);
      outerWingGeoR.translate(2.2, 0, 0);
      const rightOuterWing = new THREE.Mesh(outerWingGeoR, carbonWhiteMat);
      rightOuterWing.castShadow = true;
      wingRightPivot.add(rightOuterWing);

      const rightWinglet = new THREE.Mesh(wingletGeo, carbonDarkMat);
      rightWinglet.position.set(4.4, 0.4, 0.15);
      wingRightPivot.add(rightWinglet);

      // 3. 4x Distributed Electric Propulsion (DEP) Nacelles & Props
      const propMeshes = [];
      const propBlurMeshes = [];
      const depXPositions = [-4.6, -2.2, 2.2, 4.6];

      depXPositions.forEach((xPos, idx) => {
        const parent = (xPos < -1.8) ? wingLeftPivot : ((xPos > 1.8) ? wingRightPivot : root);
        const localX = (parent === wingLeftPivot) ? (xPos + 1.8) : ((parent === wingRightPivot) ? (xPos - 1.8) : xPos);
        const localY = (parent === root) ? 0.58 : 0.0;

        const nacGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.9, 18);
        nacGeo.rotateX(Math.PI / 2);
        const nacelle = new THREE.Mesh(nacGeo, carbonDarkMat);
        nacelle.position.set(localX, localY - 0.08, 0.7);
        parent.add(nacelle);

        const spinnerGeo = new THREE.ConeGeometry(0.14, 0.35, 18);
        spinnerGeo.rotateX(Math.PI / 2);
        const spinner = new THREE.Mesh(spinnerGeo, chromeMetalMat);
        spinner.position.set(localX, localY - 0.08, 1.25);
        parent.add(spinner);

        // 3-Blade Propeller
        const propGroup = new THREE.Group();
        propGroup.position.set(localX, localY - 0.08, 1.28);

        for (let b = 0; b < 3; b++) {
          const bladeGeo = new THREE.BoxGeometry(0.06, 0.75, 0.02);
          const blade = new THREE.Mesh(bladeGeo, carbonDarkMat);
          blade.rotation.z = (b * Math.PI * 2) / 3;
          blade.position.set(Math.sin(blade.rotation.z) * 0.35, Math.cos(blade.rotation.z) * 0.35, 0);
          propGroup.add(blade);
        }
        parent.add(propGroup);
        propMeshes.push(propGroup);

        // Motion Blur Disc
        const blurGeo = new THREE.CircleGeometry(0.75, 24);
        const blurMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide
        });
        const blurMesh = new THREE.Mesh(blurGeo, blurMat);
        blurMesh.position.set(localX, localY - 0.08, 1.28);
        parent.add(blurMesh);
        propBlurMeshes.push(blurMesh);
      });

      // 4. Twin Tail Booms & H-Tail Structure
      const boomPivots = [];
      [-1.3, 1.3].forEach(bX => {
        const boomGeo = new THREE.CylinderGeometry(0.12, 0.16, 4.6, 16);
        boomGeo.rotateX(Math.PI / 2);
        const boom = new THREE.Mesh(boomGeo, carbonWhiteMat);
        boom.position.set(bX, 0.52, -2.1);
        boom.castShadow = true;
        root.add(boom);

        // Vertical Fin
        const finGeo = new THREE.BoxGeometry(0.08, 1.4, 0.95);
        const fin = new THREE.Mesh(finGeo, carbonWhiteMat);
        fin.position.set(bX, 1.05, -4.2);
        root.add(fin);
      });

      // Horizontal Stabilizer connecting the twin fins
      const hStabGeo = new THREE.BoxGeometry(2.8, 0.09, 0.85);
      const hStab = new THREE.Mesh(hStabGeo, carbonWhiteMat);
      hStab.position.set(0, 1.55, -4.25);
      root.add(hStab);

      // 5. Retractable Tricycle Landing Gear
      const gearPivots = [];
      // Nose Gear Pivot
      const noseGearPivot = new THREE.Group();
      noseGearPivot.position.set(0, -0.45, 2.4);
      const nStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12), chromeMetalMat);
      nStrut.position.set(0, -0.35, 0);
      noseGearPivot.add(nStrut);
      const nWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), rubberMat);
      nWheel.rotateZ(Math.PI / 2);
      nWheel.position.set(0, -0.7, 0);
      noseGearPivot.add(nWheel);
      root.add(noseGearPivot);
      gearPivots.push({ pivot: noseGearPivot, rotX: Math.PI / 2 });

      // Main Left & Right Gears
      [-0.95, 0.95].forEach(mX => {
        const mainPivot = new THREE.Group();
        mainPivot.position.set(mX, -0.35, -0.2);
        const mStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 12), chromeMetalMat);
        mStrut.position.set(0, -0.42, 0);
        mainPivot.add(mStrut);
        const mWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18), rubberMat);
        mWheel.rotateZ(Math.PI / 2);
        mWheel.position.set(0, -0.85, 0);
        mainPivot.add(mWheel);
        root.add(mainPivot);
        gearPivots.push({ pivot: mainPivot, rotX: -Math.PI / 2 });
      });

      return {
        group: root,
        propMeshes: propMeshes,
        propBlurMeshes: propBlurMeshes,
        gearPivots: gearPivots,
        wingLeftPivot: wingLeftPivot,
        wingRightPivot: wingRightPivot
      };
    }

    // --------------------------------------------------------------------------
    // 2. AIRBUS A380-800 SUPERJUMBO (BY MUSAYEV SARDOR AIRLINES)
    // --------------------------------------------------------------------------
    createAirbusA380(THREE) {
      const root = new THREE.Group();
      root.name = 'Airbus_A380_Root';

      const a380WhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.08,
        clearcoat: 0.9
      });

      const airlineBlueMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7, // Sardor Airlines Sky Blue
        roughness: 0.3,
        metalness: 0.15
      });

      const goldTitleMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.2
      });

      const glassCockpitMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1
      });

      const chromeFanMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        metalness: 0.95,
        roughness: 0.15
      });

      // Scale factor: A380 is massive (~73m length, ~80m span)
      // Visual scale adapted for simulator coordinate space
      const s = 0.55;

      // 1. Double-Deck Ovoid Fuselage
      const fuseGeo = new THREE.CylinderGeometry(2.8 * s, 2.9 * s, 36.0 * s, 32);
      fuseGeo.rotateX(Math.PI / 2);
      fuseGeo.scale(0.88, 1.25, 1.0); // Ovoid double decker cross section
      const fuselage = new THREE.Mesh(fuseGeo, a380WhiteMat);
      fuselage.castShadow = true;
      root.add(fuselage);

      // Nose & Cockpit Glass
      const noseGeo = new THREE.ConeGeometry(2.6 * s, 6.5 * s, 32);
      noseGeo.rotateX(Math.PI / 2);
      noseGeo.scale(0.88, 1.25, 1.0);
      const nose = new THREE.Mesh(noseGeo, a380WhiteMat);
      nose.position.set(0, 0, 20.5 * s);
      root.add(nose);

      // Cockpit windows band
      const cockpitGeo = new THREE.BoxGeometry(2.2 * s, 0.7 * s, 1.5 * s);
      const cockpit = new THREE.Mesh(cockpitGeo, glassCockpitMat);
      cockpit.position.set(0, 1.6 * s, 19.8 * s);
      root.add(cockpit);

      // Double-deck cabin window strips
      [-1.4 * s, 1.4 * s].forEach(sideX => {
        // Main deck windows
        const winLowerGeo = new THREE.BoxGeometry(0.1, 0.4 * s, 26.0 * s);
        const winLower = new THREE.Mesh(winLowerGeo, glassCockpitMat);
        winLower.position.set(sideX, 0.2 * s, 0);
        root.add(winLower);

        // Upper deck windows
        const winUpperGeo = new THREE.BoxGeometry(0.1, 0.35 * s, 22.0 * s);
        const winUpper = new THREE.Mesh(winUpperGeo, glassCockpitMat);
        winUpper.position.set(sideX, 1.8 * s, 0.5 * s);
        root.add(winUpper);
      });

      // Tail Boattail Cone
      const tailGeo = new THREE.ConeGeometry(2.7 * s, 12.0 * s, 32);
      tailGeo.rotateX(-Math.PI / 2);
      tailGeo.scale(0.88, 1.2, 1.0);
      const tail = new THREE.Mesh(tailGeo, a380WhiteMat);
      tail.position.set(0, 0.4 * s, -23.5 * s);
      root.add(tail);

      // 2. Swept Superjumbo Wings & Wingtip Fences
      const wingLeftPivot = new THREE.Group();
      const wingRightPivot = new THREE.Group();
      root.add(wingLeftPivot);
      root.add(wingRightPivot);

      [-1, 1].forEach(side => {
        const pivot = (side === -1) ? wingLeftPivot : wingRightPivot;
        const wingGeo = new THREE.BoxGeometry(18.0 * s, 0.6 * s, 6.5 * s);
        wingGeo.translate(side * 10.0 * s, 0, -2.5 * s);
        const wing = new THREE.Mesh(wingGeo, a380WhiteMat);
        wing.rotation.y = side * 0.18; // Sweep back ~33°
        wing.rotation.z = -side * 0.08; // Slight dihedral
        pivot.add(wing);

        // Wingtip Fence
        const fenceGeo = new THREE.BoxGeometry(0.15, 2.4 * s, 1.6 * s);
        const fence = new THREE.Mesh(fenceGeo, airlineBlueMat);
        fence.position.set(side * 19.5 * s, 1.4 * s, -5.5 * s);
        pivot.add(fence);
      });

      // 3. 4x Rolls-Royce Trent 900 Turbofan Engines with Spinning Fans
      const engineFans = [];
      const contrailEmitters = [];
      const enginePositions = [
        { x: -6.5 * s, y: -1.2 * s, z: 2.0 * s },
        { x: -12.5 * s, y: -0.6 * s, z: -0.8 * s },
        { x: 6.5 * s, y: -1.2 * s, z: 2.0 * s },
        { x: 12.5 * s, y: -0.6 * s, z: -0.8 * s }
      ];

      enginePositions.forEach(pos => {
        const engNacGeo = new THREE.CylinderGeometry(1.4 * s, 1.3 * s, 5.2 * s, 24);
        engNacGeo.rotateX(Math.PI / 2);
        const nacelle = new THREE.Mesh(engNacGeo, airlineBlueMat);
        nacelle.position.set(pos.x, pos.y, pos.z);
        root.add(nacelle);

        // Chrome Spinner & Fan Blades
        const fanGroup = new THREE.Group();
        fanGroup.position.set(pos.x, pos.y, pos.z + 2.5 * s);

        const spinnerGeo = new THREE.ConeGeometry(0.4 * s, 1.2 * s, 20);
        spinnerGeo.rotateX(Math.PI / 2);
        const spinner = new THREE.Mesh(spinnerGeo, chromeFanMat);
        fanGroup.add(spinner);

        for (let i = 0; i < 8; i++) {
          const bladeGeo = new THREE.BoxGeometry(0.15 * s, 1.1 * s, 0.05 * s);
          const blade = new THREE.Mesh(bladeGeo, chromeFanMat);
          blade.rotation.z = (i * Math.PI) / 4;
          fanGroup.add(blade);
        }
        root.add(fanGroup);
        engineFans.push(fanGroup);

        // Contrail anchor position behind exhaust
        contrailEmitters.push({ x: pos.x, y: pos.y, z: pos.z - 3.2 * s });
      });

      // 4. Giant Vertical Tail Fin with MUSAYEV SARDOR Logo
      const vFinGeo = new THREE.BoxGeometry(0.35, 9.5 * s, 7.0 * s);
      const vFin = new THREE.Mesh(vFinGeo, airlineBlueMat);
      vFin.position.set(0, 6.2 * s, -23.0 * s);
      vFin.rotation.x = -0.32; // Swept back vertical fin
      root.add(vFin);

      // Gold Crown Emblem on Vertical Fin
      const crownGeo = new THREE.BoxGeometry(0.4, 1.6 * s, 2.2 * s);
      const crown = new THREE.Mesh(crownGeo, goldTitleMat);
      crown.position.set(0, 7.8 * s, -24.5 * s);
      root.add(crown);

      // Horizontal Stabilizers
      [-1, 1].forEach(side => {
        const hStabGeo = new THREE.BoxGeometry(7.5 * s, 0.3 * s, 3.8 * s);
        hStabGeo.translate(side * 4.0 * s, 0, 0);
        const hStab = new THREE.Mesh(hStabGeo, a380WhiteMat);
        hStab.position.set(0, 2.2 * s, -26.0 * s);
        hStab.rotation.y = side * 0.22;
        root.add(hStab);
      });

      // 5. Retractable 22-Wheel Landing Gear
      const gearPivots = [];
      const nosePivot = new THREE.Group();
      nosePivot.position.set(0, -2.6 * s, 17.0 * s);
      const nStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 2.5 * s, 14), chromeFanMat);
      nStrut.position.set(0, -1.2 * s, 0);
      nosePivot.add(nStrut);
      root.add(nosePivot);
      gearPivots.push({ pivot: nosePivot, rotX: Math.PI / 2 });

      [-3.2 * s, 3.2 * s].forEach(mX => {
        const mainPivot = new THREE.Group();
        mainPivot.position.set(mX, -2.6 * s, -1.5 * s);
        const mStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 2.8 * s, 14), chromeFanMat);
        mStrut.position.set(0, -1.4 * s, 0);
        mainPivot.add(mStrut);
        root.add(mainPivot);
        gearPivots.push({ pivot: mainPivot, rotX: -Math.PI / 2 });
      });

      return {
        group: root,
        propMeshes: engineFans,
        propBlurMeshes: [],
        gearPivots: gearPivots,
        wingLeftPivot: wingLeftPivot,
        wingRightPivot: wingRightPivot,
        contrailEmitters: contrailEmitters
      };
    }

    // --------------------------------------------------------------------------
    // 3. BOEING 777-300ER (SARDOR AEROSPACE 777-300ER)
    // --------------------------------------------------------------------------
    createBoeing777(THREE) {
      const root = new THREE.Group();
      root.name = 'Boeing_777_Root';

      const b777WhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0.1,
        clearcoat: 0.95
      });

      const goldNavyMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f2042, // Sardor Aerospace Deep Navy
        roughness: 0.28,
        metalness: 0.2
      });

      const titaniumMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.2
      });

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1
      });

      const s = 0.58;

      // 1. Long Cylindrical Fuselage
      const fuseGeo = new THREE.CylinderGeometry(2.3 * s, 2.3 * s, 39.0 * s, 32);
      fuseGeo.rotateX(Math.PI / 2);
      const fuselage = new THREE.Mesh(fuseGeo, b777WhiteMat);
      fuselage.castShadow = true;
      root.add(fuselage);

      // Radome & Nose Cone
      const noseGeo = new THREE.ConeGeometry(2.28 * s, 5.8 * s, 32);
      noseGeo.rotateX(Math.PI / 2);
      const nose = new THREE.Mesh(noseGeo, b777WhiteMat);
      nose.position.set(0, -0.15 * s, 22.2 * s);
      root.add(nose);

      // Cockpit Window Band
      const cockpitGeo = new THREE.BoxGeometry(2.1 * s, 0.65 * s, 1.4 * s);
      const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
      cockpit.position.set(0, 0.95 * s, 21.0 * s);
      root.add(cockpit);

      // Tail Boattail Cone (Blade style APU exhaust)
      const tailGeo = new THREE.ConeGeometry(2.28 * s, 11.5 * s, 32);
      tailGeo.rotateX(-Math.PI / 2);
      const tail = new THREE.Mesh(tailGeo, b777WhiteMat);
      tail.position.set(0, 0.2 * s, -25.0 * s);
      root.add(tail);

      // 2. High-Aspect Swept Wings with Raked Wingtips
      const wingLeftPivot = new THREE.Group();
      const wingRightPivot = new THREE.Group();
      root.add(wingLeftPivot);
      root.add(wingRightPivot);

      [-1, 1].forEach(side => {
        const pivot = (side === -1) ? wingLeftPivot : wingRightPivot;
        const wingGeo = new THREE.BoxGeometry(16.5 * s, 0.5 * s, 5.2 * s);
        wingGeo.translate(side * 9.0 * s, 0, -2.2 * s);
        const wing = new THREE.Mesh(wingGeo, b777WhiteMat);
        wing.rotation.y = side * 0.20;
        wing.rotation.z = -side * 0.07;
        pivot.add(wing);

        // Raked Wingtip (Aerodynamic swept back tip extension)
        const rakedGeo = new THREE.BoxGeometry(3.5 * s, 0.25 * s, 1.8 * s);
        rakedGeo.translate(side * 1.8 * s, 0, -1.0 * s);
        const rakedTip = new THREE.Mesh(rakedGeo, goldNavyMat);
        rakedTip.position.set(side * 17.5 * s, 0.8 * s, -4.5 * s);
        rakedTip.rotation.y = side * 0.35;
        pivot.add(rakedTip);
      });

      // 3. 2x Giant GE90-115B Engines with Spinner Spirals
      const engineFans = [];
      const contrailEmitters = [];
      [-7.5 * s, 7.5 * s].forEach(engX => {
        const engGeo = new THREE.CylinderGeometry(1.8 * s, 1.7 * s, 6.2 * s, 26);
        engGeo.rotateX(Math.PI / 2);
        const engine = new THREE.Mesh(engGeo, goldNavyMat);
        engine.position.set(engX, -1.2 * s, 1.5 * s);
        root.add(engine);

        // Spinning Blades & Spiral Spinner
        const fanGroup = new THREE.Group();
        fanGroup.position.set(engX, -1.2 * s, 4.4 * s);

        const spinnerGeo = new THREE.ConeGeometry(0.55 * s, 1.4 * s, 22);
        spinnerGeo.rotateX(Math.PI / 2);
        const spinner = new THREE.Mesh(spinnerGeo, titaniumMat);
        fanGroup.add(spinner);

        for (let i = 0; i < 10; i++) {
          const bladeGeo = new THREE.BoxGeometry(0.18 * s, 1.4 * s, 0.05 * s);
          const blade = new THREE.Mesh(bladeGeo, titaniumMat);
          blade.rotation.z = (i * Math.PI) / 5;
          fanGroup.add(blade);
        }
        root.add(fanGroup);
        engineFans.push(fanGroup);

        contrailEmitters.push({ x: engX, y: -1.2 * s, z: -3.8 * s });
      });

      // 4. Swept Vertical Fin with SARDOR 777 Livery
      const finGeo = new THREE.BoxGeometry(0.32, 8.8 * s, 6.2 * s);
      const fin = new THREE.Mesh(finGeo, goldNavyMat);
      fin.position.set(0, 5.5 * s, -24.5 * s);
      fin.rotation.x = -0.36;
      root.add(fin);

      // Horizontal Stabilizers
      [-1, 1].forEach(side => {
        const hStabGeo = new THREE.BoxGeometry(6.8 * s, 0.28 * s, 3.2 * s);
        hStabGeo.translate(side * 3.6 * s, 0, 0);
        const hStab = new THREE.Mesh(hStabGeo, b777WhiteMat);
        hStab.position.set(0, 1.8 * s, -27.0 * s);
        hStab.rotation.y = side * 0.24;
        root.add(hStab);
      });

      // 5. Retractable 6-Wheel Bogie Landing Gear
      const gearPivots = [];
      const nosePivot = new THREE.Group();
      nosePivot.position.set(0, -2.2 * s, 18.0 * s);
      const nStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 2.2 * s, 14), titaniumMat);
      nStrut.position.set(0, -1.1 * s, 0);
      nosePivot.add(nStrut);
      root.add(nosePivot);
      gearPivots.push({ pivot: nosePivot, rotX: Math.PI / 2 });

      [-3.4 * s, 3.4 * s].forEach(mX => {
        const mainPivot = new THREE.Group();
        mainPivot.position.set(mX, -2.2 * s, -0.8 * s);
        const mStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 2.4 * s, 14), titaniumMat);
        mStrut.position.set(0, -1.2 * s, 0);
        mainPivot.add(mStrut);
        root.add(mainPivot);
        gearPivots.push({ pivot: mainPivot, rotX: -Math.PI / 2 });
      });

      return {
        group: root,
        propMeshes: engineFans,
        propBlurMeshes: [],
        gearPivots: gearPivots,
        wingLeftPivot: wingLeftPivot,
        wingRightPivot: wingRightPivot,
        contrailEmitters: contrailEmitters
      };
    }
  }

  // Export Global Instance
  window.FleetModels3D = new FleetModels3D();
  console.log('[FleetModels3D] 3D Aircraft Fleet Engine loaded successfully.');
})();
