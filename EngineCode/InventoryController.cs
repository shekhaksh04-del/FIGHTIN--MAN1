using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Modular 2-Slot Primary Weapon Inventory Controller with Drop on Swap logic.
/// Supports 100% offline local updates without network dependencies.
/// </summary>
public class InventoryController : MonoBehaviour
{
    [Header("Inventory Settings")]
    public const int MAX_WEAPONS = 2;
    public float maxWeightCapacityKg = 15.0f;
    public Transform playerSocketRightHand;
    public Transform dropSpawnPoint;

    [Header("Current Loadout Slots")]
    // Array managing strict 2-weapon max capacity
    // Index 0 = Slot 1, Index 1 = Slot 2
    [SerializeField] private WeaponInstance[] weaponSlots = new WeaponInstance[MAX_WEAPONS];
    private int activeSlotIndex = 0;

    public event Action OnInventoryUpdated;

    private void Start()
    {
        UpdateActiveWeaponVisuals();
    }

    /// <summary>
    /// Gets total weight of carried weapons in loadout.
    /// </summary>
    public float GetCarriedWeightKg()
    {
        float total = 0f;
        foreach (var w in weaponSlots)
        {
            if (w != null && w.config != null)
                total += w.config.weightKg;
        }
        return total;
    }

    /// <summary>
    /// Swaps/Equips weapon when pressing interact "E" on a WeaponPickup.
    /// </summary>
    public void InteractWithPickup(WeaponPickup pickup)
    {
        if (pickup == null || pickup.config == null) return;

        int targetSlot = -1;

        // 1. Check for an empty slot
        for (int i = 0; i < MAX_WEAPONS; i++)
        {
            if (weaponSlots[i] == null)
            {
                targetSlot = i;
                break;
            }
        }

        // 2. If slots are full (2/2), drop currently equipped weapon at player coordinates
        if (targetSlot == -1)
        {
            targetSlot = activeSlotIndex;
            DropWeaponSlot(targetSlot);
        }

        // 3. Equip new weapon into designated slot
        weaponSlots[targetSlot] = pickup.GetWeaponInstance();
        activeSlotIndex = targetSlot;

        // 4. Destroy collected pickup object from world
        Destroy(pickup.gameObject);

        // 5. Update visuals & UI completely offline
        UpdateActiveWeaponVisuals();
        OnInventoryUpdated?.Invoke();
    }

    /// <summary>
    /// Drops weapon at slot index onto ground coordinates.
    /// </summary>
    public void DropWeaponSlot(int slotIndex)
    {
        WeaponInstance instance = weaponSlots[slotIndex];
        if (instance == null || instance.config == null) return;

        Vector3 spawnPos = dropSpawnPoint != null ? dropSpawnPoint.position : transform.position + transform.forward * 1.2f;

        if (instance.config.weaponModelPrefab != null)
        {
            GameObject droppedGO = Instantiate(instance.config.weaponModelPrefab, spawnPos, Quaternion.identity);
            WeaponPickup pickupComp = droppedGO.GetComponent<WeaponPickup>();
            if (pickupComp != null)
            {
                pickupComp.config = instance.config;
                pickupComp.currentMagazineAmmo = instance.currentAmmo;
            }
        }

        weaponSlots[slotIndex] = null;
    }

    private void UpdateActiveWeaponVisuals()
    {
        // Clear socket children
        foreach (Transform child in playerSocketRightHand)
        {
            Destroy(child.gameObject);
        }

        WeaponInstance active = weaponSlots[activeSlotIndex];
        if (active != null && active.config != null && active.config.weaponModelPrefab != null)
        {
            Instantiate(active.config.weaponModelPrefab, playerSocketRightHand);
        }
    }
}
