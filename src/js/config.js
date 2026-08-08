/* --------------------------------------------------------------------------
   GAME CONFIGURATION & WEAPON DATABASE MATRIX
   -------------------------------------------------------------------------- */

const GAME_CONFIG = {
    // Seed for 100% offline deterministic loot container generation
    MAP_SEED: 7392104,
    WORLD_SIZE: 600, // 600m x 600m render bounds representing scaled 4km world matrix
    
    // Inventory limits
    MAX_PRIMARY_WEAPONS: 2,
    MAX_WEIGHT_CAPACITY: 15.0, // kg
    
    // Player Vitals Default
    PLAYER_MAX_HP: 100,
    PLAYER_MAX_STAMINA: 100,
    STAMINA_REGEN_RATE: 25, // % per sec
    STAMINA_DRAIN_RATE: 20, // % per sec when sprinting
    
    // Zone Definitions
    ZONES: {
        ZONE_1: {
            id: 1,
            name: "ZONE 1: SURVIVOR RUINS & RESIDENTIAL",
            minRadius: 0,
            maxRadius: 180,
            color: "#3498db",
            threat: "LOW",
            lootTiers: [1, 2]
        },
        ZONE_2: {
            id: 2,
            name: "ZONE 2: POLICE CHECKPOINT & HIGHWAY",
            minRadius: 180,
            maxRadius: 360,
            color: "#f39c12",
            threat: "MEDIUM",
            lootTiers: [2, 3]
        },
        ZONE_3: {
            id: 3,
            name: "ZONE 3: MILITARY FORTRESS & UNDERGROUND BUNKER",
            minRadius: 360,
            maxRadius: 600,
            color: "#e74c3c",
            threat: "EXTREME",
            lootTiers: [3, 4]
        }
    }
};

// Firearm Tier Database with tactile parameters
const WEAPONS_DATABASE = {
    "m9_pistol": {
        id: "m9_pistol",
        name: "M9 Tactical Pistol",
        tier: 1,
        tierName: "Civilian / Sidearm",
        weight: 1.2, // kg
        damage: 28,
        fireRate: 0.25, // sec per shot (semi-auto)
        range: 80,
        magCapacity: 15,
        maxAmmo: 60,
        ammoType: "9mm NATO",
        recoil: 0.05,
        color: 0x95a5a6,
        modelType: "pistol",
        soundFreq: 220
    },
    "remington_shotgun": {
        id: "remington_shotgun",
        name: "Remington 870 Shotgun",
        tier: 1,
        tierName: "Civilian Hunting",
        weight: 3.4,
        damage: 75,
        fireRate: 0.9,
        range: 40,
        magCapacity: 6,
        maxAmmo: 24,
        ammoType: "12 Gauge Buckshot",
        recoil: 0.18,
        color: 0x7f8c8d,
        modelType: "shotgun",
        soundFreq: 140
    },
    "mp5_smg": {
        id: "mp5_smg",
        name: "MP5A3 Submachine Gun",
        tier: 2,
        tierName: "Police Tactical",
        weight: 2.9,
        damage: 24,
        fireRate: 0.09, // rapid auto
        range: 120,
        magCapacity: 30,
        maxAmmo: 120,
        ammoType: "9x19mm Parabellum",
        recoil: 0.04,
        color: 0x3498db,
        modelType: "smg",
        soundFreq: 310
    },
    "m4a1_rifle": {
        id: "m4a1_rifle",
        name: "M4A1 Carbine Assault Rifle",
        tier: 3,
        tierName: "Military Spec-Ops",
        weight: 3.6,
        damage: 36,
        fireRate: 0.11,
        range: 220,
        magCapacity: 30,
        maxAmmo: 150,
        ammoType: "5.56x45mm NATO",
        recoil: 0.07,
        color: 0xf39c12,
        modelType: "rifle",
        soundFreq: 400
    },
    "m24_sniper": {
        id: "m24_sniper",
        name: "M24 SWS Bolt-Action Sniper",
        tier: 3,
        tierName: "Military Marksman",
        weight: 5.5,
        damage: 110,
        fireRate: 1.4,
        range: 450,
        magCapacity: 5,
        maxAmmo: 25,
        ammoType: "7.62x51mm NATO",
        recoil: 0.25,
        color: 0xe67e22,
        modelType: "sniper",
        soundFreq: 110
    },
    "m32_launcher": {
        id: "m32_launcher",
        name: "M32 MGL Rotary Grenade Launcher",
        tier: 4,
        tierName: "Elite Prototype",
        weight: 6.0,
        damage: 160,
        fireRate: 0.8,
        range: 160,
        magCapacity: 6,
        maxAmmo: 18,
        ammoType: "40mm HE Grenade",
        recoil: 0.3,
        color: 0x9b59b6,
        modelType: "heavy",
        soundFreq: 80
    }
};

// Seeded Offline Pseudo-Random Generator (Linear Congruential Generator)
class SeededRandom {
    constructor(seed = 12345) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    choice(array) {
        return array[Math.floor(this.next() * array.length)];
    }
}
