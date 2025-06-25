/**
 * GESTION DES COLONNES D'EMPLOYÉS - CORRIGÉE
 * Correction de l'initialisation + protection contre null
 */

/**
 * Gestionnaire des colonnes d'employés
 */
class EmployeeColumnManager {
    constructor() {
        this.maxColumns = 5; // Maximum 5 employés par cellule
        this.employeeColumns = new Map(); // employeeId -> columnIndex
        this.isInitialized = false;
        console.log('📋 EmployeeColumnManager créé');
    }

    /**
     * Initialise les colonnes d'employés avec protection
     */
    initializeEmployeeColumns() {
        try {
            if (this.isInitialized) {
                console.log('📋 Colonnes déjà initialisées');
                return;
            }

            // Attendre que AppState soit disponible
            if (!window.AppState?.employees) {
                console.warn('📋 AppState.employees non disponible, retry dans 500ms');
                setTimeout(() => this.initializeEmployeeColumns(), 500);
                return;
            }

            this.employeeColumns.clear();
            const employees = Array.from(window.AppState.employees.values());

            employees.forEach((employee, index) => {
                const columnIndex = index % this.maxColumns;
                this.employeeColumns.set(employee.id, columnIndex);
            });

            this.isInitialized = true;
            console.log(`📋 ${employees.length} employés répartis sur ${this.maxColumns} colonnes`);
        } catch (error) {
            console.error('❌ Erreur initialisation colonnes:', error);
            // Retry dans 1 seconde
            setTimeout(() => this.initializeEmployeeColumns(), 1000);
        }
    }

    /**
     * Récupère l'index de colonne d'un employé (avec protection)
     */
    getEmployeeColumn(employeeId) {
        if (!this.isInitialized) {
            this.initializeEmployeeColumns();
        }
        return this.employeeColumns.get(employeeId) || 0;
    }

    /**
     * Récupère la largeur d'une colonne en pourcentage
     */
    getColumnWidth() {
        return 100 / this.maxColumns;
    }

    /**
     * Récupère la position gauche d'une colonne en pourcentage
     */
    getColumnLeft(columnIndex) {
        return columnIndex * this.getColumnWidth();
    }

    /**
     * Met à jour les colonnes quand les employés changent
     */
    updateEmployeeColumns() {
        this.isInitialized = false;
        this.employeeColumns.clear();
        this.initializeEmployeeColumns();
    }

    /**
     * Force la réinitialisation
     */
    forceReinit() {
        this.isInitialized = false;
        this.initializeEmployeeColumns();
    }
}

/**
 * Extensions du renderer pour les colonnes
 */
class PlanningRendererColumnExtensions {
    /**
     * Ajoute les guides visuels de colonnes à une cellule
     */
    static addColumnGuides(cell) {
        if (!window.employeeColumnManager) return;

        // Nettoyer les anciens guides
        cell.querySelectorAll('.employee-column-guide').forEach(guide => guide.remove());

        // Créer les guides de colonnes
        for (let i = 0; i < window.employeeColumnManager.maxColumns; i++) {
            const guide = document.createElement('div');
            guide.className = 'employee-column-guide';
            guide.style.cssText = `
                position: absolute;
                left: ${i * (100 / window.employeeColumnManager.maxColumns)}%;
                top: 0;
                width: ${100 / window.employeeColumnManager.maxColumns}%;
                height: 100%;
                border-right: 1px solid rgba(0,0,0,0.05);
                pointer-events: none;
                z-index: 1;
            `;
            cell.appendChild(guide);
        }
    }

