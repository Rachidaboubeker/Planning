/**
 * GESTION DES COLONNES D'EMPLOYÉS - SANS DRAG & DROP
 * Le drag & drop est maintenant géré par drag-drop-unified-fix.js
 * Ce fichier se contente de gérer les colonnes visuelles
 */

/**
 * Gestionnaire des colonnes d'employés
 */
class EmployeeColumnManager {
    constructor() {
        this.maxColumns = 5; // Maximum 5 employés par cellule
        this.employeeColumns = new Map(); // employeeId -> columnIndex
        this.initializeEmployeeColumns();
        console.log('📋 EmployeeColumnManager initialisé (sans drag & drop)');
    }

    /**
     * Initialise les colonnes d'employés
     */
    initializeEmployeeColumns() {
        if (!window.AppState?.employees) {
            console.warn('AppState.employees non disponible');
            return;
        }

        const employees = Array.from(window.AppState.employees.values());
        employees.forEach((employee, index) => {
            const columnIndex = index % this.maxColumns;
            this.employeeColumns.set(employee.id, columnIndex);
        });

        console.log(`📋 ${employees.length} employés répartis sur ${this.maxColumns} colonnes`);
    }

    /**
     * Récupère l'index de colonne d'un employé
     */
    getEmployeeColumn(employeeId) {
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
        this.employeeColumns.clear();
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
        if (!employeeColumnManager) return;

        // Nettoyer les anciens guides
        cell.querySelectorAll('.employee-column-guide').forEach(guide => guide.remove());

        // Créer les guides de colonnes
        for (let i = 0; i < employeeColumnManager.maxColumns; i++) {
            const guide = document.createElement('div');
            guide.className = 'employee-column-guide';
            guide.style.cssText = `
                position: absolute;
                left: ${i * (100 / employeeColumnManager.maxColumns)}%;
                top: 0;
                width: ${100 / employeeColumnManager.maxColumns}%;
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

    /**
     * DÉSACTIVÉ - setupColumnDragDrop
     */
    static setupColumnDragDrop(shiftElement, shift) {
        console.log('🚫 setupColumnDragDrop désactivé - utiliser le gestionnaire unifié');
        return false;
    }

    /**
     * DÉSACTIVÉ - setupColumnDropZone
     */
    static setupColumnDropZone(cell) {
        console.log('🚫 setupColumnDropZone désactivé - utiliser le gestionnaire unifié');
        return false;
    }

    /**
     * DÉSACTIVÉ - saveShiftMovement
     */
    static async saveShiftMovement(shiftId, newDay, newHour, newMinutes = 0) {
        console.log('🚫 saveShiftMovement désactivé - utiliser le gestionnaire unifié');
        return false;
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

        // Initialiser les colonnes si nécessaire
        if (typeof employeeColumnManager !== 'undefined') {
            employeeColumnManager.initializeEmployeeColumns();
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
        for (let i = 0; i < (employeeColumnManager?.maxColumns || 5); i++) {
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
        if (!window.AppState?.employees || !employeeColumnManager) return null;

        for (let [employeeId, colIndex] of employeeColumnManager.employeeColumns) {
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

// ==================== INITIALISATION ====================

// Créer l'instance globale du gestionnaire de colonnes
let employeeColumnManager = null;

// Initialiser quand les données sont prêtes
function initializeColumnSystem() {
    if (window.AppState?.employees && !employeeColumnManager) {
        employeeColumnManager = new EmployeeColumnManager();

        // Mettre à jour la légende
        setTimeout(() => {
            EmployeeLegendWithColumns.updateLegendWithColumns();
        }, 500);

        console.log('✅ Système de colonnes initialisé');
    }
}

// Auto-initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeColumnSystem, 1000);
    });
} else {
    setTimeout(initializeColumnSystem, 1000);
}

// Réinitialisation quand les employés changent
if (typeof EventBus !== 'undefined') {
    EventBus.on('EMPLOYEE_ADDED', () => {
        if (employeeColumnManager) {
            employeeColumnManager.updateEmployeeColumns();
            EmployeeLegendWithColumns.updateLegendWithColumns();
        }
    });
}

// Exposer globalement
window.employeeColumnManager = employeeColumnManager;
window.PlanningRendererColumnExtensions = PlanningRendererColumnExtensions;
window.EmployeeLegendWithColumns = EmployeeLegendWithColumns;

console.log('📋 Système de colonnes chargé (SANS drag & drop - géré par le système unifié)');