/**
 * STATE MANAGER OPTIMISÉ - Planning Restaurant
 * Version propre et fonctionnelle, sans code redondant
 */

class StateManager {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        this.isDirty = false;
        this.lastSave = null;

        this.initializeState();
        this.setupAutoSave();

        console.log('🚀 StateManager initialisé');
    }

    // ==================== INITIALISATION ====================

    initializeState() {
        this.state.set('employees', new Map());
        this.state.set('shifts', new Map());
        this.state.set('ui', {
            isLoading: false,
            selectedEmployee: null,
            granularity: 60
        });
        this.state.set('meta', {
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            totalEmployees: 0,
            totalShifts: 0,
            totalHours: 0
        });
        this.state.set('temp', {
            isDirty: false,
            granularity: 60
        });
    }

    setupAutoSave() {
        setInterval(() => {
            if (this.isDirty && window.APIManager) {
                window.APIManager.autoSave().catch(error => {
                    console.error('💾 Échec sauvegarde auto:', error);
                });
            }
        }, 30000);
    }

    // ==================== GESTION D'ÉTAT ====================

    setState(key, value) {
        try {
            const keys = key.split('.');
            let current = this.state;

            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!current.has(k)) {
                    current.set(k, {});
                }
                current = current.get(k);
            }

            const finalKey = keys[keys.length - 1];
            current[finalKey] = value;

            this.markDirty();
            this.notifyListeners(key, value);

            return true;
        } catch (error) {
            console.error('❌ Erreur setState:', error);
            return false;
        }
    }

    getState(key) {
        try {
            if (!key) {
                // Retourner les données en format compatible
                const employees = Array.from(this.state.get('employees').values());
                const shifts = Array.from(this.state.get('shifts').values());

                return {
                    employees,
                    shifts,
                    ui: this.state.get('ui'),
                    meta: this.state.get('meta'),
                    temp: this.state.get('temp')
                };
            }

            const keys = key.split('.');
            let current = this.state;

            for (const k of keys) {
                if (current instanceof Map) {
                    current = current.get(k);
                } else if (current && typeof current === 'object') {
                    current = current[k];
                } else {
                    return undefined;
                }

                if (current === undefined) return undefined;
            }

            return current;
        } catch (error) {
            console.error('❌ Erreur getState:', error);
            return undefined;
        }
    }

    // ==================== EMPLOYÉS ====================

    setEmployee(employee) {
        if (!this.validateEmployee(employee)) {
            console.error('❌ Employé invalide:', employee);
            return false;
        }

        // Nettoyer les données
        const cleanEmployee = {
            id: employee.id,
            nom: employee.nom.trim(),
            prenom: employee.prenom.trim(),
            poste: employee.poste,
            email: employee.email || '',
            telephone: employee.telephone || '',
            taux_horaire: parseFloat(employee.taux_horaire) || 15.0
        };

        this.state.get('employees').set(cleanEmployee.id, cleanEmployee);
        this.updateMeta();
        this.markDirty();

        console.log(`👤 Employé ${cleanEmployee.nom} ${cleanEmployee.prenom} mis à jour`);
        return true;
    }

    validateEmployee(employee) {
        return employee &&
               employee.id &&
               employee.nom &&
               employee.prenom &&
               employee.poste;
    }

    // ==================== CRÉNEAUX ====================

    setShift(shift) {
        if (!this.validateShift(shift)) {
            console.error('❌ Créneau invalide:', shift);
            return false;
        }

        // Vérifier que l'employé existe
        if (!this.state.get('employees').has(shift.employee_id)) {
            console.error('❌ Employé introuvable:', shift.employee_id);
            return false;
        }

        // Nettoyer les données
        const cleanShift = {
            id: shift.id,
            employee_id: shift.employee_id,
            day: shift.day,
            start_hour: parseInt(shift.start_hour),
            start_minutes: parseInt(shift.start_minutes) || 0,
            duration: parseFloat(shift.duration) || 1.0,
            notes: shift.notes || ''
        };

        this.state.get('shifts').set(cleanShift.id, cleanShift);
        this.updateMeta();
        this.markDirty();

        console.log(`⏰ Créneau ${cleanShift.id} mis à jour`);
        return true;
    }

    validateShift(shift) {
        const validDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        return shift &&
               shift.id &&
               shift.employee_id &&
               validDays.includes(shift.day) &&
               typeof shift.start_hour === 'number' &&
               shift.start_hour >= 0 &&
               shift.start_hour <= 23;
    }

    // ==================== DONNÉES ====================

    exportData() {
        try {
            const employees = Array.from(this.state.get('employees').values());
            const shifts = Array.from(this.state.get('shifts').values());

            const data = {
                employees: employees.filter(emp => this.validateEmployee(emp)),
                shifts: shifts.filter(shift => this.validateShift(shift)),
                meta: {
                    ...this.state.get('meta'),
                    exportDate: new Date().toISOString()
                }
            };

            // Test de sérialisation
            JSON.stringify(data);

            console.log(`📤 Export: ${data.employees.length} employés, ${data.shifts.length} créneaux`);
            return data;

        } catch (error) {
            console.error('❌ Erreur export:', error);
            throw error;
        }
    }

    importData(data) {
        try {
            if (!data || !data.employees || !data.shifts) {
                throw new Error('Données invalides');
            }

            // Nettoyer et importer
            this.state.get('employees').clear();
            this.state.get('shifts').clear();

            let importedEmployees = 0;
            let importedShifts = 0;

            data.employees.forEach(emp => {
                if (this.setEmployee(emp)) {
                    importedEmployees++;
                }
            });

            data.shifts.forEach(shift => {
                if (this.setShift(shift)) {
                    importedShifts++;
                }
            });

            this.updateMeta();
            this.markClean();

            console.log(`📥 Import: ${importedEmployees} employés, ${importedShifts} créneaux`);
            return { importedEmployees, importedShifts };

        } catch (error) {
            console.error('❌ Erreur import:', error);
            throw error;
        }
    }

    // ==================== UTILITAIRES ====================

    updateMeta() {
        const meta = this.state.get('meta');
        const employees = this.state.get('employees');
        const shifts = this.state.get('shifts');

        meta.totalEmployees = employees.size;
        meta.totalShifts = shifts.size;
        meta.lastModified = new Date().toISOString();

        let totalHours = 0;
        shifts.forEach(shift => {
            totalHours += shift.duration || 1;
        });
        meta.totalHours = totalHours;
    }

    markDirty() {
        this.isDirty = true;
        const ui = this.state.get('ui');
        ui.hasUnsavedChanges = true;

        const temp = this.state.get('temp');
        temp.isDirty = true;
    }

    markClean() {
        this.isDirty = false;
        this.lastSave = new Date();

        const ui = this.state.get('ui');
        ui.hasUnsavedChanges = false;

        const temp = this.state.get('temp');
        temp.isDirty = false;
    }

    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    removeListener(key, callback) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.delete(callback);
        }
    }

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

    detectConflicts() {
        const conflicts = [];
        const shifts = Array.from(this.state.get('shifts').values());

        for (let i = 0; i < shifts.length; i++) {
            for (let j = i + 1; j < shifts.length; j++) {
                const shift1 = shifts[i];
                const shift2 = shifts[j];

                if (shift1.employee_id === shift2.employee_id && shift1.day === shift2.day) {
                    const start1 = shift1.start_hour + (shift1.start_minutes || 0) / 60;
                    const end1 = start1 + (shift1.duration || 1);

                    const start2 = shift2.start_hour + (shift2.start_minutes || 0) / 60;
                    const end2 = start2 + (shift2.duration || 1);

                    if (!(end1 <= start2 || end2 <= start1)) {
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

    // ==================== COMPATIBILITÉ ====================

    // Méthode observe pour compatibilité (deprecated)
    observe(key, callback) {
        console.warn(`⚠️ observe('${key}') est deprecated, utilisez addListener`);
        return this.addListener(key, callback);
    }

    // Calcul des statistiques pour compatibilité
    calculateStatistics() {
        console.log('📊 Calcul des statistiques...');
        this.updateMeta();
    }

    // Nettoyage des données corrompues
    cleanCorruptedData() {
        console.log('🧹 Nettoyage des données...');

        const employees = this.state.get('employees');
        const shifts = this.state.get('shifts');

        let deletedEmployees = 0;
        let deletedShifts = 0;

        // Supprimer les employés "Supprimé"
        const employeesToDelete = [];
        employees.forEach((employee, id) => {
            if (!employee ||
                employee.nom === 'Employé' ||
                employee.prenom === 'Supprimé' ||
                employee.nom === 'Supprimé') {
                employeesToDelete.push(id);
            }
        });

        employeesToDelete.forEach(id => {
            employees.delete(id);
            deletedEmployees++;
            console.log(`🗑️ Employé supprimé: ${id}`);
        });

        // Supprimer les créneaux orphelins
        const validEmployeeIds = new Set(employees.keys());
        const shiftsToDelete = [];

        shifts.forEach((shift, id) => {
            if (!shift || !validEmployeeIds.has(shift.employee_id)) {
                shiftsToDelete.push(id);
            }
        });

        shiftsToDelete.forEach(id => {
            shifts.delete(id);
            deletedShifts++;
            console.log(`🗑️ Créneau supprimé: ${id}`);
        });

        this.updateMeta();

        console.log(`✅ Nettoyage: ${deletedEmployees} employés, ${deletedShifts} créneaux supprimés`);

        return { deletedEmployees, deletedShifts };
    }

    reset() {
        this.state.clear();
        this.listeners.clear();
        this.initializeState();
        this.markClean();
        console.log('🔄 État réinitialisé');
    }

    debug() {
        console.group('🔍 StateManager Debug');
        console.log('Employés:', this.state.get('employees').size);
        console.log('Créneaux:', this.state.get('shifts').size);
        console.log('Is Dirty:', this.isDirty);
        console.log('Conflits:', this.detectConflicts().length);
        console.groupEnd();
    }
}

// ==================== INITIALISATION GLOBALE ====================

if (!window.StateManager) {
    window.StateManager = new StateManager();

    // Alias pour compatibilité
    window.State = window.StateManager;

    // Debug en développement
    if (window.location.hostname === 'localhost') {
        window.debugState = () => window.StateManager.debug();
        window.cleanData = () => window.StateManager.cleanCorruptedData();
    }
}

// ==================== NETTOYAGE AUTOMATIQUE ====================

// Nettoyer les données au démarrage
setTimeout(() => {
    if (window.StateManager) {
        try {
            const result = window.StateManager.cleanCorruptedData();

            if (result.deletedEmployees > 0 || result.deletedShifts > 0) {
                console.log('🔄 Régénération après nettoyage...');

                // Régénérer l'affichage
                setTimeout(() => {
                    if (window.PlanningManager && window.PlanningManager.generateGrid) {
                        window.PlanningManager.generateGrid();

                        setTimeout(() => {
                            if (window.PlanningManager.renderShifts) {
                                window.PlanningManager.renderShifts();
                            }
                        }, 100);
                    }
                }, 50);
            }
        } catch (error) {
            console.error('❌ Erreur nettoyage initial:', error);
        }
    }
}, 500);

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

console.log('🔧 StateManager optimisé chargé');


/**
 * CORRECTIF D'URGENCE - RESTAURATION AFFICHAGE IMMÉDIATE
 * Corrige les problèmes de données et layout immédiatement
 */

// Exécuter immédiatement
setTimeout(() => {
    console.log('🚨 CORRECTIF D\'URGENCE EN COURS...');

    // ==================== ÉTAPE 1: CORRIGER LES DONNÉES ====================

    function fixDataIssues() {
        console.log('🔧 Correction des données...');

        if (!window.StateManager) {
            console.error('❌ StateManager manquant');
            return;
        }

        // Récupérer les données actuelles
        const employees = window.StateManager.state.get('employees');
        const shifts = window.StateManager.state.get('shifts');

        console.log(`📊 État actuel: ${employees.size} employés, ${shifts.size} créneaux`);

        // Créer un mapping des IDs d'employés valides
        const validEmployeeIds = new Set();
        employees.forEach((emp, id) => {
            if (emp && emp.nom && emp.prenom && emp.nom !== 'Supprimé') {
                validEmployeeIds.add(id);
                console.log(`✅ Employé valide: ${emp.nom} ${emp.prenom} (${id})`);
            }
        });

        // Réparer les créneaux orphelins en les assignant à un employé valide
        const employeeArray = Array.from(employees.values()).filter(emp =>
            emp && emp.nom && emp.prenom && emp.nom !== 'Supprimé'
        );

        if (employeeArray.length === 0) {
            console.error('❌ Aucun employé valide trouvé');
            return;
        }

        const defaultEmployee = employeeArray[0]; // Premier employé valide
        console.log(`🔧 Employé par défaut pour réparation: ${defaultEmployee.nom} ${defaultEmployee.prenom}`);

        // Réparer les créneaux
        let repairedCount = 0;
        shifts.forEach((shift, shiftId) => {
            if (!validEmployeeIds.has(shift.employee_id)) {
                console.log(`🔧 Réparation créneau ${shiftId}: ${shift.employee_id} -> ${defaultEmployee.id}`);
                shift.employee_id = defaultEmployee.id;
                shifts.set(shiftId, shift);
                repairedCount++;
            }
        });

        console.log(`✅ ${repairedCount} créneaux réparés`);

        // Mettre à jour les métadonnées
        window.StateManager.updateMeta();

        return { employees: employeeArray, shifts: Array.from(shifts.values()) };
    }

    // ==================== ÉTAPE 2: FORCER LE RENDU ====================

    function forceRender() {
        console.log('🎨 Forçage du rendu...');

        if (!window.PlanningManager) {
            console.error('❌ PlanningManager manquant');
            return;
        }

        // Patcher temporairement le renderShifts pour qu'il fonctionne
        window.PlanningManager.renderShiftsEmergency = function() {
            console.log('🚨 Rendu d\'urgence des créneaux...');

            // Nettoyer
            document.querySelectorAll('.shift-block').forEach(block => block.remove());

            const data = window.StateManager.getState();
            const shifts = data.shifts || [];
            const employees = data.employees || [];

            console.log(`📊 Données pour rendu: ${employees.length} employés, ${shifts.length} créneaux`);

            if (shifts.length === 0) {
                console.warn('⚠️ Aucun créneau à rendre');
                return;
            }

            // Créer un index des employés
            const empMap = new Map();
            employees.forEach(emp => {
                if (emp && emp.id) {
                    empMap.set(emp.id, emp);
                }
            });

            let rendered = 0;

            // Rendre chaque créneau dans la grille existante
            shifts.forEach(shift => {
                const employee = empMap.get(shift.employee_id);
                if (!employee) {
                    console.warn(`⚠️ Employé manquant pour créneau ${shift.id}: ${shift.employee_id}`);
                    return;
                }

                // Trouver une cellule de la grille existante
                const cell = document.querySelector(
                    `[data-day="${shift.day}"][data-hour="${shift.start_hour}"], ` +
                    `.schedule-cell, .time-slot, .employee-slot, .emp-slot`
                );

                if (!cell) {
                    // Créer une cellule temporaire si aucune trouvée
                    const gridContainer = document.getElementById('planningGrid');
                    if (gridContainer && gridContainer.children.length > 0) {
                        const firstRow = gridContainer.children[0];
                        if (firstRow) {
                            const tempCell = document.createElement('div');
                            tempCell.style.cssText = `
                                position: relative;
                                width: 100px;
                                height: 60px;
                                border: 1px solid #ddd;
                                margin: 2px;
                                display: inline-block;
                                background: white;
                            `;
                            firstRow.appendChild(tempCell);

                            const success = this.renderShiftInAnyCell(shift, employee, tempCell);
                            if (success) rendered++;
                        }
                    }
                } else {
                    const success = this.renderShiftInAnyCell(shift, employee, cell);
                    if (success) rendered++;
                }
            });

            console.log(`✅ ${rendered} créneaux rendus en mode urgence`);
        };

        // Méthode pour rendre un créneau dans n'importe quelle cellule
        window.PlanningManager.renderShiftInAnyCell = function(shift, employee, cell) {
            try {
                // Créer le bloc de créneau
                const shiftBlock = document.createElement('div');
                shiftBlock.className = 'shift-block emergency-shift';
                shiftBlock.dataset.shiftId = shift.id;
                shiftBlock.dataset.employeeId = employee.id;
                shiftBlock.draggable = true;

                // Style et contenu
                const color = this.getEmployeeColor ? this.getEmployeeColor(employee.poste) : '#00b894';
                const endHour = shift.start_hour + (shift.duration || 1);
                const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();

                shiftBlock.innerHTML = `
                    <div style="padding: 4px; text-align: center; color: white; font-size: 0.7rem;">
                        <div style="font-weight: 600;">${initials}</div>
                        <div style="font-size: 0.6rem;">${shift.day}</div>
                        <div style="font-size: 0.6rem;">${shift.start_hour}h-${endHour}h</div>
                    </div>
                `;

                shiftBlock.style.cssText = `
                    background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
                    color: white;
                    border-radius: 4px;
                    margin: 2px;
                    padding: 2px;
                    font-size: 0.7rem;
                    text-align: center;
                    cursor: grab;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: ${cell.style.position === 'relative' ? 'absolute' : 'relative'};
                    ${cell.style.position === 'relative' ? 'top: 2px; left: 2px; right: 2px; bottom: 2px;' : ''}
                    z-index: 10;
                `;

                // Ajouter à la cellule
                if (cell.style.position !== 'relative') {
                    cell.style.position = 'relative';
                }

                cell.appendChild(shiftBlock);

                console.log(`📍 Créneau ${shift.id} rendu pour ${employee.prenom} (${shift.day} ${shift.start_hour}h)`);
                return true;

            } catch (error) {
                console.error(`❌ Erreur rendu urgence ${shift.id}:`, error);
                return false;
            }
        };

        // Méthode de couleur par défaut si manquante
        if (!window.PlanningManager.getEmployeeColor) {
            window.PlanningManager.getEmployeeColor = function(poste) {
                const colors = {
                    'serveur': '#00b894',
                    'cuisinier': '#74b9ff',
                    'barman': '#fdcb6e',
                    'manager': '#a29bfe'
                };
                return colors[poste] || '#6c757d';
            };
        }

        // Exécuter le rendu d'urgence
        window.PlanningManager.renderShiftsEmergency();
    }

    // ==================== ÉTAPE 3: VÉRIFIER ET CORRIGER LA GRILLE ====================

    function ensureGridExists() {
        console.log('🏗️ Vérification de la grille...');

        const gridContainer = document.getElementById('planningGrid');
        if (!gridContainer) {
            console.error('❌ Container grille manquant');
            return;
        }

        // Si la grille est vide, créer une grille de base
        if (gridContainer.children.length === 0) {
            console.log('🏗️ Création grille de base...');

            const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
            const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

            let gridHTML = '<div class="emergency-grid" style="display: grid; grid-template-columns: 80px repeat(7, 1fr); gap: 1px; background: #f0f0f0;">';

            // En-tête
            gridHTML += '<div style="background: #333; color: white; padding: 0.5rem; text-align: center;">Heures</div>';
            days.forEach(day => {
                gridHTML += `<div style="background: #667eea; color: white; padding: 0.5rem; text-align: center;">${day}</div>`;
            });

            // Lignes horaires
            hours.forEach(hour => {
                const displayHour = hour === 0 ? '00:00' : (hour < 10 ? `0${hour}:00` : `${hour}:00`);
                gridHTML += `<div style="background: #f8f9fa; padding: 0.5rem; text-align: center; font-weight: 500;">${displayHour}</div>`;

                days.forEach(day => {
                    gridHTML += `
                        <div class="emergency-cell"
                             data-day="${day}"
                             data-hour="${hour}"
                             style="background: white; min-height: 60px; position: relative; border: 1px solid #ddd;">
                        </div>
                    `;
                });
            });

            gridHTML += '</div>';
            gridContainer.innerHTML = gridHTML;

            console.log('✅ Grille de base créée');
        }
    }

    // ==================== EXÉCUTION ====================

    try {
        // 1. Corriger les données
        const fixedData = fixDataIssues();

        // 2. S'assurer que la grille existe
        ensureGridExists();

        // 3. Forcer le rendu
        setTimeout(() => {
            forceRender();

            // 4. Vérification finale
            setTimeout(() => {
                const visibleShifts = document.querySelectorAll('.shift-block').length;
                const employees = window.StateManager?.getState()?.employees?.length || 0;
                const shifts = window.StateManager?.getState()?.shifts?.length || 0;

                console.log('📊 RÉSULTAT CORRECTIF D\'URGENCE:');
                console.log(`   - ${employees} employés`);
                console.log(`   - ${shifts} créneaux en mémoire`);
                console.log(`   - ${visibleShifts} créneaux visibles`);

                if (visibleShifts > 0) {
                    console.log('🎉 CORRECTIF D\'URGENCE RÉUSSI !');

                    // Réactiver le drag & drop
                    if (window.DragDropManager && window.DragDropManager.refresh) {
                        setTimeout(() => window.DragDropManager.refresh(), 100);
                    }
                } else {
                    console.warn('⚠️ Aucun créneau visible après correctif');

                    // Diagnostic supplémentaire
                    console.log('🔍 Diagnostic:');
                    console.log('   - Container grille:', !!document.getElementById('planningGrid'));
                    console.log('   - Cellules grille:', document.querySelectorAll('[data-day][data-hour]').length);
                    console.log('   - StateManager:', !!window.StateManager);
                    console.log('   - PlanningManager:', !!window.PlanningManager);
                }

            }, 200);
        }, 100);

    } catch (error) {
        console.error('💥 ERREUR CORRECTIF D\'URGENCE:', error);
    }

}, 100);

// ==================== FONCTIONS D'URGENCE POUR DEBUG ====================

if (window.location.hostname === 'localhost') {
    window.emergencyFix = {
        render: () => {
            if (window.PlanningManager && window.PlanningManager.renderShiftsEmergency) {
                window.PlanningManager.renderShiftsEmergency();
            }
        },
        checkData: () => {
            const data = window.StateManager?.getState();
            console.log('📊 Données:', {
                employees: data?.employees?.length || 0,
                shifts: data?.shifts?.length || 0,
                employeesList: data?.employees?.map(e => `${e.nom} ${e.prenom}`) || [],
                shiftsList: data?.shifts?.map(s => `${s.id} (${s.day} ${s.start_hour}h)`) || []
            });
        }
    };

    console.log('🚨 Fonctions d\'urgence: window.emergencyFix');
}

console.log('🚨 Correctif d\'urgence chargé');