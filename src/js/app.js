/* --------------------------------------------------------------------------
   FORWARD OPERATING BASE - MAIN GAME INITIALIZER & LOOP COORDINATOR
   -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate Core Subsystems
    console.log("Initializing FOB Tactical Realism System...");

    const graphicEngine = new GraphicEngine();
    const world = new GameWorld(graphicEngine.scene);
    const player = new PlayerController(graphicEngine.scene, graphicEngine.camera, world);
    const inventory = new InventoryManager(player, world);
    
    // Global UI Instance
    window.UI = new UIManager();

    // AI Faction Manager
    const aiManager = new AIManager(graphicEngine.scene, world, player);

    // Tactile Firearm Weapon System
    const weaponSystem = new WeaponSystem(
        graphicEngine.scene,
        graphicEngine.camera,
        player,
        inventory,
        aiManager
    );

    // Save Persistence System
    window.SaveSystem = new SaveManager(player, inventory, world);

    // Give default starter sidearm (M9 Pistol)
    inventory.giveDefaultStarterWeapon();

    // Key Listener Bindings
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE') {
            inventory.handlePickupInteract();
        } else if (e.code === 'Digit1') {
            inventory.selectSlot(0);
        } else if (e.code === 'Digit2') {
            inventory.selectSlot(1);
        } else if (e.code === 'KeyR') {
            weaponSystem.reload();
        } else if (e.code === 'KeyK') {
            window.SaveSystem.saveGame();
        } else if (e.code === 'KeyL') {
            window.SaveSystem.loadGame();
        } else if (e.code === 'Escape') {
            window.UI.toggleMenu();
        } else {
            player.handleInput(e.key, true);
        }
    });

    window.addEventListener('keyup', (e) => {
        player.handleInput(e.key, false);
    });

    // Mouse Shooting Listener
    window.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body && e.button === 0) {
            weaponSystem.shoot();
        }
    });

    let lastTime = performance.now();

    // Main 60FPS Game Loop
    function gameLoop(now) {
        requestAnimationFrame(gameLoop);

        const delta = Math.min(0.05, (now - lastTime) / 1000);
        const timeSec = now / 1000;
        lastTime = now;

        if (!window.UI.isMenuOpen) {
            // Update Subsystems
            world.update(delta, timeSec);
            player.update(delta, inventory.getTotalWeight());
            inventory.checkNearbyPickups();
            aiManager.update(delta, timeSec);

            // Update UI HUD
            window.UI.updatePlayerVitals(player.hp, player.maxHp, player.stamina, player.maxStamina);
            window.UI.updateCompassAndZone(player.position, player.cameraYaw);
            window.UI.renderMinimap(player.position, player.cameraYaw, aiManager.agents, world.lootPickups);
        }

        // Render WebGL Scene
        graphicEngine.render();
    }

    // Auto-load existing local save if present
    const existingSave = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
    if (existingSave) {
        window.UI.showToast("LOCAL SAVE STATE DETECTED - PRESS [L] TO LOAD IN MENU");
    }

    // Launch Game Loop
    requestAnimationFrame(gameLoop);
});
