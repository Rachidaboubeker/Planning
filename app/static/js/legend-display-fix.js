// ==================== CORRECTION AFFICHAGE LÉGENDE ====================
// Préserve l'affichage des pastilles d'équipe et empêche l'écrasement

console.log('🔧 Chargement de la correction d\'affichage légende...');

/**
 * Gestionnaire unifié de légende
 * Préserve l'affichage pastilles et évite les conflits
 */
class UnifiedLegendManager {
    constructor() {
        this.isUpdating = false;
        this.preferredDisplay = 'team-cards'; // 'team-cards' ou 'column-legend'
        this.setupObserver();
    }

    /**
     * Met à jour la légende avec l'affichage préféré (pastilles)
     */
    updateLegend() {
        if (this.isUpdating) {
            console.log('🔄 Mise à jour légende déjà en cours...');
            return;
        }

        this.isUpdating = true;

        try {
            // Trouver les conteneurs
            const legendContainer = document.getElementById('legendContainer');
            const employeeLegend = document.getElementById('employeeLegend');

            if (!legendContainer) {
                console.warn('❌ Conteneur legendContainer non trouvé');
                return;
            }

            console.log('🎨 Mise à jour légende avec affichage pastilles...');

            // S'assurer que employeeLegend existe
            let targetContainer = employeeLegend || legendContainer;

            // Générer l'affichage pastilles
            this.generateTeamCardsDisplay(targetContainer);

        } catch (error) {
            console.error('❌ Erreur mise à jour légende:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Génère l'affichage avec les pastilles d'équipe
     */
    generateTeamCardsDisplay(container) {
        const activeEmployees = Array.from(AppState.employees.values())
            .filter(emp => emp.actif !== false)
            .sort((a, b) => a.nom.localeCompare(b.nom));

        if (activeEmployees.length === 0) {
            container.innerHTML = `
                <div class="legend-empty">
                    <i class="fas fa-users"></i>
                    <p>Aucun équipier actif</p>
                    <button class="btn btn-primary btn-sm" onclick="PlanningUI.showAddEmployeeModal()">
                        <i class="fas fa-plus"></i> Ajouter un équipier
                    </button>
                </div>
            `;
            return;
        }

        // Structure avec pastilles (comme dans l'image)
        container.innerHTML = `
            <div class="team-header">
                <h3><i class="fas fa-users"></i> Équipe (${activeEmployees.length} personnes)</h3>
                <div class="team-actions">
                    <button class="btn btn-sm btn-outline" onclick="showBulkPhotoModal()" title="Gérer les photos">
                        <i class="fas fa-images"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="generateRandomAvatars()" title="Nouveaux avatars">
                        <i class="fas fa-dice"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="PlanningUI.showAddEmployeeModal()" title="Nouveau">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="team-cards-grid" id="teamCardsGrid"></div>
        `;

        const grid = document.getElementById('teamCardsGrid');
        if (!grid) return;

        // Générer les pastilles d'employés
        activeEmployees.forEach(employee => {
            const card = this.createEmployeeCard(employee);
            grid.appendChild(card);
        });

        console.log(`✅ Affichage pastilles généré pour ${activeEmployees.length} employés`);
    }

    /**
     * Crée une pastille d'employé
     */
    createEmployeeCard(employee) {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.dataset.employeeId = employee.id;

        // Obtenir la couleur de l'employé
        const employeeType = window.FLASK_CONFIG?.EMPLOYEE_TYPES?.[employee.poste] ||
                           PlanningConfig?.EMPLOYEE_TYPES?.[employee.poste] ||
                           { color: '#74b9ff', name: employee.poste };

        // Calculer les statistiques de l'employé
        const employeeShifts = Array.from(AppState.shifts.values())
            .filter(shift => shift.employee_id === employee.id);
        const totalHours = employeeShifts.reduce((sum, shift) => sum + shift.duration, 0);

        // Structure de la pastille
        card.innerHTML = `
            <div class="employee-avatar-section">
                <div class="employee-avatar" style="background: ${employeeType.color};">
                    <span class="avatar-initials">${this.getInitials(employee)}</span>
                </div>
                <div class="employee-status ${employee.actif ? 'active' : 'inactive'}"></div>
            </div>
            <div class="employee-info">
                <div class="employee-name">${this.sanitizeString(employee.prenom)} ${this.sanitizeString(employee.nom)}</div>
                <div class="employee-role">${this.sanitizeString(employeeType.name || employee.poste)}</div>
                ${totalHours > 0 ? `<div class="employee-hours">${totalHours}h cette semaine</div>` : ''}
            </div>
        `;

        // Styles de la pastille
        card.style.cssText = `
            display: flex;
            align-items: center;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 16px;
            margin: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 240px;
            flex: 1;
        `;

        // Événements
        this.setupCardEvents(card, employee);

        return card;
    }

    /**
     * Configure les événements d'une pastille
     */
    setupCardEvents(card, employee) {
        // Clic pour ouvrir la gestion de l'employé
        card.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof PlanningUI !== 'undefined' && PlanningUI.showEditEmployeeModal) {
                PlanningUI.showEditEmployeeModal(employee);
            } else if (typeof window.openPhotoModal === 'function') {
                window.openPhotoModal(employee.id);
            }
        });

        // Hover pour mettre en évidence les créneaux
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            card.style.borderColor = this.getEmployeeColor(employee);

            // Mettre en évidence les créneaux de cet employé
            this.highlightEmployeeShifts(employee.id, true);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            card.style.borderColor = '#e2e8f0';

            // Retirer la mise en évidence
            this.highlightEmployeeShifts(employee.id, false);
        });
    }

    /**
     * Met en évidence les créneaux d'un employé
     */
    highlightEmployeeShifts(employeeId, highlight) {
        const shiftsElements = document.querySelectorAll(`[data-employee-id="${employeeId}"]`);

        shiftsElements.forEach(element => {
            if (highlight) {
                element.style.transform = 'scale(1.05)';
                element.style.zIndex = '25';
                element.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            } else {
                element.style.transform = '';
                element.style.zIndex = '';
                element.style.boxShadow = '';
            }
        });
    }

    /**
     * Obtient les initiales d'un employé
     */
    getInitials(employee) {
        const prenom = employee.prenom || '';
        const nom = employee.nom || '';
        return (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
    }

    /**
     * Nettoie une chaîne pour l'affichage
     */
    sanitizeString(str) {
        if (!str) return '';
        return str.replace(/[<>]/g, '');
    }

    /**
     * Obtient la couleur d'un employé
     */
    getEmployeeColor(employee) {
        const employeeType = window.FLASK_CONFIG?.EMPLOYEE_TYPES?.[employee.poste] ||
                           PlanningConfig?.EMPLOYEE_TYPES?.[employee.poste] ||
                           { color: '#74b9ff' };
        return employeeType.color;
    }

    /**
     * Surveille les changements DOM pour empêcher l'écrasement
     */
    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Vérifier si le contenu de la légende a été modifié
                if (mutation.type === 'childList' &&
                    (mutation.target.id === 'legendContainer' || mutation.target.id === 'employeeLegend')) {

                    // Vérifier si c'est l'affichage "Colonnes d'employés" qui a pris le dessus
                    const container = mutation.target;
                    const columnTitle = container.querySelector('[textContent*="Colonnes d\'employés"]');

                    if (columnTitle && !this.isUpdating) {
                        console.log('🔄 Détection écrasement par colonnes, restauration pastilles...');
                        setTimeout(() => {
                            this.updateLegend();
                        }, 100);
                    }
                }
            });
        });

        // Observer les conteneurs de légende
        const containers = ['legendContainer', 'employeeLegend'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                observer.observe(element, {
                    childList: true,
                    subtree: true
                });
            }
        });

        console.log('👁️ Observateur DOM configuré pour protéger l\'affichage pastilles');
    }
}

