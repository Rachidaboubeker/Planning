/**
 * FIX EMPLOYEE-SHIFT MISMATCH
 * Corrige le problème de correspondance entre les IDs d'employés et les créneaux
 * À ajouter dans planning.js ou créer un fichier séparé
 */

class EmployeeShiftMapper {
    constructor() {
        this.employeeIdMapping = new Map();
        this.shiftEmployeeMapping = new Map();
        this.initialized = false;
    }

    /**
     * Initialise le mappeur
     */
    init() {
        if (this.initialized) return;

        console.log('🔧 Initialisation Employee-Shift Mapper...');
        this.buildMappings();
        this.initialized = true;
        console.log('✅ Employee-Shift Mapper initialisé');
    }

    /**
     * Construit les mappings entre employés et créneaux
     */
    buildMappings() {
        if (!window.State) {
            console.error('❌ State non disponible pour le mapping');
            return;
        }

        // Récupérer les employés et créneaux
        const employees = window.State.getEmployees();
        const shifts = window.State.getShifts();

        console.log(`📊 Mapping: ${employees.size} employés, ${shifts.size} créneaux`);

        // Créer un mapping basé sur les noms complets
        this.createNameBasedMapping(employees, shifts);

        // Créer un mapping basé sur les patterns d'ID
        this.createIdPatternMapping(employees, shifts);

        // Afficher les résultats
        this.logMappingResults();
    }

    /**
     * Crée un mapping basé sur les noms
     */
    createNameBasedMapping(employees, shifts) {
        const employeesByName = new Map();

        // Indexer les employés par nom complet
        for (const [id, employee] of employees) {
            const fullName = `${employee.prenom} ${employee.nom}`.toLowerCase().trim();
            employeesByName.set(fullName, { id, employee });

            // Variantes du nom
            const variants = [
                employee.prenom.toLowerCase(),
                employee.nom.toLowerCase(),
                `${employee.nom} ${employee.prenom}`.toLowerCase(),
                employee.prenom.toLowerCase().charAt(0) + employee.nom.toLowerCase()
            ];

            variants.forEach(variant => {
                if (!employeesByName.has(variant)) {
                    employeesByName.set(variant, { id, employee });
                }
            });
        }

        // Mapper les créneaux aux employés
        for (const [shiftId, shift] of shifts) {
            if (!shift.employee_id) continue;

            // Chercher l'employé correspondant
            const employee = employees.get(shift.employee_id);
            if (employee) {
                this.shiftEmployeeMapping.set(shiftId, employee);
            } else {
                // Essayer de trouver par pattern d'ID
                const mappedEmployee = this.findEmployeeByIdPattern(shift.employee_id, employees);
                if (mappedEmployee) {
                    this.shiftEmployeeMapping.set(shiftId, mappedEmployee);
                    console.log(`🔗 Mapping trouvé: ${shift.employee_id} -> ${mappedEmployee.id}`);
                }
            }
        }
    }

    /**
     * Trouve un employé par pattern d'ID
     */
    findEmployeeByIdPattern(shiftEmployeeId, employees) {
        // Patterns possibles
        const patterns = [
            // emp_1 -> emp1, employee_1, etc.
            shiftEmployeeId.replace('emp_', ''),
            shiftEmployeeId.replace('_', ''),
            'employee_' + shiftEmployeeId.replace('emp_', ''),
            'emp' + shiftEmployeeId.replace('emp_', '')
        ];

        for (const pattern of patterns) {
            for (const [id, employee] of employees) {
                if (id.includes(pattern) || pattern.includes(id)) {
                    return employee;
                }
            }
        }

        // Essayer les numéros séquentiels
        const numberMatch = shiftEmployeeId.match(/(\d+)/);
        if (numberMatch) {
            const number = parseInt(numberMatch[1]);
            const employeeArray = Array.from(employees.values());

            if (number <= employeeArray.length) {
                return employeeArray[number - 1];
            }
        }

        return null;
    }

