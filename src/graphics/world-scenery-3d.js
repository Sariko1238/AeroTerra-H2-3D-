/**
 * AEROTERRA H2 — 3D PROCEDURAL WORLD SCENERY & MISSION ZONES
 * Architecture: Runway 09/27, Terminal, Musayev Sardor Hangar, Wildfire & Lake
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class WorldScenery3D {
    constructor() {
      this.sceneryGroup = null;
      this.fireParticles = [];
      this.cloudMeshes = [];
      this.radarAntenna = null;
    }

    init(scene, THREE) {
      if (!scene || !THREE) return;
      this.THREE = THREE;
      this.scene = scene;

      this.sceneryGroup = new THREE.Group();
      this.sceneryGroup.name = 'Procedural_World_Scenery_Group';
      scene.add(this.sceneryGroup);

      // Materials
      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.85,
        metalness: 0.1
      });

      const runwayLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const runwayYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.3
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        transmission: 0.8
      });

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.9
      });

      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.95
      });

      const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x0369a1,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.7
      });

      // 1. Runway 09/27 Concrete Strip (2400m x 48m)
      const runwayGeo = new THREE.PlaneGeometry(48, 2400);
      runwayGeo.rotateX(-Math.PI / 2);
      const runway = new THREE.Mesh(runwayGeo, concreteMat);
      runway.position.set(0, 0.05, 1200);
      runway.receiveShadow = true;
      this.sceneryGroup.add(runway);

      // Centerline Dashes
      for (let z = 100; z < 2300; z += 50) {
        const dashGeo = new THREE.PlaneGeometry(1.6, 28);
        dashGeo.rotateX(-Math.PI / 2);
        const dash = new THREE.Mesh(dashGeo, runwayLineMat);
        dash.position.set(0, 0.08, z);
        this.sceneryGroup.add(dash);
      }

      // Threshold Piano Keys (Runway 09 & 27)
      [-18, -14, -10, -6, -2, 2, 6, 10, 14, 18].forEach(x => {
        // Threshold 09
        const keyGeo = new THREE.PlaneGeometry(1.8, 30);
        keyGeo.rotateX(-Math.PI / 2);
        const key09 = new THREE.Mesh(keyGeo, runwayLineMat);
        key09.position.set(x, 0.08, 40);
        this.sceneryGroup.add(key09);

        // Threshold 27
        const key27 = new THREE.Mesh(keyGeo, runwayLineMat);
        key27.position.set(x, 0.08, 2360);
        this.sceneryGroup.add(key27);
      });

      // Runway Edge Lights (Green at threshold, white along edge, red at end)
      for (let z = 20; z <= 2380; z += 60) {
        [-24.5, 24.5].forEach(x => {
          const color = (z < 60) ? 0x10b981 : ((z > 2340) ? 0xef4444 : 0xffffff);
          const lightGeo = new THREE.SphereGeometry(0.35, 8, 8);
          const light = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: color }));
          light.position.set(x, 0.3, z);
          this.sceneryGroup.add(light);
        });
      }

      // 2. Grand Airport Terminal & Musayev Sardor Aerospace Hangar
      const hangarGeo = new THREE.BoxGeometry(110, 32, 85);
      const hangar = new THREE.Mesh(hangarGeo, buildingMat);
      hangar.position.set(-140, 16, 750);
      hangar.castShadow = true;
      this.sceneryGroup.add(hangar);

      // Curved Hangar Roof
      const roofGeo = new THREE.CylinderGeometry(44, 44, 110, 24, 1, false, 0, Math.PI);
      roofGeo.rotateZ(Math.PI / 2);
      const roof = new THREE.Mesh(roofGeo, buildingMat);
      roof.position.set(-140, 32, 750);
      this.sceneryGroup.add(roof);

      // Illuminated Signboard: MUSAYEV SARDOR — AEROTERRA H2 HANGAR
      const signBoardGeo = new THREE.BoxGeometry(85, 8, 1.2);
      const signBoard = new THREE.Mesh(
        signBoardGeo,
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.4 })
      );
      signBoard.position.set(-140, 24, 793);
      this.sceneryGroup.add(signBoard);

      // Gold Neon Letters Bar
      const goldBarGeo = new THREE.BoxGeometry(75, 2.5, 1.5);
      const goldBar = new THREE.Mesh(
        goldBarGeo,
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      goldBar.position.set(-140, 24, 794);
      this.sceneryGroup.add(goldBar);

      // Control Tower (ATC Tower with glass cab)
      const towerBaseGeo = new THREE.CylinderGeometry(4.5, 6.0, 48, 16);
      const towerBase = new THREE.Mesh(towerBaseGeo, buildingMat);
      towerBase.position.set(-120, 24, 980);
      this.sceneryGroup.add(towerBase);

      const towerCabGeo = new THREE.CylinderGeometry(8.5, 7.0, 8, 16);
      const towerCab = new THREE.Mesh(towerCabGeo, glassMat);
      towerCab.position.set(-120, 52, 980);
      this.sceneryGroup.add(towerCab);

      // Rotating Radar Antenna on top of Tower
      const antennaPivot = new THREE.Group();
      antennaPivot.position.set(-120, 57, 980);
      const antennaBar = new THREE.Mesh(
        new THREE.BoxGeometry(7, 1.2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xff8800 })
      );
      antennaPivot.add(antennaBar);
      this.sceneryGroup.add(antennaPivot);
      this.radarAntenna = antennaPivot;

      // 3. Agricultural Orchards & Fruit Tree Rows (Agro-Spray Zone)
      const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
      const treeCanopyGeo = new THREE.SphereGeometry(2.4, 10, 10);

      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 12; c++) {
          const treeGroup = new THREE.Group();
          const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
          trunk.position.set(0, 1.25, 0);
          treeGroup.add(trunk);

          const canopy = new THREE.Mesh(treeCanopyGeo, foliageMat);
          canopy.position.set(0, 3.2, 0);
          treeGroup.add(canopy);

          treeGroup.position.set(160 + r * 22, 0, 500 + c * 25);
          this.sceneryGroup.add(treeGroup);
        }
      }

      // 4. Wildfire Mission Zone with Smoke and Flames
      const fireCenter = { x: -650, y: 0, z: 1800 };

      // Charred Ground Decal
      const scorchGeo = new THREE.CircleGeometry(65, 24);
      scorchGeo.rotateX(-Math.PI / 2);
      const scorch = new THREE.Mesh(
        scorchGeo,
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 })
      );
      scorch.position.set(fireCenter.x, 0.1, fireCenter.z);
      this.sceneryGroup.add(scorch);

      // Flame & Smoke Particles (Points)
      const fireCount = 180;
      const fireGeo = new THREE.BufferGeometry();
      const firePos = new Float32Array(fireCount * 3);
      const fireColors = new Float32Array(fireCount * 3);

      for (let i = 0; i < fireCount; i++) {
        const rad = Math.random() * 45;
        const ang = Math.random() * Math.PI * 2;
        firePos[i * 3]     = fireCenter.x + Math.cos(ang) * rad;
        firePos[i * 3 + 1] = Math.random() * 25;
        firePos[i * 3 + 2] = fireCenter.z + Math.sin(ang) * rad;

        // Orange / Red / Yellow flame gradient
        fireColors[i * 3]     = 1.0;
        fireColors[i * 3 + 1] = Math.random() * 0.6 + 0.2;
        fireColors[i * 3 + 2] = 0.0;
      }

      fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
      fireGeo.setAttribute('color', new THREE.BufferAttribute(fireColors, 3));

      const fireMat = new THREE.PointsMaterial({
        size: 5.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.85
      });

      const firePoints = new THREE.Points(fireGeo, fireMat);
      this.sceneryGroup.add(firePoints);
      this.firePoints = firePoints;

      // 5. Charvak Mountain Lake (Water Reservoir)
      const lakeGeo = new THREE.CircleGeometry(420, 32);
      lakeGeo.rotateX(-Math.PI / 2);
      const lake = new THREE.Mesh(lakeGeo, waterMat);
      lake.position.set(950, 0.05, 1400);
      this.sceneryGroup.add(lake);

      // 6. Volumetric 3D Procedural Cloud Puffs
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.72
      });

      const cloudCenters = [
        { x: -500, y: 1100, z: 200 },
        { x: 700, y: 1350, z: -800 },
        { x: -1200, y: 1500, z: 1600 },
        { x: 300, y: 950, z: 2200 }
      ];

      cloudCenters.forEach(c => {
        const cloudGroup = new THREE.Group();
        for (let p = 0; p < 7; p++) {
          const puffGeo = new THREE.SphereGeometry(45 + Math.random() * 35, 12, 10);
          const puff = new THREE.Mesh(puffGeo, cloudMat);
          puff.position.set(
            (Math.random() - 0.5) * 120,
            (Math.random() - 0.5) * 35,
            (Math.random() - 0.5) * 120
          );
          cloudGroup.add(puff);
        }
        cloudGroup.position.set(c.x, c.y, c.z);
        this.sceneryGroup.add(cloudGroup);
        this.cloudMeshes.push(cloudGroup);
      });

      console.log('[WorldScenery3D] 3D Airport, Musayev Sardor Hangar, Wildfire & Lake constructed.');
    }

    update(dt) {
      if (!this.sceneryGroup) return;

      // Rotate ATC Radar
      if (this.radarAntenna) {
        this.radarAntenna.rotation.y += 1.8 * dt;
      }

      // Animate Wildfire flames flickering
      if (this.firePoints) {
        const positions = this.firePoints.geometry.attributes.position.array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 1] += 14.0 * dt; // Rise up
          if (positions[i * 3 + 1] > 35.0) {
            positions[i * 3 + 1] = 0.5; // Reset to base
          }
        }
        this.firePoints.geometry.attributes.position.needsUpdate = true;
      }

      // Drift Clouds slowly through sky
      this.cloudMeshes.forEach(c => {
        c.position.x += 2.5 * dt;
        if (c.position.x > 2500) c.position.x = -2500;
      });
    }
  }

  // Export Global Instance
  window.WorldScenery3D = new WorldScenery3D();
  console.log('[WorldScenery3D] World Scenery & 3D Mission Environment loaded successfully.');
})();