    /**
     * Crée un bloc de créneau pour une colonne spécifique
     */
    static createShiftBlockForColumn(shift, employee, isLongShift = false) {
        const block = document.createElement('div');
        block.className = 'shift-block column-mode';
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;

        // Contenu du bloc
        const duration = shift.duration;
        const employeeType = window.FLASK_CONFIG?.EMPLOYEE_TYPES?.[employee.poste] || { color: '#007bff' };

        const content = `
            <div class="shift-employee" style="font-weight: 600; font-size: 0.75rem;">
                ${employee.prenom}
            </div>
            <div class="shift-time" style="font-size: 0.6rem; opacity: 0.9;">
                ${shift.start_hour}h-${(shift.start_hour + duration) % 24}h
            </div>
            ${shift.notes ? `<div class="shift-notes" style="font-size: 0.55rem; opacity: 0.8;">${shift.notes}</div>` : ''}
        `;

        block.innerHTML = content;
        block.style.background = employeeType.color;
        block.style.color = 'white';
        block.title = this.createShiftTooltip(shift, employee);

        return block;
    }

    /**
     * Crée le tooltip d'un créneau
     */
    static createShiftTooltip(shift, employee) {
        return [
            `👤 ${employee.nom_complet}`,
            `📍 ${shift.day}`,
            `⏰ ${shift.start_hour}h - ${(shift.start_hour + shift.duration) % 24}h`,
            `⏱️ ${shift.duration}h`,
            shift.notes ? `📝 ${shift.notes}` : '',
            employee.taux_horaire ? `💰 ${(employee.taux_horaire * shift.duration).toFixed(2)}€` : ''
        ].filter(Boolean).join('\n');
    }

    /**
     * Met en évidence la colonne d'un employé
     */
    static highlightEmployeeColumn(columnIndex) {
        const cells = document.querySelectorAll('.schedule-cell-with-columns, .schedule-cell');
        cells.forEach(cell => {
            const guides = cell.querySelectorAll('.employee-column-guide');
            if (guides[columnIndex]) {
                guides[columnIndex].style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                guides[columnIndex].style.borderRight = '2px solid #28a745';
            }
        });
    }

    /**
     * Supprime tous les highlights de colonnes
     */
    static removeColumnHighlights() {
        document.querySelectorAll('.employee-column-guide').forEach(guide => {
            guide.style.backgroundColor = '';
            guide.style.borderRight = '1px solid rgba(0,0,0,0.05)';
        });
    }

    /**
     * DÉSACTIVÉ - Le drag & drop est géré par le gestionnaire unifié
     */
    static initializeAllDragDrop() {
        console.log('🚫 employee-columns drag & drop désactivé - gestionnaire unifié actif');

        // Déclencher la configuration du gestionnaire unifié à la place
        if (typeof window.UnifiedDragDropFix !== 'undefined') {
            setTimeout(() => window.UnifiedDragDropFix.configureAll(), 100);
        }
    }
}

/**
 * Légende avec colonnes d'employés
 */
