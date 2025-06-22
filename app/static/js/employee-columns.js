// ===== SYSTÈME DE COLONNES FIXES PAR EMPLOYÉ =====
// Fichier: app/static/js/employee-columns.js

/**
 * Gestionnaire des colonnes d'employés
 */
class EmployeeColumnManager {
    constructor() {
        this.employeeColumns = new Map(); // Map employee_id -> column_index
        this.maxColumns = 5; // Configurable selon vos besoins
        this.initialized = false;
    }

    /**
     * Initialise l'attribution des colonnes pour tous les employés
     */
    initializeEmployeeColumns() {
        if (this.initialized) return;

        console.log('🏗️ Initialisation des colonnes d\'employés...');

        // Récupérer tous les employés actifs
        const activeEmployees = Array.from(AppState.employees.values())
            .filter(emp => emp.active !== false)
            .sort((a, b) => a.nom.localeCompare(b.nom)); // Tri alphabétique

        // Assigner une colonne à chaque employé
        activeEmployees.forEach((employee, index) => {
            if (index < this.maxColumns) {
                this.employeeColumns.set(employee.id, index);
                console.log(`👤 ${employee.nom_complet} → Colonne ${index + 1}`);
            }
        });

        this.initialized = true;
        console.log(`✅ ${this.employeeColumns.size} employés assignés sur ${this.maxColumns} colonnes`);
    }

    /**
     * Obtient l'index de colonne pour un employé
     */
    getEmployeeColumn(employeeId) {
        if (!this.initialized) {
            this.initializeEmployeeColumns();
        }
        return this.employeeColumns.get(employeeId) || 0;
    }

    /**
     * Ajoute un nouvel employé avec attribution automatique de colonne
     */
    addEmployee(employee) {
        if (this.employeeColumns.size < this.maxColumns) {
            const newColumnIndex = this.employeeColumns.size;
            this.employeeColumns.set(employee.id, newColumnIndex);
            console.log(`➕ Nouvel employé ${employee.nom_complet} → Colonne ${newColumnIndex + 1}`);
            return newColumnIndex;
        }
        return null; // Plus de colonnes disponibles
    }

    /**
     * Supprime un employé et réorganise les colonnes
     */
    removeEmployee(employeeId) {
        if (this.employeeColumns.has(employeeId)) {
            this.employeeColumns.delete(employeeId);
            this.reorganizeColumns();
        }
    }

    /**
     * Réorganise les colonnes après suppression
     */
    reorganizeColumns() {
        const entries = Array.from(this.employeeColumns.entries());
        this.employeeColumns.clear();

        entries.forEach(([employeeId], index) => {
            this.employeeColumns.set(employeeId, index);
        });

        console.log('🔄 Colonnes réorganisées');
    }

    /**
     * Obtient la largeur d'une colonne en pourcentage
     */
    getColumnWidth() {
        return Math.floor(100 / this.maxColumns);
    }

    /**
     * Calcule la position left pour une colonne
     */
    getColumnLeft(columnIndex) {
        return columnIndex * this.getColumnWidth();
    }

    /**
     * Réinitialise le système (utile lors de changements d'employés)
     */
    reset() {
        this.employeeColumns.clear();
        this.initialized = false;
        console.log('🔄 Système de colonnes réinitialisé');
    }
}

// Instance globale
const employeeColumnManager = new EmployeeColumnManager();

/**
 * Extensions pour PlanningRenderer avec colonnes
 */
class PlanningRendererColumnExtensions {

    /**
     * Ajoute les guides visuels pour les colonnes d'employés
     */
    static addColumnGuides(cell) {
        // Supprimer les anciens guides
        cell.querySelectorAll('.employee-column-guide').forEach(guide => guide.remove());

        const columnWidth = employeeColumnManager.getColumnWidth();

        for (let i = 0; i < employeeColumnManager.maxColumns; i++) {
            const guide = document.createElement('div');
            guide.className = 'employee-column-guide';
            guide.style.cssText = `
                position: absolute;
                left: ${i * columnWidth}%;
                width: ${columnWidth}%;
                height: 100%;
                border-right: 1px solid rgba(0,0,0,0.05);
                pointer-events: none;
                z-index: 1;
                transition: background-color 0.2s ease;
            `;

            // Effet hover pour visualiser la colonne
            guide.addEventListener('mouseenter', () => {
                guide.style.backgroundColor = 'rgba(0,123,255,0.1)';
            });

            guide.addEventListener('mouseleave', () => {
                guide.style.backgroundColor = 'transparent';
            });

            cell.appendChild(guide);
        }
    }

