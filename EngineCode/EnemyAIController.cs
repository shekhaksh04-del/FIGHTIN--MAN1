using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public enum AIState
{
    Patrol,
    Alert,
    Combat,
    Retreat
}

/// <summary>
/// Offline Finite State Machine (FSM) Enemy AI for open-world shooter.
/// Runs entirely on local hardware without server dependencies.
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class EnemyAIController : MonoBehaviour
{
    [Header("FSM State")]
    public AIState currentState = AIState.Patrol;

    [Header("Stats")]
    public float maxHealth = 100f;
    public float currentHealth = 100f;
    public float detectionRadius = 35f;
    public float shootInterval = 1.2f;
    public float damagePerShot = 12f;

    [Header("References")]
    public Transform playerTransform;
    public LayerMask lineOfSightMask;
    public Transform[] patrolWaypoints;

    private NavMeshAgent agent;
    private int currentWaypointIndex = 0;
    private float lastShotTime = 0f;
    private Vector3 soundInvestigationTarget;

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        currentHealth = maxHealth;
    }

    private void Update()
    {
        if (currentHealth <= 0) return;

        float distToPlayer = playerTransform != null ? Vector3.Distance(transform.position, playerTransform.position) : 9999f;

        // FSM State Machine Switch
        switch (currentState)
        {
            case AIState.Patrol:
                UpdatePatrolState(distToPlayer);
                break;
            case AIState.Alert:
                UpdateAlertState(distToPlayer);
                break;
            case AIState.Combat:
                UpdateCombatState(distToPlayer);
                break;
            case AIState.Retreat:
                UpdateRetreatState(distToPlayer);
                break;
        }
    }

    private void UpdatePatrolState(float distToPlayer)
    {
        if (distToPlayer < detectionRadius && HasLineOfSight())
        {
            currentState = AIState.Combat;
            return;
        }

        if (patrolWaypoints != null && patrolWaypoints.Length > 0)
        {
            if (!agent.hasPath || agent.remainingDistance < 1.0f)
            {
                currentWaypointIndex = (currentWaypointIndex + 1) % patrolWaypoints.Length;
                agent.SetDestination(patrolWaypoints[currentWaypointIndex].position);
            }
        }
    }

    private void UpdateAlertState(float distToPlayer)
    {
        if (distToPlayer < detectionRadius && HasLineOfSight())
        {
            currentState = AIState.Combat;
            return;
        }

        agent.SetDestination(soundInvestigationTarget);

        if (agent.remainingDistance < 1.5f)
        {
            currentState = AIState.Patrol;
        }
    }

    private void UpdateCombatState(float distToPlayer)
    {
        // Check low health retreat condition (<25% HP)
        if (currentHealth < maxHealth * 0.25f)
        {
            currentState = AIState.Retreat;
            return;
        }

        if (distToPlayer > detectionRadius * 2.0f)
        {
            currentState = AIState.Patrol;
            return;
        }

        // Aim towards player
        Vector3 dir = (playerTransform.position - transform.position).normalized;
        dir.y = 0;
        transform.rotation = Quaternion.LookRotation(dir);

        // Keep tactical distance
        if (distToPlayer > 10f)
        {
            agent.SetDestination(playerTransform.position);
        }
        else
        {
            agent.ResetPath();
        }

        // Shoot at interval
        if (Time.time - lastShotTime > shootInterval)
        {
            lastShotTime = Time.time;
            if (HasLineOfSight())
            {
                // Distance based accuracy
                float accuracy = Mathf.Clamp01(1.0f - (distToPlayer / 60f));
                if (Random.value < accuracy)
                {
                    // Apply damage to player
                }
            }
        }
    }

    private void UpdateRetreatState(float distToPlayer)
    {
        // Flee away from player
        Vector3 fleeDir = (transform.position - playerTransform.position).normalized;
        Vector3 retreatPos = transform.position + fleeDir * 20f;
        agent.SetDestination(retreatPos);

        // Heal when safe
        if (distToPlayer > 45f)
        {
            currentHealth += 20f * Time.deltaTime;
            if (currentHealth >= maxHealth * 0.5f)
            {
                currentState = AIState.Combat;
            }
        }
    }

    public void HearGunshot(Vector3 soundOrigin)
    {
        if (currentState == AIState.Patrol)
        {
            soundInvestigationTarget = soundOrigin;
            currentState = AIState.Alert;
        }
    }

    private bool HasLineOfSight()
    {
        if (playerTransform == null) return false;
        Vector3 origin = transform.position + Vector3.up * 1.5f;
        Vector3 dir = (playerTransform.position + Vector3.up * 1.5f) - origin;
        return !Physics.Raycast(origin, dir.normalized, dir.magnitude, lineOfSightMask);
    }
}
