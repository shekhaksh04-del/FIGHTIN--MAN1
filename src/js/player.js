/* --------------------------------------------------------------------------
   THIRD-PERSON PLAYER CONTROLLER & CAMERA SYSTEM
   -------------------------------------------------------------------------- */

class PlayerController {
    constructor(scene, camera, world) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;

        // Player Vitals State
        this.hp = GAME_CONFIG.PLAYER_MAX_HP;
        this.maxHp = GAME_CONFIG.PLAYER_MAX_HP;
        this.stamina = GAME_CONFIG.PLAYER_MAX_STAMINA;
        this.maxStamina = GAME_CONFIG.PLAYER_MAX_STAMINA;
        
        // Movement Physics Variables
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.isSprinting = false;
        this.isCrouching = false;
        this.isAiming = false;
        this.isDead = false;

        this.walkSpeed = 6.0;
        this.sprintSpeed = 10.5;
        this.crouchSpeed = 3.2;

        // TPS Camera Controls State
        this.cameraPitch = 0.2; // Elevation angle
        this.cameraYaw = 0; // Azimuth angle
        this.cameraDistance = 4.5;
        this.cameraOffset = new THREE.Vector3(0.8, 1.6, 0); // Shoulder offset

        // Input Keys Tracker
        this.keys = {
            forward: false, backward: false, left: false, right: false,
            sprint: false, crouch: false, aim: false, fire: false
        };

        this.createPlayerMesh();
        this.setupPointerLock();
    }

    createPlayerMesh() {
        this.mesh = new THREE.Group();

        // Operator Body Mesh
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 });
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.4, 1.8, 12);
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.bodyMesh.position.y = 0.9;
        this.bodyMesh.castShadow = true;
        this.mesh.add(this.bodyMesh);

        // Tactical Helmet Mesh
        const headMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.5 });
        const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.9, 0);
        head.castShadow = true;
        this.mesh.add(head);

        // Visor / Forward direction indicator
        const visorMat = new THREE.MeshBasicMaterial({ color: 0xe69d25 });
        const visorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.95, -0.3);
        this.mesh.add(visor);

        // Weapon Attachment Socket (Right Hand)
        this.weaponSocket = new THREE.Group();
        this.weaponSocket.position.set(0.45, 1.1, -0.4);
        this.mesh.add(this.weaponSocket);

        this.scene.add(this.mesh);
    }

    setupPointerLock() {
        const dom = this.scene.renderer ? this.scene.renderer.domElement : document.body;

        dom.addEventListener('click', () => {
            if (!document.pointerLockElement && !this.isDead) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                const sensitivity = 0.0022;
                this.cameraYaw -= e.movementX * sensitivity;
                this.cameraPitch -= e.movementY * sensitivity;

                // Clamp vertical pitch angles
                this.cameraPitch = Math.max(-0.4, Math.min(1.2, this.cameraPitch));
            }
        });
    }

    handleInput(key, isPressed) {
        switch (key.toLowerCase()) {
            case 'w': this.keys.forward = isPressed; break;
            case 's': this.keys.backward = isPressed; break;
            case 'a': this.keys.left = isPressed; break;
            case 'd': this.keys.right = isPressed; break;
            case 'shift': this.keys.sprint = isPressed; break;
            case 'c': if (isPressed) this.isCrouching = !this.isCrouching; break;
        }
    }

    update(delta, inventoryWeight = 0) {
        if (this.isDead) return;

        // Stamina logic
        const moving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
        const wantsSprint = this.keys.sprint && moving && !this.isCrouching && this.stamina > 5;
        
        this.isSprinting = wantsSprint;

        if (this.isSprinting) {
            this.stamina = Math.max(0, this.stamina - GAME_CONFIG.STAMINA_DRAIN_RATE * delta);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + GAME_CONFIG.STAMINA_REGEN_RATE * delta);
        }

        // Weight penalty on movement speed
        const weightPenalty = Math.max(0, (inventoryWeight - 8.0) * 0.15); // Speed drops if > 8kg
        let currentSpeed = this.walkSpeed - weightPenalty;

        if (this.isCrouching) {
            currentSpeed = this.crouchSpeed;
            this.bodyMesh.scale.set(1, 0.6, 1);
            this.bodyMesh.position.y = 0.55;
        } else {
            this.bodyMesh.scale.set(1, 1, 1);
            this.bodyMesh.position.y = 0.9;
            if (this.isSprinting) currentSpeed = this.sprintSpeed;
        }

        // Direction vectors based on camera yaw
        const moveVector = new THREE.Vector3();
        if (this.keys.forward) moveVector.z -= 1;
        if (this.keys.backward) moveVector.z += 1;
        if (this.keys.left) moveVector.x -= 1;
        if (this.keys.right) moveVector.x += 1;

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();
            
            // Rotate move vector according to camera angle
            const moveAngle = Math.atan2(moveVector.x, moveVector.z) + this.cameraYaw;
            const moveX = Math.sin(moveAngle) * currentSpeed * delta;
            const moveZ = Math.cos(moveAngle) * currentSpeed * delta;

            // Simple collision check against world obstacles
            const nextPos = this.position.clone().add(new THREE.Vector3(moveX, 0, moveZ));
            let blocked = false;

            for (const col of this.world.colliders) {
                const dist = Math.hypot(nextPos.x - col.x, nextPos.z - col.z);
                if (dist < col.radius + 0.5) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                this.position.x += moveX;
                this.position.z += moveZ;
            }

            // Player mesh faces camera direction when moving
            this.mesh.rotation.y = this.cameraYaw + Math.PI;
        } else {
            // Face forward when idle
            this.mesh.rotation.y = this.cameraYaw + Math.PI;
        }

        // Ground clamping
        this.position.y = 0;
        this.mesh.position.copy(this.position);

        // Update TPS Orbit Camera Position
        this.updateCamera();
    }

    updateCamera() {
        const targetDist = this.isAiming ? 2.5 : this.cameraDistance;
        
        // Calculate Orbit Camera offset
        const target = this.position.clone().add(new THREE.Vector3(0, this.isCrouching ? 1.2 : 1.7, 0));
        
        const cx = target.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * targetDist;
        const cy = target.y + Math.sin(this.cameraPitch) * targetDist;
        const cz = target.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * targetDist;

        // Apply right shoulder offset
        const shoulderVec = new THREE.Vector3(0.8, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
        
        this.camera.position.set(cx, cy, cz).add(shoulderVec);
        this.camera.lookAt(target.clone().add(shoulderVec));
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp = Math.max(0, this.hp - amount);
        
        if (window.UI) {
            window.UI.triggerDamageEffect();
        }

        if (this.hp <= 0) {
            this.isDead = true;
            if (window.UI) {
                window.UI.showToast("CRITICAL SIGNAL LOST - OPERATOR ELIMINATED", "error");
            }
        }
    }
}
