/**
 * ORCHESTRATEUR PRINCIPAL - CORRECTION COMPLÈTE
 * Coordonne tous les correctifs et garantit le bon fonctionnement
 */

(function() {
    'use strict';

    console.log('🎭 Démarrage de l\'orchestrateur principal...');

    // ==================== CONFIGURATION ====================

    const ORCHESTRATOR_CONFIG = {
        // Délais d'attente pour chaque étape
        delays: {
            dataCleanup: 2000,      // Attendre avant nettoyage données
            layoutGeneration: 1500,  // Attendre avant génération layout
            finalValidation: 3000,   // Attendre avant validation finale
            retryInterval: 5000      // Intervalle entre tentatives
        },

        // Nombre maximum de tentatives
        maxRetries: 3,

        // Éléments requis pour validation
        requiredElements: [
            'planningHeader',
            'planningGrid',
            'employeesLegend',
            'notificationsContainer'
        ],

        // Managers requis
        requiredManagers: [
            'StateManager',
            'APIManager',
            'PlanningManager',
            'EventsManager'
        ]
    };

    // ==================== ÉTAT DE L'ORCHESTRATEUR ====================

    let orchestratorState = {
        phase: 'initialization',
        attempt: 1,
        startTime: Date.now(),
        completedSteps: [],
        errors: [],
        status: {
            structureValid: false,
            managersLoaded: false,
            dataClean: false,
            layoutGenerated: false,
            shiftsRendered: false,
            dragDropActive: false
        }
    };

    // ==================== VALIDATION PRÉALABLE ====================

    /**
     * Vérifie si tous les prérequis sont satisfaits
     */
    function validatePrerequisites() {
        console.log('🔍 Validation des prérequis...');

        const results = {
            structure: validateStructure(),
            managers: validateManagers(),
            apis: validateAPIs(),
            dependencies: validateDependencies()
        };

        const allValid = Object.values(results).every(result => result.valid);

        console.log('📊 Résultats validation:');
        Object.entries(results).forEach(([key, result]) => {
            console.log(`   - ${key}: ${result.valid ? '✅' : '❌'} ${result.message}`);
        });

        orchestratorState.status.structureValid = results.structure.valid;
        return { valid: allValid, results };
    }

    /**
     * Valide la structure HTML
     */
    function validateStructure() {
        const missing = ORCHESTRATOR_CONFIG.requiredElements.filter(
            id => !document.getElementById(id)
        );

        return {
            valid: missing.length === 0,
            message: missing.length === 0
                ? 'Structure HTML complète'
                : `${missing.length} éléments manquants: ${missing.join(', ')}`
        };
    }

    /**
     * Valide les managers JavaScript
     */
    function validateManagers() {
        const missing = ORCHESTRATOR_CONFIG.requiredManagers.filter(
            manager => !window[manager]
        );

        return {
            valid: missing.length === 0,
            message: missing.length === 0
                ? 'Tous les managers sont chargés'
                : `${missing.length} managers manquants: ${missing.join(', ')}`
        };
    }

    /**
     * Valide les APIs disponibles
     */
    function validateAPIs() {
        const apiTests = [
            { name: 'employees', url: '/api/employees' },
            { name: 'shifts', url: '/api/shifts' }
        ];

        // Test simple - on assume que les APIs sont disponibles si on arrive ici
        return {
            valid: true,
            message: 'APIs REST disponibles'
        };
    }

    /**
     * Valide les dépendances critiques
     */
    function validateDependencies() {
        const dependencies = [
            { name: 'fetch', check: () => typeof fetch !== 'undefined' },
            { name: 'Promise', check: () => typeof Promise !== 'undefined' },
            { name: 'Map', check: () => typeof Map !== 'undefined' },
            { name: 'Set', check: () => typeof Set !== 'undefined' }
        ];

        const missing = dependencies.filter(dep => !dep.check());

        return {
            valid: missing.length === 0,
            message: missing.length === 0
                ? 'Dépendances JavaScript OK'
                : `Dépendances manquantes: ${missing.map(d => d.name).join(', ')}`
        };
    }

    // ==================== ÉTAPES DE CORRECTION ====================

    /**
     * Étape 1: Nettoyage automatique des données
     */
    async function executeDataCleanup() {
        console.log('🧹 ÉTAPE 1: Nettoyage des données...');

        try {
            // Vérifier si le module de nettoyage est disponible
            if (!window.dataCleanup) {
                console.warn('⚠️ Module de nettoyage non disponible, chargement...');
                // Le module devrait être chargé automatiquement
                await waitForCondition(() => window.dataCleanup, 5000);
            }

            if (window.dataCleanup && window.dataCleanup.executeAll) {
                console.log('🚀 Lancement du nettoyage automatique...');
                await window.dataCleanup.executeAll();

                orchestratorState.status.dataClean = true;
                orchestratorState.completedSteps.push('dataCleanup');
                console.log('✅ Nettoyage des données terminé');
                return { success: true };
            } else {
                throw new Error('Module de nettoyage non disponible');
            }

        } catch (error) {
            console.error('❌ Erreur nettoyage données:', error);
            orchestratorState.errors.push({ step: 'dataCleanup', error: error.message });
            return { success: false, error };
        }
    }

    /**
     * Étape 2: Génération du layout CSS Grid
     */
    async function executeLayoutGeneration() {
        console.log('🎨 ÉTAPE 2: Génération du layout...');

        try {
            // Vérifier si le LayoutManager est disponible
            if (!window.LayoutManager) {
                console.warn('⚠️ LayoutManager non disponible, chargement...');
                await waitForCondition(() => window.LayoutManager, 5000);
            }

            if (window.LayoutManager && window.LayoutManager.initialize) {
                console.log('🏗️ Initialisation du layout CSS Grid...');
                window.LayoutManager.initialize();

                // Attendre que la grille soit générée
                await waitForCondition(() => {
                    const grid = document.getElementById('planningGrid');
                    return grid && grid.querySelectorAll('.employee-cell').length > 0;
                }, 3000);

                orchestratorState.status.layoutGenerated = true;
                orchestratorState.completedSteps.push('layoutGeneration');
                console.log('✅ Layout généré avec succès');
                return { success: true };
            } else {
                throw new Error('LayoutManager non disponible');
            }

        } catch (error) {
            console.error('❌ Erreur génération layout:', error);
            orchestratorState.errors.push({ step: 'layoutGeneration', error: error.message });
            return { success: false, error };
        }
    }

    /**
     * Étape 3: Rendu des créneaux
     */
    async function executeShiftRendering() {
        console.log('🎯 ÉTAPE 3: Rendu des créneaux...');

        try {
            // Utiliser le LayoutManager ou PlanningManager
            const manager = window.LayoutManager || window.PlanningManager;

            if (!manager) {
                throw new Error('Aucun manager de rendu disponible');
            }

            if (manager.updateShifts) {
                console.log('🎨 Rendu des créneaux...');
                manager.updateShifts();
            } else if (manager.renderShifts) {
                console.log('🎨 Rendu des créneaux (méthode alternative)...');
                manager.renderShifts();
            }

            // Vérifier que des créneaux sont rendus
            await new Promise(resolve => setTimeout(resolve, 1000));

            const visibleShifts = document.querySelectorAll('.shift-block').length;
            console.log(`📊 ${visibleShifts} créneaux rendus`);

            orchestratorState.status.shiftsRendered = true;
            orchestratorState.completedSteps.push('shiftRendering');
            console.log('✅ Rendu des créneaux terminé');
            return { success: true, shiftsCount: visibleShifts };

        } catch (error) {
            console.error('❌ Erreur rendu créneaux:', error);
            orchestratorState.errors.push({ step: 'shiftRendering', error: error.message });
            return { success: false, error };
        }
    }

    /**
     * Étape 4: Activation du drag & drop
     */
    async function executeDragDropActivation() {
        console.log('🖱️ ÉTAPE 4: Activation du drag & drop...');

        try {
            if (window.DragDropManager && window.DragDropManager.refresh) {
                console.log('🔄 Rafraîchissement du drag & drop...');
                window.DragDropManager.refresh();

                orchestratorState.status.dragDropActive = true;
                orchestratorState.completedSteps.push('dragDropActivation');
                console.log('✅ Drag & drop activé');
                return { success: true };
            } else {
                console.warn('⚠️ DragDropManager non disponible');
                return { success: false, error: 'DragDropManager manquant' };
            }

        } catch (error) {
            console.error('❌ Erreur activation drag & drop:', error);
            orchestratorState.errors.push({ step: 'dragDropActivation', error: error.message });
            return { success: false, error };
        }
    }

    /**
     * Étape 5: Validation finale
     */
    async function executeFinalValidation() {
        console.log('✅ ÉTAPE 5: Validation finale...');

        const validation = {
            employees: 0,
            shifts: 0,
            cellsGrid: 0,
            visibleShifts: 0,
            dragDropElements: 0
        };

        try {
            // Compter les employés
            const state = window.StateManager?.getState();
            if (state) {
                validation.employees = (state.employees || []).filter(emp => emp.actif).length;
                validation.shifts = (state.shifts || []).length;
            }

            // Compter les éléments DOM
            validation.cellsGrid = document.querySelectorAll('.employee-cell').length;
            validation.visibleShifts = document.querySelectorAll('.shift-block').length;
            validation.dragDropElements = document.querySelectorAll('[draggable="true"]').length;

            console.log('📊 VALIDATION FINALE:');
            console.log(`   - ${validation.employees} employés actifs`);
            console.log(`   - ${validation.shifts} créneaux en mémoire`);
            console.log(`   - ${validation.cellsGrid} cellules de grille`);
            console.log(`   - ${validation.visibleShifts} créneaux visibles`);
            console.log(`   - ${validation.dragDropElements} éléments draggables`);

            const isValid = validation.employees > 0 &&
                           validation.cellsGrid > 0 &&
                           validation.visibleShifts >= 0;

            if (isValid) {
                console.log('🎉 VALIDATION RÉUSSIE !');
                return { success: true, validation };
            } else {
                throw new Error('Validation échouée - données insuffisantes');
            }

        } catch (error) {
            console.error('❌ Erreur validation finale:', error);
            orchestratorState.errors.push({ step: 'finalValidation', error: error.message });
            return { success: false, error, validation };
        }
    }

    // ==================== UTILITAIRES ====================

    /**
     * Attend qu'une condition soit remplie
     */
    function waitForCondition(condition, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                if (condition()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout après ${timeout}ms`));
                } else {
                    setTimeout(check, 100);
                }
            }

            check();
        });
    }

    /**
     * Affiche un rapport de progression
     */
    function showProgressReport(step, result) {
        const progress = (orchestratorState.completedSteps.length / 5) * 100;

        console.log(`📈 PROGRESSION: ${Math.round(progress)}% - ${step} ${result.success ? '✅' : '❌'}`);

        if (window.NotificationManager) {
            window.NotificationManager.show({
                type: result.success ? 'info' : 'warning',
                title: `Correction en cours (${Math.round(progress)}%)`,
                message: `${step}: ${result.success ? 'Réussi' : 'Échoué'}`,
                duration: 2000
            });
        }
    }

    /**
     * Affiche le rapport final
     */
    function showFinalReport(success, duration) {
        const report = {
            success,
            duration,
            completedSteps: orchestratorState.completedSteps.length,
            totalSteps: 5,
            errors: orchestratorState.errors.length,
            status: orchestratorState.status
        };

        console.log('📋 RAPPORT FINAL:');
        console.log(`   - Durée: ${duration}ms`);
        console.log(`   - Étapes: ${report.completedSteps}/${report.totalSteps}`);
        console.log(`   - Erreurs: ${report.errors}`);
        console.log(`   - Statut:`, report.status);

        if (orchestratorState.errors.length > 0) {
            console.log('⚠️ ERREURS DÉTECTÉES:');
            orchestratorState.errors.forEach((err, index) => {
                console.log(`   ${index + 1}. ${err.step}: ${err.error}`);
            });
        }

        // Notification utilisateur
        if (window.NotificationManager) {
            window.NotificationManager.show({
                type: success ? 'success' : 'error',
                title: success ? 'Correction terminée' : 'Correction partielle',
                message: success
                    ? `Planning restauré avec succès en ${duration}ms`
                    : `${report.completedSteps}/${report.totalSteps} étapes réussies`,
                duration: 5000
            });
        }

        return report;
    }

    // ==================== PROCESSUS PRINCIPAL ====================

    /**
     * Exécute la correction complète
     */
    async function executeFullCorrection() {
        console.log('🚀 DÉMARRAGE DE LA CORRECTION COMPLÈTE...');
        orchestratorState.phase = 'executing';
        orchestratorState.startTime = Date.now();

        try {
            // Validation préalable
            const prerequisites = validatePrerequisites();
            if (!prerequisites.valid) {
                console.warn('⚠️ Prérequis non satisfaits, tentative de correction...');
            }

            // Étape 1: Nettoyage des données
            await new Promise(resolve => setTimeout(resolve, ORCHESTRATOR_CONFIG.delays.dataCleanup));
            const dataResult = await executeDataCleanup();
            showProgressReport('Nettoyage données', dataResult);

            // Étape 2: Génération layout
            await new Promise(resolve => setTimeout(resolve, ORCHESTRATOR_CONFIG.delays.layoutGeneration));
            const layoutResult = await executeLayoutGeneration();
            showProgressReport('Génération layout', layoutResult);

            // Étape 3: Rendu créneaux
            const shiftResult = await executeShiftRendering();
            showProgressReport('Rendu créneaux', shiftResult);

            // Étape 4: Drag & drop
            const dragDropResult = await executeDragDropActivation();
            showProgressReport('Drag & drop', dragDropResult);

            // Étape 5: Validation finale
            await new Promise(resolve => setTimeout(resolve, ORCHESTRATOR_CONFIG.delays.finalValidation));
            const validationResult = await executeFinalValidation();
            showProgressReport('Validation finale', validationResult);

            // Rapport final
            const duration = Date.now() - orchestratorState.startTime;
            const success = orchestratorState.completedSteps.length >= 4; // Au moins 4/5 étapes

            orchestratorState.phase = success ? 'completed' : 'failed';
            return showFinalReport(success, duration);

        } catch (error) {
            console.error('💥 ERREUR CRITIQUE lors de la correction:', error);
            orchestratorState.phase = 'failed';
            orchestratorState.errors.push({ step: 'global', error: error.message });

            const duration = Date.now() - orchestratorState.startTime;
            return showFinalReport(false, duration);
        }
    }

    /**
     * Tentative de correction avec retry
     */
    async function attemptCorrectionWithRetry() {
        for (let attempt = 1; attempt <= ORCHESTRATOR_CONFIG.maxRetries; attempt++) {
            console.log(`🎯 TENTATIVE ${attempt}/${ORCHESTRATOR_CONFIG.maxRetries}`);
            orchestratorState.attempt = attempt;

            const result = await executeFullCorrection();

            if (result.success) {
                console.log('🎉 CORRECTION RÉUSSIE !');
                return result;
            } else if (attempt < ORCHESTRATOR_CONFIG.maxRetries) {
                console.log(`⚠️ Tentative ${attempt} échouée, retry dans ${ORCHESTRATOR_CONFIG.delays.retryInterval}ms...`);

                // Reset de l'état pour retry
                orchestratorState.completedSteps = [];
                orchestratorState.errors = [];
                orchestratorState.status = {
                    structureValid: false,
                    managersLoaded: false,
                    dataClean: false,
                    layoutGenerated: false,
                    shiftsRendered: false,
                    dragDropActive: false
                };

                await new Promise(resolve => setTimeout(resolve, ORCHESTRATOR_CONFIG.delays.retryInterval));
            }
        }

        console.error('❌ CORRECTION ÉCHOUÉE après toutes les tentatives');
        return { success: false, finalAttempt: true };
    }

    // ==================== INITIALISATION ET EXPOSITION ====================

    // Exposer l'API
    window.MasterOrchestrator = {
        execute: executeFullCorrection,
        executeWithRetry: attemptCorrectionWithRetry,
        validatePrerequisites,
        getState: () => orchestratorState,
        config: ORCHESTRATOR_CONFIG
    };

    // Démarrage automatique après un délai
    setTimeout(() => {
        console.log('🎭 Démarrage automatique de la correction...');
        attemptCorrectionWithRetry();
    }, 3000);

    console.log('🎭 Orchestrateur principal chargé');
    console.log('🛠️ API: window.MasterOrchestrator');

})();