class EmployeeLegendWithColumns {
    /**
     * Met à jour la légende avec les colonnes d'employés
     */
    static updateLegendWithColumns() {
        const legend = document.getElementById('employeeLegend') || document.getElementById('legendContainer');
        if (!legend) return;

        // S'assurer que le gestionnaire est initialisé
        if (window.employeeColumnManager && !window.employeeColumnManager.isInitialized) {
            window.employeeColumnManager.initializeEmployeeColumns();
        }

        legend.innerHTML = '';

        // Titre de la légende
        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #495057;
            font-size: 0.9rem;
        `;
        title.textContent = 'Colonnes d\'employés';
        legend.appendChild(title);

        // Créer un indicateur pour chaque colonne
        const maxColumns = window.employeeColumnManager?.maxColumns || 5;
        for (let i = 0; i < maxColumns; i++) {
            const employee = this.getEmployeeByColumn(i);
            const columnDiv = document.createElement('div');
            columnDiv.className = 'employee-column-legend';
            columnDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px 12px;
                margin: 3px 0;
                border-radius: 8px;
                background: ${employee ? this.getEmployeeColor(employee) : '#f8f9fa'};
                color: ${employee ? 'white' : '#666'};
                font-weight: 600;
                font-size: 0.8rem;
                border: 2px solid ${employee ? 'rgba(255,255,255,0.3)' : '#ddd'};
                transition: all 0.2s ease;
                cursor: ${employee ? 'pointer' : 'default'};
            `;

            if (employee) {
                columnDiv.innerHTML = `
                    <span style="margin-right: 8px; font-size: 0.7rem; opacity: 0.8;">Col.${i + 1}</span>
                    <span>${employee.prenom}</span>
                `;

                // Effet hover pour highlight
                columnDiv.addEventListener('mouseenter', () => {
                    PlanningRendererColumnExtensions.highlightEmployeeColumn(i);
                });

                columnDiv.addEventListener('mouseleave', () => {
                    PlanningRendererColumnExtensions.removeColumnHighlights();
                });
            } else {
                columnDiv.innerHTML = `
                    <span style="margin-right: 8px; font-size: 0.7rem; opacity: 0.6;">Col.${i + 1}</span>
                    <span style="font-style: italic;">Libre</span>
                `;
            }

            legend.appendChild(columnDiv);
        }
    }

    /**
     * Récupère l'employé assigné à une colonne
     */
    static getEmployeeByColumn(columnIndex) {
        if (!window.AppState?.employees || !window.employeeColumnManager?.isInitialized) return null;

        for (let [employeeId, colIndex] of window.employeeColumnManager.employeeColumns) {
            if (colIndex === columnIndex) {
                return window.AppState.employees.get(employeeId);
            }
        }
        return null;
    }

    /**
     * Récupère la couleur d'un employé
     */
    static getEmployeeColor(employee) {
        const employeeType = window.FLASK_CONFIG?.EMPLOYEE_TYPES?.[employee.poste];
        return employeeType?.color || '#74b9ff';
    }
}

// ==================== INITIALISATION FORCÉE ====================

// Créer l'instance globale du gestionnaire de colonnes
window.employeeColumnManager = new EmployeeColumnManager();

// INITIALISATION IMMÉDIATE et FORCÉE
function forceInitializeColumnSystem() {
    console.log('🔧 Initialisation forcée du système de colonnes...');

    if (window.employeeColumnManager) {
        window.employeeColumnManager.forceReinit();

        // Mettre à jour la légende
        setTimeout(() => {
            EmployeeLegendWithColumns.updateLegendWithColumns();
        }, 200);

        console.log('✅ Système de colonnes forcé');
    }
}

// Multiples tentatives d'initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(forceInitializeColumnSystem, 100);
        setTimeout(forceInitializeColumnSystem, 500);
        setTimeout(forceInitializeColumnSystem, 1000);
    });
} else {
    setTimeout(forceInitializeColumnSystem, 100);
    setTimeout(forceInitializeColumnSystem, 500);
    setTimeout(forceInitializeColumnSystem, 1000);
}

// Réinitialisation quand les employés changent
if (typeof EventBus !== 'undefined') {
    EventBus.on('EMPLOYEE_ADDED', () => {
        if (window.employeeColumnManager) {
            window.employeeColumnManager.updateEmployeeColumns();
            EmployeeLegendWithColumns.updateLegendWithColumns();
        }
    });
}

// Exposer globalement (compatibilité)
window.PlanningRendererColumnExtensions = PlanningRendererColumnExtensions;
window.EmployeeLegendWithColumns = EmployeeLegendWithColumns;

// Fonction de debug
window.debugColumns = function() {
    console.log('🔍 Debug colonnes:');
    console.log('  employeeColumnManager:', window.employeeColumnManager);
    console.log('  isInitialized:', window.employeeColumnManager?.isInitialized);
    console.log('  AppState.employees:', window.AppState?.employees?.size);
};

console.log('📋 Système de colonnes chargé (CORRIGÉ avec initialisation forcée)');

/**
 * CORRECTION SIMPLE - FORCER LE CHARGEMENT DES EMPLOYÉS
 * À ajouter à la fin de employee-columns.js (remplacer la section initialisation)
 */

// ==================== INITIALISATION FORCÉE IMMÉDIATE ====================

