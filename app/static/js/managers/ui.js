/**
 * UI MANAGER UNIFIÉ - Planning Restaurant
 * Remplace ui-manager.js, ui-manager-fix.js, planning-ui.js
 * Gestion centralisée de toute l'interface utilisateur
 */

class UIManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.isInitialized = false;

        this.bindGlobalEvents();
        console.log('🎨 UI Manager unifié initialisé');
    }

    /**
     * Initialise le UI Manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('🎨 UI Manager déjà initialisé');
            return;
        }

        try {
            // Initialiser les composants UI
            await this.initializeComponents();

            // Configurer les contrôles
            this.setupControls();

            // Configurer les raccourcis clavier
            this.setupKeyboardShortcuts();

            this.isInitialized = true;
            console.log('✅ UI Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation UI Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Observer les changements d'état
        if (window.State) {
            window.State.observe('ui.isLoading', (isLoading) => {
                this.toggleLoadingState(isLoading);
            });
        }

        // Observer les événements globaux
        if (window.EventBus) {
            window.EventBus.on(window.Config?.EVENTS.DATA_LOADED, () => {
                this.onDataLoaded();
            });

            window.EventBus.on(window.Config?.EVENTS.ERROR_OCCURRED, (error) => {
                this.showError(error.message);
            });
        }
    }

    /**
     * Initialise les composants UI
     */
    async initializeComponents() {
        // Initialiser les notifications si disponibles
        if (window.NotificationManager && typeof window.NotificationManager.initialize === 'function') {
            await window.NotificationManager.initialize();
        }

        // Initialiser les modals si disponibles
        if (window.ModalManager && typeof window.ModalManager.initialize === 'function') {
            await window.ModalManager.initialize();
        }

        // Initialiser la légende si disponible
        if (window.LegendManager && typeof window.LegendManager.initialize === 'function') {
            await window.LegendManager.initialize();
        }
    }

    /**
     * Configure les contrôles de l'interface
     */
    setupControls() {
        // Sélecteur de granularité
        const granularitySelect = document.getElementById('granularitySelect');
        if (granularitySelect) {
            granularitySelect.addEventListener('change', (e) => {
                this.handleGranularityChange(parseInt(e.target.value));
            });
        }

        // Sélecteur de vue
        const viewSelect = document.getElementById('viewSelect');
        if (viewSelect) {
            viewSelect.addEventListener('change', (e) => {
                this.handleViewChange(e.target.value);
            });
        }

        // Boutons d'action
        this.setupActionButtons();
    }

    /**
     * Configure les boutons d'action
     */
    setupActionButtons() {
        const actionButtons = [
            { selector: '[data-action="add-employee"]', handler: () => this.showAddEmployeeModal() },
            { selector: '[data-action="add-shift"]', handler: () => this.showAddShiftModal() },
            { selector: '[data-action="prev-week"]', handler: () => this.handlePreviousWeek() },
            { selector: '[data-action="next-week"]', handler: () => this.handleNextWeek() },
            { selector: '[data-action="toggle-legend"]', handler: () => this.toggleLegend() }
        ];

        actionButtons.forEach(({ selector, handler }) => {
            const button = document.querySelector(selector);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }

    /**
     * Configure les raccourcis clavier
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N : Nouvel employé
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
                e.preventDefault();
                this.showAddEmployeeModal();
            }

            // Ctrl/Cmd + Shift + N : Nouveau créneau
            if ((e.ctrlKey || e.metaKey) && e.key === 'N' && e.shiftKey) {
                e.preventDefault();
                this.showAddShiftModal();
            }

            // Échap : Fermer les modals
            if (e.key === 'Escape') {
                this.closeActiveModal();
            }

            // Flèches pour navigation semaine
            if (e.altKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.handlePreviousWeek();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.handleNextWeek();
                }
            }
        });
    }

    // ==================== MODALS ====================

    /**
     * Affiche le modal d'ajout d'employé
     */
    showAddEmployeeModal() {
        const modalContent = this.generateAddEmployeeForm();

        this.showModal('add-employee', 'Ajouter un employé', modalContent, {
            onSave: (formData) => this.handleAddEmployee(formData),
            size: 'medium'
        });
    }

    /**
     * Affiche le modal d'édition d'employé
     */
    showEditEmployeeModal(employeeId) {
        const employee = window.State?.state.employees.get(employeeId);
        if (!employee) {
            this.showError('Employé non trouvé');
            return;
        }

        const modalContent = this.generateEditEmployeeForm(employee);

        this.showModal('edit-employee', 'Modifier l\'employé', modalContent, {
            onSave: (formData) => this.handleUpdateEmployee(employeeId, formData),
            onDelete: () => this.handleDeleteEmployee(employeeId),
            size: 'medium'
        });
    }

    /**
     * Affiche le modal d'ajout de créneau
     */
    showAddShiftModal(day = null, hour = null, minutes = 0) {
        const modalContent = this.generateAddShiftForm(day, hour, minutes);

        this.showModal('add-shift', 'Ajouter un créneau', modalContent, {
            onSave: (formData) => this.handleAddShift(formData),
            size: 'medium'
        });
    }

    /**
     * Affiche le modal d'édition de créneau
     */
    showEditShiftModal(shiftId) {
        const shift = window.State?.state.shifts.get(shiftId);
        if (!shift) {
            this.showError('Créneau non trouvé');
            return;
        }

        const modalContent = this.generateEditShiftForm(shift);

        this.showModal('edit-shift', 'Modifier le créneau', modalContent, {
            onSave: (formData) => this.handleUpdateShift(shiftId, formData),
            onDelete: () => this.handleDeleteShift(shiftId),
            size: 'medium'
        });
    }

    /**
     * Affiche un modal générique
     */
    showModal(id, title, content, options = {}) {
        if (window.ModalManager && typeof window.ModalManager.show === 'function') {
            window.ModalManager.show(id, title, content, options);
            this.activeModal = id;
        } else {
            // Fallback modal simple
            this.showFallbackModal(title, content, options);
        }
    }

    /**
     * Ferme le modal actif
     */
    closeActiveModal() {
        if (window.ModalManager && typeof window.ModalManager.close === 'function') {
            window.ModalManager.close(this.activeModal);
        }
        this.activeModal = null;
    }

    /**
     * Modal fallback simple
     */
    showFallbackModal(title, content, options = {}) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${this.sanitize(title)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="window.UIManager.handleModalSave(this)">
                        Enregistrer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        // Stocker les options pour la sauvegarde
        backdrop.dataset.options = JSON.stringify(options);
    }

    /**
     * Gère la sauvegarde depuis le modal fallback
     */
    handleModalSave(button) {
        const backdrop = button.closest('.modal-backdrop');
        const form = backdrop.querySelector('form');
        const options = JSON.parse(backdrop.dataset.options || '{}');

        if (form && options.onSave) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            options.onSave(data);
        }

        backdrop.remove();
    }

    // ==================== GÉNÉRATION DE FORMULAIRES ====================

    /**
     * Génère le formulaire d'ajout d'employé
     */
    generateAddEmployeeForm() {
        const employeeTypes = window.Config?.EMPLOYEE_TYPES || {};

        return `
            <form id="addEmployeeForm" class="form">
                <div class="form-row">
                    <div class="form-group">
                    <label class="form-label" for="shiftEmployee">Employé *</label>
                    <select id="shiftEmployee" name="employee_id" class="form-select" required>
                        <option value="">Sélectionner un employé</option>
                        ${employees.map(emp =>
                            `<option value="${emp.id}">${this.sanitize(emp.prenom)} ${this.sanitize(emp.nom)} (${this.sanitize(emp.poste)})</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="shiftDay">Jour *</label>
                        <select id="shiftDay" name="day" class="form-select" required>
                            ${days.map(day =>
                                `<option value="${day}" ${defaultDay === day ? 'selected' : ''}>${day}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="shiftHour">Heure de début *</label>
                        <select id="shiftHour" name="start_hour" class="form-select" required>
                            ${hours.map(hour =>
                                `<option value="${hour}" ${defaultHour === hour ? 'selected' : ''}>${hour.toString().padStart(2, '0')}:00</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="shiftMinutes">Minutes</label>
                        <select id="shiftMinutes" name="start_minutes" class="form-select">
                            <option value="0" ${defaultMinutes === 0 ? 'selected' : ''}>00</option>
                            <option value="15" ${defaultMinutes === 15 ? 'selected' : ''}>15</option>
                            <option value="30" ${defaultMinutes === 30 ? 'selected' : ''}>30</option>
                            <option value="45" ${defaultMinutes === 45 ? 'selected' : ''}>45</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="shiftDuration">Durée (heures) *</label>
                        <input type="number" id="shiftDuration" name="duration" class="form-input"
                               min="0.25" max="24" step="0.25" value="8" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="shiftNotes">Notes</label>
                    <textarea id="shiftNotes" name="notes" class="form-textarea" rows="2"></textarea>
                </div>
            </form>
        `;
    }

    /**
     * Génère le formulaire d'édition de créneau
     */
    generateEditShiftForm(shift) {
        const employees = window.State?.getActiveEmployees() || [];
        const days = window.Config?.DAYS_OF_WEEK || [];
        const hours = window.Config?.HOURS_RANGE || [];

        return `
            <form id="editShiftForm" class="form">
                <div class="form-group">
                    <label class="form-label" for="editShiftEmployee">Employé *</label>
                    <select id="editShiftEmployee" name="employee_id" class="form-select" required>
                        ${employees.map(emp =>
                            `<option value="${emp.id}" ${shift.employee_id === emp.id ? 'selected' : ''}>
                                ${this.sanitize(emp.prenom)} ${this.sanitize(emp.nom)} (${this.sanitize(emp.poste)})
                            </option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="editShiftDay">Jour *</label>
                        <select id="editShiftDay" name="day" class="form-select" required>
                            ${days.map(day =>
                                `<option value="${day}" ${shift.day === day ? 'selected' : ''}>${day}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="editShiftHour">Heure de début *</label>
                        <select id="editShiftHour" name="start_hour" class="form-select" required>
                            ${hours.map(hour =>
                                `<option value="${hour}" ${shift.start_hour === hour ? 'selected' : ''}>${hour.toString().padStart(2, '0')}:00</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="editShiftMinutes">Minutes</label>
                        <select id="editShiftMinutes" name="start_minutes" class="form-select">
                            <option value="0" ${(shift.start_minutes || 0) === 0 ? 'selected' : ''}>00</option>
                            <option value="15" ${shift.start_minutes === 15 ? 'selected' : ''}>15</option>
                            <option value="30" ${shift.start_minutes === 30 ? 'selected' : ''}>30</option>
                            <option value="45" ${shift.start_minutes === 45 ? 'selected' : ''}>45</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="editShiftDuration">Durée (heures) *</label>
                        <input type="number" id="editShiftDuration" name="duration" class="form-input"
                               min="0.25" max="24" step="0.25" value="${shift.duration || 8}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="editShiftNotes">Notes</label>
                    <textarea id="editShiftNotes" name="notes" class="form-textarea" rows="2">${this.sanitize(shift.notes || '')}</textarea>
                </div>
            </form>
        `;
    }

    // ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

    /**
     * Gère l'ajout d'un employé
     */
    async handleAddEmployee(formData) {
        try {
            this.showLoading('Ajout de l\'employé...');

            // Valider les données
            this.validateEmployeeData(formData);

            // Ajouter via l'API
            if (window.APIManager) {
                await window.APIManager.addEmployee(formData);
            } else {
                // Fallback local
                const employee = {
                    id: this.generateId(),
                    ...formData,
                    actif: true
                };
                window.State?.setEmployee(employee);
            }

            this.closeActiveModal();
            this.showSuccess('Employé ajouté avec succès');

        } catch (error) {
            this.showError(`Erreur lors de l'ajout: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère la mise à jour d'un employé
     */
    async handleUpdateEmployee(employeeId, formData) {
        try {
            this.showLoading('Mise à jour de l\'employé...');

            this.validateEmployeeData(formData);

            if (window.APIManager) {
                await window.APIManager.updateEmployee(employeeId, formData);
            } else {
                const employee = { id: employeeId, ...formData };
                window.State?.setEmployee(employee);
            }

            this.closeActiveModal();
            this.showSuccess('Employé mis à jour');

        } catch (error) {
            this.showError(`Erreur lors de la mise à jour: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère la suppression d'un employé
     */
    async handleDeleteEmployee(employeeId) {
        const employee = window.State?.state.employees.get(employeeId);
        if (!employee) return;

        const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer ${employee.prenom} ${employee.nom} ?\n\nTous ses créneaux seront également supprimés.`);
        if (!confirmed) return;

        try {
            this.showLoading('Suppression de l\'employé...');

            if (window.APIManager) {
                await window.APIManager.deleteEmployee(employeeId);
            } else {
                window.State?.removeEmployee(employeeId);
            }

            this.closeActiveModal();
            this.showSuccess('Employé supprimé');

        } catch (error) {
            this.showError(`Erreur lors de la suppression: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère l'ajout d'un créneau
     */
    async handleAddShift(formData) {
        try {
            this.showLoading('Ajout du créneau...');

            this.validateShiftData(formData);

            if (window.APIManager) {
                await window.APIManager.addShift(formData);
            } else {
                const shift = {
                    id: this.generateId(),
                    ...formData,
                    start_hour: parseInt(formData.start_hour),
                    start_minutes: parseInt(formData.start_minutes || 0),
                    duration: parseFloat(formData.duration)
                };
                window.State?.setShift(shift);
            }

            this.closeActiveModal();
            this.showSuccess('Créneau ajouté avec succès');

        } catch (error) {
            this.showError(`Erreur lors de l'ajout: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère la mise à jour d'un créneau
     */
    async handleUpdateShift(shiftId, formData) {
        try {
            this.showLoading('Mise à jour du créneau...');

            this.validateShiftData(formData);

            if (window.APIManager) {
                await window.APIManager.updateShift(shiftId, formData);
            } else {
                const shift = {
                    id: shiftId,
                    ...formData,
                    start_hour: parseInt(formData.start_hour),
                    start_minutes: parseInt(formData.start_minutes || 0),
                    duration: parseFloat(formData.duration)
                };
                window.State?.setShift(shift);
            }

            this.closeActiveModal();
            this.showSuccess('Créneau mis à jour');

        } catch (error) {
            this.showError(`Erreur lors de la mise à jour: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère la suppression d'un créneau
     */
    async handleDeleteShift(shiftId) {
        const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?');
        if (!confirmed) return;

        try {
            this.showLoading('Suppression du créneau...');

            if (window.APIManager) {
                await window.APIManager.deleteShift(shiftId);
            } else {
                window.State?.removeShift(shiftId);
            }

            this.closeActiveModal();
            this.showSuccess('Créneau supprimé');

        } catch (error) {
            this.showError(`Erreur lors de la suppression: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère le changement de granularité
     */
    async handleGranularityChange(granularity) {
        try {
            if (window.PlanningManager) {
                await window.PlanningManager.changeGranularity(granularity);
            }
        } catch (error) {
            this.showError(`Erreur changement granularité: ${error.message}`);
        }
    }

    /**
     * Gère le changement de vue
     */
    handleViewChange(view) {
        if (window.PlanningManager) {
            window.PlanningManager.changeView(view);
        }
    }

    /**
     * Gère la navigation semaine précédente
     */
    handlePreviousWeek() {
        if (window.PlanningManager) {
            window.PlanningManager.changeWeek(-1);
        }
    }

    /**
     * Gère la navigation semaine suivante
     */
    handleNextWeek() {
        if (window.PlanningManager) {
            window.PlanningManager.changeWeek(1);
        }
    }

    /**
     * Toggle la légende
     */
    toggleLegend() {
        const legend = document.getElementById('employeeLegend');
        if (legend) {
            legend.style.display = legend.style.display === 'none' ? 'block' : 'none';
        }
    }

    // ==================== VALIDATION ====================

    /**
     * Valide les données d'un employé
     */
    validateEmployeeData(data) {
        if (!data.prenom?.trim()) {
            throw new Error('Le prénom est obligatoire');
        }

        if (!data.nom?.trim()) {
            throw new Error('Le nom est obligatoire');
        }

        if (!data.poste) {
            throw new Error('Le poste est obligatoire');
        }

        if (!data.taux_horaire || parseFloat(data.taux_horaire) <= 0) {
            throw new Error('Le taux horaire doit être positif');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            throw new Error('L\'email n\'est pas valide');
        }
    }

    /**
     * Valide les données d'un créneau
     */
    validateShiftData(data) {
        if (!data.employee_id) {
            throw new Error('L\'employé est obligatoire');
        }

        if (!data.day) {
            throw new Error('Le jour est obligatoire');
        }

        if (data.start_hour === undefined || data.start_hour === '') {
            throw new Error('L\'heure de début est obligatoire');
        }

        if (!data.duration || parseFloat(data.duration) <= 0) {
            throw new Error('La durée doit être positive');
        }

        if (parseFloat(data.duration) > 24) {
            throw new Error('La durée ne peut pas dépasser 24 heures');
        }
    }

    /**
     * Valide un email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ==================== ÉTAT DE L'INTERFACE ====================

    /**
     * Gère l'état de chargement
     */
    toggleLoadingState(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('active', isLoading);
        }

        // Désactiver les boutons pendant le chargement
        const buttons = document.querySelectorAll('button, select');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
    }

    /**
     * Affiche un état de chargement avec message
     */
    showLoading(message = 'Chargement...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const spinner = overlay.querySelector('.spinner span');
            if (spinner) {
                spinner.textContent = message;
            }
            overlay.classList.add('active');
        }
    }

    /**
     * Cache l'état de chargement
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Gère le chargement des données
     */
    onDataLoaded() {
        // Mettre à jour les statistiques
        this.updateStatistics();

        // Actualiser la légende
        if (window.LegendManager && typeof window.LegendManager.refresh === 'function') {
            window.LegendManager.refresh();
        }
    }

    /**
     * Met à jour les statistiques affichées
     */
    updateStatistics() {
        const stats = window.State?.calculateStatistics();

        if (stats) {
            this.updateStatElement('employeeCount', stats.activeEmployees);
            this.updateStatElement('totalHours', Math.round(stats.totalHours * 10) / 10);
        }
    }

    /**
     * Met à jour un élément de statistique
     */
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Affiche un message de succès
     */
    showSuccess(message) {
        if (window.NotificationManager && typeof window.NotificationManager.success === 'function') {
            window.NotificationManager.success(message);
        } else {
            console.log('✅', message);
        }
    }

    /**
     * Affiche un message d'erreur
     */
    showError(message) {
        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(message);
        } else {
            console.error('❌', message);
            alert(message); // Fallback
        }
    }

    /**
     * Affiche un message d'information
     */
    showInfo(message) {
        if (window.NotificationManager && typeof window.NotificationManager.info === 'function') {
            window.NotificationManager.info(message);
        } else {
            console.log('ℹ️', message);
        }
    }

    // ==================== UTILITAIRES ====================

    /**
     * Génère un ID unique
     */
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitise une chaîne pour l'affichage HTML
     */
    sanitize(str) {
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
    }

    /**
     * Détruit le UI Manager
     */
    destroy() {
        this.modals.clear();
        this.activeModal = null;
        this.isInitialized = false;
        console.log('🗑️ UI Manager détruit');
    }
}

// Instance globale unique
if (!window.UIManager) {
    window.UIManager = new UIManager();
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
                        <label class="form-label" for="employeePrenom">Prénom *</label>
                        <input type="text" id="employeePrenom" name="prenom" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="employeeNom">Nom *</label>
                        <input type="text" id="employeeNom" name="nom" class="form-input" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="employeePoste">Poste *</label>
                        <select id="employeePoste" name="poste" class="form-select" required>
                            <option value="">Sélectionner un poste</option>
                            ${Object.entries(employeeTypes).map(([type, config]) =>
                                `<option value="${type}">${this.sanitize(config.name)}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="employeeTaux">Taux horaire (€) *</label>
                        <input type="number" id="employeeTaux" name="taux_horaire" class="form-input"
                               min="0" step="0.01" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="employeeEmail">Email</label>
                        <input type="email" id="employeeEmail" name="email" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="employeeTelephone">Téléphone</label>
                        <input type="tel" id="employeeTelephone" name="telephone" class="form-input">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="employeeNotes">Notes</label>
                    <textarea id="employeeNotes" name="notes" class="form-textarea" rows="3"></textarea>
                </div>
            </form>
        `;
    }

    /**
     * Génère le formulaire d'édition d'employé
     */
    generateEditEmployeeForm(employee) {
        const employeeTypes = window.Config?.EMPLOYEE_TYPES || {};

        return `
            <form id="editEmployeeForm" class="form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="editEmployeePrenom">Prénom *</label>
                        <input type="text" id="editEmployeePrenom" name="prenom" class="form-input"
                               value="${this.sanitize(employee.prenom || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="editEmployeeNom">Nom *</label>
                        <input type="text" id="editEmployeeNom" name="nom" class="form-input"
                               value="${this.sanitize(employee.nom || '')}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="editEmployeePoste">Poste *</label>
                        <select id="editEmployeePoste" name="poste" class="form-select" required>
                            ${Object.entries(employeeTypes).map(([type, config]) =>
                                `<option value="${type}" ${employee.poste === type ? 'selected' : ''}>
                                    ${this.sanitize(config.name)}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="editEmployeeTaux">Taux horaire (€) *</label>
                        <input type="number" id="editEmployeeTaux" name="taux_horaire" class="form-input"
                               min="0" step="0.01" value="${employee.taux_horaire || ''}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="editEmployeeEmail">Email</label>
                        <input type="email" id="editEmployeeEmail" name="email" class="form-input"
                               value="${this.sanitize(employee.email || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="editEmployeeTelephone">Téléphone</label>
                        <input type="tel" id="editEmployeeTelephone" name="telephone" class="form-input"
                               value="${this.sanitize(employee.telephone || '')}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="editEmployeeNotes">Notes</label>
                    <textarea id="editEmployeeNotes" name="notes" class="form-textarea" rows="3">${this.sanitize(employee.notes || '')}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="actif" ${employee.actif !== false ? 'checked' : ''}>
                        Employé actif
                    </label>
                </div>
            </form>
        `;
    }

    /**
     * Génère le formulaire d'ajout de créneau
     */
    generateAddShiftForm(defaultDay = null, defaultHour = null, defaultMinutes = 0) {
        const employees = window.State?.getActiveEmployees() || [];
        const days = window.Config?.DAYS_OF_WEEK || [];
        const hours = window.Config?.HOURS_RANGE || [];

        return `
            <form id="addShiftForm" class="form">
                <div class="form-group">