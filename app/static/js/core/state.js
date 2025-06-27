/**
 * GESTION D'ÉTAT CENTRALISÉE - Planning Restaurant
 * Remplace et unifie AppState, les variables globales dispersées
 * State management moderne avec observateurs et synchronisation
 */

class PlanningState {
    constructor() {
        this.observers = new Map();
        this.initializeState();
        this.setupAutoSave();

        console.log('📊 State management centralisé initialisé');
    }

    /**
     * Initialise l'état de l'application
     */
    initializeState() {
        this.state = {
            // Données principales
            employees: new Map(),
            shifts: new Map(),

            // Interface utilisateur
            ui: {
                currentWeekOffset: 0,
                currentView: 'week', // week, day, employee
                selectedEmployee: null,
                selectedShift: null,
                isLoading: false,
                draggedElement: null,
                dragOffset: { x: 0, y: 0 },
                isResizing: false,
                resizeDirection: null
            },

            // Filtres et vues
            filters: {
                employee: '',
                day: '',
                type: '',
                timeRange: null
            },

            // Cache des données organisées
            cache: {
                shiftsByCell: new Map(),      // key: "day_hour_minutes", value: [shifts]
                employeeShifts: new Map(),    // key: employeeId, value: [shifts]
                dayShifts: new Map(),         // key: day, value: [shifts]
                statistics: null,             // Stats calculées
                lastUpdated: null
            },

            // Configuration temporaire
            temp: {
                granularity: window.Config?.TIME_SLOT_GRANULARITY || 60,
                weekStart: new Date(),
                isDirty: false,
                lastSaveTime: null,
                pendingChanges: []
            },

            // Métadonnées
            meta: {
                version: '2.0.0',
                lastDataLoad: null,
                totalEmployees: 0,
                totalShifts: 0,
                totalHours: 0
            }
        };

        // Calculer la semaine actuelle
        this.updateCurrentWeek();
    }