    /**
     * Crée un bloc de créneau optimisé pour les colonnes
     */
    static createShiftBlockForColumn(shift, employee, isMultiHour) {
        const block = document.createElement('div');
        block.className = `shift-block ${isMultiHour ? 'multi-hour' : 'single-hour'} column-positioned`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = employee.id;

        // Style de base
        const employeeType = PlanningConfig.EMPLOYEE_TYPES[employee.poste] || PlanningConfig.EMPLOYEE_TYPES.Autre;
        block.style.cssText = `
            background: linear-gradient(135deg, ${employeeType.color} 0%, ${this.darkenColor(employeeType.color, 10)} 100%);
            position: absolute;
            z-index: 10;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.3);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
        `;

        // Contenu optimisé pour colonnes étroites
        const content = document.createElement('div');
        content.className = 'shift-content-column';
        content.style.cssText = `
            padding: 4px 2px;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            text-align: center;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            line-height: 1.1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        `;

        // Texte adapté à la largeur (utiliser initiales si nécessaire)
        const name = employee.prenom || employee.nom.split(' ')[0];
        const displayName = name.length > 8 ? name.substring(0, 6) + '.' : name;

        content.innerHTML = `
            <div style="font-size: 0.65rem; margin-bottom: 1px;">${displayName}</div>
            ${shift.duration > 1 ? `<div style="font-size: 0.6rem; opacity: 0.9;">${shift.duration}h</div>` : ''}
        `;

        block.appendChild(content);

        // Événements
        this.setupShiftEvents(block, shift, employee);

        return block;
    }

    /**
     * Positionne un créneau dans sa colonne
     */
    static positionShiftInColumn(block, columnIndex, duration) {
        const columnWidth = employeeColumnManager.getColumnWidth();
        const left = employeeColumnManager.getColumnLeft(columnIndex);

        block.style.cssText += `
            left: ${left}% !important;
            width: ${columnWidth - 1}% !important;
            top: 2px !important;
            height: ${(PlanningConfig.CELL_HEIGHT * duration) - 4}px !important;
        `;
    }

    /**
     * Configure les événements d'un créneau
     */
    static setupShiftEvents(block, shift, employee) {
        // Effet hover
        block.addEventListener('mouseenter', () => {
            block.style.transform = 'scale(1.02)';
            block.style.zIndex = '50';
            block.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });

        block.addEventListener('mouseleave', () => {
            block.style.transform = 'scale(1)';
            block.style.zIndex = '10';
            block.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        });

        // Clic pour éditer
        block.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.showEditShiftModal(shift);
            }
        });

        // Tooltip détaillé
        const endHour = (shift.start_hour + shift.duration) % 24;
        block.title = [
            `👤 ${employee.nom_complet}`,
            `📅 ${shift.day}`,
            `🕐 ${PlanningUtils.formatHour(shift.start_hour)} - ${PlanningUtils.formatHour(endHour)} (${shift.duration}h)`,
            `💼 ${employee.poste}`,
            shift.notes ? `📝 ${shift.notes}` : ''
        ].filter(Boolean).join('\n');

        // Drag & Drop (si activé)
        if (typeof DragDropManager !== 'undefined') {
            DragDropManager.makeDraggable(block);
        }
    }

    /**
     * Assombrit une couleur
     */
    static darkenColor(color, percent) {
        // Convertir hex en RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Assombrir
        const factor = (100 - percent) / 100;
        const newR = Math.round(r * factor);
        const newG = Math.round(g * factor);
        const newB = Math.round(b * factor);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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
        const legend = document.getElementById('employeeLegend');
        if (!legend) return;

        // Initialiser les colonnes si nécessaire
        employeeColumnManager.initializeEmployeeColumns();

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
        for (let i = 0; i < employeeColumnManager.maxColumns; i++) {
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
                    <span style="margin-right: 8px; font-size: 0.7rem; opacity: 0.8;">Col. ${i + 1}</span>
                    <span style="flex: 1;">${employee.nom_complet}</span>
                    <span style="margin-left: 8px; opacity: 0.8; font-size: 0.7rem;">${employee.poste}</span>
                `;

                // Effet hover
                columnDiv.addEventListener('mouseenter', () => {
                    columnDiv.style.transform = 'scale(1.02)';
                    columnDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                });

                columnDiv.addEventListener('mouseleave', () => {
                    columnDiv.style.transform = 'scale(1)';
                    columnDiv.style.boxShadow = 'none';
                });
            } else {
                columnDiv.innerHTML = `
                    <span style="opacity: 0.6;">Col. ${i + 1} - Libre</span>
                `;
            }

            legend.appendChild(columnDiv);
        }
    }

    /**
     * Obtient l'employé assigné à une colonne
     */
    static getEmployeeByColumn(columnIndex) {
        for (const [employeeId, column] of employeeColumnManager.employeeColumns) {
            if (column === columnIndex) {
                return AppState.employees.get(employeeId);
            }
        }
        return null;
    }

    /**
     * Obtient la couleur d'un employé
     */
    static getEmployeeColor(employee) {
        const employeeType = PlanningConfig.EMPLOYEE_TYPES[employee.poste] || PlanningConfig.EMPLOYEE_TYPES.Autre;
        return employeeType.color;
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.EmployeeColumnManager = EmployeeColumnManager;
    window.employeeColumnManager = employeeColumnManager;
    window.PlanningRendererColumnExtensions = PlanningRendererColumnExtensions;
    window.EmployeeLegendWithColumns = EmployeeLegendWithColumns;
}

console.log('🏛️ Système de colonnes d\'employés chargé');