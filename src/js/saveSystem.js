/* --------------------------------------------------------------------------
   100% OFFLINE LOCAL SAVE & DATA PERSISTENCE SYSTEM
   -------------------------------------------------------------------------- */

const LOCAL_STORAGE_SAVE_KEY = "FOB_OFFLINE_SAVE_STATE_V1";

class SaveManager {
    constructor(player, inventory, world) {
        this.player = player;
        this.inventory = inventory;
        this.world = world;

        // Track harvested/looted container IDs locally
        this.harvestedLootIds = new Set();
    }

    recordHarvestedLoot(containerId) {
        if (containerId) {
            this.harvestedLootIds.add(containerId);
        }
    }

    /**
     * SAVE GAME TO LOCAL STORAGE (No cloud/internet dependency)
     */
    saveGame() {
        if (this.player.isDead) {
            window.UI.showToast("CANNOT SAVE WHILE OPERATOR IS ELIMINATED", "error");
            return false;
        }

        const saveData = {
            version: "1.0.0",
            timestamp: new Date().toISOString(),
            seed: GAME_CONFIG.MAP_SEED,
            
            // 1. Player Coordinates & Camera Rotation
            playerTransform: {
                x: parseFloat(this.player.position.x.toFixed(2)),
                y: parseFloat(this.player.position.y.toFixed(2)),
                z: parseFloat(this.player.position.z.toFixed(2)),
                cameraYaw: parseFloat(this.player.cameraYaw.toFixed(3)),
                cameraPitch: parseFloat(this.player.cameraPitch.toFixed(3))
            },

            // 2. Health & Stamina
            vitals: {
                hp: Math.round(this.player.hp),
                stamina: Math.round(this.player.stamina)
            },

            // 3. Equipped Weapons & Magazine Ammo Counts
            inventoryState: {
                activeSlotIndex: this.inventory.activeSlotIndex,
                slots: this.inventory.weaponSlots.map(slot => {
                    if (!slot) return null;
                    return {
                        id: slot.id,
                        name: slot.name,
                        tier: slot.tier,
                        weight: slot.weight,
                        damage: slot.damage,
                        curAmmo: slot.curAmmo,
                        reserveAmmo: slot.reserveAmmo,
                        maxAmmo: slot.maxAmmo,
                        ammoType: slot.ammoType,
                        fireRate: slot.fireRate,
                        range: slot.range,
                        color: slot.color
                    };
                })
            },

            // 4. Persistent List of Picked-Up World Weapon Coordinates / Container IDs
            harvestedLootIds: Array.from(this.harvestedLootIds)
        };

        try {
            const jsonString = JSON.stringify(saveData);
            localStorage.setItem(LOCAL_STORAGE_SAVE_KEY, jsonString);
            
            window.UI.showToast("PROGRESS SAVED TO LOCAL DEVICE STORAGE", "success");
            this.updateMenuSaveInfo(saveData);
            return true;
        } catch (err) {
            console.error("Local save error:", err);
            window.UI.showToast("FAILED TO WRITE LOCAL SAVE DATA", "error");
            return false;
        }
    }

    /**
     * LOAD SAVED STATE FROM LOCAL STORAGE
     */
    loadGame() {
        try {
            const jsonString = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
            if (!jsonString) {
                window.UI.showToast("NO LOCAL SAVE STATE FOUND", "warning");
                return false;
            }

            const saveData = JSON.parse(jsonString);

            // Restore Player Position XYZ
            if (saveData.playerTransform) {
                this.player.position.set(
                    saveData.playerTransform.x,
                    saveData.playerTransform.y,
                    saveData.playerTransform.z
                );
                this.player.cameraYaw = saveData.playerTransform.cameraYaw || 0;
                this.player.cameraPitch = saveData.playerTransform.cameraPitch || 0.2;
                this.player.mesh.position.copy(this.player.position);
            }

            // Restore Vitals
            if (saveData.vitals) {
                this.player.hp = saveData.vitals.hp;
                this.player.stamina = saveData.vitals.stamina;
                this.player.isDead = false;
            }

            // Restore Inventory & Ammo
            if (saveData.inventoryState) {
                this.inventory.activeSlotIndex = saveData.inventoryState.activeSlotIndex || 0;
                this.inventory.weaponSlots = saveData.inventoryState.slots.map(s => {
                    if (!s) return null;
                    const baseConfig = WEAPONS_DATABASE[s.id] || {};
                    return {
                        ...baseConfig,
                        ...s
                    };
                });
                this.inventory.updatePlayerWeaponMesh();
                this.inventory.notifyUI();
            }

            // Restore Harvested Loot IDs & Remove Picked-Up Crates from World
            if (saveData.harvestedLootIds && Array.isArray(saveData.harvestedLootIds)) {
                this.harvestedLootIds = new Set(saveData.harvestedLootIds);
                this.harvestedLootIds.forEach(containerId => {
                    this.world.removeLootPickup(containerId);
                });
            }

            window.UI.showToast("LOCAL SAVE STATE RESTORED SUCCESSFULLY", "success");
            this.updateMenuSaveInfo(saveData);
            return true;
        } catch (err) {
            console.error("Local load error:", err);
            window.UI.showToast("CORRUPTED LOCAL SAVE STATE DETECTED", "error");
            return false;
        }
    }

    /**
     * CLEAR / RESET LOCAL PROGRESS
     */
    resetSave() {
        localStorage.removeItem(LOCAL_STORAGE_SAVE_KEY);
        this.harvestedLootIds.clear();
        window.UI.showToast("LOCAL SAVE STATE RESET - RESTARTING MAP", "warning");
        setTimeout(() => location.reload(), 1000);
    }

    updateMenuSaveInfo(data = null) {
        const infoElem = document.getElementById('save-status-text');
        if (!infoElem) return;

        if (!data) {
            const raw = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
            if (raw) data = JSON.parse(raw);
        }

        if (data) {
            const time = new Date(data.timestamp).toLocaleString();
            infoElem.innerHTML = `
                <strong>SAVED TIMESTAMP:</strong> ${time}<br>
                <strong>LOCATION (XYZ):</strong> [X: ${data.playerTransform.x}, Y: ${data.playerTransform.y}, Z: ${data.playerTransform.z}]<br>
                <strong>OPERATOR VITALS:</strong> ${data.vitals.hp} HP | ${data.vitals.stamina}% Stamina<br>
                <strong>LOOTED SITES:</strong> ${data.harvestedLootIds ? data.harvestedLootIds.length : 0} containers harvested
            `;
        } else {
            infoElem.innerHTML = "No save state detected in local device storage.";
        }
    }
}