    /**
     * Crée un mapping basé sur les patterns d'ID
     */
    createIdPatternMapping(employees, shifts) {
        // Analyser les patterns d'ID existants
        const employeeIds = Array.from(employees.keys());
        const shiftEmployeeIds = Array.from(new Set(
            Array.from(shifts.values()).map(s => s.employee_id).filter(Boolean)
        ));

        console.log('👥 IDs Employés:', employeeIds);
        console.log('📅 IDs dans créneaux:', shiftEmployeeIds);

        // Créer des correspondances automatiques
        shiftEmployeeIds.forEach((shiftEmpId, index) => {
            if (!this.employeeIdMapping.has(shiftEmpId)) {
                // Essayer de mapper à un employé existant
                const mappedEmployee = this.findBestEmployeeMatch(shiftEmpId, employees);
                if (mappedEmployee) {
                    this.employeeIdMapping.set(shiftEmpId, mappedEmployee.id);
                    console.log(`🎯 Auto-mapping: ${shiftEmpId} -> ${mappedEmployee.id} (${mappedEmployee.prenom} ${mappedEmployee.nom})`);
                }
            }
        });
    }

    /**
     * Trouve la meilleure correspondance d'employé
     */
    findBestEmployeeMatch(shiftEmployeeId, employees) {
        const employeeArray = Array.from(employees.values());

        // Stratégie 1: Correspondance exacte
        for (const employee of employeeArray) {
            if (employee.id === shiftEmployeeId) {
                return employee;
            }
        }

        // Stratégie 2: Pattern numérique
        const numberMatch = shiftEmployeeId.match(/(\d+)/);
        if (numberMatch) {
            const number = parseInt(numberMatch[1]);

            // Essayer emp_X -> employé numéro X
            if (number > 0 && number <= employeeArray.length) {
                return employeeArray[number - 1];
            }
        }

        // Stratégie 3: Similarité de chaîne
        let bestMatch = null;
        let bestScore = 0;

        for (const employee of employeeArray) {
            const score = this.calculateSimilarity(shiftEmployeeId, employee.id);
            if (score > bestScore && score > 0.5) {
                bestScore = score;
                bestMatch = employee;
            }
        }

        return bestMatch;
    }

    /**
     * Calcule la similarité entre deux chaînes
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calcule la distance de Levenshtein
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Obtient l'employé pour un créneau
     */
    getEmployeeForShift(shift) {
        if (!shift || !shift.employee_id) return null;

        // Vérifier le cache de mapping d'abord
        if (this.shiftEmployeeMapping.has(shift.id)) {
            return this.shiftEmployeeMapping.get(shift.id);
        }

        // Essayer l'ID direct
        if (window.State) {
            const employees = window.State.getEmployees();

            // ID direct
            let employee = employees.get(shift.employee_id);
            if (employee) return employee;

            // ID mappé
            const mappedId = this.employeeIdMapping.get(shift.employee_id);
            if (mappedId) {
                employee = employees.get(mappedId);
                if (employee) {
                    // Mettre en cache
                    this.shiftEmployeeMapping.set(shift.id, employee);
                    return employee;
                }
            }

            // Recherche par pattern
            employee = this.findEmployeeByIdPattern(shift.employee_id, employees);
            if (employee) {
                // Mettre en cache
                this.shiftEmployeeMapping.set(shift.id, employee);
                return employee;
            }
        }

        console.warn(`⚠️ Employé non trouvé pour le créneau ${shift.id} (employee_id: ${shift.employee_id})`);
        return null;
    }

    /**
     * Répare les IDs manquants
     */
    repairMissingEmployees() {
        console.log('🔧 Réparation des employés manquants...');

        if (!window.State) return;

        const shifts = window.State.getShifts();
        const employees = window.State.getEmployees();
        let repairedCount = 0;

        for (const [shiftId, shift] of shifts) {
            if (!shift.employee_id) continue;

            const employee = this.getEmployeeForShift(shift);
            if (!employee) {
                // Essayer d'assigner automatiquement
                const autoEmployee = this.autoAssignEmployee(shift, employees);
                if (autoEmployee) {
                    // Mettre à jour le créneau
                    shift.employee_id = autoEmployee.id;
                    window.State.setShift(shift);
                    repairedCount++;
                    console.log(`🔧 Créneau ${shiftId} assigné à ${autoEmployee.prenom} ${autoEmployee.nom}`);
                }
            }
        }

        console.log(`✅ ${repairedCount} créneaux réparés`);
        return repairedCount;
    }