// Fonction de forçage du chargement
function forceLoadEmployeesIntoColumns() {
    console.log('🔧 Forçage chargement employés dans colonnes...');

    // Vérifier si AppState.employees existe et a des données
    if (!window.AppState?.employees || window.AppState.employees.size === 0) {
        console.warn('⚠️ AppState.employees vide, retry...');
        return false;
    }

    // Forcer la création du gestionnaire si inexistant
    if (!window.employeeColumnManager) {
        window.employeeColumnManager = new EmployeeColumnManager();
    }

    // Vider et recharger les colonnes
    window.employeeColumnManager.employeeColumns.clear();
    window.employeeColumnManager.isInitialized = false;

    const employees = Array.from(window.AppState.employees.values());
    console.log(`📋 Chargement forcé de ${employees.length} employés...`);

    employees.forEach((employee, index) => {
        const columnIndex = index % window.employeeColumnManager.maxColumns;
        window.employeeColumnManager.employeeColumns.set(employee.id, columnIndex);
        console.log(`  • ${employee.prenom} → Colonne ${columnIndex + 1}`);
    });

    window.employeeColumnManager.isInitialized = true;
    console.log(`✅ ${employees.length} employés forcés dans colonnes`);

    return true;
}

// Tentatives multiples et persistantes
function attemptForceLoad() {
    if (forceLoadEmployeesIntoColumns()) {
        // Succès - recharger le planning
        console.log('🎯 Rechargement du planning après chargement employés...');

        if (typeof PlanningRenderer !== 'undefined' && PlanningRenderer.renderShifts) {
            setTimeout(() => {
                PlanningRenderer.renderShifts();
            }, 200);
        }

        return;
    }

    // Échec - retry
    setTimeout(attemptForceLoad, 500);
}

// ==================== EXÉCUTION IMMÉDIATE ====================

// Lancement immédiat
setTimeout(attemptForceLoad, 100);
setTimeout(attemptForceLoad, 500);
setTimeout(attemptForceLoad, 1000);
setTimeout(attemptForceLoad, 2000);

// Override de la méthode getEmployeeColumn pour protection
if (window.employeeColumnManager) {
    const originalGetEmployeeColumn = window.employeeColumnManager.getEmployeeColumn;

    window.employeeColumnManager.getEmployeeColumn = function(employeeId) {
        // Si pas initialisé, forcer le chargement
        if (!this.isInitialized) {
            forceLoadEmployeesIntoColumns();
        }

        // Si toujours pas d'employé, essayer de l'ajouter dynamiquement
        if (!this.employeeColumns.has(employeeId) && window.AppState?.employees?.has(employeeId)) {
            const employees = Array.from(window.AppState.employees.values());
            const employee = window.AppState.employees.get(employeeId);
            const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
            const columnIndex = employeeIndex >= 0 ? employeeIndex % this.maxColumns : 0;

            this.employeeColumns.set(employeeId, columnIndex);
            console.log(`🔧 Employé ${employee?.prenom} ajouté dynamiquement à colonne ${columnIndex + 1}`);
        }

        return this.employeeColumns.get(employeeId) || 0;
    };
}

// Fonction de diagnostic global
window.debugEmployeeColumns = function() {
    console.log('🔍 Debug colonnes employés:');
    console.log('  AppState.employees:', window.AppState?.employees?.size);
    console.log('  employeeColumnManager:', window.employeeColumnManager);
    console.log('  isInitialized:', window.employeeColumnManager?.isInitialized);
    console.log('  employeeColumns:', window.employeeColumnManager?.employeeColumns);

    if (window.AppState?.employees) {
        window.AppState.employees.forEach((emp, id) => {
            const column = window.employeeColumnManager?.getEmployeeColumn(id);
            console.log(`    ${emp.prenom} (${id}) → Colonne ${column + 1}`);
        });
    }
};

console.log('🚀 Correction employés/colonnes chargée - Commande: debugEmployeeColumns()');