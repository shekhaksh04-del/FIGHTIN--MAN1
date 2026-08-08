/* --------------------------------------------------------------------------
   TACTILE FIREARM BALLISTICS, RECOIL & OFFLINE WEBAUDIO SYNTHESIZER
   -------------------------------------------------------------------------- */

class WeaponSystem {
    constructor(scene, camera, player, inventory, aiManager) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.inventory = inventory;
        this.aiManager = aiManager;

        this.lastShotTime = 0;
        this.isReloading = false;

        // Initialize WebAudio context for 100% offline procedural gunshot sounds
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Primary Trigger Fire Command
     */
    shoot() {
        if (this.player.isDead || this.isReloading) return;

        const weapon = this.inventory.getActiveWeapon();
        if (!weapon) {
            this.playClickSound();
            return;
        }

        const now = performance.now() / 1000;
        if (now - this.lastShotTime < weapon.fireRate) return;

        if (weapon.curAmmo <= 0) {
            this.playClickSound();
            this.reload();
            return;
        }

        // Deduct magazine ammo
        weapon.curAmmo--;
        this.lastShotTime = now;

        // Update HUD ammo counters
        this.inventory.notifyUI();

        // Recoil effect on TPS Camera
        this.player.cameraPitch += weapon.recoil;

        // Procedural WebAudio Gunshot Synthesis
        this.playProceduralGunshot(weapon);

        // Visual Muzzle Flash Effect
        this.createMuzzleFlash();

        // Perform Raycast Ballistics
        this.performRaycastShot(weapon);

        // Notify nearby AI agents of player gunshot sound cue
        if (this.aiManager) {
            this.aiManager.broadcastGunshotSound(this.player.position, weapon.range * 1.2);
        }
    }

    /**
     * Perform physical bullet raycast against enemy AI and environment
     */
    performRaycastShot(weapon) {
        const raycaster = new THREE.Raycaster();
        
        // Raycast from camera center into world
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Collect shootable target meshes from AI agents
        const targets = this.aiManager ? this.aiManager.getShootableMeshes() : [];
        const intersects = raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const hitDistance = hit.distance;

            // Draw bullet tracer line
            this.createTracerLine(this.player.mesh.position, hit.point);

            if (hitDistance <= weapon.range) {
                // Check if hit object belongs to an AI agent
                const hitAgent = this.aiManager.getAgentFromMesh(hit.object);
                if (hitAgent) {
                    hitAgent.takeDamage(weapon.damage);
                    if (window.UI) {
                        window.UI.triggerHitMarker();
                    }
                } else {
                    // Environment impact spark
                    this.createImpactSpark(hit.point);
                }
            }
        } else {
            // Far distance bullet tracer line
            const endPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(weapon.range));
            this.createTracerLine(this.player.mesh.position, endPoint);
        }
    }

    /**
     * Reload Magazine Logic (Key 'R')
     */
    reload() {
        const weapon = this.inventory.getActiveWeapon();
        if (!weapon || this.isReloading || weapon.curAmmo === weapon.magCapacity) return;

        if (weapon.reserveAmmo <= 0) {
            window.UI.showToast("NO AMMO RESERVES REMAINING", "warning");
            return;
        }

        this.isReloading = true;
        window.UI.showToast(`RELOADING ${weapon.name}...`);
        this.playReloadSound();

        setTimeout(() => {
            const needed = weapon.magCapacity - weapon.curAmmo;
            const reloadAmount = Math.min(needed, weapon.reserveAmmo);
            
            weapon.curAmmo += reloadAmount;
            weapon.reserveAmmo -= reloadAmount;

            this.isReloading = false;
            this.inventory.notifyUI();
            window.UI.showToast("RELOAD COMPLETE", "success");
        }, 1200);
    }

    /**
     * Procedural Offline WebAudio Synthesizer for Gunshot Sounds
     */
    playProceduralGunshot(weapon) {
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;
            
            // Noise buffer for blast explosive transient
            const bufferSize = this.audioCtx.sampleRate * 0.15;
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;

            // Lowpass filter for mechanical thump
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(weapon.soundFreq || 250, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 0.15);

            // Envelope gain
            const gain = this.audioCtx.createGain();
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            noise.start(now);
        } catch (e) {
            // Audio context fallback
        }
    }

    playClickSound() {
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.05);
        } catch (e) {}
    }

    playReloadSound() {
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, this.audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.25);
        } catch (e) {}
    }

    createMuzzleFlash() {
        const light = new THREE.PointLight(0xffaa33, 3, 8);
        const socketPos = new THREE.Vector3();
        this.player.weaponSocket.getWorldPosition(socketPos);
        light.position.copy(socketPos);
        this.scene.add(light);

        setTimeout(() => this.scene.remove(light), 40);
    }

    createTracerLine(start, end) {
        const points = [start.clone().add(new THREE.Vector3(0, 1.2, 0)), end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        setTimeout(() => this.scene.remove(line), 60);
    }

    createImpactSpark(pos) {
        const pGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const spark = new THREE.Mesh(pGeo, pMat);
        spark.position.copy(pos);
        this.scene.add(spark);

        setTimeout(() => this.scene.remove(spark), 100);
    }
}
