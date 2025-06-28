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
 * CORRECTIF DE COMPATIBILITÉ
 * Adapte le nouveau StateManager pour être compatible avec l'ancien code
 * À ajouter TEMPORAIREMENT en fin du StateManager corrigé
 */

// ==================== COMPATIBILITÉ AVEC L'ANCIEN CODE ====================

/**
 * Méthode observe pour compatibilité avec l'ancien code
 * @deprecated Utiliser addListener à la place
 */
StateManager.prototype.observe = function(key, callback) {
    console.warn(`⚠️ observe() est deprecated, utilisez addListener('${key}', callback) à la place`);
    return this.addListener(key, callback);
};

/**
 * Méthode setState compatible avec l'ancien format
 */
StateManager.prototype.setStateOld = StateManager.prototype.setState;
StateManager.prototype.setState = function(key, value) {
    // Support ancien format avec objet complet
    if (typeof key === 'object' && value === undefined) {
        Object.entries(key).forEach(([k, v]) => {
            this.setStateOld(k, v);
        });
        return;
    }

    return this.setStateOld(key, value);
};

/**
 * Méthode getState compatible
 */
StateManager.prototype.getStateOld = StateManager.prototype.getState;
StateManager.prototype.getState = function(key) {
    if (!key) {
        // Retourner un objet plat pour compatibilité
        const flatState = {};

        // Conversion Map vers objet pour employees
        const employees = this.state.get('employees');
        if (employees) {
            flatState.employees = Array.from(employees.values());
        }

        // Conversion Map vers objet pour shifts
        const shifts = this.state.get('shifts');
        if (shifts) {
            flatState.shifts = Array.from(shifts.values());
        }

        // Autres propriétés
        flatState.ui = this.state.get('ui') || {};
        flatState.meta = this.state.get('meta') || {};

        return flatState;
    }

    return this.getStateOld(key);
};

/**
 * Propriété state accessible pour compatibilité
 */
if (window.StateManager && !window.StateManager.state.temp) {
    window.StateManager.state.set('temp', {
        isDirty: false,
        granularity: 60
    });
}

// Alias pour compatibilité totale
if (window.StateManager) {
    // Méthodes manquantes de l'ancien State
    window.StateManager.calculateStatistics = function() {
        console.log('📊 Calcul des statistiques...');
        this.updateMeta();
    };

    window.StateManager.setSapp = function(key, value) {
        console.warn('⚠️ setSapp() deprecated, utilisez setState()');
        return this.setState(key, value);
    };
}

console.log('🔧 Correctifs de compatibilité appliqués');