    /**
     * Assigne automatiquement un employé à un créneau
     */
    autoAssignEmployee(shift, employees) {
        const employeeArray = Array.from(employees.values());

        // Stratégie: Assigner de manière cyclique
        const shiftIndex = Object.keys(shift).length % employeeArray.length;
        return employeeArray[shiftIndex] || employeeArray[0];
    }

    /**
     * Affiche les résultats du mapping
     */
    logMappingResults() {
        console.log('\n🔍 === RÉSULTATS DU MAPPING ===');
        console.log(`📋 Mappings employés: ${this.employeeIdMapping.size}`);
        console.log(`🔗 Mappings créneaux: ${this.shiftEmployeeMapping.size}`);

        if (this.employeeIdMapping.size > 0) {
            console.log('\n📊 Mappings employés:');
            for (const [oldId, newId] of this.employeeIdMapping) {
                console.log(`  ${oldId} -> ${newId}`);
            }
        }

        if (this.shiftEmployeeMapping.size > 0) {
            console.log('\n🔗 Créneaux mappés:');
            for (const [shiftId, employee] of this.shiftEmployeeMapping) {
                console.log(`  Créneau ${shiftId} -> ${employee.prenom} ${employee.nom}`);
            }
        }
    }

    /**
     * Synchronise tous les créneaux
     */
    synchronizeAllShifts() {
        console.log('🔄 Synchronisation de tous les créneaux...');

        if (!window.State) return;

        const shifts = window.State.getShifts();
        let syncedCount = 0;

        for (const [shiftId, shift] of shifts) {
            const employee = this.getEmployeeForShift(shift);
            if (employee) {
                syncedCount++;
            }
        }

        console.log(`✅ ${syncedCount}/${shifts.size} créneaux synchronisés`);

        // Déclencher un re-rendu si PlanningManager disponible
        if (window.PlanningManager && window.PlanningManager.renderShifts) {
            setTimeout(() => {
                window.PlanningManager.renderShifts();
            }, 100);
        }

        return syncedCount;
    }

    /**
     * Diagnostic du mappeur
     */
    diagnose() {
        if (!window.State) {
            return { error: 'State non disponible' };
        }

        const employees = window.State.getEmployees();
        const shifts = window.State.getShifts();

        let validShifts = 0;
        let invalidShifts = 0;
        const missingEmployeeIds = new Set();

        for (const [shiftId, shift] of shifts) {
            const employee = this.getEmployeeForShift(shift);
            if (employee) {
                validShifts++;
            } else {
                invalidShifts++;
                missingEmployeeIds.add(shift.employee_id);
            }
        }

        return {
            totalEmployees: employees.size,
            totalShifts: shifts.size,
            validShifts,
            invalidShifts,
            missingEmployeeIds: Array.from(missingEmployeeIds),
            mappingCacheSize: this.shiftEmployeeMapping.size,
            employeeIdMappings: this.employeeIdMapping.size
        };
    }

    /**
     * Réinitialise tous les mappings
     */
    reset() {
        this.employeeIdMapping.clear();
        this.shiftEmployeeMapping.clear();
        this.initialized = false;
        console.log('🔄 Mappeur réinitialisé');
    }
}

// ==================== INTÉGRATION DANS PLANNING MANAGER ====================

/**
 * Patch pour le Planning Manager existant
 * À intégrer dans planning.js
 */
