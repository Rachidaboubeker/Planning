/**
 * NETTOYAGE AUTOMATIQUE DES DONNÉES CORROMPUES
 * Résout définitivement les problèmes d'employés introuvables
 */

(function() {
    'use strict';

    console.log('🧹 Démarrage du nettoyage automatique des données...');

    // ==================== NETTOYAGE BACKEND ====================

    /**
     * Nettoie les fichiers JSON côté serveur
     */
    async function cleanupBackendData() {
        console.log('🔧 Nettoyage des données backend...');

        try {
            // Récupérer les données actuelles
            const response = await fetch('/api/employees');
            const employees = await response.json();

            const shiftsResponse = await fetch('/api/shifts');
            const shifts = await shiftsResponse.json();

            console.log(`📊 Données actuelles: ${employees.length} employés, ${shifts.length} créneaux`);

            // Identifier les employés actifs
            const activeEmployees = employees.filter(emp =>
                emp.actif === true &&
                emp.nom !== 'Supprimé' &&
                emp.nom !== 'Employé'
            );

            const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));

            console.log(`✅ Employés actifs: ${activeEmployees.length}`);
            activeEmployees.forEach(emp => {
                console.log(`   - ${emp.nom} ${emp.prenom} (${emp.id})`);
            });

            // Identifier les créneaux orphelins
            const orphanedShifts = shifts.filter(shift =>
                !activeEmployeeIds.has(shift.employee_id)
            );

            console.log(`❌ Créneaux orphelins: ${orphanedShifts.length}`);
            orphanedShifts.forEach(shift => {
                console.log(`   - ${shift.id} -> employé ${shift.employee_id} (${shift.day} ${shift.start_hour}h)`);
            });

            // Proposer les actions de nettoyage
            return {
                activeEmployees,
                orphanedShifts,
                stats: {
                    totalEmployees: employees.length,
                    activeEmployees: activeEmployees.length,
                    inactiveEmployees: employees.length - activeEmployees.length,
                    totalShifts: shifts.length,
                    orphanedShifts: orphanedShifts.length,
                    validShifts: shifts.length - orphanedShifts.length
                }
            };

        } catch (error) {
            console.error('❌ Erreur lors du nettoyage backend:', error);
            return null;
        }
    }

    // ==================== RÉPARATION AUTOMATIQUE ====================

    /**
     * Répare automatiquement les créneaux orphelins
     */
    async function repairOrphanedShifts(cleanupData) {
        console.log('🔧 Réparation des créneaux orphelins...');

        if (!cleanupData || cleanupData.orphanedShifts.length === 0) {
            console.log('✅ Aucun créneau orphelin à réparer');
            return { repaired: 0, deleted: 0 };
        }

        const { activeEmployees, orphanedShifts } = cleanupData;

        if (activeEmployees.length === 0) {
            console.warn('⚠️ Aucun employé actif pour la réparation');
            return { repaired: 0, deleted: orphanedShifts.length };
        }

        // Choisir l'employé de réparation (manager en priorité)
        const defaultEmployee = activeEmployees.find(emp => emp.poste === 'manager') || activeEmployees[0];
        console.log(`🔧 Employé de réparation: ${defaultEmployee.nom} ${defaultEmployee.prenom}`);

        let repaired = 0;
        let deleted = 0;

        // Réparer ou supprimer chaque créneau orphelin
        for (const shift of orphanedShifts) {
            try {
                // Option 1: Réparer en réassignant à un employé actif
                if (shift.day && shift.start_hour !== undefined && shift.duration) {
                    const updatedShift = {
                        ...shift,
                        employee_id: defaultEmployee.id
                    };

                    const response = await fetch(`/api/shifts/${shift.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedShift)
                    });

                    if (response.ok) {
                        console.log(`✅ Créneau réparé: ${shift.id} -> ${defaultEmployee.id}`);
                        repaired++;
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } else {
                    throw new Error('Données de créneau invalides');
                }

            } catch (error) {
                // Option 2: Supprimer le créneau s'il ne peut pas être réparé
                try {
                    const deleteResponse = await fetch(`/api/shifts/${shift.id}`, {
                        method: 'DELETE'
                    });

                    if (deleteResponse.ok) {
                        console.log(`🗑️ Créneau supprimé: ${shift.id}`);
                        deleted++;
                    } else {
                        console.error(`❌ Impossible de supprimer le créneau ${shift.id}`);
                    }
                } catch (deleteError) {
                    console.error(`❌ Erreur lors de la suppression de ${shift.id}:`, deleteError);
                }
            }
        }

        return { repaired, deleted };
    }

    // ==================== NETTOYAGE EMPLOYÉS INACTIFS ====================

    /**
     * Supprime les employés inactifs du système
     */
    async function removeInactiveEmployees(cleanupData) {
        console.log('🧹 Suppression des employés inactifs...');

        try {
            const response = await fetch('/api/employees');
            const allEmployees = await response.json();

            const inactiveEmployees = allEmployees.filter(emp =>
                emp.actif === false ||
                emp.nom === 'Supprimé' ||
                emp.nom === 'Employé'
            );

            let deleted = 0;

            for (const employee of inactiveEmployees) {
                try {
                    const deleteResponse = await fetch(`/api/employees/${employee.id}`, {
                        method: 'DELETE'
                    });

                    if (deleteResponse.ok) {
                        console.log(`🗑️ Employé inactif supprimé: ${employee.nom} ${employee.prenom} (${employee.id})`);
                        deleted++;
                    }
                } catch (error) {
                    console.error(`❌ Erreur suppression employé ${employee.id}:`, error);
                }
            }

            return { deleted };

        } catch (error) {
            console.error('❌ Erreur lors de la suppression des employés inactifs:', error);
            return { deleted: 0 };
        }
    }

    // ==================== RÉGÉNÉRATION FRONTEND ====================

    /**
     * Force la régénération complète de l'interface
     */
    function regenerateFrontend() {
        console.log('🔄 Régénération de l\'interface...');

        // Vider le cache StateManager
        if (window.StateManager && window.StateManager.state) {
            window.StateManager.state.clear();
            console.log('🧹 Cache StateManager vidé');
        }

        // Recharger les données
        if (window.APIManager && window.APIManager.loadInitialData) {
            window.APIManager.loadInitialData().then(() => {
                console.log('✅ Données rechargées');

                // Régénérer la grille
                if (window.PlanningManager && window.PlanningManager.generateGrid) {
                    window.PlanningManager.generateGrid();
                    console.log('✅ Grille régénérée');

                    // Rendre les créneaux
                    setTimeout(() => {
                        if (window.PlanningManager.renderShifts) {
                            window.PlanningManager.renderShifts();
                            console.log('✅ Créneaux rendus');
                        }
                    }, 100);
                }
            });
        }
    }

    // ==================== PROCESSUS PRINCIPAL ====================

    /**
     * Exécute le nettoyage complet
     */
    async function executeFullCleanup() {
        console.log('🚀 Démarrage du nettoyage complet...');

        try {
            // 1. Analyse des données
            const cleanupData = await cleanupBackendData();
            if (!cleanupData) {
                console.error('❌ Impossible d\'analyser les données');
                return;
            }

            console.log('📊 ANALYSE TERMINÉE:', cleanupData.stats);

            // 2. Réparation des créneaux orphelins
            const repairResults = await repairOrphanedShifts(cleanupData);
            console.log(`🔧 RÉPARATION: ${repairResults.repaired} réparés, ${repairResults.deleted} supprimés`);

            // 3. Suppression des employés inactifs
            const cleanResults = await removeInactiveEmployees(cleanupData);
            console.log(`🧹 NETTOYAGE: ${cleanResults.deleted} employés inactifs supprimés`);

            // 4. Régénération de l'interface
            regenerateFrontend();

            // 5. Rapport final
            setTimeout(() => {
                console.log('🎉 NETTOYAGE TERMINÉ AVEC SUCCÈS !');
                console.log('📊 RÉSUMÉ:');
                console.log(`   - ${cleanupData.stats.activeEmployees} employés actifs conservés`);
                console.log(`   - ${cleanResults.deleted} employés inactifs supprimés`);
                console.log(`   - ${repairResults.repaired} créneaux réparés`);
                console.log(`   - ${repairResults.deleted} créneaux orphelins supprimés`);

                // Notification utilisateur
                if (window.NotificationManager) {
                    window.NotificationManager.show({
                        type: 'success',
                        title: 'Données nettoyées',
                        message: `${cleanResults.deleted + repairResults.deleted} éléments supprimés, ${repairResults.repaired} réparés`,
                        duration: 5000
                    });
                }
            }, 1000);

        } catch (error) {
            console.error('💥 ERREUR LORS DU NETTOYAGE:', error);

            if (window.NotificationManager) {
                window.NotificationManager.show({
                    type: 'error',
                    title: 'Erreur de nettoyage',
                    message: 'Une erreur est survenue lors du nettoyage des données',
                    duration: 8000
                });
            }
        }
    }

    // ==================== EXPOSITION ET EXÉCUTION ====================

    // Exposer les fonctions pour debug
    window.dataCleanup = {
        analyze: cleanupBackendData,
        repairShifts: repairOrphanedShifts,
        removeInactive: removeInactiveEmployees,
        regenerate: regenerateFrontend,
        executeAll: executeFullCleanup
    };

    // Exécution automatique si des problèmes sont détectés
    setTimeout(() => {
        cleanupBackendData().then(data => {
            if (data && (data.orphanedShifts.length > 0 || data.stats.inactiveEmployees > 0)) {
                console.log(`⚠️ ${data.orphanedShifts.length} créneaux orphelins et ${data.stats.inactiveEmployees} employés inactifs détectés`);
                console.log('🚀 Lancement du nettoyage automatique...');
                executeFullCleanup();
            } else {
                console.log('✅ Aucun problème de données détecté');
            }
        });
    }, 2000);

    console.log('🧹 Module de nettoyage automatique chargé');
    console.log('🛠️ Fonctions disponibles: window.dataCleanup');

})();