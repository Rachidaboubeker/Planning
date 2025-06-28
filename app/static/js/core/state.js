/**
 * STATE MANAGER - Version corrigée et optimisée
 * Gestion centralisée de l'état avec validation JSON robuste
 */

class StateManager {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        this.cache = new Map();
        this.isDirty = false;
        this.lastSave = null;

        this.initializeState();
        this.setupAutoSave();

        console.log('🚀 StateManager initialisé');
    }

    /**
     * Initialise l'état par défaut
     */
    initializeState() {
        this.state.set('employees', new Map());
        this.state.set('shifts', new Map());
        this.state.set('ui', {
            isLoading: false,
            selectedEmployee: null,
            draggedElement: null,
            granularity: 60
        });
        this.state.set('meta', {
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            totalEmployees: 0,
            totalShifts: 0,
            totalHours: 0
        });
    }

    /**
     * Met une valeur dans l'état
     */
    setState(key, value) {
        try {
            const keys = key.split('.');
            let current = this.state;

            // Navigation dans l'arbre d'état
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!current.has(k)) {
                    current.set(k, new Map());
                }
                current = current.get(k);
            }

            const finalKey = keys[keys.length - 1];
            const oldValue = current.get(finalKey);

            // Validation avant modification
            if (this.validateStateChange(key, value)) {
                current.set(finalKey, value);
                this.markDirty();
                this.notifyListeners(key, value, oldValue);

                console.log(`📝 État mis à jour: ${key}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur setState:', error);
            return false;
        }
    }

    /**
     * Récupère une valeur de l'état
     */
    getState(key) {
        try {
            if (!key) return this.state;

            const keys = key.split('.');
            let current = this.state;

            for (const k of keys) {
                if (!current.has(k)) {
                    return undefined;
                }
                current = current.get(k);
            }

            return current;
        } catch (error) {
            console.error('❌ Erreur getState:', error);
            return undefined;
        }
    }

    /**
     * Valide un changement d'état
     */
    validateStateChange(key, value) {
        // Validation spécifique par type de données
        if (key.startsWith('employees.')) {
            return this.validateEmployee(value);
        }

        if (key.startsWith('shifts.')) {
            return this.validateShift(value);
        }

        return true; // Validation par défaut
    }

    /**
     * Valide un employé
     */
    validateEmployee(employee) {
        if (!employee || typeof employee !== 'object') return false;

        const required = ['id', 'nom', 'prenom', 'poste'];
        return required.every(field => employee.hasOwnProperty(field) && employee[field]);
    }

    /**
     * Valide un créneau
     */
    validateShift(shift) {
        if (!shift || typeof shift !== 'object') return false;

        const required = ['id', 'employee_id', 'day', 'start_hour'];
        const valid = required.every(field => shift.hasOwnProperty(field) && shift[field] !== null);

        // Validation des heures
        if (valid && typeof shift.start_hour === 'number') {
            return shift.start_hour >= 0 && shift.start_hour <= 23;
        }

        return valid;
    }

    /**
     * Ajoute/Met à jour un employé
     */
    setEmployee(employee) {
        if (!this.validateEmployee(employee)) {
            console.error('❌ Employé invalide:', employee);
            return false;
        }

        const employees = this.getState('employees');
        employees.set(employee.id, { ...employee });

        this.updateMeta();
        this.markDirty();

        console.log(`👤 Employé ${employee.nom} ${employee.prenom} mis à jour`);
        return true;
    }

    /**
     * Ajoute/Met à jour un créneau
     */
    setShift(shift) {
        if (!this.validateShift(shift)) {
            console.error('❌ Créneau invalide:', shift);
            return false;
        }

        // Vérifier que l'employé existe
        const employees = this.getState('employees');
        if (!employees.has(shift.employee_id)) {
            console.error('❌ Employé introuvable pour le créneau:', shift.employee_id);
            return false;
        }

        const shifts = this.getState('shifts');
        shifts.set(shift.id, { ...shift });

        this.updateMeta();
        this.markDirty();

        console.log(`⏰ Créneau ${shift.id} mis à jour`);
        return true;
    }

    /**
     * Met à jour les métadonnées
     */
    updateMeta() {
        const meta = this.getState('meta');
        const employees = this.getState('employees');
        const shifts = this.getState('shifts');

        meta.totalEmployees = employees.size;
        meta.totalShifts = shifts.size;
        meta.lastModified = new Date().toISOString();

        // Calcul des heures totales
        let totalHours = 0;
        shifts.forEach(shift => {
            totalHours += shift.duration || 1;
        });
        meta.totalHours = totalHours;
    }

    /**
     * Exporte les données avec validation JSON
     */
    exportData() {
        try {
            const employees = this.getState('employees');
            const shifts = this.getState('shifts');
            const meta = this.getState('meta');

            // Conversion Map vers Array avec validation
            const employeeArray = [];
            employees.forEach(emp => {
                if (this.validateEmployee(emp)) {
                    employeeArray.push(this.sanitizeForJSON(emp));
                }
            });

            const shiftArray = [];
            shifts.forEach(shift => {
                if (this.validateShift(shift)) {
                    shiftArray.push(this.sanitizeForJSON(shift));
                }
            });

            const exportData = {
                employees: employeeArray,
                shifts: shiftArray,
                meta: {
                    ...meta,
                    exportDate: new Date().toISOString(),
                    totalEmployees: employeeArray.length,
                    totalShifts: shiftArray.length
                }
            };

            // Test de sérialisation JSON
            const jsonString = JSON.stringify(exportData);
            if (!jsonString || jsonString === '{}') {
                throw new Error('Données vides après sérialisation');
            }

            // Test de parsing pour vérifier l'intégrité
            JSON.parse(jsonString);

            console.log(`📤 Export réussi: ${employeeArray.length} employés, ${shiftArray.length} créneaux`);
            return exportData;

        } catch (error) {
            console.error('❌ Erreur export données:', error);
            throw new Error(`Export échoué: ${error.message}`);
        }
    }

    /**
     * Nettoie un objet pour la sérialisation JSON
     */
    sanitizeForJSON(obj) {
        const cleaned = {};

        for (const [key, value] of Object.entries(obj)) {
            // Ignorer les propriétés non sérialisables
            if (value === undefined || typeof value === 'function') {
                continue;
            }

            // Conversion des types problématiques
            if (value instanceof Date) {
                cleaned[key] = value.toISOString();
            } else if (value instanceof Map) {
                cleaned[key] = Object.fromEntries(value);
            } else if (value instanceof Set) {
                cleaned[key] = Array.from(value);
            } else {
                cleaned[key] = value;
            }
        }

        return cleaned;
    }

    /**
     * Importe des données avec validation
     */
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Données d\'import invalides');
            }

            let importedEmployees = 0;
            let importedShifts = 0;

            // Import des employés
            if (Array.isArray(data.employees)) {
                this.getState('employees').clear();
                data.employees.forEach(emp => {
                    if (this.setEmployee(emp)) {
                        importedEmployees++;
                    }
                });
            }

            // Import des créneaux
            if (Array.isArray(data.shifts)) {
                this.getState('shifts').clear();
                data.shifts.forEach(shift => {
                    if (this.setShift(shift)) {
                        importedShifts++;
                    }
                });
            }

            this.updateMeta();
            this.markClean(); // Les données importées sont considérées comme propres

            console.log(`📥 Import réussi: ${importedEmployees} employés, ${importedShifts} créneaux`);
            return { importedEmployees, importedShifts };

        } catch (error) {
            console.error('❌ Erreur import données:', error);
            throw error;
        }
    }

    /**
     * Marque l'état comme modifié
     */
    markDirty() {
        this.isDirty = true;
        const ui = this.getState('ui');
        ui.hasUnsavedChanges = true;
    }

    /**
     * Marque l'état comme propre (sauvegardé)
     */
    markClean() {
        this.isDirty = false;
        this.lastSave = new Date();
        const ui = this.getState('ui');
        ui.hasUnsavedChanges = false;
    }

    /**
     * Configure la sauvegarde automatique
     */
    setupAutoSave() {
        // Sauvegarde toutes les 30 secondes si des modifications existent
        setInterval(() => {
            if (this.isDirty && window.APIManager) {
                window.APIManager.autoSave().catch(error => {
                    console.error('💾 Échec sauvegarde auto:', error);
                });
            }
        }, 30000);
    }

    /**
     * Ajoute un listener pour les changements d'état
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    /**
     * Supprime un listener
     */
    removeListener(key, callback) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.delete(callback);
        }
    }

    /**
     * Notifie les listeners d'un changement
     */
    notifyListeners(key, newValue, oldValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('❌ Erreur listener:', error);
                }
            });
        }
    }

    /**
     * Détecte les conflits de planning
     */
    detectConflicts() {
        const conflicts = [];
        const shifts = this.getState('shifts');
        const shiftArray = Array.from(shifts.values());

        for (let i = 0; i < shiftArray.length; i++) {
            for (let j = i + 1; j < shiftArray.length; j++) {
                const shift1 = shiftArray[i];
                const shift2 = shiftArray[j];

                // Même employé, même jour
                if (shift1.employee_id === shift2.employee_id && shift1.day === shift2.day) {
                    const conflict = this.checkTimeOverlap(shift1, shift2);
                    if (conflict) {
                        conflicts.push({
                            type: 'overlap',
                            shift1,
                            shift2,
                            message: `Conflit horaire pour ${shift1.day}`
                        });
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * Vérifie le chevauchement horaire
     */
    checkTimeOverlap(shift1, shift2) {
        const start1 = shift1.start_hour + (shift1.start_minutes || 0) / 60;
        const end1 = start1 + (shift1.duration || 1);

        const start2 = shift2.start_hour + (shift2.start_minutes || 0) / 60;
        const end2 = start2 + (shift2.duration || 1);

        return !(end1 <= start2 || end2 <= start1);
    }

    /**
     * Réinitialise complètement l'état
     */
    reset() {
        this.state.clear();
        this.cache.clear();
        this.listeners.clear();
        this.initializeState();
        this.markClean();
        console.log('🔄 État réinitialisé');
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('🔍 StateManager Debug');
        console.log('État complet:', this.state);
        console.log('Listeners:', this.listeners);
        console.log('Is Dirty:', this.isDirty);
        console.log('Dernière sauvegarde:', this.lastSave);
        console.log('Conflits:', this.detectConflicts());
        console.groupEnd();
    }
}

// Instance globale unique
if (!window.StateManager) {
    window.StateManager = new StateManager();

    // Alias pour compatibilité
    window.State = window.StateManager;

    // Exposition pour debug en développement
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugState = () => window.StateManager.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

/**
 * CORRECTIF FINAL STATEMANAGER
 * Résout le problème Map/Object et affichage des données
 * Remplace complètement le correctif de compatibilité précédent
 */

// ==================== CORRECTIF GETSTATE ====================

/**
 * Méthode getState corrigée pour gérer Map et Object
 */
StateManager.prototype.getStateFixed = function(key) {
    try {
        if (!key) {
            // Retourner un objet plat pour compatibilité totale
            const flatState = {};

            // Employees - conversion Map vers Array
            const employees = this.state.get('employees');
            if (employees instanceof Map) {
                flatState.employees = Array.from(employees.values());
            } else if (Array.isArray(employees)) {
                flatState.employees = employees;
            } else {
                flatState.employees = [];
            }

            // Shifts - conversion Map vers Array
            const shifts = this.state.get('shifts');
            if (shifts instanceof Map) {
                flatState.shifts = Array.from(shifts.values());
            } else if (Array.isArray(shifts)) {
                flatState.shifts = shifts;
            } else {
                flatState.shifts = [];
            }

            // UI et autres propriétés
            flatState.ui = this.state.get('ui') || {};
            flatState.meta = this.state.get('meta') || {};
            flatState.temp = this.state.get('temp') || { isDirty: false, granularity: 60 };

            return flatState;
        }

        // Navigation dans l'arbre pour clés spécifiques
        const keys = key.split('.');
        let current = this.state;

        for (const k of keys) {
            if (current instanceof Map) {
                if (!current.has(k)) {
                    return undefined;
                }
                current = current.get(k);
            } else if (current && typeof current === 'object') {
                if (!(k in current)) {
                    return undefined;
                }
                current = current[k];
            } else {
                return undefined;
            }
        }

        // Conversion finale si Map
        if (current instanceof Map) {
            if (key.includes('employees') || key.includes('shifts')) {
                return Array.from(current.values());
            }
            return Object.fromEntries(current);
        }

        return current;

    } catch (error) {
        console.error('❌ Erreur getState:', error);

        // Fallback pour éviter les crashes
        if (!key) {
            return { employees: [], shifts: [], ui: {}, meta: {}, temp: { isDirty: false } };
        }
        return undefined;
    }
};

// Remplacer la méthode getState
if (window.StateManager) {
    window.StateManager.getState = window.StateManager.getStateFixed;
}

// ==================== CORRECTIF SETEMPLOYEE/SETSHIFT ====================

/**
 * SetEmployee amélioré avec validation et nettoyage
 */
StateManager.prototype.setEmployeeFixed = function(employee) {
    if (!employee || typeof employee !== 'object') {
        console.error('❌ Employé invalide:', employee);
        return false;
    }

    // Validation et nettoyage des données
    const cleanEmployee = {
        id: employee.id || `emp_${Date.now()}`,
        nom: (employee.nom || '').toString().trim(),
        prenom: (employee.prenom || '').toString().trim(),
        poste: employee.poste || 'serveur',
        email: employee.email || '',
        telephone: employee.telephone || '',
        taux_horaire: parseFloat(employee.taux_horaire) || 15.0
    };

    // Validation finale
    if (!cleanEmployee.nom || !cleanEmployee.prenom) {
        console.error('❌ Nom/prénom manquant pour l\'employé:', cleanEmployee);
        return false;
    }

    const employees = this.state.get('employees');
    if (employees instanceof Map) {
        employees.set(cleanEmployee.id, cleanEmployee);
    } else {
        console.error('❌ Structure employees invalide');
        return false;
    }

    this.updateMeta();
    this.markDirty();

    console.log(`👤 Employé ${cleanEmployee.nom} ${cleanEmployee.prenom} mis à jour`);
    return true;
};

/**
 * SetShift amélioré avec validation employé
 */
StateManager.prototype.setShiftFixed = function(shift) {
    if (!shift || typeof shift !== 'object') {
        console.error('❌ Créneau invalide:', shift);
        return false;
    }

    // Vérification employé existant
    const employees = this.state.get('employees');
    if (!employees || !employees.has(shift.employee_id)) {
        console.error('❌ Employé introuvable pour le créneau:', shift.employee_id);

        // Créer un employé temporaire si ID manquant
        if (shift.employee_id && shift.employee_id.startsWith('emp_')) {
            const tempEmployee = {
                id: shift.employee_id,
                nom: 'Employé',
                prenom: 'Supprimé',
                poste: 'serveur',
                email: '',
                telephone: '',
                taux_horaire: 15.0
            };

            console.warn(`⚠️ Création employé temporaire: ${shift.employee_id}`);
            this.setEmployeeFixed(tempEmployee);
        } else {
            return false;
        }
    }

    // Nettoyage des données créneau
    const cleanShift = {
        id: shift.id || `shift_${Date.now()}`,
        employee_id: shift.employee_id,
        day: shift.day,
        start_hour: parseInt(shift.start_hour) || 8,
        start_minutes: parseInt(shift.start_minutes) || 0,
        duration: parseFloat(shift.duration) || 1.0,
        notes: shift.notes || ''
    };

    // Validation finale
    const validDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    if (!validDays.includes(cleanShift.day)) {
        console.error('❌ Jour invalide pour le créneau:', cleanShift.day);
        return false;
    }

    const shifts = this.state.get('shifts');
    if (shifts instanceof Map) {
        shifts.set(cleanShift.id, cleanShift);
    } else {
        console.error('❌ Structure shifts invalide');
        return false;
    }

    this.updateMeta();
    this.markDirty();

    console.log(`⏰ Créneau ${cleanShift.id} mis à jour`);
    return true;
};

// Remplacer les méthodes
if (window.StateManager) {
    window.StateManager.setEmployee = window.StateManager.setEmployeeFixed;
    window.StateManager.setShift = window.StateManager.setShiftFixed;
}

// ==================== ALIAS LEGACY POUR COMPATIBILITÉ ====================

if (window.StateManager) {
    // Alias pour State
    window.State = window.StateManager;

    // Méthodes observe avec warning
    window.StateManager.observe = function(key, callback) {
        console.warn(`⚠️ observe('${key}') est deprecated, utilisez addListener('${key}', callback) à la place`);
        return this.addListener(key, callback);
    };

    // Méthodes manquantes
    window.StateManager.calculateStatistics = function() {
        console.log('📊 Calcul des statistiques...');
        this.updateMeta();
    };

    window.StateManager.setSapp = function(key, value) {
        console.warn('⚠️ setSapp() deprecated, utilisez setState()');
        return this.setState(key, value);
    };

    // Propriété state accessible
    if (!window.StateManager.state.has('temp')) {
        window.StateManager.state.set('temp', {
            isDirty: false,
            granularity: 60
        });
    }
}

// ==================== FONCTION DE RÉPARATION DONNÉES ====================

/**
 * Répare les données orphelines au démarrage
 */
function repairOrphanedData() {
    if (!window.StateManager) return;

    console.log('🔧 Réparation des données orphelines...');

    const employees = window.StateManager.state.get('employees');
    const shifts = window.StateManager.state.get('shifts');

    if (!employees || !shifts) return;

    let repairedShifts = 0;
    let removedShifts = 0;

    // Parcourir tous les créneaux
    shifts.forEach((shift, shiftId) => {
        if (!employees.has(shift.employee_id)) {
            // Tenter de réparer l'ID d'employé
            const possibleEmployees = Array.from(employees.values());

            if (possibleEmployees.length > 0) {
                // Assigner au premier employé disponible
                shift.employee_id = possibleEmployees[0].id;
                shifts.set(shiftId, shift);
                repairedShifts++;
                console.log(`🔧 Créneau ${shiftId} réparé: assigné à ${possibleEmployees[0].nom}`);
            } else {
                // Supprimer le créneau orphelin
                shifts.delete(shiftId);
                removedShifts++;
                console.log(`🗑️ Créneau orphelin supprimé: ${shiftId}`);
            }
        }
    });

    if (repairedShifts > 0 || removedShifts > 0) {
        window.StateManager.updateMeta();
        console.log(`✅ Réparation terminée: ${repairedShifts} réparés, ${removedShifts} supprimés`);
    }
}

// ==================== FONCTION DE RAFRAÎCHISSEMENT AFFICHAGE ====================

/**
 * Force le rafraîchissement de l'affichage
 */
function forceDisplayRefresh() {
    console.log('🎨 Rafraîchissement forcé de l\'affichage...');

    // Déclencher les événements pour mettre à jour l'affichage
    if (window.Events) {
        window.Events.emit('planning:data:loaded', {
            timestamp: new Date(),
            forced: true
        });
    }

    // Rafraîchir le planning manager si disponible
    if (window.PlanningManager && window.PlanningManager.refreshDisplay) {
        window.PlanningManager.refreshDisplay();
    }

    // Rafraîchir le drag & drop
    if (window.DragDropManager && window.DragDropManager.refresh) {
        window.DragDropManager.refresh();
    }
}

// ==================== EXÉCUTION AUTOMATIQUE ====================

// Exécuter les réparations après le chargement
setTimeout(() => {
    try {
        repairOrphanedData();
        forceDisplayRefresh();
        console.log('✅ Correctifs finaux appliqués avec succès');
    } catch (error) {
        console.error('❌ Erreur lors des correctifs finaux:', error);
    }
}, 100);

console.log('🔧 Correctif final StateManager appliqué');

/**
 * CORRECTIF D'AFFICHAGE - RENDU DES CRÉNEAUX
 * Corrige le problème "Aucun créneau à rendre" en patchant renderShifts
 */

/**
 * Patch pour corriger le rendu des créneaux
 */
function patchPlanningManagerDisplay() {
    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    console.log('🔧 Application du patch d\'affichage...');

    // Sauvegarder la méthode originale
    const originalRenderShifts = window.PlanningManager.renderShifts;

    // Nouvelle méthode renderShifts corrigée
    window.PlanningManager.renderShifts = function() {
        console.log('🎨 Rendu des créneaux (version corrigée)...');

        // Nettoyer les créneaux existants
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        if (!window.StateManager) {
            console.error('❌ StateManager non disponible pour le rendu');
            return;
        }

        // Récupérer les données via la méthode corrigée
        const stateData = window.StateManager.getState();

        if (!stateData) {
            console.warn('⚠️ Aucune donnée d\'état disponible');
            return;
        }

        const shifts = stateData.shifts || [];
        const employees = stateData.employees || [];

        console.log(`📊 Données pour rendu: ${employees.length} employés, ${shifts.length} créneaux`);

        if (shifts.length === 0) {
            console.log('ℹ️ Aucun créneau à rendre');
            return;
        }

        // Créer un index des employés pour accès rapide
        const employeeIndex = new Map();
        employees.forEach(emp => {
            if (emp && emp.id) {
                employeeIndex.set(emp.id, emp);
            }
        });

        let renderedCount = 0;
        let skippedCount = 0;

        // Rendre chaque créneau
        shifts.forEach(shift => {
            if (!shift || !shift.id) {
                skippedCount++;
                return;
            }

            const employee = employeeIndex.get(shift.employee_id);
            if (!employee) {
                console.warn(`⚠️ Employé non trouvé pour créneau ${shift.id}: ${shift.employee_id}`);
                skippedCount++;
                return;
            }

            if (this.renderSingleShift(shift, employee)) {
                renderedCount++;
            } else {
                skippedCount++;
            }
        });

        console.log(`✅ ${renderedCount} créneaux rendus, ${skippedCount} ignorés`);

        // Mettre à jour les statistiques
        if (typeof this.updateStatistics === 'function') {
            this.updateStatistics();
        }

        // Rafraîchir le drag & drop
        if (window.DragDropManager && window.DragDropManager.refresh) {
            setTimeout(() => window.DragDropManager.refresh(), 100);
        }
    };

    // Ajouter la méthode renderSingleShift si elle n'existe pas
    if (!window.PlanningManager.renderSingleShift) {
        window.PlanningManager.renderSingleShift = function(shift, employee) {
            try {
                // Trouver la cellule de destination
                const cellSelector = `[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`;
                const cell = document.querySelector(cellSelector);

                if (!cell) {
                    console.warn(`⚠️ Cellule non trouvée: ${cellSelector}`);
                    return false;
                }

                // Créer le bloc de créneau
                const shiftBlock = this.createShiftBlock(shift, employee);
                if (!shiftBlock) {
                    console.warn(`⚠️ Impossible de créer le bloc pour créneau ${shift.id}`);
                    return false;
                }

                // Ajouter à la cellule
                cell.appendChild(shiftBlock);

                // Appliquer les styles de position
                this.applyShiftStyles(shiftBlock, shift);

                console.log(`📍 Créneau ${shift.id} rendu pour ${employee.prenom} ${employee.nom}`);
                return true;

            } catch (error) {
                console.error(`❌ Erreur rendu créneau ${shift.id}:`, error);
                return false;
            }
        };
    }

    // Ajouter la méthode createShiftBlock si elle n'existe pas
    if (!window.PlanningManager.createShiftBlock) {
        window.PlanningManager.createShiftBlock = function(shift, employee) {
            try {
                const shiftBlock = document.createElement('div');
                shiftBlock.className = 'shift-block';
                shiftBlock.dataset.shiftId = shift.id;
                shiftBlock.dataset.employeeId = employee.id;
                shiftBlock.dataset.day = shift.day;
                shiftBlock.dataset.hour = shift.start_hour;
                shiftBlock.dataset.minutes = shift.start_minutes || 0;
                shiftBlock.dataset.duration = shift.duration || 1;
                shiftBlock.draggable = true;

                // Couleurs par poste
                const colors = {
                    'serveur': '#00b894',
                    'cuisinier': '#74b9ff',
                    'barman': '#fdcb6e',
                    'manager': '#a29bfe',
                    'aide_cuisine': '#6c5ce7',
                    'aide': '#6c5ce7',
                    'commis': '#fd79a8',
                    'plongeur': '#636e72'
                };

                const backgroundColor = colors[employee.poste] || '#6c757d';

                // Heure de fin
                const endHour = shift.start_hour + (shift.duration || 1);
                const timeDisplay = `${shift.start_hour}h-${endHour}h`;

                // Contenu HTML
                shiftBlock.innerHTML = `
                    <div class="shift-content">
                        <div class="shift-employee">${this.sanitize(employee.prenom || '')}</div>
                        <div class="shift-time">${timeDisplay}</div>
                        <div class="shift-post">${this.sanitize(employee.poste || '')}</div>
                        ${shift.notes ? `<div class="shift-notes">${this.sanitize(shift.notes)}</div>` : ''}
                    </div>
                `;

                // Styles inline
                shiftBlock.style.cssText = `
                    background-color: ${backgroundColor};
                    color: white;
                    border-radius: 4px;
                    padding: 4px 8px;
                    margin: 1px;
                    font-size: 11px;
                    line-height: 1.2;
                    cursor: grab;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.2);
                    min-height: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                `;

                return shiftBlock;

            } catch (error) {
                console.error('❌ Erreur création bloc créneau:', error);
                return null;
            }
        };
    }

    // Ajouter la méthode applyShiftStyles si elle n'existe pas
    if (!window.PlanningManager.applyShiftStyles) {
        window.PlanningManager.applyShiftStyles = function(shiftBlock, shift) {
            const duration = shift.duration || 1;

            if (duration > 1) {
                // Pour les créneaux de plus d'1h, étendre sur plusieurs cellules
                const height = duration * 60; // Hauteur en pixels (1h = 60px par défaut)
                shiftBlock.style.height = `${height}px`;
                shiftBlock.style.position = 'relative';
                shiftBlock.style.zIndex = '10';
            }
        };
    }

    // Ajouter la méthode sanitize si elle n'existe pas
    if (!window.PlanningManager.sanitize) {
        window.PlanningManager.sanitize = function(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[<>&"']/g, (match) => {
                const escape = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '&': '&amp;',
                    '"': '&quot;',
                    "'": '&#x27;'
                };
                return escape[match];
            });
        };
    }

    console.log('✅ Patch d\'affichage appliqué');
}

/**
 * Force le rendu immédiat des créneaux
 */
function forceRenderShifts() {
    console.log('🚀 Forçage du rendu des créneaux...');

    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    try {
        // Appliquer le patch si pas encore fait
        if (!window.PlanningManager.renderSingleShift) {
            patchPlanningManagerDisplay();
        }

        // Forcer le rendu
        window.PlanningManager.renderShifts();

        // Vérifier le résultat
        const renderedShifts = document.querySelectorAll('.shift-block').length;
        console.log(`📊 ${renderedShifts} créneaux maintenant visibles`);

        // Si toujours rien, diagnostiquer
        if (renderedShifts === 0) {
            diagnosticDisplay();
        }

    } catch (error) {
        console.error('❌ Erreur lors du forçage du rendu:', error);
    }
}

/**
 * Diagnostic complet de l'affichage
 */
function diagnosticDisplay() {
    console.group('🔍 Diagnostic affichage');

    // Vérifier les données
    if (window.StateManager) {
        const state = window.StateManager.getState();
        console.log('📊 État des données:', {
            employees: state.employees?.length || 0,
            shifts: state.shifts?.length || 0
        });

        if (state.employees?.length > 0) {
            console.log('👥 Premier employé:', state.employees[0]);
        }

        if (state.shifts?.length > 0) {
            console.log('⏰ Premier créneau:', state.shifts[0]);
        }
    }

    // Vérifier la grille
    const gridContainer = document.getElementById('planningGrid');
    if (gridContainer) {
        const cells = gridContainer.querySelectorAll('[data-day][data-hour]');
        console.log(`🏗️ ${cells.length} cellules de grille trouvées`);

        if (cells.length > 0) {
            console.log('📍 Première cellule:', cells[0].dataset);
        }
    } else {
        console.warn('⚠️ Conteneur de grille non trouvé (#planningGrid)');
    }

    // Vérifier les styles CSS
    const shiftBlocks = document.querySelectorAll('.shift-block');
    console.log(`🎨 ${shiftBlocks.length} blocs de créneaux dans le DOM`);

    console.groupEnd();
}

/**
 * Test de création manuelle d'un créneau
 */
function testCreateShift() {
    console.log('🧪 Test de création manuelle d\'un créneau...');

    const testCell = document.querySelector('[data-day="Lundi"][data-hour="10"]');
    if (!testCell) {
        console.warn('⚠️ Cellule de test non trouvée');
        return;
    }

    // Créer un créneau de test
    const testShift = {
        id: 'test_shift',
        employee_id: 'test_emp',
        day: 'Lundi',
        start_hour: 10,
        start_minutes: 0,
        duration: 1,
        notes: 'Test'
    };

    const testEmployee = {
        id: 'test_emp',
        nom: 'Test',
        prenom: 'Employé',
        poste: 'serveur'
    };

    // Créer le bloc
    const testBlock = document.createElement('div');
    testBlock.className = 'shift-block test-shift';
    testBlock.style.cssText = `
        background-color: #e74c3c;
        color: white;
        padding: 8px;
        border-radius: 4px;
        margin: 2px;
        font-size: 12px;
        cursor: pointer;
    `;
    testBlock.innerHTML = `
        <div>🧪 Test Créneau</div>
        <div>Employé Test - 10h-11h</div>
    `;

    testCell.appendChild(testBlock);
    console.log('✅ Créneau de test créé dans la cellule Lundi 10h');

    // Supprimer après 5 secondes
    setTimeout(() => {
        testBlock.remove();
        console.log('🗑️ Créneau de test supprimé');
    }, 5000);
}

// ==================== EXÉCUTION AUTOMATIQUE ====================

// Appliquer les correctifs immédiatement
setTimeout(() => {
    try {
        console.log('🚀 Application des correctifs d\'affichage...');

        patchPlanningManagerDisplay();
        forceRenderShifts();

        // Test diagnostic si toujours rien
        setTimeout(() => {
            const visibleShifts = document.querySelectorAll('.shift-block').length;
            if (visibleShifts === 0) {
                console.warn('⚠️ Aucun créneau visible après correctifs');
                diagnosticDisplay();
                testCreateShift();
            } else {
                console.log(`🎉 ${visibleShifts} créneaux maintenant visibles !`);
            }
        }, 500);

    } catch (error) {
        console.error('❌ Erreur lors des correctifs d\'affichage:', error);
    }
}, 200);

// Exposer les fonctions pour debug
if (window.location.hostname === 'localhost') {
    window.debugDisplay = {
        patch: patchPlanningManagerDisplay,
        force: forceRenderShifts,
        diagnostic: diagnosticDisplay,
        test: testCreateShift
    };

    console.log('🛠️ Fonctions de debug disponibles: window.debugDisplay');
}

console.log('🔧 Correctif d\'affichage chargé');

/**
 * CORRECTIF STRUCTURE COLONNES EMPLOYÉS
 * Restaure la structure originale avec colonnes par employé et avatars
 */

/**
 * Patch pour restaurer la structure en colonnes employés
 */
function restoreEmployeeColumnLayout() {
    console.log('🏗️ Restauration de la structure en colonnes employés...');

    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    // Sauvegarder les méthodes originales
    const originalGenerateGrid = window.PlanningManager.generateGrid;
    const originalRenderShifts = window.PlanningManager.renderShifts;

    // ==================== NOUVELLE GÉNÉRATION DE GRILLE ====================

    window.PlanningManager.generateGrid = function() {
        console.log('🏗️ Génération grille avec colonnes employés...');

        const headerContainer = document.getElementById('planningHeader');
        const gridContainer = document.getElementById('planningGrid');

        if (!headerContainer || !gridContainer) {
            console.error('❌ Conteneurs de grille non trouvés');
            return;
        }

        // Récupérer les employés actifs
        const employees = this.getActiveEmployees();
        const days = window.Config?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const hours = window.Config?.HOURS_RANGE || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

        console.log(`📊 Génération pour ${employees.length} employés, ${days.length} jours, ${hours.length} heures`);

        // Générer l'en-tête avec colonnes employés
        this.generateEmployeeColumnsHeader(headerContainer, employees, days);

        // Générer la grille avec colonnes employés
        this.generateEmployeeColumnsGrid(gridContainer, employees, days, hours);

        console.log('✅ Grille en colonnes employés générée');
    };

    // ==================== GÉNÉRATION EN-TÊTE COLONNES ====================

    window.PlanningManager.generateEmployeeColumnsHeader = function(container, employees, days) {
        let headerHTML = '<div class="planning-header-row">';

        // Cellule d'angle
        headerHTML += '<div class="corner-cell">Heures</div>';

        // Pour chaque jour
        days.forEach(day => {
            headerHTML += `<div class="day-section" data-day="${day}">`;
            headerHTML += `<div class="day-header">${day}</div>`;
            headerHTML += '<div class="employee-columns-header">';

            // Colonnes employés pour ce jour
            employees.forEach(employee => {
                const avatar = this.generateEmployeeAvatar(employee);
                headerHTML += `
                    <div class="employee-column-header" data-employee-id="${employee.id}" data-day="${day}">
                        ${avatar}
                        <div class="employee-column-name">${employee.prenom}</div>
                    </div>
                `;
            });

            headerHTML += '</div></div>';
        });

        headerHTML += '</div>';
        container.innerHTML = headerHTML;
    };

    // ==================== GÉNÉRATION GRILLE COLONNES ====================

    window.PlanningManager.generateEmployeeColumnsGrid = function(container, employees, days, hours) {
        let gridHTML = '';

        hours.forEach(hour => {
            gridHTML += '<div class="planning-row" data-hour="' + hour + '">';

            // Colonne horaire
            const displayHour = hour === 0 ? '00:00' : hour < 10 ? `0${hour}:00` : `${hour}:00`;
            gridHTML += `<div class="time-slot" data-hour="${hour}">${displayHour}</div>`;

            // Pour chaque jour
            days.forEach(day => {
                gridHTML += `<div class="day-section-grid" data-day="${day}" data-hour="${hour}">`;

                // Colonnes employés pour ce jour/heure
                employees.forEach((employee, index) => {
                    gridHTML += `
                        <div class="employee-column-cell"
                             data-day="${day}"
                             data-hour="${hour}"
                             data-employee-id="${employee.id}"
                             data-employee-index="${index}">
                        </div>
                    `;
                });

                gridHTML += '</div>';
            });

            gridHTML += '</div>';
        });

        container.innerHTML = gridHTML;

        // Appliquer les styles CSS
        this.applyEmployeeColumnStyles(container, employees.length);
    };

    // ==================== NOUVEAU RENDU DES CRÉNEAUX ====================

    window.PlanningManager.renderShifts = function() {
        console.log('🎨 Rendu créneaux en colonnes employés...');

        // Nettoyer les créneaux existants
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        if (!window.StateManager) {
            console.error('❌ StateManager non disponible');
            return;
        }

        const stateData = window.StateManager.getState();
        const shifts = stateData.shifts || [];
        const employees = stateData.employees || [];

        console.log(`📊 Rendu: ${shifts.length} créneaux, ${employees.length} employés`);

        if (shifts.length === 0) {
            console.log('ℹ️ Aucun créneau à rendre');
            return;
        }

        // Index des employés
        const employeeIndex = new Map();
        employees.forEach(emp => {
            if (emp && emp.id) {
                employeeIndex.set(emp.id, emp);
            }
        });

        let renderedCount = 0;

        // Rendre chaque créneau
        shifts.forEach(shift => {
            if (!shift || !shift.id) return;

            const employee = employeeIndex.get(shift.employee_id);
            if (!employee) {
                console.warn(`⚠️ Employé non trouvé: ${shift.employee_id}`);
                return;
            }

            if (this.renderShiftInColumn(shift, employee)) {
                renderedCount++;
            }
        });

        console.log(`✅ ${renderedCount} créneaux rendus en colonnes`);

        // Mettre à jour le drag & drop
        if (window.DragDropManager && window.DragDropManager.refresh) {
            setTimeout(() => window.DragDropManager.refresh(), 100);
        }
    };

    // ==================== RENDU CRÉNEAU INDIVIDUEL EN COLONNE ====================

    window.PlanningManager.renderShiftInColumn = function(shift, employee) {
        try {
            // Trouver la cellule de destination
            const cell = document.querySelector(
                `[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-employee-id="${employee.id}"]`
            );

            if (!cell) {
                console.warn(`⚠️ Cellule employé non trouvée: ${shift.day} ${shift.start_hour}h ${employee.prenom}`);
                return false;
            }

            // Créer le bloc créneau pour colonnes
            const shiftBlock = this.createColumnShiftBlock(shift, employee);
            if (!shiftBlock) return false;

            // Ajouter à la cellule
            cell.appendChild(shiftBlock);

            console.log(`📍 Créneau ${shift.id} rendu pour ${employee.prenom} (${shift.day} ${shift.start_hour}h)`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur rendu créneau colonne ${shift.id}:`, error);
            return false;
        }
    };

    // ==================== CRÉATION BLOC CRÉNEAU COLONNE ====================

    window.PlanningManager.createColumnShiftBlock = function(shift, employee) {
        try {
            const shiftBlock = document.createElement('div');
            shiftBlock.className = 'shift-block column-positioned';
            shiftBlock.dataset.shiftId = shift.id;
            shiftBlock.dataset.employeeId = employee.id;
            shiftBlock.dataset.day = shift.day;
            shiftBlock.dataset.hour = shift.start_hour;
            shiftBlock.dataset.minutes = shift.start_minutes || 0;
            shiftBlock.dataset.duration = shift.duration || 1;
            shiftBlock.draggable = true;

            // Couleur selon le poste
            const backgroundColor = this.getEmployeeColor(employee.poste);

            // Durée et affichage
            const duration = shift.duration || 1;
            const endHour = shift.start_hour + duration;
            const timeDisplay = duration >= 1 ?
                `${shift.start_hour}h-${endHour}h` :
                `${shift.start_hour}h${shift.start_minutes || 0}`;

            // Avatar de l'employé
            const avatar = this.generateEmployeeAvatar(employee, 'small');

            // Contenu HTML optimisé pour colonnes
            shiftBlock.innerHTML = `
                <div class="shift-content-column">
                    ${avatar}
                    <div class="shift-time-column">${timeDisplay}</div>
                    ${shift.notes ? `<div class="shift-notes-column">${this.sanitize(shift.notes)}</div>` : ''}
                </div>
            `;

            // Styles adaptés aux colonnes
            shiftBlock.style.cssText = `
                background: linear-gradient(135deg, ${backgroundColor}, ${this.darkenColor(backgroundColor, 10)});
                color: white;
                border-radius: 6px;
                padding: 4px;
                margin: 1px;
                font-size: 0.7rem;
                line-height: 1.1;
                text-align: center;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.2);
                min-height: ${duration * 50}px;
                width: 100%;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
            `;

            return shiftBlock;

        } catch (error) {
            console.error('❌ Erreur création bloc colonne:', error);
            return null;
        }
    };

    // ==================== MÉTHODES UTILITAIRES ====================

    window.PlanningManager.getActiveEmployees = function() {
        if (!window.StateManager) return [];

        const stateData = window.StateManager.getState();
        const employees = stateData.employees || [];

        // Filtrer les employés actifs et les trier
        return employees
            .filter(emp => emp && emp.id && emp.nom && emp.prenom)
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    };

    window.PlanningManager.generateEmployeeAvatar = function(employee, size = 'normal') {
        const initials = `${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase();
        const color = this.getEmployeeColor(employee.poste);

        const avatarSize = size === 'small' ? '20px' : '32px';
        const fontSize = size === 'small' ? '0.6rem' : '0.8rem';

        // Si l'employé a une photo
        if (employee.photo_url) {
            return `
                <div class="employee-avatar ${size}" style="width: ${avatarSize}; height: ${avatarSize};">
                    <img src="${employee.photo_url}" alt="${employee.prenom}"
                         style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                </div>
            `;
        }

        // Avatar avec initiales
        return `
            <div class="employee-avatar ${size}"
                 style="width: ${avatarSize}; height: ${avatarSize};
                        background-color: ${color}; color: white;
                        border-radius: 50%; display: flex;
                        align-items: center; justify-content: center;
                        font-size: ${fontSize}; font-weight: 600;">
                ${initials}
            </div>
        `;
    };

    window.PlanningManager.getEmployeeColor = function(poste) {
        const colors = {
            'serveur': '#00b894',
            'cuisinier': '#74b9ff',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide_cuisine': '#6c5ce7',
            'aide': '#6c5ce7',
            'commis': '#fd79a8',
            'plongeur': '#636e72'
        };
        return colors[poste] || '#6c757d';
    };

    window.PlanningManager.darkenColor = function(color, percent) {
        // Assombrir une couleur de X%
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    };

    window.PlanningManager.applyEmployeeColumnStyles = function(container, employeeCount) {
        // Appliquer les styles CSS pour les colonnes
        const style = document.createElement('style');
        style.textContent = `
            .planning-header-row {
                display: grid;
                grid-template-columns: 80px repeat(7, 1fr);
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 20;
            }

            .corner-cell {
                background: #e9ecef;
                padding: 1rem;
                font-weight: 600;
                text-align: center;
                border-right: 1px solid #dee2e6;
            }

            .day-section {
                border-right: 1px solid #dee2e6;
            }

            .day-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.75rem;
                text-align: center;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .employee-columns-header {
                display: grid;
                grid-template-columns: repeat(${employeeCount}, 1fr);
                background: #f1f3f4;
            }

            .employee-column-header {
                padding: 0.5rem 0.25rem;
                text-align: center;
                border-right: 1px solid #e9ecef;
                font-size: 0.7rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
            }

            .employee-column-name {
                font-weight: 500;
                color: #495057;
            }

            .planning-row {
                display: grid;
                grid-template-columns: 80px repeat(7, 1fr);
                border-bottom: 1px solid #e9ecef;
            }

            .time-slot {
                background: #f8f9fa;
                padding: 0.75rem 0.5rem;
                text-align: center;
                font-weight: 500;
                color: #6c757d;
                border-right: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .day-section-grid {
                display: grid;
                grid-template-columns: repeat(${employeeCount}, 1fr);
                border-right: 1px solid #dee2e6;
                min-height: 60px;
            }

            .employee-column-cell {
                border-right: 1px solid #f1f3f4;
                background: white;
                padding: 2px;
                min-height: 60px;
                position: relative;
                transition: background-color 0.2s ease;
            }

            .employee-column-cell:hover {
                background-color: rgba(0, 123, 255, 0.05);
            }

            .shift-content-column {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                height: 100%;
                justify-content: center;
            }

            .shift-time-column {
                font-size: 0.65rem;
                opacity: 0.9;
            }

            .shift-notes-column {
                font-size: 0.6rem;
                opacity: 0.8;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
        `;

        document.head.appendChild(style);
    };

    // Ajouter méthode sanitize si pas déjà présente
    if (!window.PlanningManager.sanitize) {
        window.PlanningManager.sanitize = function(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[<>&"']/g, (match) => {
                const escape = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '&': '&amp;',
                    '"': '&quot;',
                    "'": '&#x27;'
                };
                return escape[match];
            });
        };
    }

    console.log('✅ Structure en colonnes employés restaurée');
}

/**
 * Force la régénération avec la nouvelle structure
 */
function forceColumnLayoutRefresh() {
    console.log('🔄 Régénération forcée avec colonnes employés...');

    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    try {
        // Appliquer le patch si pas déjà fait
        if (!window.PlanningManager.generateEmployeeColumnsHeader) {
            restoreEmployeeColumnLayout();
        }

        // Régénérer la grille
        window.PlanningManager.generateGrid();

        // Rendre les créneaux
        window.PlanningManager.renderShifts();

        // Vérifier le résultat
        const columnCells = document.querySelectorAll('.employee-column-cell').length;
        const shiftBlocks = document.querySelectorAll('.shift-block').length;

        console.log(`✅ Layout colonnes: ${columnCells} cellules, ${shiftBlocks} créneaux`);

    } catch (error) {
        console.error('❌ Erreur régénération colonnes:', error);
    }
}

// ==================== EXÉCUTION AUTOMATIQUE ====================

// Appliquer la restauration immédiatement
setTimeout(() => {
    try {
        console.log('🏗️ Restauration du layout en colonnes employés...');

        restoreEmployeeColumnLayout();
        forceColumnLayoutRefresh();

        console.log('🎉 Layout en colonnes employés restauré !');

    } catch (error) {
        console.error('❌ Erreur restauration colonnes:', error);
    }
}, 300);

// Exposer pour debug
if (window.location.hostname === 'localhost') {
    window.debugColumns = {
        restore: restoreEmployeeColumnLayout,
        refresh: forceColumnLayoutRefresh
    };

    console.log('🛠️ Fonctions colonnes disponibles: window.debugColumns');
}

console.log('🔧 Correctif colonnes employés chargé');

/**
 * CORRECTIF FINAL - NETTOYAGE ET LAYOUT PARFAIT
 * 1. Supprime définitivement les employés "Supprimé"
 * 2. Corrige le layout en colonnes
 * 3. Optimise l'affichage
 */

/**
 * Nettoie les données corrompues et les employés supprimés
 */
function cleanupCorruptedData() {
    console.log('🧹 Nettoyage des données corrompues...');

    if (!window.StateManager) return;

    const employees = window.StateManager.getState('employees');
    const shifts = window.StateManager.getState('shifts');

    if (!employees || !shifts) return;

    let deletedEmployees = 0;
    let deletedShifts = 0;
    let repairedShifts = 0;

    // Supprimer les employés "Supprimé" ou temporaires
    const employeesToDelete = [];
    employees.forEach((employee, id) => {
        if (!employee ||
            employee.nom === 'Employé' ||
            employee.prenom === 'Supprimé' ||
            employee.nom === 'Supprimé' ||
            id.startsWith('emp_') && !employee.nom) {
            employeesToDelete.push(id);
        }
    });

    employeesToDelete.forEach(id => {
        employees.delete(id);
        deletedEmployees++;
        console.log(`🗑️ Employé supprimé: ${id}`);
    });

    // Nettoyer les créneaux orphelins ou corrompus
    const shiftsToDelete = [];
    const validEmployeeIds = new Set(employees.keys());

    shifts.forEach((shift, id) => {
        if (!shift ||
            !shift.employee_id ||
            !validEmployeeIds.has(shift.employee_id) ||
            !shift.day ||
            typeof shift.start_hour !== 'number') {
            shiftsToDelete.push(id);
        }
    });

    shiftsToDelete.forEach(id => {
        shifts.delete(id);
        deletedShifts++;
        console.log(`🗑️ Créneau supprimé: ${id}`);
    });

    // Mettre à jour les métadonnées
    window.StateManager.updateMeta();

    console.log(`✅ Nettoyage terminé: ${deletedEmployees} employés, ${deletedShifts} créneaux supprimés`);

    return {
        deletedEmployees,
        deletedShifts,
        remainingEmployees: employees.size,
        remainingShifts: shifts.size
    };
}

/**
 * Corrige le layout des colonnes employés
 */
function fixEmployeeColumnLayout() {
    console.log('🎨 Correction du layout colonnes...');

    if (!window.PlanningManager) return;

    // Version corrigée de la génération de grille
    window.PlanningManager.generateEmployeeColumnsGrid = function(container, employees, days, hours) {
        console.log(`🏗️ Génération grille: ${employees.length} employés, ${days.length} jours, ${hours.length} heures`);

        // Structure HTML optimisée
        let gridHTML = `
            <div class="planning-grid-corrected">
                <div class="time-column">
                    ${hours.map(hour => {
                        const displayHour = hour === 0 ? '00:00' : hour < 10 ? `0${hour}:00` : `${hour}:00`;
                        return `<div class="time-cell" data-hour="${hour}">${displayHour}</div>`;
                    }).join('')}
                </div>
                <div class="days-container">
                    ${days.map(day => `
                        <div class="day-column" data-day="${day}">
                            <div class="day-hours">
                                ${hours.map(hour => `
                                    <div class="hour-row" data-day="${day}" data-hour="${hour}">
                                        <div class="employee-columns">
                                            ${employees.map((employee, index) => `
                                                <div class="employee-cell"
                                                     data-day="${day}"
                                                     data-hour="${hour}"
                                                     data-employee-id="${employee.id}"
                                                     data-employee-index="${index}"
                                                     title="${employee.prenom} ${employee.nom}">
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = gridHTML;

        // Appliquer les styles CSS corrigés
        this.applyFixedColumnStyles(employees.length, days.length, hours.length);
    };

    // En-tête corrigé avec avatars bien positionnés
    window.PlanningManager.generateEmployeeColumnsHeader = function(container, employees, days) {
        let headerHTML = `
            <div class="planning-header-corrected">
                <div class="corner-header">Heures</div>
                <div class="days-header">
                    ${days.map(day => `
                        <div class="day-header-section" data-day="${day}">
                            <div class="day-title">${day}</div>
                            <div class="employees-header">
                                ${employees.map(employee => {
                                    const avatar = this.generateEmployeeAvatar(employee, 'small');
                                    const initials = `${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase();
                                    return `
                                        <div class="employee-header"
                                             data-employee-id="${employee.id}"
                                             title="${employee.prenom} ${employee.nom} - ${employee.poste}">
                                            ${avatar}
                                            <span class="employee-initials">${initials}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = headerHTML;
    };

    // Styles CSS corrigés
    window.PlanningManager.applyFixedColumnStyles = function(employeeCount, dayCount, hourCount) {
        // Supprimer l'ancien style
        const oldStyle = document.getElementById('planning-columns-style');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'planning-columns-style';
        style.textContent = `
            /* LAYOUT CORRIGÉ POUR COLONNES EMPLOYÉS */
            .planning-grid-corrected {
                display: flex;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                overflow: hidden;
                font-size: 0.8rem;
            }

            .time-column {
                width: 80px;
                background: #f8f9fa;
                border-right: 2px solid #dee2e6;
                flex-shrink: 0;
            }

            .time-cell {
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-bottom: 1px solid #e9ecef;
                font-weight: 500;
                color: #6c757d;
                font-size: 0.75rem;
            }

            .days-container {
                flex: 1;
                display: flex;
            }

            .day-column {
                flex: 1;
                border-right: 1px solid #dee2e6;
            }

            .day-column:last-child {
                border-right: none;
            }

            .hour-row {
                height: 60px;
                border-bottom: 1px solid #e9ecef;
                position: relative;
            }

            .employee-columns {
                display: flex;
                height: 100%;
                width: 100%;
            }

            .employee-cell {
                flex: 1;
                border-right: 1px solid #f1f3f4;
                background: white;
                position: relative;
                transition: background-color 0.2s ease;
                min-height: 60px;
                padding: 2px;
                box-sizing: border-box;
            }

            .employee-cell:last-child {
                border-right: none;
            }

            .employee-cell:hover {
                background-color: rgba(0, 123, 255, 0.05) !important;
            }

            /* EN-TÊTE CORRIGÉ */
            .planning-header-corrected {
                display: flex;
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 20;
            }

            .corner-header {
                width: 80px;
                background: #e9ecef;
                padding: 1rem 0.5rem;
                font-weight: 600;
                text-align: center;
                border-right: 2px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
            }

            .days-header {
                flex: 1;
                display: flex;
            }

            .day-header-section {
                flex: 1;
                border-right: 1px solid #dee2e6;
            }

            .day-header-section:last-child {
                border-right: none;
            }

            .day-title {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.75rem;
                text-align: center;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .employees-header {
                display: flex;
                background: #f1f3f4;
                padding: 0.5rem 0;
            }

            .employee-header {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem;
                border-right: 1px solid #e9ecef;
                font-size: 0.65rem;
            }

            .employee-header:last-child {
                border-right: none;
            }

            .employee-initials {
                font-weight: 600;
                color: #495057;
                font-size: 0.6rem;
            }

            /* CRÉNEAUX EN COLONNES CORRIGÉS */
            .shift-block.column-positioned {
                position: absolute !important;
                top: 2px;
                left: 2px;
                right: 2px;
                bottom: 2px;
                border-radius: 4px;
                color: white;
                font-size: 0.65rem;
                font-weight: 600;
                text-align: center;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                z-index: 10;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 2px;
                box-sizing: border-box;
            }

            .shift-block.column-positioned:hover {
                transform: scale(1.02);
                z-index: 50 !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
            }

            .shift-content-column {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                height: 100%;
                justify-content: center;
                text-align: center;
                line-height: 1.1;
            }

            .shift-time-column {
                font-size: 0.6rem;
                opacity: 0.9;
                font-weight: 500;
            }

            .employee-avatar.small {
                width: 18px !important;
                height: 18px !important;
                font-size: 0.55rem !important;
                flex-shrink: 0;
            }

            /* RESPONSIVE */
            @media (max-width: 1200px) {
                .employee-cell {
                    min-width: 60px;
                }

                .shift-block.column-positioned {
                    font-size: 0.6rem;
                }
            }

            @media (max-width: 768px) {
                .time-column {
                    width: 60px;
                }

                .corner-header {
                    width: 60px;
                    font-size: 0.7rem;
                }

                .employee-cell {
                    min-width: 40px;
                }

                .shift-block.column-positioned {
                    font-size: 0.55rem;
                }

                .employee-avatar.small {
                    width: 16px !important;
                    height: 16px !important;
                    font-size: 0.5rem !important;
                }
            }
        `;

        document.head.appendChild(style);
        console.log('✅ Styles colonnes corrigés appliqués');
    };

    console.log('✅ Layout colonnes corrigé');
}

/**
 * Rendu optimisé des créneaux en colonnes
 */
function optimizeShiftRendering() {
    if (!window.PlanningManager) return;

    // Version optimisée du rendu de créneau individuel
    window.PlanningManager.renderShiftInColumn = function(shift, employee) {
        try {
            // Trouver la cellule exacte
            const cell = document.querySelector(
                `.employee-cell[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-employee-id="${employee.id}"]`
            );

            if (!cell) {
                console.warn(`⚠️ Cellule non trouvée: ${shift.day} ${shift.start_hour}h ${employee.prenom}`);
                return false;
            }

            // Vérifier qu'il n'y a pas déjà un créneau
            const existingShift = cell.querySelector('.shift-block');
            if (existingShift) {
                existingShift.remove();
            }

            // Créer le nouveau bloc
            const shiftBlock = this.createOptimizedColumnShiftBlock(shift, employee);
            if (!shiftBlock) return false;

            // Ajouter à la cellule
            cell.appendChild(shiftBlock);

            console.log(`📍 ✅ ${employee.prenom} -> ${shift.day} ${shift.start_hour}h`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur rendu ${shift.id}:`, error);
            return false;
        }
    };

    // Création optimisée des blocs
    window.PlanningManager.createOptimizedColumnShiftBlock = function(shift, employee) {
        try {
            const shiftBlock = document.createElement('div');
            shiftBlock.className = 'shift-block column-positioned';
            shiftBlock.dataset.shiftId = shift.id;
            shiftBlock.dataset.employeeId = employee.id;
            shiftBlock.dataset.day = shift.day;
            shiftBlock.dataset.hour = shift.start_hour;
            shiftBlock.draggable = true;

            // Couleur et contenu
            const backgroundColor = this.getEmployeeColor(employee.poste);
            const duration = shift.duration || 1;
            const endHour = shift.start_hour + duration;
            const timeDisplay = `${shift.start_hour}h-${endHour}h`;

            // Avatar optimisé
            const initials = `${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase();

            shiftBlock.innerHTML = `
                <div class="shift-content-column">
                    <div class="employee-avatar small" style="background-color: ${backgroundColor};">
                        ${initials}
                    </div>
                    <div class="shift-time-column">${timeDisplay}</div>
                </div>
            `;

            // Style avec gradient
            const darkerColor = this.darkenColor(backgroundColor, 15);
            shiftBlock.style.background = `linear-gradient(135deg, ${backgroundColor} 0%, ${darkerColor} 100%)`;

            return shiftBlock;

        } catch (error) {
            console.error('❌ Erreur création bloc optimisé:', error);
            return null;
        }
    };
}

/**
 * Exécution complète du nettoyage et de la correction
 */
function executeFullCleanupAndFix() {
    console.log('🚀 Exécution du nettoyage complet...');

    try {
        // 1. Nettoyer les données corrompues
        const cleanupResult = cleanupCorruptedData();

        // 2. Corriger le layout
        fixEmployeeColumnLayout();

        // 3. Optimiser le rendu
        optimizeShiftRendering();

        // 4. Régénérer complètement
        if (window.PlanningManager) {
            // Forcer la régénération avec les nouvelles méthodes
            setTimeout(() => {
                window.PlanningManager.generateGrid();
                window.PlanningManager.renderShifts();

                // Vérification finale
                const cells = document.querySelectorAll('.employee-cell').length;
                const shifts = document.querySelectorAll('.shift-block').length;
                const employees = window.StateManager?.getState('employees')?.length || 0;

                console.log(`🎉 SUCCÈS! ${employees} employés, ${cells} cellules, ${shifts} créneaux`);

                // Activer le drag & drop
                if (window.DragDropManager) {
                    setTimeout(() => window.DragDropManager.refresh(), 200);
                }

            }, 100);
        }

        return cleanupResult;

    } catch (error) {
        console.error('❌ Erreur nettoyage complet:', error);
        throw error;
    }
}

// ==================== EXÉCUTION AUTOMATIQUE ====================

// Exécuter immédiatement
setTimeout(() => {
    try {
        console.log('🧹 Début du nettoyage complet et correction...');

        const result = executeFullCleanupAndFix();

        console.log('✨ Nettoyage et correction terminés!');

    } catch (error) {
        console.error('💥 Erreur lors du nettoyage:', error);
    }
}, 400);

// Exposer pour tests manuels
if (window.location.hostname === 'localhost') {
    window.debugCleanup = {
        cleanup: cleanupCorruptedData,
        fixLayout: fixEmployeeColumnLayout,
        fullFix: executeFullCleanupAndFix
    };

    console.log('🛠️ Fonctions de nettoyage: window.debugCleanup');
}

console.log('🔧 Correctif de nettoyage final chargé');

/**
 * CORRECTIF NETTOYAGE - BUG startsWith RÉPARÉ
 * Corrige l'erreur de type et nettoie définitivement les employés "Supprimé"
 */

/**
 * Nettoie les données corrompues - VERSION CORRIGÉE
 */
function cleanupCorruptedDataFixed() {
    console.log('🧹 Nettoyage des données corrompues (version corrigée)...');

    if (!window.StateManager) {
        console.error('❌ StateManager non disponible');
        return { deletedEmployees: 0, deletedShifts: 0 };
    }

    const employees = window.StateManager.getState('employees');
    const shifts = window.StateManager.getState('shifts');

    if (!employees || !shifts) {
        console.error('❌ Données employees/shifts non disponibles');
        return { deletedEmployees: 0, deletedShifts: 0 };
    }

    let deletedEmployees = 0;
    let deletedShifts = 0;

    console.log(`📊 Avant nettoyage: ${employees.length} employés, ${shifts.length} créneaux`);

    // MÉTHODE 1: Nettoyer via Array (plus sûr)
    const cleanEmployees = [];
    const employeesToDelete = [];

    employees.forEach((employee, index) => {
        const employeeId = employee?.id;
        const employeeIdStr = String(employeeId || '');

        // Critères de suppression
        const shouldDelete = !employee ||
                           !employee.id ||
                           employee.nom === 'Employé' ||
                           employee.prenom === 'Supprimé' ||
                           employee.nom === 'Supprimé' ||
                           employeeIdStr.startsWith('emp_') && (!employee.nom || !employee.prenom) ||
                           (employee.nom === 'Supprimé' && employee.prenom === 'Employé');

        if (shouldDelete) {
            employeesToDelete.push({ employee, index, id: employeeId });
            deletedEmployees++;
            console.log(`🗑️ Employé à supprimer: ${employee?.nom} ${employee?.prenom} (ID: ${employeeId})`);
        } else {
            cleanEmployees.push(employee);
            console.log(`✅ Employé conservé: ${employee.nom} ${employee.prenom} (ID: ${employeeId})`);
        }
    });

    // Créer un Set des IDs d'employés valides
    const validEmployeeIds = new Set();
    cleanEmployees.forEach(emp => {
        if (emp && emp.id) {
            validEmployeeIds.add(emp.id);
        }
    });

    console.log(`📋 Employés valides: ${Array.from(validEmployeeIds).join(', ')}`);

    // Nettoyer les créneaux orphelins
    const cleanShifts = [];
    shifts.forEach((shift, index) => {
        const shiftEmployeeId = shift?.employee_id;

        // Critères de suppression de créneaux
        const shouldDeleteShift = !shift ||
                                  !shift.id ||
                                  !shift.employee_id ||
                                  !validEmployeeIds.has(shiftEmployeeId) ||
                                  !shift.day ||
                                  typeof shift.start_hour !== 'number';

        if (shouldDeleteShift) {
            deletedShifts++;
            console.log(`🗑️ Créneau à supprimer: ${shift?.id} (employé: ${shiftEmployeeId})`);
        } else {
            cleanShifts.push(shift);
            console.log(`✅ Créneau conservé: ${shift.id} (employé: ${shiftEmployeeId})`);
        }
    });

    // Mettre à jour le state avec les données nettoyées
    try {
        // Remplacer les données dans le StateManager
        const stateData = window.StateManager.getState();
        stateData.employees = cleanEmployees;
        stateData.shifts = cleanShifts;

        // Mettre à jour les Maps internes si elles existent
        if (window.StateManager.state.get('employees')) {
            const employeesMap = window.StateManager.state.get('employees');
            employeesMap.clear();
            cleanEmployees.forEach(emp => {
                if (emp && emp.id) {
                    employeesMap.set(emp.id, emp);
                }
            });
        }

        if (window.StateManager.state.get('shifts')) {
            const shiftsMap = window.StateManager.state.get('shifts');
            shiftsMap.clear();
            cleanShifts.forEach(shift => {
                if (shift && shift.id) {
                    shiftsMap.set(shift.id, shift);
                }
            });
        }

        // Mettre à jour les métadonnées
        window.StateManager.updateMeta();
        window.StateManager.markDirty();

        console.log(`✅ Nettoyage terminé: ${deletedEmployees} employés supprimés, ${deletedShifts} créneaux supprimés`);
        console.log(`📊 Après nettoyage: ${cleanEmployees.length} employés, ${cleanShifts.length} créneaux`);

        return {
            deletedEmployees,
            deletedShifts,
            remainingEmployees: cleanEmployees.length,
            remainingShifts: cleanShifts.length,
            validEmployeeIds: Array.from(validEmployeeIds)
        };

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du state:', error);
        throw error;
    }
}

/**
 * Régénération complète après nettoyage
 */
function regenerateAfterCleanup() {
    console.log('🔄 Régénération après nettoyage...');

    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    try {
        // Attendre un peu pour que le state se stabilise
        setTimeout(() => {
            console.log('🏗️ Régénération de la grille...');

            // Forcer la régénération complète
            if (window.PlanningManager.generateGrid) {
                window.PlanningManager.generateGrid();
            }

            // Attendre et rendre les créneaux
            setTimeout(() => {
                console.log('🎨 Rendu des créneaux après nettoyage...');

                if (window.PlanningManager.renderShifts) {
                    window.PlanningManager.renderShifts();
                }

                // Vérification finale
                setTimeout(() => {
                    const finalEmployees = window.StateManager?.getState('employees')?.length || 0;
                    const finalShifts = window.StateManager?.getState('shifts')?.length || 0;
                    const visibleShifts = document.querySelectorAll('.shift-block').length;
                    const employeeCells = document.querySelectorAll('.employee-cell, .employee-column-cell').length;

                    console.log('📊 RÉSULTAT FINAL:');
                    console.log(`   - ${finalEmployees} employés dans le state`);
                    console.log(`   - ${finalShifts} créneaux dans le state`);
                    console.log(`   - ${visibleShifts} créneaux visibles`);
                    console.log(`   - ${employeeCells} cellules employé`);

                    // Rafraîchir le drag & drop
                    if (window.DragDropManager && window.DragDropManager.refresh) {
                        window.DragDropManager.refresh();
                    }

                    // Notification de succès
                    console.log('🎉 NETTOYAGE ET RÉGÉNÉRATION TERMINÉS !');

                }, 300);
            }, 200);
        }, 100);

    } catch (error) {
        console.error('❌ Erreur régénération:', error);
    }
}

/**
 * Exécution complète du nettoyage corrigé
 */
function executeCompleteCleanup() {
    console.log('🚀 Début du nettoyage complet corrigé...');

    try {
        // 1. Nettoyer les données
        const cleanupResult = cleanupCorruptedDataFixed();

        console.log('📋 Résultat du nettoyage:', cleanupResult);

        // 2. Régénérer l'affichage
        regenerateAfterCleanup();

        return cleanupResult;

    } catch (error) {
        console.error('💥 Erreur lors du nettoyage complet:', error);

        // Fallback: au moins essayer de supprimer manuellement
        console.log('🔄 Tentative de nettoyage manuel...');

        try {
            const employees = window.StateManager?.getState('employees') || [];
            const validEmployees = employees.filter(emp =>
                emp && emp.id && emp.nom && emp.prenom &&
                emp.nom !== 'Supprimé' && emp.prenom !== 'Supprimé'
            );

            console.log(`🧹 Nettoyage manuel: ${employees.length} -> ${validEmployees.length} employés`);

            // Forcer la régénération même en cas d'erreur
            regenerateAfterCleanup();

        } catch (fallbackError) {
            console.error('❌ Même le fallback a échoué:', fallbackError);
        }
    }
}

/**
 * Test de nettoyage manuel pour debug
 */
function manualCleanupTest() {
    console.log('🧪 Test de nettoyage manuel...');

    const employees = window.StateManager?.getState('employees') || [];
    console.log('Employés avant:', employees.map(e => `${e?.nom} ${e?.prenom} (${e?.id})`));

    const cleanEmployees = employees.filter(emp => {
        const keep = emp && emp.id && emp.nom && emp.prenom &&
                    emp.nom !== 'Supprimé' && emp.prenom !== 'Supprimé' &&
                    emp.nom !== 'Employé';

        console.log(`${keep ? '✅' : '🗑️'} ${emp?.nom} ${emp?.prenom}`);
        return keep;
    });

    console.log('Employés après:', cleanEmployees.map(e => `${e.nom} ${e.prenom} (${e.id})`));

    return cleanEmployees;
}

// ==================== EXÉCUTION ET EXPOSITION ====================

// Exécuter automatiquement dans 1 seconde
setTimeout(() => {
    executeCompleteCleanup();
}, 1000);

// Exposer les fonctions pour debug
if (typeof window !== 'undefined') {
    window.debugCleanupFixed = {
        cleanup: cleanupCorruptedDataFixed,
        regenerate: regenerateAfterCleanup,
        fullCleanup: executeCompleteCleanup,
        manualTest: manualCleanupTest
    };

    console.log('🛠️ Fonctions de nettoyage corrigées: window.debugCleanupFixed');
}

console.log('🔧 Correctif de nettoyage corrigé chargé');

/**
 * CORRECTIF LAYOUT FINAL - STRUCTURE CSS OPTIMISÉE
 * Corrige définitivement le layout en colonnes employés avec CSS Grid
 */

/**
 * Corrige le layout avec CSS Grid moderne
 */
function fixLayoutWithCSSGrid() {
    console.log('🎨 Correction du layout avec CSS Grid...');

    if (!window.PlanningManager) return;

    // Nouvelle génération de grille optimisée
    window.PlanningManager.generateGrid = function() {
        console.log('🏗️ Génération grille optimisée...');

        const headerContainer = document.getElementById('planningHeader');
        const gridContainer = document.getElementById('planningGrid');

        if (!headerContainer || !gridContainer) {
            console.error('❌ Conteneurs non trouvés');
            return;
        }

        // Récupérer les employés actifs (après nettoyage)
        const employees = this.getActiveEmployees();
        const days = window.Config?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const hours = window.Config?.HOURS_RANGE || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

        console.log(`📊 Layout pour: ${employees.length} employés, ${days.length} jours, ${hours.length} heures`);

        if (employees.length === 0) {
            console.warn('⚠️ Aucun employé trouvé pour la grille');
            headerContainer.innerHTML = '<div class="no-employees">Aucun employé</div>';
            gridContainer.innerHTML = '<div class="no-employees">Ajoutez des employés pour voir le planning</div>';
            return;
        }

        // Générer l'en-tête optimisé
        this.generateOptimizedHeader(headerContainer, employees, days);

        // Générer la grille optimisée
        this.generateOptimizedGrid(gridContainer, employees, days, hours);

        console.log('✅ Grille optimisée générée');
    };

    // En-tête optimisé
    window.PlanningManager.generateOptimizedHeader = function(container, employees, days) {
        const employeeCount = employees.length;

        let headerHTML = `
            <div class="planning-header-optimized">
                <div class="time-header-cell">Heures</div>
                ${days.map(day => `
                    <div class="day-header-cell">
                        <div class="day-name">${day}</div>
                        <div class="employees-row" style="grid-template-columns: repeat(${employeeCount}, 1fr);">
                            ${employees.map(employee => {
                                const initials = `${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase();
                                const color = this.getEmployeeColor(employee.poste);
                                return `
                                    <div class="employee-header-cell" title="${employee.prenom} ${employee.nom} - ${employee.poste}">
                                        <div class="employee-avatar-header" style="background-color: ${color};">
                                            ${initials}
                                        </div>
                                        <span class="employee-name-header">${employee.prenom}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = headerHTML;
    };

    // Grille optimisée
    window.PlanningManager.generateOptimizedGrid = function(container, employees, days, hours) {
        const employeeCount = employees.length;

        let gridHTML = `
            <div class="planning-body-optimized">
                ${hours.map(hour => {
                    const displayHour = hour === 0 ? '00:00' : hour < 10 ? `0${hour}:00` : `${hour}:00`;
                    return `
                        <div class="time-row">
                            <div class="time-cell-body">${displayHour}</div>
                            ${days.map(day => `
                                <div class="day-cell">
                                    <div class="employee-slots" style="grid-template-columns: repeat(${employeeCount}, 1fr);">
                                        ${employees.map((employee, index) => `
                                            <div class="employee-slot"
                                                 data-day="${day}"
                                                 data-hour="${hour}"
                                                 data-employee-id="${employee.id}"
                                                 data-employee-name="${employee.prenom}"
                                                 title="Slot: ${employee.prenom} - ${day} ${displayHour}">
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = gridHTML;

        // Appliquer les styles CSS Grid
        this.applyOptimizedStyles(employeeCount, days.length, hours.length);
    };

    // Styles CSS Grid optimisés
    window.PlanningManager.applyOptimizedStyles = function(employeeCount, dayCount, hourCount) {
        // Supprimer les anciens styles
        const oldStyles = document.querySelectorAll('#planning-grid-styles, #planning-columns-style');
        oldStyles.forEach(style => style.remove());

        const style = document.createElement('style');
        style.id = 'planning-grid-styles';
        style.textContent = `
            /* LAYOUT CSS GRID OPTIMISÉ */
            .planning-header-optimized {
                display: grid;
                grid-template-columns: 80px repeat(${dayCount}, 1fr);
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 100;
                font-size: 0.85rem;
            }

            .time-header-cell {
                background: #e9ecef;
                padding: 1rem 0.5rem;
                font-weight: 600;
                text-align: center;
                border-right: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .day-header-cell {
                border-right: 1px solid #dee2e6;
                background: white;
            }

            .day-name {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.75rem;
                text-align: center;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .employees-row {
                display: grid;
                gap: 1px;
                background: #f1f3f4;
                padding: 0.5rem 0;
            }

            .employee-header-cell {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem;
                text-align: center;
            }

            .employee-avatar-header {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .employee-name-header {
                font-size: 0.65rem;
                font-weight: 500;
                color: #495057;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* CORPS DE LA GRILLE */
            .planning-body-optimized {
                background: white;
                border-radius: 0 0 8px 8px;
                overflow: hidden;
            }

            .time-row {
                display: grid;
                grid-template-columns: 80px repeat(${dayCount}, 1fr);
                border-bottom: 1px solid #e9ecef;
                min-height: 60px;
            }

            .time-cell-body {
                background: #f8f9fa;
                padding: 0.75rem 0.5rem;
                text-align: center;
                font-weight: 500;
                color: #6c757d;
                border-right: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
            }

            .day-cell {
                border-right: 1px solid #dee2e6;
                background: white;
                position: relative;
            }

            .employee-slots {
                display: grid;
                height: 100%;
                min-height: 60px;
                gap: 1px;
                background: #f8f9fa;
            }

            .employee-slot {
                background: white;
                position: relative;
                transition: background-color 0.2s ease;
                border: 1px solid transparent;
                padding: 2px;
                box-sizing: border-box;
            }

            .employee-slot:hover {
                background-color: rgba(0, 123, 255, 0.05) !important;
                border-color: rgba(0, 123, 255, 0.2);
            }

            /* CRÉNEAUX DANS LES SLOTS */
            .shift-block {
                position: absolute !important;
                top: 2px;
                left: 2px;
                right: 2px;
                bottom: 2px;
                border-radius: 4px;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                text-align: center;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                border: 1px solid rgba(255,255,255,0.3);
                z-index: 10;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 2px;
                box-sizing: border-box;
                transition: all 0.2s ease;
            }

            .shift-block:hover {
                transform: scale(1.05);
                z-index: 50 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
            }

            .shift-block:active {
                cursor: grabbing;
                transform: scale(0.98);
            }

            .shift-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                height: 100%;
                justify-content: center;
                text-align: center;
                line-height: 1.1;
            }

            .shift-avatar {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                font-size: 0.6rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.2);
                flex-shrink: 0;
            }

            .shift-time {
                font-size: 0.65rem;
                opacity: 0.95;
                font-weight: 500;
                margin-top: 1px;
            }

            /* DRAG & DROP STATES */
            .employee-slot.drag-over {
                background-color: rgba(40, 167, 69, 0.1) !important;
                border-color: #28a745 !important;
                border-style: dashed !important;
            }

            .employee-slot.drag-invalid {
                background-color: rgba(220, 38, 38, 0.1) !important;
                border-color: #dc2626 !important;
                border-style: dashed !important;
            }

            .shift-block.dragging {
                opacity: 0.7;
                transform: rotate(3deg) scale(1.1);
                z-index: 1000 !important;
            }

            /* RESPONSIVE */
            @media (max-width: 1400px) {
                .employee-slots {
                    gap: 0;
                }

                .employee-name-header {
                    font-size: 0.6rem;
                }

                .employee-avatar-header {
                    width: 20px;
                    height: 20px;
                    font-size: 0.65rem;
                }
            }

            @media (max-width: 1024px) {
                .time-header-cell,
                .time-cell-body {
                    width: 60px;
                    font-size: 0.75rem;
                }

                .planning-header-optimized,
                .time-row {
                    grid-template-columns: 60px repeat(${dayCount}, 1fr);
                }

                .employee-name-header {
                    display: none;
                }

                .shift-block {
                    font-size: 0.65rem;
                }
            }

            @media (max-width: 768px) {
                .planning-header-optimized,
                .time-row {
                    grid-template-columns: 50px repeat(${dayCount}, 1fr);
                }

                .time-header-cell,
                .time-cell-body {
                    width: 50px;
                    font-size: 0.7rem;
                    padding: 0.5rem 0.25rem;
                }

                .employee-avatar-header {
                    width: 18px;
                    height: 18px;
                    font-size: 0.6rem;
                }

                .shift-block {
                    font-size: 0.6rem;
                }

                .shift-avatar {
                    width: 14px;
                    height: 14px;
                    font-size: 0.55rem;
                }
            }
        `;

        document.head.appendChild(style);
        console.log(`✅ Styles CSS Grid appliqués (${employeeCount} employés)`);
    };

    console.log('✅ Layout CSS Grid configuré');
}

/**
 * Rendu optimisé des créneaux dans les slots
 */
function optimizeShiftRendering() {
    if (!window.PlanningManager) return;

    // Rendu optimisé de créneau individuel
    window.PlanningManager.renderShiftInColumn = function(shift, employee) {
        try {
            // Trouver le slot spécifique
            const slot = document.querySelector(
                `.employee-slot[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-employee-id="${employee.id}"]`
            );

            if (!slot) {
                console.warn(`⚠️ Slot non trouvé: ${shift.day} ${shift.start_hour}h ${employee.prenom}`);
                return false;
            }

            // Nettoyer le slot existant
            const existingShift = slot.querySelector('.shift-block');
            if (existingShift) {
                existingShift.remove();
            }

            // Créer le nouveau bloc optimisé
            const shiftBlock = this.createOptimizedShiftBlock(shift, employee);
            if (!shiftBlock) return false;

            // Ajouter au slot
            slot.appendChild(shiftBlock);

            console.log(`📍 ✅ ${employee.prenom} -> ${shift.day} ${shift.start_hour}h`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur rendu optimisé ${shift.id}:`, error);
            return false;
        }
    };

    // Création optimisée des blocs
    window.PlanningManager.createOptimizedShiftBlock = function(shift, employee) {
        try {
            const shiftBlock = document.createElement('div');
            shiftBlock.className = 'shift-block';
            shiftBlock.dataset.shiftId = shift.id;
            shiftBlock.dataset.employeeId = employee.id;
            shiftBlock.dataset.day = shift.day;
            shiftBlock.dataset.hour = shift.start_hour;
            shiftBlock.draggable = true;

            // Couleur et style
            const backgroundColor = this.getEmployeeColor(employee.poste);
            const duration = shift.duration || 1;
            const endHour = shift.start_hour + duration;
            const timeDisplay = `${shift.start_hour}h-${endHour}h`;
            const initials = `${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase();

            // Contenu optimisé
            shiftBlock.innerHTML = `
                <div class="shift-content">
                    <div class="shift-avatar">${initials}</div>
                    <div class="shift-time">${timeDisplay}</div>
                </div>
            `;

            // Style avec gradient
            const darkerColor = this.darkenColor(backgroundColor, 15);
            shiftBlock.style.background = `linear-gradient(135deg, ${backgroundColor} 0%, ${darkerColor} 100%)`;

            return shiftBlock;

        } catch (error) {
            console.error('❌ Erreur création bloc optimisé:', error);
            return null;
        }
    };

    console.log('✅ Rendu optimisé configuré');
}

/**
 * Application complète du correctif layout
 */
function applyCompleteLayoutFix() {
    console.log('🚀 Application du correctif layout complet...');

    try {
        // 1. Configurer le layout CSS Grid
        fixLayoutWithCSSGrid();

        // 2. Optimiser le rendu
        optimizeShiftRendering();

        // 3. Régénérer immédiatement
        setTimeout(() => {
            if (window.PlanningManager) {
                console.log('🔄 Régénération avec nouveau layout...');

                window.PlanningManager.generateGrid();

                setTimeout(() => {
                    window.PlanningManager.renderShifts();

                    // Vérification finale
                    setTimeout(() => {
                        const employees = window.StateManager?.getState('employees')?.length || 0;
                        const slots = document.querySelectorAll('.employee-slot').length;
                        const shifts = document.querySelectorAll('.shift-block').length;

                        console.log('📊 LAYOUT FINAL:');
                        console.log(`   - ${employees} employés`);
                        console.log(`   - ${slots} slots employé`);
                        console.log(`   - ${shifts} créneaux visibles`);

                        if (slots === employees * 7 * 19) { // 7 jours × 19 heures
                            console.log('🎉 LAYOUT PARFAIT !');
                        } else {
                            console.warn(`⚠️ Layout incorrect: attendu ${employees * 7 * 19} slots, trouvé ${slots}`);
                        }

                        // Activer le drag & drop
                        if (window.DragDropManager) {
                            setTimeout(() => window.DragDropManager.refresh(), 100);
                        }

                    }, 200);
                }, 100);
            }
        }, 50);

    } catch (error) {
        console.error('❌ Erreur application layout fix:', error);
    }
}

// ==================== EXÉCUTION AUTOMATIQUE ====================

// Appliquer immédiatement
setTimeout(() => {
    applyCompleteLayoutFix();
}, 100);

// Exposer pour debug
if (typeof window !== 'undefined') {
    window.debugLayout = {
        fixGrid: fixLayoutWithCSSGrid,
        optimizeRender: optimizeShiftRendering,
        fullFix: applyCompleteLayoutFix
    };

    console.log('🛠️ Fonctions layout: window.debugLayout');
}

console.log('🔧 Correctif layout final chargé');