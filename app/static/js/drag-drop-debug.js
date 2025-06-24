/**
 * CORRECTION TEMPORAIRE - SYNCHRONISATION DES IDs
 * Corrige le problème d'ID non trouvé en synchronisant frontend/backend
 */

class ShiftIdSynchronizer {
    constructor() {
        this.isRunning = false;
        console.log('🔄 Synchronizer des IDs de shifts initialisé');
    }

    /**
     * Synchronise tous les shifts entre frontend et backend
     */
    async synchronizeAll() {
        if (this.isRunning) {
            console.log('⏳ Synchronisation déjà en cours...');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Début synchronisation des shifts...');

        try {
            // 1. Récupérer les shifts du serveur
            const serverShifts = await this.getServerShifts();

            // 2. Mettre à jour AppState
            this.updateAppState(serverShifts);

            // 3. Corriger les IDs dans le DOM
            this.fixDOMIds(serverShifts);

            // 4. Reconfigurer le drag & drop
            this.reconfigureDragDrop();

            console.log('✅ Synchronisation terminée avec succès');

        } catch (error) {
            console.error('❌ Erreur pendant la synchronisation:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Récupère tous les shifts du serveur
     */
    async getServerShifts() {
        console.log('📡 Récupération shifts serveur...');

        const response = await fetch('/api/shifts');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erreur récupération shifts');
        }

        console.log(`📊 ${data.shifts.length} shifts récupérés du serveur`);
        return data.shifts;
    }

    /**
     * Met à jour AppState avec les données serveur
     */
    updateAppState(serverShifts) {
        console.log('📋 Mise à jour AppState...');

        if (!window.AppState) {
            window.AppState = {};
        }

        if (!window.AppState.shifts) {
            window.AppState.shifts = new Map();
        }

        // Vider et remplir avec les données serveur
        window.AppState.shifts.clear();

        serverShifts.forEach(shift => {
            window.AppState.shifts.set(shift.id, shift);
        });

        console.log(`📋 AppState mis à jour avec ${serverShifts.length} shifts`);
    }

    /**
     * Corrige les IDs dans le DOM
     */
    fixDOMIds(serverShifts) {
        console.log('🎨 Correction des IDs DOM...');

        const shiftBlocks = document.querySelectorAll('.shift-block');
        let corrected = 0;

        shiftBlocks.forEach(block => {
            const currentId = block.dataset.shiftId;
            const employeeId = this.extractEmployeeId(block);
            const day = this.extractDay(block);
            const hour = this.extractHour(block);

            // Chercher le shift correspondant côté serveur
            const matchingShift = serverShifts.find(s =>
                s.employee_id === employeeId &&
                s.day === day &&
                s.start_hour === hour
            );

            if (matchingShift && matchingShift.id !== currentId) {
                console.log(`🔧 ID corrigé: ${currentId} → ${matchingShift.id}`);
                block.dataset.shiftId = matchingShift.id;
                corrected++;
            }
        });

        console.log(`🎨 ${corrected} IDs corrigés dans le DOM`);
    }

    /**
     * Extrait l'employee_id d'un block
     */
    extractEmployeeId(block) {
        // Plusieurs méthodes pour extraire l'employee_id

        // 1. Dataset direct
        if (block.dataset.employeeId) {
            return block.dataset.employeeId;
        }

        // 2. Depuis un élément enfant
        const empElement = block.querySelector('[data-employee-id]');
        if (empElement) {
            return empElement.dataset.employeeId;
        }

        // 3. Depuis le nom affiché (matching par nom)
        const nameElement = block.querySelector('.employee-name, .shift-employee');
        if (nameElement && window.AppState?.employees) {
            const displayName = nameElement.textContent.trim();

            for (let [id, emp] of window.AppState.employees) {
                if (emp.prenom === displayName || emp.nom_complet === displayName) {
                    return id;
                }
            }
        }

        return null;
    }

    /**
     * Extrait le jour d'un block
     */
    extractDay(block) {
        let parent = block.parentElement;

        // Remonter jusqu'à trouver data-day
        while (parent && !parent.dataset.day) {
            parent = parent.parentElement;
        }

        return parent?.dataset.day || null;
    }

    /**
     * Extrait l'heure d'un block
     */
    extractHour(block) {
        let parent = block.parentElement;

        // Remonter jusqu'à trouver data-hour
        while (parent && parent.dataset.hour === undefined) {
            parent = parent.parentElement;
        }

        return parent?.dataset.hour ? parseInt(parent.dataset.hour) : null;
    }

    /**
     * Reconfigure le drag & drop après correction
     */
    reconfigureDragDrop() {
        console.log('🎯 Reconfiguration drag & drop...');

        // Utiliser le gestionnaire unifié si disponible
        if (typeof window.UnifiedDragDropFix !== 'undefined') {
            setTimeout(() => {
                window.UnifiedDragDropFix.configureAll();
            }, 100);
        }

        // Ou utiliser l'ancien système
        else if (typeof window.setupShiftDragAndDrop === 'function') {
            document.querySelectorAll('.shift-block').forEach(block => {
                const shiftId = block.dataset.shiftId;
                const shift = window.AppState?.shifts?.get(shiftId);

                if (shift) {
                    window.setupShiftDragAndDrop(block, shift);
                }
            });
        }

        console.log('🎯 Drag & drop reconfiguré');
    }

    /**
     * Vérifie la cohérence des données
     */
    async checkConsistency() {
        console.log('🔍 Vérification cohérence...');

        const issues = [];

        // Vérifier AppState vs DOM
        const domBlocks = document.querySelectorAll('.shift-block');
        const appStateIds = window.AppState?.shifts ? Array.from(window.AppState.shifts.keys()) : [];
        const domIds = Array.from(domBlocks).map(b => b.dataset.shiftId);

        const onlyInAppState = appStateIds.filter(id => !domIds.includes(id));
        const onlyInDOM = domIds.filter(id => !appStateIds.includes(id));

        if (onlyInAppState.length > 0) {
            issues.push(`IDs dans AppState mais pas DOM: ${onlyInAppState.join(', ')}`);
        }

        if (onlyInDOM.length > 0) {
            issues.push(`IDs dans DOM mais pas AppState: ${onlyInDOM.join(', ')}`);
        }

        // Vérifier AppState vs Serveur
        try {
            const serverShifts = await this.getServerShifts();
            const serverIds = serverShifts.map(s => s.id);

            const onlyInServer = serverIds.filter(id => !appStateIds.includes(id));
            const onlyInAppStateNotServer = appStateIds.filter(id => !serverIds.includes(id));

            if (onlyInServer.length > 0) {
                issues.push(`IDs sur serveur mais pas AppState: ${onlyInServer.join(', ')}`);
            }

            if (onlyInAppStateNotServer.length > 0) {
                issues.push(`IDs dans AppState mais pas serveur: ${onlyInAppStateNotServer.join(', ')}`);
            }

        } catch (error) {
            issues.push(`Erreur vérification serveur: ${error.message}`);
        }

        if (issues.length === 0) {
            console.log('✅ Données cohérentes');
        } else {
            console.warn('⚠️ Problèmes de cohérence détectés:');
            issues.forEach(issue => console.warn(`  • ${issue}`));
        }

        return issues;
    }
}

// ==================== INSTALLATION ET UTILISATION ====================

// Instance globale
const shiftIdSynchronizer = new ShiftIdSynchronizer();
window.ShiftIdSynchronizer = shiftIdSynchronizer;

// Auto-synchronisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        shiftIdSynchronizer.synchronizeAll();
    }, 3000);
});

// Synchronisation après erreur 404
if (typeof window.APIManager !== 'undefined') {
    const originalPut = window.APIManager.put;

    window.APIManager.put = async function(endpoint, data) {
        try {
            return await originalPut.call(this, endpoint, data);
        } catch (error) {
            // Si erreur 404 sur un shift, tenter une synchronisation
            if (endpoint.includes('/shifts/') && error.message.includes('404')) {
                console.log('🔄 Erreur 404 détectée, synchronisation...');
                await shiftIdSynchronizer.synchronizeAll();

                // Retry après synchronisation
                console.log('🔄 Retry après synchronisation...');
                return await originalPut.call(this, endpoint, data);
            }

            throw error;
        }
    };
}

// Commandes utiles
console.log('🔄 Commandes synchronisation disponibles:');
console.log('  • ShiftIdSynchronizer.synchronizeAll() - Synchroniser tout');
console.log('  • ShiftIdSynchronizer.checkConsistency() - Vérifier cohérence');

// Fonction globale rapide
window.fixShiftIds = () => shiftIdSynchronizer.synchronizeAll();