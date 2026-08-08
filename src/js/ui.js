/* --------------------------------------------------------------------------
   TACTICAL USER INTERFACE & MINIMAP RADAR CONTROLLER
   -------------------------------------------------------------------------- */

class UIManager {
    constructor() {
        this.hitMarker = document.getElementById('hit-marker');
        this.damageVignette = document.getElementById('damage-vignette');
        this.notificationContainer = document.getElementById('notification-container');
        
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        this.isMenuOpen = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching in pause menu
        window.switchTab = (tabId) => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
            if (targetBtn) targetBtn.classList.add('active');

            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.remove('hidden');
        };

        // Resume operation button
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.toggleMenu(false));
        }

        // Save / Load / Reset Buttons
        const saveBtn = document.getElementById('btn-save');
        const loadBtn = document.getElementById('btn-load');
        const resetBtn = document.getElementById('btn-reset');

        if (saveBtn) saveBtn.addEventListener('click', () => window.SaveSystem && window.SaveSystem.saveGame());
        if (loadBtn) loadBtn.addEventListener('click', () => window.SaveSystem && window.SaveSystem.loadGame());
        if (resetBtn) resetBtn.addEventListener('click', () => window.SaveSystem && window.SaveSystem.resetSave());
    }

    toggleMenu(forceState = null) {
        this.isMenuOpen = forceState !== null ? forceState : !this.isMenuOpen;
        const menu = document.getElementById('pause-menu');

        if (this.isMenuOpen) {
            menu.classList.remove('menu-hidden');
            document.exitPointerLock();
            if (window.SaveSystem) window.SaveSystem.updateMenuSaveInfo();
        } else {
            menu.classList.add('menu-hidden');
            document.body.requestPointerLock();
        }
    }

    updatePlayerVitals(hp, maxHp, stamina, maxStamina) {
        const hpBar = document.getElementById('hp-bar');
        const hpText = document.getElementById('hp-text');
        const staminaBar = document.getElementById('stamina-bar');
        const staminaText = document.getElementById('stamina-text');

        if (hpBar) hpBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
        if (hpText) hpText.innerText = `${Math.round(hp)} / ${maxHp}`;

        if (staminaBar) staminaBar.style.width = `${Math.max(0, (stamina / maxStamina) * 100)}%`;
        if (staminaText) staminaText.innerText = `${Math.round(stamina)}%`;
    }

    updateInventoryHUD(slots, activeIndex, totalWeight) {
        // Update Weight Counter
        const weightText = document.getElementById('weight-text');
        if (weightText) {
            weightText.innerText = `${totalWeight.toFixed(1)} / ${GAME_CONFIG.MAX_WEIGHT_CAPACITY} KG`;
            weightText.style.color = totalWeight > 12.0 ? "#e74c3c" : "#e69d25";
        }

        // Slot 1 (Index 0)
        this.renderSlotData(0, slots[0], activeIndex === 0);
        // Slot 2 (Index 1)
        this.renderSlotData(1, slots[1], activeIndex === 1);
    }

    renderSlotData(slotIdx, weaponData, isActive) {
        const slotElem = document.getElementById(`slot-${slotIdx}`);
        if (!slotElem) return;

        if (isActive) {
            slotElem.classList.add('active-slot');
        } else {
            slotElem.classList.remove('active-slot');
        }

        const nameElem = document.getElementById(`slot-${slotIdx}-name`);
        const tierElem = document.getElementById(`slot-${slotIdx}-tier`);
        const curAmmoElem = document.getElementById(`slot-${slotIdx}-cur`);
        const maxAmmoElem = document.getElementById(`slot-${slotIdx}-max`);
        const typeElem = document.getElementById(`slot-${slotIdx}-type`);

        if (weaponData) {
            slotElem.classList.remove('empty-slot');
            if (nameElem) nameElem.innerText = weaponData.name;
            if (tierElem) {
                tierElem.innerText = `TIER ${weaponData.tier} - ${weaponData.tierName}`;
                tierElem.className = `weapon-tier tier-${weaponData.tier}`;
            }
            if (curAmmoElem) curAmmoElem.innerText = weaponData.curAmmo;
            if (maxAmmoElem) maxAmmoElem.innerText = weaponData.reserveAmmo;
            if (typeElem) typeElem.innerText = `${weaponData.ammoType} | ${weaponData.weight}kg | ${weaponData.damage} DMG`;
        } else {
            slotElem.classList.add('empty-slot');
            if (nameElem) nameElem.innerText = "[ UNARMED / EMPTY ]";
            if (tierElem) {
                tierElem.innerText = "EMPTY";
                tierElem.className = "weapon-tier tier-0";
            }
            if (curAmmoElem) curAmmoElem.innerText = "--";
            if (maxAmmoElem) maxAmmoElem.innerText = "--";
            if (typeElem) typeElem.innerText = "APPROACH WEAPON CRATE & PRESS [E] TO EQUIP";
        }
    }

    updateInteractionPrompt(nearbyPickup, weaponSlots, activeIndex) {
        const prompt = document.getElementById('interaction-prompt');
        if (!prompt) return;

        if (nearbyPickup) {
            prompt.classList.remove('prompt-hidden');
            const data = nearbyPickup.userData.weaponData;
            
            const isFull = weaponSlots[0] !== null && weaponSlots[1] !== null;
            const actionText = isFull ? "SWAP & DROP EQUIPPED WEAPON" : "EQUIP WEAPON";
            
            document.getElementById('prompt-action').innerText = actionText;
            document.getElementById('prompt-item-name').innerText = data.name;
            document.getElementById('prompt-item-stats').innerText = `TIER ${data.tier} | DMG: ${data.damage} | ${data.ammoType} | WEIGHT: ${data.weight}kg`;
        } else {
            prompt.classList.add('prompt-hidden');
        }
    }

    updateCompassAndZone(playerPos, yaw) {
        const compass = document.getElementById('compass');
        if (!compass) return;

        // Heading calculation
        const degrees = Math.round(((yaw * 180 / Math.PI) % 360 + 360) % 360);
        const headingElem = compass.querySelector('.heading');
        if (headingElem) headingElem.innerText = `N ${String(degrees).padStart(3, '0')}°`;

        // Zone detection by radial distance
        const dist = Math.hypot(playerPos.x, playerPos.z);
        const badge = document.getElementById('zone-badge');
        if (!badge) return;

        if (dist < GAME_CONFIG.ZONES.ZONE_1.maxRadius) {
            badge.innerText = GAME_CONFIG.ZONES.ZONE_1.name;
            badge.style.borderLeftColor = GAME_CONFIG.ZONES.ZONE_1.color;
        } else if (dist < GAME_CONFIG.ZONES.ZONE_2.maxRadius) {
            badge.innerText = GAME_CONFIG.ZONES.ZONE_2.name;
            badge.style.borderLeftColor = GAME_CONFIG.ZONES.ZONE_2.color;
        } else {
            badge.innerText = GAME_CONFIG.ZONES.ZONE_3.name;
            badge.style.borderLeftColor = GAME_CONFIG.ZONES.ZONE_3.color;
        }
    }

    renderMinimap(playerPos, yaw, agents, pickups) {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const w = 160;
        const h = 160;
        const center = 80;
        const scale = 0.4; // Meters to pixels

        ctx.clearRect(0, 0, w, h);

        // Draw Radar Grid Background
        ctx.fillStyle = "#0d1217";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "rgba(64, 80, 95, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);

        ctx.beginPath();
        ctx.arc(center, center, 40, 0, Math.PI * 2);
        ctx.arc(center, center, 70, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Loot Containers (Yellow Dots)
        ctx.fillStyle = "#f39c12";
        pickups.forEach(p => {
            const dx = (p.position.x - playerPos.x) * scale;
            const dz = (p.position.z - playerPos.z) * scale;
            if (Math.hypot(dx, dz) < center - 5) {
                ctx.beginPath();
                ctx.arc(center + dx, center + dz, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw Enemy Faction Threat Dots (Red Dots)
        ctx.fillStyle = "#e74c3c";
        agents.forEach(a => {
            if (a.state !== "DEAD") {
                const dx = (a.position.x - playerPos.x) * scale;
                const dz = (a.position.z - playerPos.z) * scale;
                if (Math.hypot(dx, dz) < center - 5) {
                    ctx.beginPath();
                    ctx.arc(center + dx, center + dz, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        // Draw Player Arrow Marker (Center)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-yaw);
        ctx.fillStyle = "#e69d25";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    triggerHitMarker() {
        if (!this.hitMarker) return;
        this.hitMarker.classList.add('active');
        setTimeout(() => this.hitMarker.classList.remove('active'), 120);
    }

    triggerDamageEffect() {
        if (!this.damageVignette) return;
        this.damageVignette.classList.add('vignette-active');
        setTimeout(() => this.damageVignette.classList.remove('vignette-active'), 250);
    }

    showToast(message, type = "info") {
        if (!this.notificationContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        this.notificationContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }
}
