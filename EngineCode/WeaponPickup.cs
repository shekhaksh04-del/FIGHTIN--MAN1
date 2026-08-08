using System;
using UnityEngine;

/// <summary>
/// ScriptableObject defining immutable firearm configuration stats.
/// </summary>
[CreateAssetMenu(fileName = "NewWeaponConfig", menuName = "Weapons/Weapon Configuration")]
public class WeaponConfig : ScriptableObject
{
    public string weaponId;
    public string weaponName;
    public int tier; // 1: Civilian, 2: Police, 3: Military, 4: Heavy
    public float weightKg;
    public float baseDamage;
    public float fireRateSec;
    public float maxRangeMeters;
    public int magazineCapacity;
    public int defaultReserveAmmo;
    public string ammoType;
    public GameObject weaponModelPrefab;
}

/// <summary>
/// World 3D pickup component attached to ground models.
/// </summary>
public class WeaponPickup : MonoBehaviour
{
    [Header("Configuration")]
    public WeaponConfig config;
    public int currentMagazineAmmo;

    private void Awake()
    {
        if (config != null && currentMagazineAmmo == 0)
        {
            currentMagazineAmmo = config.magazineCapacity;
        }
    }

    /// <summary>
    /// Returns current weapon state structure for inventory insertion.
    /// </summary>
    public WeaponInstance GetWeaponInstance()
    {
        return new WeaponInstance
        {
            config = config,
            currentAmmo = currentMagazineAmmo,
            reserveAmmo = config.defaultReserveAmmo
        };
    }
}

[Serializable]
public class WeaponInstance
{
    public WeaponConfig config;
    public int currentAmmo;
    public int reserveAmmo;
}
