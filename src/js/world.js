/* --------------------------------------------------------------------------
   3D PROCEDURAL WORLD, ZONES & LOOT CONTAINER MATRIX
   -------------------------------------------------------------------------- */

class GameWorld {
    constructor(scene) {
        this.scene = scene;
        this.rng = new SeededRandom(GAME_CONFIG.MAP_SEED);
        
        this.colliders = []; // Bounding objects for player/AI collision
        this.coverPoints = []; // Cover coordinates for enemy AI
        this.lootPickups = []; // Active world 3D weapon pickups
        
        this.initTerrain();
        this.initZone1_Village();
        this.initZone2_Checkpoint();
        this.initZone3_MilitaryBase();
        this.initFoliageAndRocks();
        this.spawnInitialLootContainers();
    }

    initTerrain() {
        const size = GAME_CONFIG.WORLD_SIZE;
        const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
        geometry.rotateX(-Math.PI / 2);

        // Height variation using simple sine waves
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const distFromCenter = Math.sqrt(x * x + z * z);
            
            // Outer perimeter elevation for mountainous map boundaries
            let y = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 3;
            if (distFromCenter > 250) {
                y += Math.pow((distFromCenter - 250) * 0.15, 1.8);
            }
            pos.setY(i, y);
        }
        geometry.computeVertexNormals();

