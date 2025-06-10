/**
 * Planning Restaurant - Gestionnaire de l'interface utilisateur
 * Gestion des modals, formulaires et interactions UI
 */

class UIManager {
    constructor() {
        this.activeModals = new Set();
        this.formValidators = new Map();
        this.isInitialized = false;

        this.init();
    }

    /**
     * Initialise le gestionnaire UI
     */
    init() {
        try {
            this.setupGlobalEventListeners();
            this.setupModalSystem();
            this.setupFormValidation();
            this.isInitialized = true;
            Logger.info('UIManager initialisé avec succès');
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation d\'UIManager:', error);
        }
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        // Fermeture des modals avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Clic à l'extérieur des modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Gestion du focus trap dans les modals
        document.addEventListener('keydown', this.handleFocusTrap.bind(this));
    }

    /**
     * Configure le système de modals
     */
    setupModalSystem() {
        // Créer le modal global s'il n'existe pas
        if (!document.getElementById('globalModal')) {
            this.createGlobalModal();
        }
    }

    /**
     * Crée le modal global
     */
    createGlobalModal() {
        const modal = document.createElement('div');
        modal.id = 'globalModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">Titre</h2>
                    <span class="modal-close" onclick="UIManager.closeModal('globalModal')">&times;</span>
                </div>
                <div class="modal-body" id="modalBody">
                    <!-- Contenu dynamique -->
                </div>
                <div class="modal-footer" id="modalFooter">
                    <!-- Boutons dynamiques -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Configure la validation des formulaires
     */
    setupFormValidation() {
        // Règles de validation communes
        this.validationRules = {
            required: (value) => value && value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: (value) => /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(value),
            number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
            min: (value, min) => parseFloat(value) >= min,
            max: (value, max) => parseFloat(value) <= max,
            minLength: (value, min) => value && value.length >= min,
            maxLength: (value, max) => value && value.length <= max
        };
    }

    // ==================== GESTION DES MODALS ====================

    /**
     * Ouvre un modal avec du contenu dynamique
     */
    openModal(title, content, buttons = [], options = {}) {
        const modal = document.getElementById('globalModal');
        if (!modal) {
            Logger.error('Modal global non trouvé');
            return;
        }

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        // Configuration du contenu
        if (modalTitle) modalTitle.innerHTML = title;
        if (modalBody) modalBody.innerHTML = content;

        // Configuration des boutons
        if (modalFooter) {
            modalFooter.innerHTML = '';
            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `btn ${button.class || 'btn-primary'}`;
                btn.innerHTML = button.text;
                btn.onclick = button.onclick;

                if (button.disabled) btn.disabled = true;
                if (button.id) btn.id = button.id;

                modalFooter.appendChild(btn);
            });
        }

        // Options du modal
        if (options.size) {
            modal.classList.add(`modal-${options.size}`);
        }
        if (options.closeOnEscape === false) {
            modal.dataset.closeOnEscape = 'false';
        }

        // Affichage
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.activeModals.add('globalModal');

        // Focus sur le premier élément focusable
        setTimeout(() => this.focusFirstElement(modal), 100);

        Logger.debug(`Modal ouvert: ${title}`);
        EventBus.emit('modal:opened', { id: 'globalModal', title });
    }

    /**
     * Ferme un modal spécifique
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        this.activeModals.delete(modalId);

        // Retirer les classes de taille
        modal.classList.remove('modal-small', 'modal-large', 'modal-fullscreen');

        // Restaurer le scroll du body si aucun modal actif
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        Logger.debug(`Modal fermé: ${modalId}`);
        EventBus.emit('modal:closed', { id: modalId });
    }

    /**
     * Ferme tous les modals
     */
    closeAllModals() {
        this.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });
    }

    /**
     * Gère le focus trap dans les modals
     */
    handleFocusTrap(e) {
        if (e.key !== 'Tab' || this.activeModals.size === 0) return;

        const activeModal = document.querySelector('.modal[style*="block"]');
        if (!activeModal) return;

        const focusableElements = this.getFocusableElements(activeModal);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Obtient les éléments focusables dans un conteneur
     */
    getFocusableElements(container) {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector))
            .filter(el => !el.disabled && !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0);
    }

    /**
     * Focus sur le premier élément focusable
     */
    focusFirstElement(container) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    // ==================== MODALS SPÉCIALISÉS ====================

    /**
     * Affiche le modal d'ajout de créneau
     */
    showAddShiftModal(defaultDay = '', defaultHour = '') {
        const employees = Array.from(AppState.employees.values())
            .filter(emp => emp.actif)
            .sort((a, b) => a.nom.localeCompare(b.nom));

        const content = `
            <form id="addShiftForm" class="form">
                <div class="form-group">
                    <label for="shiftEmployee">Équipier *</label>
                    <select id="shiftEmployee" required>
                        <option value="">Sélectionner un équipier</option>
                        ${employees.map(emp => `
                            <option value="${emp.id}" data-type="${emp.poste}">
                                ${PlanningUtils.sanitizeString(emp.nom_complet)} (${emp.type_info?.name || emp.poste})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="shiftDay">Jour *</label>
                        <select id="shiftDay" required>
                            ${PlanningConfig.DAYS_OF_WEEK.map(day => `
                                <option value="${day}" ${day === defaultDay ? 'selected' : ''}>${day}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="shiftStartHour">Heure de début *</label>
                        <select id="shiftStartHour" required>
                            ${PlanningConfig.HOURS_RANGE.map(hour => `
                                <option value="${hour}" ${hour === defaultHour ? 'selected' : ''}>
                                    ${PlanningUtils.formatHour(hour)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="shiftDuration">Durée (heures) *</label>
                        <select id="shiftDuration" required>
                            ${Array.from({length: 12}, (_, i) => i + 1).map(i => `
                                <option value="${i}" ${i === 4 ? 'selected' : ''}>${i}h</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="shiftNotes">Notes (optionnel)</label>
                    <textarea id="shiftNotes" placeholder="Remarques, consignes spéciales..."></textarea>
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
                text: '<i class="fas fa-plus"></i> Ajouter',
                class: 'btn-primary',
                onclick: () => this.handleAddShift()
            }
        ];

        this.openModal('<i class="fas fa-clock"></i> Ajouter un créneau', content, buttons);
        this.setupFormValidation('addShiftForm');
    }

    /**
     * Affiche le modal d'édition de créneau
     */
    showEditShiftModal(shift) {
        const employee = AppState.employees.get(shift.employee_id);
        if (!employee) {
            this.showErrorNotification('Employé introuvable');
            return;
        }

        const content = `
            <form id="editShiftForm" class="form">
                <div class="form-group">
                    <label>Équipier</label>
                    <input type="text" value="${PlanningUtils.sanitizeString(employee.nom_complet)}" readonly class="form-control-readonly">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editShiftDay">Jour *</label>
                        <select id="editShiftDay" required>
                            ${PlanningConfig.DAYS_OF_WEEK.map(day => `
                                <option value="${day}" ${day === shift.day ? 'selected' : ''}>${day}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftStartHour">Heure de début *</label>
                        <select id="editShiftStartHour" required>
                            ${PlanningConfig.HOURS_RANGE.map(hour => `
                                <option value="${hour}" ${hour === shift.start_hour ? 'selected' : ''}>
                                    ${PlanningUtils.formatHour(hour)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftDuration">Durée (heures) *</label>
                        <select id="editShiftDuration" required>
                            ${Array.from({length: 12}, (_, i) => i + 1).map(i => `
                                <option value="${i}" ${i === shift.duration ? 'selected' : ''}>${i}h</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editShiftNotes">Notes</label>
                    <textarea id="editShiftNotes" placeholder="Remarques, consignes spéciales...">${shift.notes || ''}</textarea>
                </div>

                <div class="form-info">
                    <p><i class="fas fa-info-circle"></i> Créneau créé le ${new Date(shift.date_creation).toLocaleDateString('fr-FR')}</p>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: '<i class="fas fa-trash"></i> Supprimer',
                class: 'btn-danger',
                onclick: () => this.confirmDeleteShift(shift.id)
            },
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: '<i class="fas fa-save"></i> Sauvegarder',
                class: 'btn-primary',
                onclick: () => this.handleUpdateShift(shift.id)
            }
        ];

        this.openModal(`Modifier le créneau de ${employee.prenom}`, content, buttons);
        this.setupFormValidation('editShiftForm');
    }

    /**
     * Affiche le modal d'ajout d'employé
     */
    showAddEmployeeModal() {
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

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeePoste">Poste *</label>
                        <select id="employeePoste" required>
                            ${Object.entries(PlanningConfig.EMPLOYEE_TYPES || {}).map(([key, info]) => `
                                <option value="${key}">${info.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="employeeTauxHoraire">Taux horaire (€) *</label>
                        <input type="number" id="employeeTauxHoraire" min="10" max="50" step="0.5" value="15" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeEmail">Email</label>
                        <input type="email" id="employeeEmail">
                    </div>
                    <div class="form-group">
                        <label for="employeeTelephone">Téléphone</label>
                        <input type="tel" id="employeeTelephone" placeholder="06.12.34.56.78">
                    </div>
                </div>

                <div class="form-group">
                    <label for="employeePhoto">Photo (optionnel)</label>
                    <input type="file" id="employeePhoto" accept="image/jpeg,image/jpg,image/png">
                    <small class="form-help">JPG, PNG - Max 5MB</small>
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
                text: '<i class="fas fa-user-plus"></i> Créer',
                class: 'btn-primary',
                onclick: () => this.handleAddEmployee()
            }
        ];

        this.openModal('<i class="fas fa-user-plus"></i> Nouvel équipier', content, buttons);
        this.setupFormValidation('addEmployeeForm');
    }

    /**
     * Affiche une confirmation de suppression
     */
    confirmDeleteShift(shiftId) {
        const shift = AppState.shifts.get(shiftId);
        const employee = AppState.employees.get(shift.employee_id);

        if (!shift || !employee) {
            this.showErrorNotification('Créneau ou employé introuvable');
            return;
        }

        const content = `
            <div class="confirm-delete">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Attention !</strong> Cette action est irréversible.
                </div>

                <p>Voulez-vous vraiment supprimer ce créneau ?</p>

                <div class="shift-details">
                    <strong>${employee.nom_complet}</strong><br>
                    ${shift.day} ${PlanningUtils.formatHour(shift.start_hour)} (${shift.duration}h)<br>
                    ${shift.notes ? `<em>${shift.notes}</em>` : ''}
                </div>
            </div>
        `;

        const buttons = [
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => this.closeModal('globalModal')
            },
            {
                text: '<i class="fas fa-trash"></i> Supprimer définitivement',
                class: 'btn-danger',
                onclick: () => this.handleDeleteShift(shiftId)
            }
        ];

        this.openModal('Confirmer la suppression', content, buttons);
    }

    // ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

    /**
     * Gère l'ajout d'un créneau
     */
    async handleAddShift() {
        const form = document.getElementById('addShiftForm');
        if (!this.validateForm(form)) return;

        const shiftData = {
            employee_id: document.getElementById('shiftEmployee').value,
            day: document.getElementById('shiftDay').value,
            start_hour: parseInt(document.getElementById('shiftStartHour').value),
            duration: parseInt(document.getElementById('shiftDuration').value),
            notes: document.getElementById('shiftNotes').value
        };

        try {
            this.setButtonLoading('btn-primary', true);
            const result = await APIManager.createShift(shiftData);

            if (result.success) {
                this.closeModal('globalModal');
                this.showSuccessNotification('Créneau ajouté avec succès');
                form.reset();
            } else {
                this.showErrorNotification(result.error);
            }
        } catch (error) {
            this.showErrorNotification('Erreur de connexion');
        } finally {
            this.setButtonLoading('btn-primary', false);
        }
    }

    /**
     * Gère la mise à jour d'un créneau
     */
    async handleUpdateShift(shiftId) {
        const form = document.getElementById('editShiftForm');
        if (!this.validateForm(form)) return;

        const updateData = {
            day: document.getElementById('editShiftDay').value,
            start_hour: parseInt(document.getElementById('editShiftStartHour').value),
            duration: parseInt(document.getElementById('editShiftDuration').value),
            notes: document.getElementById('editShiftNotes').value
        };

        try {
            this.setButtonLoading('btn-primary', true);
            const result = await APIManager.updateShift(shiftId, updateData);

            if (result.success) {
                this.closeModal('globalModal');
                this.showSuccessNotification('Créneau modifié avec succès');
            } else {
                this.showErrorNotification(result.error);
            }
        } catch (error) {
            this.showErrorNotification('Erreur de connexion');
        } finally {
            this.setButtonLoading('btn-primary', false);
        }
    }

    /**
     * Gère la suppression d'un créneau
     */
    async handleDeleteShift(shiftId) {
        try {
            this.setButtonLoading('btn-danger', true);
            const result = await APIManager.deleteShift(shiftId);

            if (result.success) {
                this.closeModal('globalModal');
                this.showSuccessNotification('Créneau supprimé avec succès');
            } else {
                this.showErrorNotification(result.error);
            }
        } catch (error) {
            this.showErrorNotification('Erreur de connexion');
        } finally {
            this.setButtonLoading('btn-danger', false);
        }
    }

    /**
     * Gère l'ajout d'un employé
     */
    async handleAddEmployee() {
        const form = document.getElementById('addEmployeeForm');
        if (!this.validateForm(form)) return;

        const employeeData = {
            prenom: document.getElementById('employeePrenom').value,
            nom: document.getElementById('employeeNom').value,
            poste: document.getElementById('employeePoste').value,
            taux_horaire: parseFloat(document.getElementById('employeeTauxHoraire').value),
            email: document.getElementById('employeeEmail').value,
            telephone: document.getElementById('employeeTelephone').value
        };

        try {
            this.setButtonLoading('btn-primary', true);
            const result = await APIManager.createEmployee(employeeData);

            if (result.success) {
                // Gérer la photo si elle existe
                const photoFile = document.getElementById('employeePhoto')?.files[0];
                if (photoFile && window.avatarManager) {
                    try {
                        await window.avatarManager.setEmployeePhoto(result.employee.id, photoFile);
                    } catch (photoError) {
                        Logger.warn('Erreur lors de la sauvegarde de la photo:', photoError);
                    }
                }

                this.closeModal('globalModal');
                this.showSuccessNotification('Équipier ajouté avec succès');
                form.reset();
            } else {
                this.showErrorNotification(result.error);
            }
        } catch (error) {
            this.showErrorNotification('Erreur de connexion');
        } finally {
            this.setButtonLoading('btn-primary', false);
        }
    }

    // ==================== VALIDATION DE FORMULAIRES ====================

    /**
     * Configure la validation pour un formulaire
     */
    setupFormValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Validation en temps réel
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        this.formValidators.set(formId, {
            form,
            rules: this.getValidationRules(formId)
        });
    }

    /**
     * Obtient les règles de validation pour un formulaire
     */
    getValidationRules(formId) {
        const commonRules = {
            required: ['employeePrenom', 'employeeNom', 'employeePoste', 'employeeTauxHoraire', 'shiftEmployee', 'shiftDay', 'shiftStartHour', 'shiftDuration'],
            email: ['employeeEmail'],
            phone: ['employeeTelephone'],
            number: ['employeeTauxHoraire', 'shiftDuration'],
            min: { employeeTauxHoraire: 10, shiftDuration: 1 },
            max: { employeeTauxHoraire: 50, shiftDuration: 12 }
        };

        return commonRules;
    }

    /**
     * Valide un champ individuel
     */
    validateField(field) {
        const rules = this.getValidationRules(field.form.id);
        const value = field.value.trim();
        const fieldName = field.id;

        // Vérification required
        if (rules.required.includes(fieldName) && !this.validationRules.required(value)) {
            this.showFieldError(field, 'Ce champ est obligatoire');
            return false;
        }

        // Vérification email
        if (rules.email.includes(fieldName) && value && !this.validationRules.email(value)) {
            this.showFieldError(field, 'Format d\'email invalide');
            return false;
        }

        // Vérification téléphone
        if (rules.phone.includes(fieldName) && value && !this.validationRules.phone(value)) {
            this.showFieldError(field, 'Format de téléphone invalide');
            return false;
        }

        // Vérification nombre
        if (rules.number.includes(fieldName) && value && !this.validationRules.number(value)) {
            this.showFieldError(field, 'Doit être un nombre valide');
            return false;
        }

        // Vérification min/max
        if (rules.min[fieldName] && value && !this.validationRules.min(value, rules.min[fieldName])) {
            this.showFieldError(field, `Minimum ${rules.min[fieldName]}`);
            return false;
        }

        if (rules.max[fieldName] && value && !this.validationRules.max(value, rules.max[fieldName])) {
            this.showFieldError(field, `Maximum ${rules.max[fieldName]}`);
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    /**
     * Valide un formulaire complet
     */
    validateForm(form) {
        if (!form) return false;

        const fields = form.querySelectorAll('input, select, textarea');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.focusFirstErrorField(form);
        }

        return isValid;
    }

    /**
     * Affiche une erreur de champ
     */
    showFieldError(field, message) {
        this.clearFieldError(field);

        field.classList.add('field-error');

        const error = document.createElement('div');
        error.className = 'field-error-message';
        error.textContent = message;

        field.parentNode.appendChild(error);
    }

    /**
     * Efface une erreur de champ
     */
    clearFieldError(field) {
        field.classList.remove('field-error');

        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Focus sur le premier champ en erreur
     */
    focusFirstErrorField(form) {
        const errorField = form.querySelector('.field-error');
        if (errorField) {
            errorField.focus();
        }
    }

    // ==================== UTILITAIRES UI ====================

    /**
     * Affiche/masque l'état de chargement d'un bouton
     */
    setButtonLoading(buttonClass, loading) {
        const button = document.querySelector(`.${buttonClass}`);
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    /**
     * Affiche une notification de succès
     */
    showSuccessNotification(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`✅ ${message}`, 'success');
        }
    }

    /**
     * Affiche une notification d'erreur
     */
    showErrorNotification(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`❌ ${message}`, 'error');
        }
    }

    /**
     * Affiche une notification d'information
     */
    showInfoNotification(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`ℹ️ ${message}`, 'info');
        }
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.closeAllModals();
        this.formValidators.clear();
        this.isInitialized = false;
        Logger.info('UIManager détruit');
    }
}

// Instance globale
let uiManagerInstance = null;

/**
 * Factory pour créer/récupérer l'instance
 */
function getUIManager() {
    if (!uiManagerInstance) {
        uiManagerInstance = new UIManager();
    }
    return uiManagerInstance;
}

// Fonctions globales pour la compatibilité
window.openModal = function(title, content, buttons, options) {
    const ui = getUIManager();
    ui.openModal(title, content, buttons, options);
};

window.closeModal = function(modalId) {
    const ui = getUIManager();
    ui.closeModal(modalId);
};

window.showAddShiftModal = function(day, hour) {
    const ui = getUIManager();
    ui.showAddShiftModal(day, hour);
};

window.showAddEmployeeModal = function() {
    const ui = getUIManager();
    ui.showAddEmployeeModal();
};

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.UIManager = getUIManager();
    window.PlanningUI = getUIManager(); // Alias pour compatibilité
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager, getUIManager };
}

Logger.info('UIManager chargé avec succès');