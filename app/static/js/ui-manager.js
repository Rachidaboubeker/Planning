/**
 * Planning Restaurant - Gestionnaire UI Principal
 * Version allégée et refactorisée
 * Fichier: ui-manager.js
 */

if (typeof window.UIManager === 'undefined') {
    console.log('🔄 Initialisation d\'UIManager...');

    class UIManager {
        constructor() {
            this.formValidators = new Map();
            this.isInitialized = false;
            this.modalManager = null;

            this.waitForDependencies();
        }

        /**
         * Attend que les dépendances soient chargées
         */
        waitForDependencies() {
            const checkDependencies = () => {
                const dependencies = ['Logger', 'PlanningConfig', 'AppState', 'ModalManager'];
                const missing = dependencies.filter(dep => typeof window[dep] === 'undefined');

                if (missing.length === 0) {
                    this.init();
                } else {
                    console.log('🔄 UIManager en attente des dépendances:', missing);
                    setTimeout(checkDependencies, 100);
                }
            };

            checkDependencies();
        }

        /**
         * Initialise le gestionnaire UI
         */
        init() {
            try {
                this.modalManager = new window.ModalManager();
                this.setupFormValidation();
                this.registerModalActions();
                this.isInitialized = true;

                if (typeof Logger !== 'undefined') {
                    Logger.info('UIManager initialisé avec succès');
                } else {
                    console.log('✅ UIManager initialisé avec succès');
                }
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation d\'UIManager:', error);
            }
        }

        /**
         * Enregistre les actions personnalisées dans ModalManager
         */
        registerModalActions() {
            // Enregistrement des gestionnaires personnalisés si nécessaire
            this.modalManager.registerEventHandler('custom-action', (event, data) => {
                console.log('Action personnalisée déclenchée', data);
            });
        }

        /**
         * Configure la validation des formulaires
         */
        setupFormValidation() {
            this.validationRules = {
                required: (value) => value && value.trim() !== '',
                email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
                phone: (value) => /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(value),
                number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
                min: (value, min) => parseFloat(value) >= min,
                max: (value, max) => parseFloat(value) <= max
            };
        }

        // ==================== MODALS SPÉCIALISÉS ====================

        /**
         * Affiche le modal d'ajout d'employé
         */
        showAddEmployeeModal() {
            console.log('🔄 Ouverture du modal d\'ajout d\'employé');

            const employeeTypes = this.getEmployeeTypes();
            const content = this.generateAddEmployeeForm(employeeTypes);

            const config = {
                title: '<i class="fas fa-user-plus"></i> Nouvel équipier',
                content: content,
                buttons: [
                    {
                        text: 'Annuler',
                        class: 'btn-secondary',
                        action: 'close'
                    },
                    {
                        text: '<i class="fas fa-user-plus"></i> Créer',
                        class: 'btn-primary',
                        action: 'add-employee'
                    }
                ]
            };

            this.modalManager.openModal(config);
            this.setupFormValidation('addEmployeeForm');
        }

        /**
         * Affiche le modal de modification d'employé
         */
        showEditEmployeeModal(employeeId) {
            const employee = AppState.employees.get(employeeId);
            if (!employee) {
                this.showErrorNotification('Employé introuvable');
                return;
            }

            const employeeTypes = this.getEmployeeTypes();
            const content = this.generateEditEmployeeForm(employee, employeeTypes);

            const config = {
                title: `✏️ Modifier - ${employee.prenom} ${employee.nom}`,
                content: content,
                buttons: [
                    {
                        text: '<i class="fas fa-trash"></i> Supprimer',
                        class: 'btn-danger',
                        action: 'delete-employee'
                    },
                    {
                        text: 'Annuler',
                        class: 'btn-secondary',
                        action: 'close'
                    },
                    {
                        text: '<i class="fas fa-save"></i> Modifier',
                        class: 'btn-primary',
                        action: 'update-employee'
                    }
                ],
                data: {
                    employeeId: employeeId
                }
            };

            this.modalManager.openModal(config);
            this.setupFormValidation('editEmployeeForm');
        }

        /**
         * Affiche le modal d'ajout de créneau
         */
        showAddShiftModal(defaultDay = '', defaultHour = '') {
            console.log('🔄 Ouverture du modal d\'ajout de créneau');

            if (!window.AppState || !window.AppState.employees) {
                this.showErrorNotification('Données des employés non disponibles');
                return;
            }

            const employees = Array.from(AppState.employees.values())
                .filter(emp => emp.actif)
                .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

            const content = this.generateAddShiftForm(employees, defaultDay, defaultHour);

            const config = {
                title: '<i class="fas fa-clock"></i> Ajouter un créneau',
                content: content,
                buttons: [
                    {
                        text: 'Annuler',
                        class: 'btn-secondary',
                        action: 'close'
                    },
                    {
                        text: '<i class="fas fa-plus"></i> Ajouter',
                        class: 'btn-primary',
                        action: 'add-shift'
                    }
                ]
            };

            this.modalManager.openModal(config);
            this.setupFormValidation('addShiftForm');
        }

        // ==================== GÉNÉRATEURS DE FORMULAIRES ====================

        /**
         * Génère le formulaire d'ajout d'employé
         */
        generateAddEmployeeForm(employeeTypes) {
            return `
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
                                <option value="">Sélectionner un poste</option>
                                ${Object.entries(employeeTypes).map(([key, info]) => `
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
        }

        /**
         * Génère le formulaire de modification d'employé
         */
        generateEditEmployeeForm(employee, employeeTypes) {
            return `
                <form id="editEmployeeForm" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeeNom">Nom *</label>
                            <input type="text" id="editEmployeeNom" value="${this.sanitizeString(employee.nom)}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmployeePrenom">Prénom *</label>
                            <input type="text" id="editEmployeePrenom" value="${this.sanitizeString(employee.prenom)}" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeePoste">Poste *</label>
                            <select id="editEmployeePoste" required>
                                ${Object.entries(employeeTypes).map(([key, info]) => `
                                    <option value="${key}" ${employee.poste === key ? 'selected' : ''}>${info.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeTauxHoraire">Taux horaire (€) *</label>
                            <input type="number" id="editEmployeeTauxHoraire" value="${employee.taux_horaire}" step="0.01" min="0" max="100" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeeEmail">Email</label>
                            <input type="email" id="editEmployeeEmail" value="${employee.email || ''}" placeholder="email@exemple.fr">
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeTelephone">Téléphone</label>
                            <input type="tel" id="editEmployeeTelephone" value="${employee.telephone || ''}" placeholder="06.12.34.56.78">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="editEmployeePhoto">Photo (optionnel)</label>
                        <input type="file" id="editEmployeePhoto" accept="image/jpeg,image/jpg,image/png">
                        <small class="form-help">JPG, PNG - Max 5MB</small>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="editEmployeeActif" ${employee.actif ? 'checked' : ''}>
                            Employé actif
                        </label>
                        <small class="form-help">Décochez pour désactiver l'employé sans le supprimer</small>
                    </div>

                    <div class="form-info">
                        <p><i class="fas fa-info-circle"></i> Employé créé le ${new Date(employee.date_creation).toLocaleDateString('fr-FR')}</p>
                    </div>
                </form>
            `;
        }

        /**
         * Génère le formulaire d'ajout de créneau
         */
        generateAddShiftForm(employees, defaultDay, defaultHour) {
            return `
                <form id="addShiftForm" class="form">
                    <div class="form-group">
                        <label for="shiftEmployee">Équipier *</label>
                        <select id="shiftEmployee" required>
                            <option value="">Sélectionner un équipier</option>
                            ${employees.map(emp => `
                                <option value="${emp.id}" data-type="${emp.poste}">
                                    ${this.sanitizeString(emp.nom_complet || `${emp.prenom} ${emp.nom}`)} (${emp.type_info?.name || emp.poste})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="shiftDay">Jour *</label>
                            <select id="shiftDay" required>
                                ${this.getDaysOfWeek().map(day => `
                                    <option value="${day}" ${day === defaultDay ? 'selected' : ''}>${day}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="shiftStartHour">Heure de début *</label>
                            <select id="shiftStartHour" required>
                                ${this.getHoursRange().map(hour => `
                                    <option value="${hour}" ${hour === defaultHour ? 'selected' : ''}>
                                        ${this.formatHour(hour)}
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
        }

        // ==================== GESTIONNAIRES D'ACTIONS ====================

        /**
         * Gère l'ajout d'un employé
         */
        async handleAddEmployee() {
            console.log('🔄 Début de handleAddEmployee');

            const employeeData = this.extractEmployeeFormData();
            if (!employeeData) return;

            const errors = this.validateEmployeeData(employeeData);
            if (errors.length > 0) {
                this.showErrorNotification('Erreurs : ' + errors.join(', '));
                return;
            }

            try {
                this.modalManager.setButtonLoading('.btn-primary', true);
                const result = await this.createEmployeeAPI(employeeData);

                if (result && result.success) {
                    console.log('✅ Employé créé avec succès');
                    this.modalManager.closeModal('globalModal');
                    this.showSuccessNotification('Équipier ajouté avec succès');
                    await this.refreshEmployeeData();
                } else {
                    this.showErrorNotification(result?.error || 'Erreur lors de la création');
                }
            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.modalManager.setButtonLoading('.btn-primary', false);
            }
        }

        /**
         * Gère la mise à jour d'un employé
         */
        async handleUpdateEmployee(employeeId) {
            console.log('🔄 Début de handleUpdateEmployee pour ID:', employeeId);

            const form = document.getElementById('editEmployeeForm');
            if (!form) {
                this.showErrorNotification('Formulaire introuvable');
                return;
            }

            if (!this.validateForm(form)) {
                return;
            }

            const employeeData = this.extractEditEmployeeFormData();
            if (!employeeData) return;

            const errors = this.validateEmployeeData(employeeData);
            if (errors.length > 0) {
                this.showErrorNotification('Erreurs: ' + errors.join(', '));
                return;
            }

            try {
                this.modalManager.setButtonLoading('.btn-primary', true);
                const result = await this.updateEmployeeAPI(employeeId, employeeData);

                if (result && result.success) {
                    console.log('✅ Employé mis à jour avec succès');

                    if (typeof AppState !== 'undefined' && AppState.employees) {
                        AppState.employees.set(employeeId, result.employee);
                    }

                    const photoFile = document.getElementById('editEmployeePhoto')?.files[0];
                    if (photoFile && window.avatarManager) {
                        try {
                            await window.avatarManager.setEmployeePhoto(employeeId, photoFile);
                        } catch (photoError) {
                            console.warn('⚠️ Erreur photo:', photoError);
                        }
                    }

                    this.updateShiftEmployeeDropdown();

                    if (typeof PlanningManager !== 'undefined') {
                        PlanningManager.generatePlanningGrid();
                        PlanningManager.updateLegend();
                    }

                    this.modalManager.closeModal('globalModal');
                    this.showSuccessNotification('Employé modifié avec succès');

                } else {
                    this.showErrorNotification(result?.error || 'Erreur lors de la modification');
                }

            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.modalManager.setButtonLoading('.btn-primary', false);
            }
        }

        /**
         * Gère la suppression d'un employé
         */
        async handleDeleteEmployee(employeeId) {
            const employee = AppState.employees.get(employeeId);
            if (!employee) {
                this.showErrorNotification('Employé introuvable');
                return;
            }

            const employeeName = employee.nom_complet;
            if (!confirm(`Êtes-vous sûr de vouloir supprimer ${employeeName} ?\n\nCette action est irréversible.`)) {
                return;
            }

            try {
                this.modalManager.setButtonLoading('.btn-danger', true);
                const result = await this.deleteEmployeeAPI(employeeId);

                if (result.success) {
                    AppState.employees.delete(employeeId);

                    const associatedShifts = Array.from(AppState.shifts.entries())
                        .filter(([_, shift]) => shift.employee_id === employeeId);

                    associatedShifts.forEach(([shiftId, _]) => {
                        AppState.shifts.delete(shiftId);
                    });

                    this.updateShiftEmployeeDropdown();

                    if (typeof PlanningManager !== 'undefined') {
                        PlanningManager.generatePlanningGrid();
                        PlanningManager.updateLegend();
                    }

                    this.modalManager.closeModal('globalModal');
                    this.showSuccessNotification('Employé supprimé avec succès');
                } else {
                    this.showErrorNotification(result.error);
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion');
            } finally {
                this.modalManager.setButtonLoading('.btn-danger', false);
            }
        }

        /**
         * Gère l'ajout d'un créneau
         */
        async handleAddShift() {
            console.log('🔄 Début de handleAddShift');

            const form = document.getElementById('addShiftForm');
            if (!form) {
                this.showErrorNotification('Formulaire introuvable');
                return;
            }

            if (!this.validateForm(form)) {
                return;
            }

            const shiftData = {
                employee_id: document.getElementById('shiftEmployee').value,
                day: document.getElementById('shiftDay').value,
                start_hour: parseInt(document.getElementById('shiftStartHour').value),
                duration: parseInt(document.getElementById('shiftDuration').value),
                notes: document.getElementById('shiftNotes').value.trim()
            };

            try {
                this.modalManager.setButtonLoading('.btn-primary', true);
                const result = await this.createShiftAPI(shiftData);

                if (result.success) {
                    this.modalManager.closeModal('globalModal');
                    this.showSuccessNotification('Créneau ajouté avec succès');
                    form.reset();
                    await this.refreshShiftData();
                } else {
                    this.showErrorNotification(result.error || 'Erreur lors de la création');
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.modalManager.setButtonLoading('.btn-primary', false);
            }
        }

        // ==================== EXTRACTION DE DONNÉES ====================

        /**
         * Extrait les données du formulaire d'ajout d'employé
         */
        extractEmployeeFormData() {
    console.log('📋 Extraction des données du formulaire...');

    // Méthode directe et fiable
    const getFieldValue = (fieldId) => {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`⚠️ Champ ${fieldId} non trouvé`);
            return '';
        }

        const value = field.value ? field.value.trim() : '';
        console.log(`  ${fieldId}: "${value}"`);
        return value;
    };

    const data = {
        prenom: getFieldValue('employeePrenom'),
        nom: getFieldValue('employeeNom'),
        poste: getFieldValue('employeePoste'),
        taux_horaire: parseFloat(getFieldValue('employeeTauxHoraire')) || 15,
        email: getFieldValue('employeeEmail'),
        telephone: getFieldValue('employeeTelephone')
    };

    console.log('📋 Données extraites:', data);
    return data;
}

        /**
         * Extrait les données du formulaire de modification d'employé
         */
        extractEditEmployeeFormData() {
            const getFieldValue = (fieldId) => {
                const field = document.getElementById(fieldId);
                return field ? (field.value ? field.value.trim() : '') : '';
            };

            return {
                nom: getFieldValue('editEmployeeNom'),
                prenom: getFieldValue('editEmployeePrenom'),
                poste: getFieldValue('editEmployeePoste'),
                taux_horaire: parseFloat(getFieldValue('editEmployeeTauxHoraire')),
                email: getFieldValue('editEmployeeEmail'),
                telephone: getFieldValue('editEmployeeTelephone'),
                actif: document.getElementById('editEmployeeActif')?.checked ?? true
            };
        }

        /**
         * Valide les données d'employé
         */
        validateEmployeeData(employeeData) {
            const errors = [];
            if (!employeeData.prenom) errors.push('Prénom manquant');
            if (!employeeData.nom) errors.push('Nom manquant');
            if (!employeeData.poste) errors.push('Poste manquant');
            if (isNaN(employeeData.taux_horaire) || employeeData.taux_horaire < 10 || employeeData.taux_horaire > 50) {
                errors.push('Taux horaire invalide (10-50€)');
            }
            return errors;
        }

        // ==================== APPELS API ====================

        /**
         * Crée un employé via l'API
         */
        async createEmployeeAPI(employeeData) {
            if (typeof APIManager !== 'undefined' && APIManager.createEmployee) {
                return await APIManager.createEmployee(employeeData);
            } else {
                const response = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });
                return await response.json();
            }
        }

        /**
         * Met à jour un employé via l'API
         */
        async updateEmployeeAPI(employeeId, employeeData) {
            if (typeof APIManager !== 'undefined' && APIManager.updateEmployee) {
                return await APIManager.updateEmployee(employeeId, employeeData);
            } else {
                const response = await fetch(`/api/employees/${employeeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });
                return await response.json();
            }
        }

        /**
         * Supprime un employé via l'API
         */
        async deleteEmployeeAPI(employeeId) {
            if (typeof APIManager !== 'undefined' && APIManager.deleteEmployee) {
                return await APIManager.deleteEmployee(employeeId);
            } else {
                const response = await fetch(`/api/employees/${employeeId}`, {
                    method: 'DELETE'
                });
                return await response.json();
            }
        }

        /**
         * Crée un créneau via l'API
         */
        async createShiftAPI(shiftData) {
            if (typeof APIManager !== 'undefined' && APIManager.createShift) {
                return await APIManager.createShift(shiftData);
            } else {
                const response = await fetch('/api/shifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shiftData)
                });
                return await response.json();
            }
        }

        // ==================== VALIDATION DE FORMULAIRES ====================

        /**
         * Configure la validation pour un formulaire
         */
        setupFormValidation(formId) {
            const form = document.getElementById(formId);
            if (!form) return;

            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.clearFieldError(input));
            });

            this.formValidators.set(formId, { form });
            console.log(`✅ Validation configurée pour ${formId}`);
        }

        /**
         * Valide un formulaire complet
         */
        validateForm(form) {
            if (!form) return false;

            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            let firstErrorField = null;

            requiredFields.forEach(field => {
                let value = field.tagName.toLowerCase() === 'select' ? field.value : (field.value ? field.value.trim() : '');
                const isEmpty = !value || value === '';

                if (isEmpty) {
                    this.showFieldError(field, field.tagName.toLowerCase() === 'select' ? 'Veuillez sélectionner une option' : 'Ce champ est obligatoire');
                    if (!firstErrorField) firstErrorField = field;
                    isValid = false;
                } else {
                    this.clearFieldError(field);
                }
            });

            if (!isValid && firstErrorField) {
                firstErrorField.focus();
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            return isValid;
        }

        /**
         * Affiche une erreur de champ
         */
        showFieldError(field, message) {
            if (!field) return;

            this.clearFieldError(field);
            field.classList.add('field-error');

            const error = document.createElement('div');
            error.className = 'field-error-message';
            error.textContent = message;
            error.style.cssText = `
                color: #dc3545;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            `;

            field.parentNode.appendChild(error);
        }

        /**
         * Efface une erreur de champ
         */
        clearFieldError(field) {
            if (!field) return;

            field.classList.remove('field-error');
            const existingError = field.parentNode.querySelector('.field-error-message');
            if (existingError) {
                existingError.remove();
            }
        }

        // ==================== UTILITAIRES ====================

        /**
         * Met à jour la liste déroulante des employés
         */
        updateShiftEmployeeDropdown() {
            const shiftEmployeeSelect = document.getElementById('shiftEmployee');
            if (!shiftEmployeeSelect) return;

            const currentValue = shiftEmployeeSelect.value;
            shiftEmployeeSelect.innerHTML = '<option value="">Sélectionner un équipier</option>';

            const employees = Array.from(AppState.employees.values())
                .filter(emp => emp.actif)
                .sort((a, b) => a.nom.localeCompare(b.nom));

            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.nom_complet} (${emp.type_info?.name || emp.poste})`;
                option.setAttribute('data-type', emp.poste);

                if (emp.id === currentValue) {
                    option.selected = true;
                }

                shiftEmployeeSelect.appendChild(option);
            });
        }

        /**
         * Rafraîchit les données des employés
         */
        async refreshEmployeeData() {
            try {
                if (typeof PlanningManager !== 'undefined' && PlanningManager.generatePlanningGrid) {
                    PlanningManager.generatePlanningGrid();
                    PlanningManager.updateLegend();
                }

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                console.error('Erreur lors du rafraîchissement:', error);
            }
        }

        /**
         * Rafraîchit les données des créneaux
         */
        async refreshShiftData() {
            try {
                if (typeof PlanningManager !== 'undefined' && PlanningManager.generatePlanningGrid) {
                    PlanningManager.generatePlanningGrid();
                }
            } catch (error) {
                console.error('Erreur lors du rafraîchissement:', error);
            }
        }

        /**
         * Affiche une notification de succès
         */
        showSuccessNotification(message) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(`✅ ${message}`, 'success');
            } else {
                alert(message);
            }
            console.log('✅', message);
        }

        /**
         * Affiche une notification d'erreur
         */
        showErrorNotification(message) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(`❌ ${message}`, 'error');
            } else {
                alert('Erreur: ' + message);
            }
            console.error('❌', message);
        }

        /**
         * Nettoie une chaîne de caractères
         */
        sanitizeString(str) {
            if (!str) return '';
            return str.toString().trim().replace(/[<>]/g, '');
        }

        /**
         * Formate une heure
         */
        formatHour(hour) {
            if (typeof PlanningUtils !== 'undefined' && PlanningUtils.formatHour) {
                return PlanningUtils.formatHour(hour);
            }
            const h = parseInt(hour);
            return h.toString().padStart(2, '0') + ':00';
        }

        /**
         * Obtient la liste des jours de la semaine
         */
        getDaysOfWeek() {
            if (typeof PlanningConfig !== 'undefined' && PlanningConfig.DAYS_OF_WEEK) {
                return PlanningConfig.DAYS_OF_WEEK;
            }
            return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        }

        /**
         * Obtient la plage des heures
         */
        getHoursRange() {
            if (typeof PlanningConfig !== 'undefined' && PlanningConfig.HOURS_RANGE) {
                return PlanningConfig.HOURS_RANGE;
            }
            return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
        }

        /**
         * Obtient les types d'employés
         */
        getEmployeeTypes() {
            if (typeof PlanningConfig !== 'undefined' && PlanningConfig.EMPLOYEE_TYPES) {
                return PlanningConfig.EMPLOYEE_TYPES;
            }

            return {
                'cuisinier': { name: 'Cuisinier' },
                'serveur': { name: 'Serveur' },
                'barman': { name: 'Barman' },
                'manager': { name: 'Manager' },
                'plongeur': { name: 'Plongeur' },
                'commis': { name: 'Commis' }
            };
        }

        /**
         * Destruction propre
         */
        destroy() {
            if (this.modalManager) {
                this.modalManager.destroy();
            }
            this.formValidators.clear();
            this.isInitialized = false;
            console.log('UIManager détruit');
        }
    }

    // ==================== EXPORT ET INITIALISATION ====================

    let uiManagerInstance = null;

    function getUIManager() {
        if (!uiManagerInstance) {
            uiManagerInstance = new UIManager();
        }
        return uiManagerInstance;
    }

    window.UIManager = getUIManager();

    // Fonctions globales de compatibilité
    window.showAddEmployeeModal = function() {
        window.UIManager.showAddEmployeeModal();
    };

    window.showEditEmployeeModal = function(employeeId) {
        window.UIManager.showEditEmployeeModal(employeeId);
    };

    window.showAddShiftModal = function(day, hour) {
        window.UIManager.showAddShiftModal(day, hour);
    };

    console.log('✅ UIManager refactorisé chargé avec succès');

} // Fermeture du if

// CSS pour les erreurs de validation
const style = document.createElement('style');
style.textContent = `
    .field-error {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
    }

    .field-error-message {
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    }
`;
document.head.appendChild(style);

// Initialisation automatique
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 UIManager refactorisé - DOM Content Loaded');

    setTimeout(() => {
        if (!window.UIManager) {
            console.error('❌ ERREUR: UIManager non disponible !');
        } else {
            console.log('✅ UIManager refactorisé prêt');
        }
    }, 500);
});

console.log('✅ UIManager refactorisé chargé');