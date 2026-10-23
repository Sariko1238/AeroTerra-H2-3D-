/**
 * AEROTERRA H2 — LIVE 3D AI SKY TRAFFIC & TCAS SYSTEM
 * Architecture: Autonomous Flight Corridors, Nav Lights, Contrails & Radar Blips
 * Author: Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО (Founder & Chief Aerospace Architect)
 * Contact: sarikmusaev2006@gmail.com
 */

(function () {
  'use strict';

  class AISkyTraffic {
    constructor() {
      this.trafficGroup = null;
      this.aiPlanes = [];
      this.tcasTargets = [];
    }

    init(scene, THREE) {
      if (!scene || !THREE) return;
      this.THREE = THREE;
      this.scene = scene;

      this.trafficGroup = new THREE.Group();
      this.trafficGroup.name = 'AI_Sky_Traffic_Group';
      scene.add(this.trafficGroup);

      // Define 4 Autonomous Traffic Flights in Airspace
      const trafficDefs = [
        {
          id: 'SDR380',
          callsign: 'SardorAir 380',
          type: 'Airbus A380-800',
          modelKey: 'a380',
          color: 0x0284c7,
          scale: 0.28,
          center: { x: -800, y: 950, z: -1200 },
          radiusX: 2400,
          radiusZ: 3200,
          speed: 116.0, // ~418 km/h
          heading: 45.0,
          altitude: 950.0,
          angle: 0.2
        },
        {
          id: 'ATC777',
          callsign: 'AeroTerra Cargo 777',
          type: 'Boeing 777-300ER',
          modelKey: 'b777',
          color: 0x0f2042,
          scale: 0.30,
          center: { x: 1200, y: 680, z: 800 },
          radiusX: 2800,
          radiusZ: 2200,
          speed: 86.0,  // ~310 km/h
          heading: 220.0,
          altitude: 680.0,
          angle: 2.4
        },
        {
          id: 'VIP01',
          callsign: 'Musayev VIP 01',
          type: 'A380 Superjumbo VIP',
          modelKey: 'a380',
          color: 0xffd700,
          scale: 0.28,
          center: { x: 0, y: 1250, z: -2000 },
          radiusX: 3600,
          radiusZ: 3600,
          speed: 125.0, // ~450 km/h
          heading: 180.0,
          altitude: 1250.0,
          angle: 4.1
        },
        {
          id: 'H2PATROL',
          callsign: 'AeroTerra Patrol H2',
          type: 'AeroTerra H2 STOL',
          modelKey: 'aeroterra',
          color: 0x00f0ff,
          scale: 0.65,
          center: { x: -400, y: 480, z: 300 },
          radiusX: 1400,
          radiusZ: 1600,
          speed: 58.0,  // ~208 km/h
          heading: 310.0,
          altitude: 480.0,
          angle: 5.2
        }
      ];

      trafficDefs.forEach(def => {
        const planeObj = this._createAIPlaneMesh(def);
        this.trafficGroup.add(planeObj.mesh);
        this.aiPlanes.push(planeObj);
      });

      console.log('[AISkyTraffic] 4 AI Commercial Flights spawned in airspace.');
    }

    _createAIPlaneMesh(def) {
      const THREE = this.THREE;
      const group = new THREE.Group();

      // Simplified Low-Poly Aerodynamic Shell for High-Performance Rendering
      const bodyMat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.3,
        metalness: 0.2
      });

      const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.25
      });

      // Fuselage
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 18, 12), whiteMat);
      fuse.rotateX(Math.PI / 2);
      group.add(fuse);

      // Nose
      const nose = new THREE.Mesh(new THREE.ConeGeometry(1.35, 4.5, 12), whiteMat);
      nose.rotateX(Math.PI / 2);
      nose.position.set(0, 0, 11.2);
      group.add(nose);

      // Wings
      const wing = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 3.5), bodyMat);
      wing.position.set(0, 0.2, 0);
      group.add(wing);

      // Tail
      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 3.0), bodyMat);
      tailFin.position.set(0, 2.5, -9.0);
      tailFin.rotation.x = -0.3;
      group.add(tailFin);

      const hTail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 2.0), whiteMat);
      hTail.position.set(0, 1.2, -9.5);
      group.add(hTail);

      // Navigation Lights (Red Port, Green Starboard, White Strobe)
      const portLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0044 })
      );
      portLight.position.set(-11.0, 0.2, 0);
      group.add(portLight);

      const starLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff66 })
      );
      starLight.position.set(11.0, 0.2, 0);
      group.add(starLight);

      const strobeLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      strobeLight.position.set(0, 4.8, -10.0);
      group.add(strobeLight);

      // Jet Contrails (White smoke ribbon)
      const contrailGeo = new THREE.CylinderGeometry(0.4, 1.8, 45, 8);
      contrailGeo.rotateX(Math.PI / 2);
      const contrailMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35
      });
      const contrailLeft = new THREE.Mesh(contrailGeo, contrailMat);
      contrailLeft.position.set(-4.5, -0.6, -26.0);
      group.add(contrailLeft);

      const contrailRight = new THREE.Mesh(contrailGeo, contrailMat);
      contrailRight.position.set(4.5, -0.6, -26.0);
      group.add(contrailRight);

      group.scale.set(def.scale, def.scale, def.scale);

      return {
        def: def,
        mesh: group,
        strobe: strobeLight,
        contrails: [contrailLeft, contrailRight]
      };
    }

    update(dt, playerPos) {
      if (!this.trafficGroup || !this.aiPlanes.length) return;

      const time = performance.now() * 0.001;
      this.tcasTargets = [];

      this.aiPlanes.forEach((plane, idx) => {
        const def = plane.def;

        // Advance flight along smooth racetrack / ellipse path
        const angularVelocity = def.speed / Math.max(1000, def.radiusX);
        def.angle += angularVelocity * dt;

        // Position in world
        const posX = def.center.x + Math.sin(def.angle) * def.radiusX;
        const posZ = def.center.z + Math.cos(def.angle) * def.radiusZ;
        const posY = def.altitude + Math.sin(def.angle * 2.0) * 25.0; // gentle oscillation

        // Heading & Tangent Velocity
        const velX = Math.cos(def.angle) * def.radiusX * angularVelocity;
        const velZ = -Math.sin(def.angle) * def.radiusZ * angularVelocity;
        const headingRad = Math.atan2(velX, velZ);
        def.heading = ((headingRad * 180.0 / Math.PI) % 360.0 + 360.0) % 360.0;

        // Position mesh relative to player (Origin-centric world)
        const relX = posX - (playerPos ? playerPos.x : 0);
        const relY = posY;
        const relZ = posZ - (playerPos ? playerPos.z : 0);

        plane.mesh.position.set(relX, relY, relZ);
        plane.mesh.rotation.y = headingRad;

        // Bank into the turn
        const bankAngle = -Math.sin(def.angle) * 0.22;
        plane.mesh.rotation.z = bankAngle;

        // Strobe flash (1 Hz blink)
        const flash = (Math.floor(time * 3.0 + idx) % 2 === 0);
        plane.strobe.material.opacity = flash ? 1.0 : 0.1;

        // Record for TCAS GPS Radar
        this.tcasTargets.push({
          id: def.id,
          callsign: def.callsign,
          type: def.type,
          x: posX,
          y: posY,
          z: posZ,
          relX: relX,
          relZ: relZ,
          altitude: Math.round(posY),
          speed: Math.round(def.speed * 3.6),
          heading: Math.round(def.heading)
        });
      });
    }

    getTcasTargets() {
      return this.tcasTargets;
    }
  }

  // Export Global Instance
  window.AISkyTraffic = new AISkyTraffic();
  console.log('[AISkyTraffic] AI Sky Traffic & TCAS radar system loaded successfully.');
})();