class PlanningManagerPatch {
    static patchRenderShifts() {
        if (!window.PlanningManager) {
            console.warn('⚠️ PlanningManager non disponible pour le patch');
            return;
        }

        // Sauvegarder la méthode originale
        const originalRenderShifts = window.PlanningManager.renderShifts;

        // Remplacer par la version patchée
        window.PlanningManager.renderShifts = function() {
            console.log('🎨 Rendu des créneaux (version patchée)...');

            if (!window.State || !window.employeeShiftMapper) {
                console.error('❌ State ou EmployeeShiftMapper non disponible');
                return;
            }

            const shifts = window.State.getShifts();
            console.log(`📊 ${shifts.size} créneaux à rendre`);

            // Nettoyer les créneaux existants
            document.querySelectorAll('.shift-block').forEach(block => block.remove());

            let renderedCount = 0;
            let skippedCount = 0;

            for (const [shiftId, shift] of shifts) {
                // Utiliser le mappeur pour trouver l'employé
                const employee = window.employeeShiftMapper.getEmployeeForShift(shift);

                if (!employee) {
                    console.warn(`⚠️ Employé non trouvé pour le créneau:`, shift);
                    skippedCount++;
                    continue;
                }

                // Rendre le créneau
                this.renderSingleShift(shift, employee);
                renderedCount++;
            }

            console.log(`✅ ${renderedCount} créneaux rendus, ${skippedCount} ignorés`);

            // Mettre à jour les statistiques
            if (typeof this.updateStatistics === 'function') {
                this.updateStatistics();
            }
        };

        console.log('✅ Planning Manager patché pour le mapping employés');
    }

    static patchRenderSingleShift() {
        if (!window.PlanningManager) return;

        // Ajouter une méthode pour rendre un créneau individuel
        window.PlanningManager.renderSingleShift = function(shift, employee) {
            // Trouver la cellule de destination
            const cell = document.querySelector(
                `[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`
            );

            if (!cell) {
                console.warn(`⚠️ Cellule non trouvée pour ${shift.day} ${shift.start_hour}h`);
                return;
            }

            // Créer le bloc de créneau
            const shiftBlock = document.createElement('div');
            shiftBlock.className = 'shift-block';
            shiftBlock.dataset.shiftId = shift.id;
            shiftBlock.dataset.employeeId = employee.id;
            shiftBlock.draggable = true;

            // Couleur selon le poste
            const colors = {
                'serveur': '#00b894',
                'cuisinier': '#74b9ff',
                'barman': '#fdcb6e',
                'manager': '#a29bfe',
                'commis': '#fd79a8',
                'aide': '#6c5ce7'
            };

            const backgroundColor = colors[employee.poste] || '#6c757d';

            // Contenu du bloc
            shiftBlock.innerHTML = `
                <div class="shift-content">
                    <div class="shift-employee-name">${employee.prenom}</div>
                    <div class="shift-duration">${shift.duration || 1}h</div>
                </div>
            `;

            // Styles
            shiftBlock.style.cssText = `
                background-color: ${backgroundColor};
                color: white;
                padding: 0.25rem;
                border-radius: 4px;
                font-size: 0.875rem;
                cursor: move;
                position: relative;
                margin: 2px;
                min-height: ${(shift.duration || 1) * 60 - 4}px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-weight: 500;
            `;

            // Événements
            this.setupShiftEvents(shiftBlock, shift, employee);

            // Ajouter à la cellule
            cell.appendChild(shiftBlock);
        };
    }
}

// ==================== INITIALISATION GLOBALE ====================

// Créer l'instance globale
if (!window.employeeShiftMapper) {
    window.employeeShiftMapper = new EmployeeShiftMapper();
}

// Initialisation automatique après chargement des données
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que les données soient chargées
    if (window.EventBus) {
        window.EventBus.on('planning:data:loaded', () => {
            console.log('📊 Données chargées, initialisation du mapper...');
            setTimeout(() => {
                window.employeeShiftMapper.init();
                window.employeeShiftMapper.synchronizeAllShifts();

                // Patcher le Planning Manager
                PlanningManagerPatch.patchRenderShifts();
                PlanningManagerPatch.patchRenderSingleShift();
            }, 500);
        });
    }
});

// Commandes de debug globales
window.repairEmployees = () => window.employeeShiftMapper.repairMissingEmployees();
window.syncShifts = () => window.employeeShiftMapper.synchronizeAllShifts();
window.diagnoseMapping = () => console.table(window.employeeShiftMapper.diagnose());

console.log('✅ Employee-Shift Mapper chargé');