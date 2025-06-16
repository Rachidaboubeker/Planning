/**
 * Planning Restaurant - Interface Utilisateur Planning
 * Fonctions UI spécifiques au planning extraites de planning.js
 */

class PlanningUI {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialise les composants UI
     */
    init() {
        try {
            this.setupEventListeners();
            this.isInitialized = true;
            Logger.info('PlanningUI initialisé');
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation de PlanningUI:', error);
        }
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Écouter les événements de planning
        if (typeof EventBus !== 'undefined') {
            EventBus.on(PlanningEvents.SHIFT_ADDED, () => this.updateLegend());
            EventBus.on(PlanningEvents.SHIFT_UPDATED, () => this.updateLegend());
            EventBus.on(PlanningEvents.SHIFT_DELETED, () => this.updateLegend());
            EventBus.on(PlanningEvents.EMPLOYEE_ADDED, () => this.updateLegend());
            EventBus.on(PlanningEvents.PHOTO_UPDATED, () => this.updateLegend());
        }
    }

    /**
     * Affiche le modal d'ajout de créneau
     */
    static showAddShiftModal(day, hour) {
        const employees = Array.from(AppState.employees.values());

        if (employees.length === 0) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Aucun équipier disponible', 'error');
            }
            return;
        }

        const employeeOptions = employees
            .filter(emp => emp.actif !== false)
            .map(emp => `<option value="${emp.id}" data-type="${emp.poste}">${emp.nom_complet} (${emp.poste})</option>`)
            .join('');

        const content = `
            <form id="addShiftForm" class="form">
                <div class="form-group">
                    <label for="shiftEmployee">Équipier *</label>
                    <select id="shiftEmployee" required>
                        <option value="">Sélectionner un équipier</option>
                        ${employeeOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="shiftDay">Jour *</label>
                    <select id="shiftDay" required>
                        ${PlanningConfig.DAYS_OF_WEEK.map(d =>
                            `<option value="${d}" ${d === day ? 'selected' : ''}>${d}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="shiftStartHour">Heure de début *</label>
                    <select id="shiftStartHour" required>
                        ${PlanningConfig.HOURS_RANGE.map(h =>
                            `<option value="${h}" ${h === hour ? 'selected' : ''}>${PlanningUtils.formatHour(h)}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="shiftDuration">Durée (heures) *</label>
                    <select id="shiftDuration" required>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(d =>
                            `<option value="${d}" ${d === 4 ? 'selected' : ''}>${d}h</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="shiftNotes">Notes</label>
                    <textarea id="shiftNotes" placeholder="Notes optionnelles..."></textarea>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: 'Ajouter',
                class: 'btn-primary',
                onclick: () => window.addShift()
            }
        ];

        if (typeof openModal === 'function') {
            openModal('➕ Ajouter un créneau', content, buttons);
        }
    }

    /**
     * Affiche le modal d'édition de créneau
     */
    static showEditShiftModal(shift) {
        const employees = Array.from(AppState.employees.values());
        const employee = AppState.employees.get(shift.employee_id);

        if (!employee) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Employé introuvable', 'error');
            }
            return;
        }

        const employeeOptions = employees
            .filter(emp => emp.actif !== false)
            .map(emp => `<option value="${emp.id}" ${emp.id === shift.employee_id ? 'selected' : ''}>${emp.nom_complet} (${emp.poste})</option>`)
            .join('');

        const content = `
            <form id="editShiftForm" class="form">
                <input type="hidden" id="editShiftId" value="${shift.id}">

                <div class="form-group">
                    <label for="editShiftEmployee">Équipier *</label>
                    <select id="editShiftEmployee" required>
                        ${employeeOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="editShiftDay">Jour *</label>
                    <select id="editShiftDay" required>
                        ${PlanningConfig.DAYS_OF_WEEK.map(d =>
                            `<option value="${d}" ${d === shift.day ? 'selected' : ''}>${d}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="editShiftStartHour">Heure de début *</label>
                    <select id="editShiftStartHour" required>
                        ${PlanningConfig.HOURS_RANGE.map(h =>
                            `<option value="${h}" ${h === shift.start_hour ? 'selected' : ''}>${PlanningUtils.formatHour(h)}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="editShiftDuration">Durée (heures) *</label>
                    <select id="editShiftDuration" required>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(d =>
                            `<option value="${d}" ${d === shift.duration ? 'selected' : ''}>${d}h</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="editShiftNotes">Notes</label>
                    <textarea id="editShiftNotes" placeholder="Notes optionnelles...">${shift.notes || ''}</textarea>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Supprimer',
                class: 'btn-danger',
                onclick: () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) {
                        window.deleteShift(shift.id);
                    }
                }
            },
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: 'Modifier',
                class: 'btn-primary',
                onclick: () => window.editShift()
            }
        ];

        if (typeof openModal === 'function') {
            openModal(`✏️ Modifier créneau - ${employee.nom_complet}`, content, buttons);
        }
    }

    /**
     * Affiche le modal d'ajout d'employé
     */
    static showAddEmployeeModal() {
        const employeeTypes = Object.entries(PlanningConfig.EMPLOYEE_TYPES || {});

        const typeOptions = employeeTypes.map(([key, type]) =>
            `<option value="${key}">${type.name || key}</option>`
        ).join('');

        const content = `
            <form id="addEmployeeForm" class="form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="employeePrenom">Prénom *</label>
                        <input type="text" id="employeePrenom" required>
                    </div>
                    <div class="form-group">
                        <label for="employeeNom">Nom *</label>
                        <input type="text" id="employeeNom" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="employeePoste">Poste *</label>
                    <select id="employeePoste" required>
                        <option value="">Sélectionner un poste</option>
                        ${typeOptions}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeTauxHoraire">Taux horaire (€)</label>
                        <input type="number" id="employeeTauxHoraire" step="0.01" min="0" placeholder="12.50">
                    </div>
                    <div class="form-group">
                        <label for="employeeHeuresContrat">Heures contrat</label>
                        <input type="number" id="employeeHeuresContrat" min="0" max="60" placeholder="35">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeEmail">Email</label>
                        <input type="email" id="employeeEmail" placeholder="prenom.nom@email.com">
                    </div>
                    <div class="form-group">
                        <label for="employeeTelephone">Téléphone</label>
                        <input type="tel" id="employeeTelephone" placeholder="06 12 34 56 78">
                    </div>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: 'Ajouter',
                class: 'btn-primary',
                onclick: () => window.addEmployee()
            }
        ];

        if (typeof openModal === 'function') {
            openModal('👤 Nouvel équipier', content, buttons);
        }
    }

    /**
     * Affiche le modal d'édition d'employé
     */
    static showEditEmployeeModal(employee) {
        const employeeTypes = Object.entries(PlanningConfig.EMPLOYEE_TYPES || {});

        const typeOptions = employeeTypes.map(([key, type]) =>
            `<option value="${key}" ${key === employee.poste ? 'selected' : ''}>${type.name || key}</option>`
        ).join('');

        const content = `
            <form id="editEmployeeForm" class="form">
                <input type="hidden" id="editEmployeeId" value="${employee.id}">

                <div class="form-row">
                    <div class="form-group">
                        <label for="editEmployeePrenom">Prénom *</label>
                        <input type="text" id="editEmployeePrenom" value="${employee.prenom}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmployeeNom">Nom *</label>
                        <input type="text" id="editEmployeeNom" value="${employee.nom}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editEmployeePoste">Poste *</label>
                    <select id="editEmployeePoste" required>
                        ${typeOptions}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editEmployeeTauxHoraire">Taux horaire (€)</label>
                        <input type="number" id="editEmployeeTauxHoraire" step="0.01" min="0"
                               value="${employee.taux_horaire || ''}" placeholder="12.50">
                    </div>
                    <div class="form-group">
                        <label for="editEmployeeHeuresContrat">Heures contrat</label>
                        <input type="number" id="editEmployeeHeuresContrat" min="0" max="60"
                               value="${employee.heures_contrat || ''}" placeholder="35">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editEmployeeEmail">Email</label>
                        <input type="email" id="editEmployeeEmail" value="${employee.email || ''}"
                               placeholder="prenom.nom@email.com">
                    </div>
                    <div class="form-group">
                        <label for="editEmployeeTelephone">Téléphone</label>
                        <input type="tel" id="editEmployeeTelephone" value="${employee.telephone || ''}"
                               placeholder="06 12 34 56 78">
                    </div>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="editEmployeeActif" ${employee.actif !== false ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Équipier actif
                    </label>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Supprimer',
                class: 'btn-danger',
                onclick: () => {
                    if (confirm(`Êtes-vous sûr de vouloir supprimer ${employee.nom_complet} ?`)) {
                        window.deleteEmployee(employee.id);
                    }
                }
            },
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: 'Modifier',
                class: 'btn-primary',
                onclick: () => window.editEmployee()
            }
        ];

        if (typeof openModal === 'function') {
            openModal(`✏️ Modifier - ${employee.nom_complet}`, content, buttons);
        }
    }

    /**
     * Met à jour la légende des équipiers avec avatars
     */
    static updateLegend() {
        const legendContainer = document.getElementById('legendContainer');
        if (!legendContainer) return;

        Logger.debug('Mise à jour de la légende');

        const employees = Array.from(AppState.employees.values())
            .filter(emp => emp.actif !== false)
            .sort((a, b) => a.nom_complet.localeCompare(b.nom_complet));

        if (employees.length === 0) {
            legendContainer.innerHTML = `
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

        const legendHTML = `
            <div class="legend-header">
                <h3><i class="fas fa-users"></i> Équipe (${employees.length})</h3>
                <button class="btn btn-primary btn-sm" onclick="PlanningUI.showAddEmployeeModal()">
                    <i class="fas fa-plus"></i> Nouveau
                </button>
            </div>
            <div class="legend-grid">
                ${employees.map(employee => {
                    const shifts = AppState.employeeShifts.get(employee.id) || [];
                    const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0);

                    // Obtenir la couleur de l'employé
                    const color = typeof ColorManager !== 'undefined' ?
                        ColorManager.getEmployeeColor(employee.id) :
                        { bg: '#74b9ff', border: '#0984e3' };

                    // Créer l'avatar
                    const avatarSrc = typeof window.avatarManager !== 'undefined' ?
                        window.avatarManager.getEmployeeAvatar(employee) :
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&background=74b9ff&color=fff`;

                    return `
                        <div class="legend-item" data-employee-id="${employee.id}"
                             onclick="PlanningUI.showEditEmployeeModal(AppState.employees.get('${employee.id}'))">
                            <div class="legend-avatar-container">
                                <img src="${avatarSrc}"
                                     alt="${employee.nom_complet}"
                                     class="legend-avatar"
                                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&background=74b9ff&color=fff'">
                                <div class="legend-color-dot" style="background: ${color.bg}; border-color: ${color.border};"></div>
                            </div>
                            <div class="legend-info">
                                <div class="legend-name">${employee.nom_complet}</div>
                                <div class="legend-details">
                                    <span class="legend-role">${employee.poste}</span>
                                    <span class="legend-hours">${totalHours}h</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        legendContainer.innerHTML = legendHTML;
    }

    /**
     * Ferme tous les modals ouverts
     */
    static closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * Ferme un modal spécifique
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Met à jour les statistiques rapides
     */
    static updateQuickStats() {
        const shifts = Array.from(AppState.shifts.values());
        const employees = Array.from(AppState.employees.values()).filter(emp => emp.actif !== false);

        const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0);
        const activeEmployees = employees.length;
        const averageHours = activeEmployees > 0 ? totalHours / activeEmployees : 0;

        // Compter les photos
        const photoCount = typeof window.avatarManager !== 'undefined' ?
            window.avatarManager.getPhotoStats().customPhotos : 0;

        // Mettre à jour l'affichage
        const elements = {
            totalHoursDisplay: totalHours,
            activeEmployeesDisplay: activeEmployees,
            averageHoursDisplay: averageHours.toFixed(1) + 'h',
            photoCountDisplay: photoCount
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.PlanningUI = PlanningUI;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningUI;
}

Logger.info('PlanningUI chargé avec succès');