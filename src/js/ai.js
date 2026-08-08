/* --------------------------------------------------------------------------
   OFFLINE FINITE STATE MACHINE (FSM) ENEMY AI FACTION SYSTEM
   -------------------------------------------------------------------------- */

const AI_STATES = {
    PATROL: "PATROL",
    ALERT: "ALERT",
    COMBAT: "COMBAT",
    RETREAT: "RETREAT",
    DEAD: "DEAD"
};

class EnemyAgent {
    constructor(id, scene, world, player, config) {
        this.id = id;
        this.scene = scene;
        this.world = world;
        this.player = player;
        
        this.faction = config.faction; // "scavenger", "police", "boss"
        this.zone = config.zone;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.damage = config.damage;
        this.shootInterval = config.shootInterval;
        this.color = config.color;

        this.position = new THREE.Vector3(config.x, 0, config.z);
        this.homePosition = this.position.clone();
        this.targetWaypoint = this.getRandomPatrolPoint();
        this.investigatePoint = null;

        this.state = AI_STATES.PATROL;
        this.speed = config.speed || 3.5;
        this.detectionRadius = config.detectionRadius || 35;
        this.lastShotTime = 0;
        this.inCover = false;

        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();

        // Enemy Mesh Body
        const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.6 });
        const bodyGeo = new THREE.CylinderGeometry(0.45, 0.35, 1.8, 10);
        this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.mesh.position.y = 0.9;
        this.mesh.castShadow = true;
        this.group.add(this.mesh);

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 10, 10);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.8, 0);
        this.group.add(head);

        // Weapon
        const gunGeo = new THREE.BoxGeometry(0.1, 0.15, 0.7);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.set(0.4, 1.0, -0.3);
        this.group.add(gun);

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    getRandomPatrolPoint() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 25;
        return new THREE.Vector3(
            this.homePosition.x + Math.cos(angle) * dist,
            0,
            this.homePosition.z + Math.sin(angle) * dist
        );
    }

    update(delta, time) {
        if (this.state === AI_STATES.DEAD) return;

        const distToPlayer = this.position.distanceTo(this.player.position);

        // State Machine Transitions
        switch (this.state) {
            case AI_STATES.PATROL:
                this.updatePatrol(delta, distToPlayer);
                break;
            case AI_STATES.ALERT:
                this.updateAlert(delta, distToPlayer);
                break;
            case AI_STATES.COMBAT:
                this.updateCombat(delta, time, distToPlayer);
                break;
            case AI_STATES.RETREAT:
                this.updateRetreat(delta, distToPlayer);
                break;
        }

        this.group.position.copy(this.position);
    }

    /**
     * STATE 1: PATROL / IDLE
     */
    updatePatrol(delta, distToPlayer) {
        // Visual Line of Sight Check
        if (distToPlayer < this.detectionRadius && !this.player.isDead) {
            this.state = AI_STATES.COMBAT;
            return;
        }

        // Wander towards waypoint
        const dir = this.targetWaypoint.clone().sub(this.position);
        dir.y = 0;
        if (dir.length() < 1.5) {
            this.targetWaypoint = this.getRandomPatrolPoint();
        } else {
            dir.normalize();
            this.position.add(dir.multiplyScalar(this.speed * delta));
            this.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
    }

    /**
     * STATE 2: ALERT / INVESTIGATE SOUND CUE
     */
    updateAlert(delta, distToPlayer) {
        if (distToPlayer < this.detectionRadius * 1.2 && !this.player.isDead) {
            this.state = AI_STATES.COMBAT;
            return;
        }

        if (this.investigatePoint) {
            const dir = this.investigatePoint.clone().sub(this.position);
            dir.y = 0;
            if (dir.length() < 2.0) {
                // Done investigating -> return to patrol
                this.investigatePoint = null;
                this.state = AI_STATES.PATROL;
            } else {
                dir.normalize();
                this.position.add(dir.multiplyScalar((this.speed * 1.3) * delta));
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
            }
        } else {
            this.state = AI_STATES.PATROL;
        }
    }

    /**
     * STATE 3: COMBAT & COVER EVALUATION
     */
    updateCombat(delta, time, distToPlayer) {
        if (this.player.isDead || distToPlayer > this.detectionRadius * 2.2) {
            this.state = AI_STATES.PATROL;
            return;
        }

        // Check health retreat threshold (< 25% HP)
        if (this.hp < this.maxHp * 0.25) {
            this.state = AI_STATES.RETREAT;
            return;
        }

        // Move towards cover or face player
        const toPlayer = this.player.position.clone().sub(this.position);
        toPlayer.y = 0;
        this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

        // Keep distance & shoot
        if (distToPlayer > 12) {
            toPlayer.normalize();
            this.position.add(toPlayer.multiplyScalar(this.speed * 1.2 * delta));
        }

        // Shoot at player with interval
        if (time - this.lastShotTime > this.shootInterval) {
            this.lastShotTime = time;
            this.shootAtPlayer(distToPlayer);
        }
    }

    /**
     * STATE 4: RETREAT TO HEAL (< 25% HP)
     */
    updateRetreat(delta, distToPlayer) {
        // Flee away from player position
        const awayDir = this.position.clone().sub(this.player.position);
        awayDir.y = 0;
        awayDir.normalize();

        this.position.add(awayDir.multiplyScalar((this.speed * 1.5) * delta));
        this.group.rotation.y = Math.atan2(awayDir.x, awayDir.z);

        // Slowly regenerate HP when out of range
        if (distToPlayer > 40) {
            this.hp += 15 * delta;
            if (this.hp >= this.maxHp * 0.6) {
                this.state = AI_STATES.COMBAT;
            }
        }
    }

    shootAtPlayer(distToPlayer) {
        // Accuracy falloff based on distance
        const hitChance = Math.max(0.15, 0.85 - (distToPlayer / 100));
        if (Math.random() < hitChance) {
            this.player.takeDamage(this.damage);
        }
    }

    onHeardGunshot(soundOriginPos) {
        if (this.state === AI_STATES.PATROL) {
            this.state = AI_STATES.ALERT;
            this.investigatePoint = soundOriginPos.clone();
        }
    }

    takeDamage(amount) {
        if (this.state === AI_STATES.DEAD) return;

        this.hp -= amount;
        this.state = AI_STATES.COMBAT; // Instant aggro on attacker

        // Visual flash on hit
        this.mesh.material.emissive.setHex(0xff0000);
        setTimeout(() => this.mesh.material.emissive.setHex(0x000000), 100);

        if (this.hp <= 0) {
            this.state = AI_STATES.DEAD;
            this.scene.remove(this.group);
            if (window.UI) {
                window.UI.showToast(`ENEMY FACTION AGENT ELIMINATED [+50 XP]`, "success");
            }
        }
    }
}