// ==================== CSS POUR LES PASTILLES ====================

// Injecter les styles nécessaires
const style = document.createElement('style');
style.textContent = `
    .team-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    }

    .team-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
    }

    .team-header h3 i {
        margin-right: 8px;
        opacity: 0.9;
    }

    .team-actions {
        display: flex;
        gap: 8px;
    }

    .team-actions .btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 8px;
        transition: all 0.2s ease;
    }

    .team-actions .btn:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-1px);
    }

    .team-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 8px;
        margin-bottom: 20px;
    }

    .employee-card {
        position: relative;
    }

    .employee-avatar-section {
        position: relative;
        margin-right: 12px;
    }

    .employee-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .avatar-initials {
        font-size: 1.2rem;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .employee-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
    }

    .employee-status.active {
        background: #00b894;
    }

    .employee-status.inactive {
        background: #636e72;
    }

    .employee-info {
        flex: 1;
    }

    .employee-name {
        font-weight: 600;
        font-size: 0.95rem;
        color: #2d3748;
        margin-bottom: 2px;
    }

    .employee-role {
        font-size: 0.85rem;
        color: #718096;
        margin-bottom: 2px;
    }

    .employee-hours {
        font-size: 0.8rem;
        color: #4299e1;
        font-weight: 500;
    }

    .legend-empty {
        text-align: center;
        padding: 40px 20px;
        color: #718096;
    }

    .legend-empty i {
        font-size: 2rem;
        margin-bottom: 16px;
        opacity: 0.5;
    }
`;
document.head.appendChild(style);

// ==================== INTÉGRATION ET PROTECTION ====================

// Créer l'instance globale
const unifiedLegendManager = new UnifiedLegendManager();

// Override des méthodes existantes qui pourraient écraser l'affichage
const originalUpdateLegend = window.updateLegend;
const originalUpdateLegendWithColumns = window.EmployeeLegendWithColumns?.updateLegendWithColumns;

// Remplacer updateLegend global
window.updateLegend = function() {
    console.log('🎯 updateLegend intercepté - utilisation affichage pastilles');
    unifiedLegendManager.updateLegend();
};

// Désactiver updateLegendWithColumns
if (window.EmployeeLegendWithColumns) {
    window.EmployeeLegendWithColumns.updateLegendWithColumns = function() {
        console.log('🚫 updateLegendWithColumns désactivé - conservation pastilles');
        // Ne rien faire pour préserver l'affichage pastilles
    };
}

// Override de PlanningUI.updateLegend si elle existe
if (typeof PlanningUI !== 'undefined' && PlanningUI.updateLegend) {
    const originalPlanningUIUpdateLegend = PlanningUI.updateLegend;
    PlanningUI.updateLegend = function() {
        console.log('🎯 PlanningUI.updateLegend intercepté');
        unifiedLegendManager.updateLegend();
    };
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        unifiedLegendManager.updateLegend();
    }, 500);
});

// Mise à jour lors des événements
if (typeof EventBus !== 'undefined') {
    EventBus.on('EMPLOYEE_UPDATED', () => unifiedLegendManager.updateLegend());
    EventBus.on('EMPLOYEE_ADDED', () => unifiedLegendManager.updateLegend());
    EventBus.on('SHIFT_UPDATED', () => unifiedLegendManager.updateLegend());
}

// Exposer globalement
window.UnifiedLegendManager = unifiedLegendManager;

console.log('✅ Correction affichage légende installée');
console.log('🎨 Mode: Pastilles d\'équipe préservées');