        // Realistic Ground Texture Color
        const material = new THREE.MeshStandardMaterial({
            color: 0x2d3a28, // Overgrown earthy green
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });

        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // Zone 2 Outer Ring Visual Line (Highway asfalt)
        const roadGeo = new THREE.RingGeometry(175, 185, 64);
        roadGeo.rotateX(-Math.PI / 2);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.8 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.y = 0.1;
        road.receiveShadow = true;
        this.scene.add(road);
    }

    initZone1_Village() {
        // Zone 1: Center area (Radius 0 to 180m)
        // Spawn enterable wooden civilian houses with open doorways
        const housePositions = [
            { x: 35, z: 40, rot: 0 },
            { x: -45, z: 50, rot: Math.PI / 2 },
            { x: 65, z: -35, rot: -Math.PI / 4 },
            { x: -55, z: -65, rot: Math.PI / 4 },
            { x: 25, z: 120, rot: 0 },
            { x: -105, z: 25, rot: -Math.PI / 2 }
        ];

        housePositions.forEach((pos, idx) => {
            this.createHouse(pos.x, pos.z, pos.rot, "wooden");
        });
    }

    initZone2_Checkpoint() {
        // Zone 2: Mid ring (Radius 180m to 360m)
        // Tactical Police Station & concrete roadblocks
        const checkpointPositions = [
            { x: 200, z: 0 }, { x: -220, z: 60 }, { x: 0, z: 240 }, { x: -150, z: -180 }
        ];

        checkpointPositions.forEach((pos, idx) => {
            this.createPoliceRoadblock(pos.x, pos.z, `z2_checkpoint_${idx}`);
        });

        // Police Station Building
        this.createHouse(180, 40, Math.PI / 6, "concrete");
    }

    initZone3_MilitaryBase() {
        // Zone 3: Northern Outpost (Radius 360m to 600m)
        // Fortified Military Base with Watchtowers & Bunker
        const baseCenterX = 0;
        const baseCenterZ = -400;

        // Concrete perimeter walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a535e, roughness: 0.6 });
        
        // Main Bunker Structure
        const bunkerGeo = new THREE.BoxGeometry(40, 12, 30);
        const bunker = new THREE.Mesh(bunkerGeo, wallMat);
        bunker.position.set(baseCenterX, 6, baseCenterZ);
        bunker.castShadow = true;
        bunker.receiveShadow = true;
        this.scene.add(bunker);
        this.addCollider(bunker, baseCenterX, baseCenterZ, 40, 30);

        // Heavy Watchtowers at corners
        const corners = [
            { x: baseCenterX - 35, z: baseCenterZ - 30 },
            { x: baseCenterX + 35, z: baseCenterZ - 30 },
            { x: baseCenterX - 35, z: baseCenterZ + 30 },
            { x: baseCenterX + 35, z: baseCenterZ + 30 }
        ];

        corners.forEach((c, idx) => {
            this.createWatchtower(c.x, c.z, `z3_tower_${idx}`);
        });

        // Military Sandbag Barriers for Cover
        for (let i = -25; i <= 25; i += 10) {
            this.createSandbagCover(baseCenterX + i, baseCenterZ + 20, 0);
        }
    }

    createHouse(x, z, rotY = 0, houseType = "wooden") {
        const houseGroup = new THREE.Group();
        houseGroup.position.set(x, 0, z);
        houseGroup.rotation.y = rotY;

        const wallMat = houseType === "concrete"
            ? new THREE.MeshStandardMaterial({ color: 0x5a6572, roughness: 0.7 })
            : new THREE.MeshStandardMaterial({ color: 0x6e4e37, roughness: 0.8 }); // Wooden plank

        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.6 });
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });

        const width = 12;
        const depth = 10;
        const height = 4.5;
        const wallThickness = 0.4;
        const doorWidth = 3.0;

        // 1. Interior Floor
        const floorGeo = new THREE.BoxGeometry(width - 0.2, 0.2, depth - 0.2);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.1, 0);
        floor.receiveShadow = true;
        houseGroup.add(floor);

        // 2. Back Wall (Solid)
        const backWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.position.set(0, height / 2, -depth / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        houseGroup.add(backWall);

        // 3. Left Wall (Solid with window cutout visual)
        const leftWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.set(-width / 2, height / 2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        houseGroup.add(leftWall);

        // 4. Right Wall (Solid)
        const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
        rightWall.position.set(width / 2, height / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        houseGroup.add(rightWall);

        // 5. Front Wall with Open Doorway Gap
        const sideWidth = (width - doorWidth) / 2;
        const frontLeftGeo = new THREE.BoxGeometry(sideWidth, height, wallThickness);
        const frontLeft = new THREE.Mesh(frontLeftGeo, wallMat);
        frontLeft.position.set(-width / 2 + sideWidth / 2, height / 2, depth / 2);
        frontLeft.castShadow = true;
        houseGroup.add(frontLeft);

        const frontRight = new THREE.Mesh(frontLeftGeo, wallMat);
        frontRight.position.set(width / 2 - sideWidth / 2, height / 2, depth / 2);
        frontRight.castShadow = true;
        houseGroup.add(frontRight);

        // Lintel above doorway
        const lintelGeo = new THREE.BoxGeometry(doorWidth, 1.2, wallThickness);
        const lintel = new THREE.Mesh(lintelGeo, wallMat);
        lintel.position.set(0, height - 0.6, depth / 2);
        houseGroup.add(lintel);

        // 6. Roof Structure (Pitched Gable Roof)
        const roofGeo = new THREE.ConeGeometry(width * 0.75, 3.5, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, height + 1.75, 0);
        roof.castShadow = true;
        houseGroup.add(roof);

        this.scene.add(houseGroup);

        // Add colliders for outer walls
        this.addCollider(backWall, x, z - depth / 2, width, wallThickness);
        this.addCollider(leftWall, x - width / 2, z, wallThickness, depth);
        this.addCollider(rightWall, x + width / 2, z, wallThickness, depth);

        // Cover points inside & outside house
        this.coverPoints.push(new THREE.Vector3(x, 0, z)); // Inside house
        this.coverPoints.push(new THREE.Vector3(x + width / 2 + 2, 0, z)); // Outside side
    }

    createPoliceRoadblock(x, z, id) {
        // Concrete K-rails & police barricades
        const mat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.5 });
        for (let i = -2; i <= 2; i++) {
            const barGeo = new THREE.BoxGeometry(4, 2, 1);
            const barrier = new THREE.Mesh(barGeo, mat);
            barrier.position.set(x + i * 4.5, 1, z);
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.addCollider(barrier, x + i * 4.5, z, 4, 1);
            this.coverPoints.push(new THREE.Vector3(x + i * 4.5, 0, z + 2));
        }
    }

    createWatchtower(x, z, id) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.5, metalness: 0.5 });
        const towerGeo = new THREE.CylinderGeometry(2, 3, 14, 8);
        const tower = new THREE.Mesh(towerGeo, mat);
        tower.position.set(x, 7, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.scene.add(tower);
        this.addCollider(tower);
    }

    createSandbagCover(x, z, rotY) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 });
        const bagGeo = new THREE.BoxGeometry(3, 1.2, 1);
        const bag = new THREE.Mesh(bagGeo, mat);
        bag.position.set(x, 0.6, z);
        bag.rotation.y = rotY;
        bag.castShadow = true;
        bag.receiveShadow = true;
        this.scene.add(bag);
        this.addCollider(bag);
        this.coverPoints.push(new THREE.Vector3(x, 0, z + 1.5));
    }

    initFoliageAndRocks() {
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.8 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });

        // Scatter 120 trees and 60 rocks deterministically using Seeded Random
        for (let i = 0; i < 120; i++) {
            const angle = this.rng.next() * Math.PI * 2;
            const dist = this.rng.range(30, 480);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 4, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 2, z);
            trunk.castShadow = true;

            const leavesGeo = new THREE.ConeGeometry(3, 7, 6);
            const leaves = new THREE.Mesh(leavesGeo, treeMat);
            leaves.position.set(x, 6.5, z);
            leaves.castShadow = true;

            this.scene.add(trunk);
            this.scene.add(leaves);
            this.addCollider(trunk);
        }
    }

    spawnInitialLootContainers() {
        // Seeded offline placement of weapons scattered across 3 zones
        const lootTable = [
            // Zone 1: Civilian Firearms
            { weaponId: "m9_pistol", x: 15, z: 25, zone: 1, containerId: "loot_z1_01" },
            { weaponId: "remington_shotgun", x: -35, z: 45, zone: 1, containerId: "loot_z1_02" },
            { weaponId: "m9_pistol", x: 50, z: -20, zone: 1, containerId: "loot_z1_03" },

            // Zone 2: Police Tactical
            { weaponId: "mp5_smg", x: 195, z: 10, zone: 2, containerId: "loot_z2_01" },
            { weaponId: "remington_shotgun", x: -210, z: 70, zone: 2, containerId: "loot_z2_02" },
            { weaponId: "mp5_smg", x: -140, z: -170, zone: 2, containerId: "loot_z2_03" },

            // Zone 3: Military Spec-Ops & Elite
            { weaponId: "m4a1_rifle", x: 10, z: -380, zone: 3, containerId: "loot_z3_01" },
            { weaponId: "m24_sniper", x: -30, z: -410, zone: 3, containerId: "loot_z3_02" },
            { weaponId: "m32_launcher", x: 0, z: -430, zone: 3, containerId: "loot_z3_03" }
        ];

        lootTable.forEach(item => {
            this.spawnWeaponPickup(item.weaponId, item.x, item.z, item.containerId);
        });
    }

    spawnWeaponPickup(weaponId, x, z, containerId, customAmmo = null) {
        const config = WEAPONS_DATABASE[weaponId];
        if (!config) return;

        const group = new THREE.Group();
        group.name = containerId;
        group.userData = {
            isWeaponPickup: true,
            containerId: containerId,
            weaponData: {
                ...config,
                curAmmo: customAmmo !== null ? customAmmo : config.magCapacity
            }
        };

        // Create crate pedestal
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x3e4a36, roughness: 0.6 });
        const crateGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4);
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 0.4;
        crate.castShadow = true;
        group.add(crate);

        // 3D Weapon Model Placeholder Mesh
        const gunMat = new THREE.MeshStandardMaterial({
            color: config.color,
            metalness: 0.8,
            roughness: 0.3,
            emissive: config.color,
            emissiveIntensity: 0.2
        });

        const gunGeo = new THREE.BoxGeometry(0.2, 0.3, 1.2);
        const gunMesh = new THREE.Mesh(gunGeo, gunMat);
        gunMesh.position.y = 1.1;
        gunMesh.rotation.y = Math.PI / 4;
        gunMesh.castShadow = true;
        group.add(gunMesh);

        // Floating tier beacon beam
        const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
        const beamMat = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.4
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 2.5;
        group.add(beam);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.lootPickups.push(group);
    }

    removeLootPickup(containerId) {
        const idx = this.lootPickups.findIndex(p => p.userData.containerId === containerId);
        if (idx !== -1) {
            const pickup = this.lootPickups[idx];
            this.scene.remove(pickup);
            this.lootPickups.splice(idx, 1);
        }
    }

    addCollider(mesh, posX = null, posZ = null) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push({
            box: box,
            x: posX !== null ? posX : mesh.position.x,
            z: posZ !== null ? posZ : mesh.position.z,
            radius: 2.0
        });
    }

    update(delta, time) {
        // Hover animation for weapon pickups
        this.lootPickups.forEach(p => {
            const gun = p.children[1];
            if (gun) {
                gun.rotation.y += delta * 1.5;
                gun.position.y = 1.1 + Math.sin(time * 3) * 0.1;
            }
        });
    }
}