class AIManager {
    constructor(scene, world, player) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.agents = [];

        this.spawnFactionAgents();
    }

    spawnFactionAgents() {
        // Spawn 32 concurrent offline AI agents across the 3 open-world loot zones
        
        // Zone 1: 10 Scavenger Agents
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist = 60 + Math.random() * 80;
            this.agents.push(new EnemyAgent(`scavenger_${i}`, this.scene, this.world, this.player, {
                faction: "scavenger", zone: 1, hp: 60, damage: 8, shootInterval: 1.8,
                speed: 3.2, color: 0x7f8c8d, x: Math.cos(angle) * dist, z: Math.sin(angle) * dist
            }));
        }

        // Zone 2: 12 Tactical Police Patrol Agents
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 210 + Math.random() * 90;
            this.agents.push(new EnemyAgent(`police_${i}`, this.scene, this.world, this.player, {
                faction: "police", zone: 2, hp: 100, damage: 14, shootInterval: 1.2,
                speed: 4.0, color: 0x2980b9, x: Math.cos(angle) * dist, z: Math.sin(angle) * dist
            }));
        }

        // Zone 3: 10 Fortified Military Boss Guards
        for (let i = 0; i < 10; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = -400 + (Math.random() - 0.5) * 60;
            this.agents.push(new EnemyAgent(`boss_${i}`, this.scene, this.world, this.player, {
                faction: "boss", zone: 3, hp: 180, damage: 22, shootInterval: 0.8,
                speed: 4.5, color: 0xc0392b, x: x, z: z
            }));
        }
    }

    broadcastGunshotSound(originPos, radius) {
        this.agents.forEach(agent => {
            if (agent.position.distanceTo(originPos) <= radius) {
                agent.onHeardGunshot(originPos);
            }
        });
    }

    getShootableMeshes() {
        return this.agents
            .filter(a => a.state !== AI_STATES.DEAD)
            .map(a => a.mesh);
    }

    getAgentFromMesh(mesh) {
        return this.agents.find(a => a.mesh === mesh);
    }

    update(delta, time) {
        // High-performance spatial distance update: only update agents within 350m of player
        const playerPos = this.player.position;
        this.agents.forEach(agent => {
            if (agent.position.distanceTo(playerPos) < 350) {
                agent.update(delta, time);
            }
        });
    }
}
