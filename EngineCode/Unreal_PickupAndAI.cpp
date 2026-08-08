// Unreal Engine 5 C++ Architectural Blueprint Snippet

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "GameFramework/SaveGame.h"
#include "Kismet/GameplayStatics.h"
#include "Unreal_PickupAndAI.generated.h"

// ---------------------------------------------------------
// 1. UNREAL LOCAL SAVE GAME PERSISTENCE
// ---------------------------------------------------------
UCLASS()
class UFOBSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(VisibleAnywhere, Category = "SaveData")
    FVector PlayerLocation;

    UPROPERTY(VisibleAnywhere, Category = "SaveData")
    float Health;

    UPROPERTY(VisibleAnywhere, Category = "SaveData")
    float Stamina;

    UPROPERTY(VisibleAnywhere, Category = "SaveData")
    TArray<FString> HarvestedLootContainerIDs;
};

// ---------------------------------------------------------
// 2. MODULAR INVENTORY COMPONENT (2 WEAPONS MAX)
// ---------------------------------------------------------
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class UInventoryComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Inventory")
    int32 MaxWeaponSlots = 2;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Inventory")
    TArray<AActor*> EquippedWeapons;

    UFUNCTION(BlueprintCallable, Category = "Inventory")
    bool SwapWeapon(AActor* NewWeaponActor)
    {
        if (EquippedWeapons.Num() >= MaxWeaponSlots)
        {
            // Drop currently equipped active weapon to ground
            AActor* ActiveWeapon = EquippedWeapons[0];
            if (ActiveWeapon)
            {
                ActiveWeapon->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
                ActiveWeapon->SetActorLocation(GetOwner()->GetActorLocation() + GetOwner()->GetActorForwardVector() * 100.0f);
                EquippedWeapons.RemoveAt(0);
            }
        }

        EquippedWeapons.Add(NewWeaponActor);
        return true;
    }
};
