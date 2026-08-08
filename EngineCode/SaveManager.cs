using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

[Serializable]
public class PlayerSaveData
{
    public float posX, posY, posZ;
    public float health;
    public float stamina;
    public List<SavedWeaponData> equippedWeapons = new List<SavedWeaponData>();
    public List<string> harvestedLootContainerIds = new List<string>();
}

[Serializable]
public class SavedWeaponData
{
    public string weaponId;
    public int currentMagazineAmmo;
    public int reserveAmmo;
}

/// <summary>
/// 100% Offline Local Data Persistence System using JSON Serialization to Local Device Storage.
/// </summary>
public class SaveManager : MonoBehaviour
{
    private string saveFilePath;

    private void Awake()
    {
        // Local Device Storage Path
        saveFilePath = Path.Combine(Application.persistentDataPath, "fob_offline_save.json");
    }

    public bool SaveGame(Vector3 playerPos, float hp, float stamina, List<SavedWeaponData> weapons, List<string> lootedIds)
    {
        PlayerSaveData data = new PlayerSaveData
        {
            posX = playerPos.x,
            posY = playerPos.y,
            posZ = playerPos.z,
            health = hp,
            stamina = stamina,
            equippedWeapons = weapons,
            harvestedLootContainerIds = lootedIds
        };

        try
        {
            string json = JsonUtility.ToJson(data, true);
            File.WriteAllText(saveFilePath, json);
            Debug.Log($"Offline Save Successful: {saveFilePath}");
            return true;
        }
        catch (Exception ex)
        {
            Debug.LogError($"Save Failed: {ex.Message}");
            return false;
        }
    }

    public PlayerSaveData LoadGame()
    {
        if (!File.Exists(saveFilePath))
        {
            Debug.LogWarning("No save file found on local storage.");
            return null;
        }

        try
        {
            string json = File.ReadAllText(saveFilePath);
            PlayerSaveData data = JsonUtility.FromJson<PlayerSaveData>(json);
            Debug.Log("Offline Save File Loaded Successfully.");
            return data;
        }
        catch (Exception ex)
        {
            Debug.LogError($"Load Failed: {ex.Message}");
            return null;
        }
    }
}