    /**
     * Observe les changements d'une propriété
     */
    observe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, []);
        }
        this.observers.get(path).push(callback);

        // Retourner une fonction de désabonnement
        return () => {
            const callbacks = this.observers.get(path);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Émet les changements aux observateurs
     */
    emit(path, oldValue, newValue) {
        const callbacks = this.observers.get(path);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Erreur dans l'observateur ${path}:`, error);
                }
            });
        }

        // Émettre aussi vers EventBus global si disponible
        if (window.EventBus) {
            window.EventBus.emit(`state:${path}`, { oldValue, newValue, path });
        }
    }

    /**
     * Met à jour une propriété de l'état
     */
    setState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        let oldValue;

        // Naviguer jusqu'à la propriété parent
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        const lastKey = keys[keys.length - 1];
        oldValue = current[lastKey];

        // Mettre à jour seulement si la valeur a changé
        if (oldValue !== value) {
            current[lastKey] = value;
            this.emit(path, oldValue, value);

            // Marquer comme modifié
            this.markDirty();
        }
    }

    /**
     * Obtient une propriété de l'état
     */
    getState(path) {
        if (!path) return this.state;

        const keys = path.split('.');
        let current = this.state;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    // ==================== GESTION DES EMPLOYÉS ====================

    /**
     * Ajoute ou met à jour un employé
     */
    setEmployee(employee) {
        const existingEmployee = this.state.employees.get(employee.id);
        this.state.employees.set(employee.id, { ...employee });

        this.updateCache();
        this.emit('employees', existingEmployee, employee);

        if (!existingEmployee) {
            this.state.meta.totalEmployees++;
            console.log(`👤 Employé ajouté: ${employee.prenom} ${employee.nom}`);
        } else {
            console.log(`👤 Employé mis à jour: ${employee.prenom} ${employee.nom}`);
        }
    }

    /**
     * Supprime un employé
     */
    removeEmployee(employeeId) {
        const employee = this.state.employees.get(employeeId);
        if (employee) {
            this.state.employees.delete(employeeId);

            // Supprimer aussi tous les créneaux de cet employé
            const shiftsToRemove = [];
            this.state.shifts.forEach((shift, id) => {
                if (shift.employee_id === employeeId) {
                    shiftsToRemove.push(id);
                }
            });

            shiftsToRemove.forEach(id => this.removeShift(id));

            this.updateCache();
            this.state.meta.totalEmployees--;
            this.emit('employees', employee, null);

            console.log(`👤 Employé supprimé: ${employee.prenom} ${employee.nom}`);
        }
    }

    /**
     * Obtient tous les employés actifs
     */
    getActiveEmployees() {
        return Array.from(this.state.employees.values())
            .filter(emp => emp.actif !== false)
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }

    // ==================== GESTION DES CRÉNEAUX ====================

    /**
     * Ajoute ou met à jour un créneau
     */
    setShift(shift) {
        const existingShift = this.state.shifts.get(shift.id);
        this.state.shifts.set(shift.id, { ...shift });

        this.updateCache();
        this.emit('shifts', existingShift, shift);

        if (!existingShift) {
            this.state.meta.totalShifts++;
            this.state.meta.totalHours += shift.duration || 0;
            console.log(`📅 Créneau ajouté: ${shift.employee_id} - ${shift.day}`);
        } else {
            this.state.meta.totalHours -= existingShift.duration || 0;
            this.state.meta.totalHours += shift.duration || 0;
            console.log(`📅 Créneau mis à jour: ${shift.employee_id} - ${shift.day}`);
        }
    }

    /**
     * Supprime un créneau
     */
    removeShift(shiftId) {
        const shift = this.state.shifts.get(shiftId);
        if (shift) {
            this.state.shifts.delete(shiftId);

            this.updateCache();
            this.state.meta.totalShifts--;
            this.state.meta.totalHours -= shift.duration || 0;
            this.emit('shifts', shift, null);

            console.log(`📅 Créneau supprimé: ${shift.employee_id} - ${shift.day}`);
        }
    }

    /**
     * Obtient les créneaux d'une cellule spécifique
     */
    getShiftsForCell(day, hour, minutes = 0) {
        const key = `${day}_${hour}_${minutes}`;
        return this.state.cache.shiftsByCell.get(key) || [];
    }

    /**
     * Obtient tous les créneaux d'un employé
     */
    getEmployeeShifts(employeeId) {
        return this.state.cache.employeeShifts.get(employeeId) || [];
    }

    /**
     * Obtient tous les créneaux d'un jour
     */
    getDayShifts(day) {
        return this.state.cache.dayShifts.get(day) || [];
    }

    // ==================== CACHE ET OPTIMISATIONS ====================

    /**
     * Met à jour le cache des données organisées
     */
    updateCache() {
        const startTime = performance.now();

        // Réinitialiser les caches
        this.state.cache.shiftsByCell.clear();
        this.state.cache.employeeShifts.clear();
        this.state.cache.dayShifts.clear();

        // Reconstruire les caches
        this.state.shifts.forEach(shift => {
            // Cache par cellule
            const cellKey = `${shift.day}_${shift.start_hour}_${shift.start_minutes || 0}`;
            if (!this.state.cache.shiftsByCell.has(cellKey)) {
                this.state.cache.shiftsByCell.set(cellKey, []);
            }
            this.state.cache.shiftsByCell.get(cellKey).push(shift);

            // Cache par employé
            if (!this.state.cache.employeeShifts.has(shift.employee_id)) {
                this.state.cache.employeeShifts.set(shift.employee_id, []);
            }
            this.state.cache.employeeShifts.get(shift.employee_id).push(shift);

            // Cache par jour
            if (!this.state.cache.dayShifts.has(shift.day)) {
                this.state.cache.dayShifts.set(shift.day, []);
            }
            this.state.cache.dayShifts.get(shift.day).push(shift);
        });

        this.state.cache.lastUpdated = new Date();

        const endTime = performance.now();
        console.log(`🔄 Cache mis à jour en ${(endTime - startTime).toFixed(2)}ms`);
    }

    /**
     * Calcule les statistiques
     */
    calculateStatistics() {
        const stats = {
            totalEmployees: this.state.employees.size,
            activeEmployees: this.getActiveEmployees().length,
            totalShifts: this.state.shifts.size,
            totalHours: this.state.meta.totalHours,

            byEmployee: new Map(),
            byDay: new Map(),
            byType: new Map()
        };

        // Statistiques par employé
        this.state.cache.employeeShifts.forEach((shifts, employeeId) => {
            const employee = this.state.employees.get(employeeId);
            if (employee) {
                const totalHours = shifts.reduce((sum, shift) => sum + (shift.duration || 0), 0);
                stats.byEmployee.set(employeeId, {
                    employee,
                    shiftsCount: shifts.length,
                    totalHours,
                    averageShift: totalHours / shifts.length || 0
                });
            }
        });

        // Statistiques par jour
        this.state.cache.dayShifts.forEach((shifts, day) => {
            const totalHours = shifts.reduce((sum, shift) => sum + (shift.duration || 0), 0);
            stats.byDay.set(day, {
                shiftsCount: shifts.length,
                totalHours,
                employeesCount: new Set(shifts.map(s => s.employee_id)).size
            });
        });

        // Statistiques par type de poste
        this.state.shifts.forEach(shift => {
            const employee = this.state.employees.get(shift.employee_id);
            if (employee) {
                const type = employee.poste;
                if (!stats.byType.has(type)) {
                    stats.byType.set(type, { shiftsCount: 0, totalHours: 0 });
                }
                stats.byType.get(type).shiftsCount++;
                stats.byType.get(type).totalHours += shift.duration || 0;
            }
        });

        this.state.cache.statistics = stats;
        return stats;
    }

    // ==================== GESTION DE LA SEMAINE ====================

    /**
     * Met à jour la semaine courante
     */
    updateCurrentWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuster pour que lundi soit le premier jour

        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        this.state.temp.weekStart = monday;
        this.updateWeekDisplay();
    }

    /**
     * Change la semaine
     */
    changeWeek(offset) {
        const oldOffset = this.state.ui.currentWeekOffset;
        this.state.ui.currentWeekOffset += offset;

        // Calculer la nouvelle date de début
        const newWeekStart = new Date(this.state.temp.weekStart);
        newWeekStart.setDate(newWeekStart.getDate() + (this.state.ui.currentWeekOffset * 7));

        this.updateWeekDisplay();
        this.emit('week', oldOffset, this.state.ui.currentWeekOffset);

        console.log(`📅 Changement semaine: ${offset > 0 ? 'suivante' : 'précédente'}`);
    }

    /**
     * Met à jour l'affichage de la semaine
     */
    updateWeekDisplay() {
        const weekStart = new Date(this.state.temp.weekStart);
        weekStart.setDate(weekStart.getDate() + (this.state.ui.currentWeekOffset * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const formatDate = (date) => {
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long'
            });
        };

        const weekDisplay = `Semaine du ${formatDate(weekStart)} au ${formatDate(weekEnd)} ${weekStart.getFullYear()}`;

        const displayElement = document.getElementById('currentWeekDisplay');
        if (displayElement) {
            displayElement.textContent = weekDisplay;
        }
    }

    // ==================== PERSISTANCE ET SYNCHRONISATION ====================

    /**
     * Marque l'état comme modifié
     */
    markDirty() {
        this.state.temp.isDirty = true;
        this.state.temp.pendingChanges.push({
            timestamp: Date.now(),
            action: 'modify'
        });
    }

    /**
     * Marque l'état comme sauvegardé
     */
    markClean() {
        this.state.temp.isDirty = false;
        this.state.temp.lastSaveTime = Date.now();
        this.state.temp.pendingChanges = [];
    }

    /**
     * Configure la sauvegarde automatique
     */
    setupAutoSave() {
        // Sauvegarder toutes les 30 secondes si des modifications sont en attente
        setInterval(() => {
            if (this.state.temp.isDirty && window.APIManager) {
                console.log('💾 Sauvegarde automatique déclenchée');
                window.APIManager.autoSave();
            }
        }, 30000);

        // Sauvegarder avant fermeture de la page
        window.addEventListener('beforeunload', (e) => {
            if (this.state.temp.isDirty) {
                e.preventDefault();
                e.returnValue = 'Des modifications non sauvegardées seront perdues. Continuer ?';
            }
        });
    }

    // ==================== UTILITAIRES ====================

    /**
     * Réinitialise l'état
     */
    reset() {
        this.initializeState();
        this.updateCache();
        console.log('🔄 État réinitialisé');
    }

    /**
     * Importe des données
     */
    importData(data) {
        if (data.employees) {
            this.state.employees.clear();
            data.employees.forEach(emp => this.setEmployee(emp));
        }

        if (data.shifts) {
            this.state.shifts.clear();
            data.shifts.forEach(shift => this.setShift(shift));
        }

        this.updateCache();
        this.state.meta.lastDataLoad = new Date();

        console.log(`📥 Données importées: ${this.state.employees.size} employés, ${this.state.shifts.size} créneaux`);
    }

    /**
     * Exporte les données
     */
    exportData() {
        return {
            employees: Array.from(this.state.employees.values()),
            shifts: Array.from(this.state.shifts.values()),
            meta: {
                exportDate: new Date().toISOString(),
                version: this.state.meta.version,
                totalEmployees: this.state.meta.totalEmployees,
                totalShifts: this.state.meta.totalShifts,
                totalHours: this.state.meta.totalHours
            }
        };
    }

    /**
     * Valide l'intégrité des données
     */
    validateIntegrity() {
        const errors = [];

        // Vérifier que tous les créneaux ont un employé valide
        this.state.shifts.forEach((shift, id) => {
            if (!this.state.employees.has(shift.employee_id)) {
                errors.push(`Créneau ${id} référence un employé inexistant: ${shift.employee_id}`);
            }
        });

        // Vérifier les doublons de créneaux
        const shiftKeys = new Set();
        this.state.shifts.forEach((shift, id) => {
            const key = `${shift.employee_id}_${shift.day}_${shift.start_hour}_${shift.start_minutes || 0}`;
            if (shiftKeys.has(key)) {
                errors.push(`Créneau en doublon détecté: ${key}`);
            }
            shiftKeys.add(key);
        });

        if (errors.length > 0) {
            console.warn('⚠️ Problèmes d\'intégrité détectés:', errors);
        } else {
            console.log('✅ Intégrité des données validée');
        }

        return errors;
    }

    /**
     * Détecte les conflits de planning
     */
    detectConflicts() {
        const conflicts = [];
        const employeeSchedules = new Map();

        // Organiser les créneaux par employé et par jour
        this.state.shifts.forEach(shift => {
            const key = `${shift.employee_id}_${shift.day}`;
            if (!employeeSchedules.has(key)) {
                employeeSchedules.set(key, []);
            }
            employeeSchedules.get(key).push(shift);
        });

        // Détecter les chevauchements
        employeeSchedules.forEach((shifts, key) => {
            shifts.sort((a, b) => a.start_hour - b.start_hour || (a.start_minutes || 0) - (b.start_minutes || 0));

            for (let i = 0; i < shifts.length - 1; i++) {
                const current = shifts[i];
                const next = shifts[i + 1];

                const currentEnd = current.start_hour + (current.duration || 0);
                const nextStart = next.start_hour + ((next.start_minutes || 0) / 60);

                if (currentEnd > nextStart) {
                    conflicts.push({
                        type: 'overlap',
                        employee_id: current.employee_id,
                        day: current.day,
                        shift1: current,
                        shift2: next
                    });
                }
            }
        });

        return conflicts;
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('📊 État de l\'application');
        console.log('Employés:', this.state.employees.size);
        console.log('Créneaux:', this.state.shifts.size);
        console.log('Interface:', this.state.ui);
        console.log('Cache:', {
            shiftsByCell: this.state.cache.shiftsByCell.size,
            employeeShifts: this.state.cache.employeeShifts.size,
            dayShifts: this.state.cache.dayShifts.size,
            lastUpdated: this.state.cache.lastUpdated
        });
        console.log('Temporaire:', this.state.temp);
        console.log('Métadonnées:', this.state.meta);
        console.groupEnd();
    }

    /**
     * Obtient un résumé de l'état
     */
    getSummary() {
        return {
            employees: this.state.employees.size,
            shifts: this.state.shifts.size,
            totalHours: this.state.meta.totalHours,
            isDirty: this.state.temp.isDirty,
            weekOffset: this.state.ui.currentWeekOffset,
            granularity: this.state.temp.granularity,
            lastUpdate: this.state.cache.lastUpdated
        };
    }
}

// Instance globale unique
if (!window.State) {
    window.State = new PlanningState();

    // Exposer des méthodes de debug
    window.State.debug = window.State.debug.bind(window.State);
    window.State.summary = window.State.getSummary.bind(window.State);

    // Observer les changements pour le debug en mode développement
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.State.observe('employees', () => console.log('👥 Employés modifiés'));
        window.State.observe('shifts', () => console.log('📅 Créneaux modifiés'));
    }
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningState;
}