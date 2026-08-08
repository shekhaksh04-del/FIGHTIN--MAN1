/* --------------------------------------------------------------------------
   MODULAR WEAPON PICKUP & INVENTORY SYSTEM (2-WEAPON CAPACITY)
   -------------------------------------------------------------------------- */

class InventoryManager {
    constructor(player, world) {
        this.player = player;
        this.world = world;

        // Strict 2-Primary Weapon Capacity Array
        // Index 0: Slot 1 | Index 1: Slot 2
        this.weaponSlots = [null, null];
        this.activeSlotIndex = 0; // Currently held slot

        this.nearbyPickup = null;
        this.interactionRadius = 2.8; // Radius to prompt [E] pickup
    }

    /**
     * Initializes player starting weapon (M9 Tactical Pistol)
     */
    giveDefaultStarterWeapon() {
        const starterConfig = WEAPONS_DATABASE["m9_pistol"];
        this.weaponSlots[0] = {
            ...starterConfig,
            curAmmo: starterConfig.magCapacity,
            reserveAmmo: starterConfig.maxAmmo
        };
        this.activeSlotIndex = 0;
        this.updatePlayerWeaponMesh();
        this.notifyUI();
    }

    /**
     * Calculates total inventory weight carried by player
     */
    getTotalWeight() {
        let weight = 0;
        this.weaponSlots.forEach(w => {
            if (w) weight += w.weight;
        });
        return weight;
    }

    /**
     * Retrieves currently equipped active weapon object
     */
    getActiveWeapon() {
        return this.weaponSlots[this.activeSlotIndex];
    }

    /**
     * Switch active weapon slot (Key 1 or Key 2)
     */
    selectSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= GAME_CONFIG.MAX_PRIMARY_WEAPONS) return;
        if (this.activeSlotIndex === slotIndex) return;

        this.activeSlotIndex = slotIndex;
        this.updatePlayerWeaponMesh();
        this.notifyUI();
        
        const active = this.getActiveWeapon();
        if (active) {
            window.UI.showToast(`EQUIPPED: ${active.name} (${active.ammoType})`);
        }
    }

    /**
     * World Proximity Scan: Checks for 3D weapon crates near player
     */
    checkNearbyPickups() {
        const pPos = this.player.position;
        let closest = null;
        let minDist = this.interactionRadius;

        for (const pickup of this.world.lootPickups) {
            const dist = pPos.distanceTo(pickup.position);
            if (dist < minDist) {
                minDist = dist;
                closest = pickup;
            }
        }

        this.nearbyPickup = closest;

        if (window.UI) {
            window.UI.updateInteractionPrompt(this.nearbyPickup, this.weaponSlots, this.activeSlotIndex);
        }
    }

    /**
     * MAIN PICKUP & WEAPON SWAP LOGIC (Called when pressing 'E')
     */
    handlePickupInteract() {
        if (!this.nearbyPickup) return;

        const pickupData = this.nearbyPickup.userData.weaponData;
        const containerId = this.nearbyPickup.userData.containerId;
        const playerPos = this.player.position.clone();

        // Step 1: Check if there is an empty slot available
        let targetSlot = -1;
        for (let i = 0; i < GAME_CONFIG.MAX_PRIMARY_WEAPONS; i++) {
            if (this.weaponSlots[i] === null) {
                targetSlot = i;
                break;
            }
        }

        // Step 2: If no empty slots, drop currently equipped weapon onto ground at player coordinates
        if (targetSlot === -1) {
            targetSlot = this.activeSlotIndex;
            const droppedWeapon = this.weaponSlots[targetSlot];

            if (droppedWeapon) {
                // Generate unique container ID for dropped ground item
                const dropContainerId = `dropped_${droppedWeapon.id}_${Date.now()}`;
                
                // Spawn physical 3D world pickup at player's exact X, Y, Z
                this.world.spawnWeaponPickup(
                    droppedWeapon.id,
                    playerPos.x + (Math.random() - 0.5) * 1.5,
                    playerPos.z + (Math.random() - 0.5) * 1.5,
                    dropContainerId,
                    droppedWeapon.curAmmo
                );

                window.UI.showToast(`DROPPED: ${droppedWeapon.name}`, "warning");
            }
        }

        // Step 3: Equip the new weapon into the designated slot
        this.weaponSlots[targetSlot] = {
            ...pickupData,
            curAmmo: pickupData.curAmmo !== undefined ? pickupData.curAmmo : pickupData.magCapacity,
            reserveAmmo: pickupData.maxAmmo
        };
        this.activeSlotIndex = targetSlot;

        // Step 4: Remove the harvested pickup from world scene
        this.world.removeLootPickup(containerId);
        
        // Track picked-up container ID in offline save persistence tracker
        if (window.SaveSystem) {
            window.SaveSystem.recordHarvestedLoot(containerId);
        }

        // Step 5: Update player 3D socket mesh & offline UI HUD
        this.updatePlayerWeaponMesh();
        this.notifyUI();

        window.UI.showToast(`EQUIPPED: ${pickupData.name} [TIER ${pickupData.tier}]`, "success");
        this.checkNearbyPickups();
    }

    /**
     * Updates 3D weapon model attached to player socket
     */
    updatePlayerWeaponMesh() {
        const socket = this.player.weaponSocket;
        // Clear existing mesh
        while (socket.children.length > 0) {
            socket.remove(socket.children[0]);
        }

        const active = this.getActiveWeapon();
        if (!active) return;

        // Create representative 3D socket gun model
        const mat = new THREE.MeshStandardMaterial({
            color: active.color,
            metalness: 0.8,
            roughness: 0.2
        });
        const geo = new THREE.BoxGeometry(0.12, 0.18, 0.85);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        socket.add(mesh);
    }

    notifyUI() {
        if (window.UI) {
            window.UI.updateInventoryHUD(this.weaponSlots, this.activeSlotIndex, this.getTotalWeight());
        }
    }
}
