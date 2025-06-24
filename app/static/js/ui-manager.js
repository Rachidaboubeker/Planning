/**
 * Planning Restaurant - Gestionnaire UI Principal
 * Version nettoyée et corrigée
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
                // Simplifier les dépendances requises
                const dependencies = ['Logger', 'PlanningConfig'];
                const missing = dependencies.filter(dep => typeof window[dep] === 'undefined');

                if (missing.length === 0 || missing.every(dep => dep === 'Logger')) {
                    // Continuer même si Logger n'est pas disponible
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
                this.setupFormValidation();
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

            // Utiliser le système unifié de base.html
            if (typeof modalManager !== 'undefined') {
                modalManager.showAddEmployee();
            } else {
                console.error('❌ modalManager non disponible');
            }
        }

        /**
         * Affiche le modal de modification d'employé
         */
        showEditEmployeeModal(employeeId) {
            console.log('🔄 Ouverture du modal d\'édition employé:', employeeId);

            // Utiliser le système unifié de base.html
            if (typeof modalManager !== 'undefined') {
                modalManager.showEditEmployee(employeeId);
            } else {
                console.error('❌ modalManager non disponible');
            }
        }

        /**
         * Affiche le modal d'ajout de créneau
         */
        showAddShiftModal(defaultDay = '', defaultHour = '') {
            console.log('🔄 Ouverture du modal d\'ajout de créneau');

            // Utiliser le système unifié de base.html
            if (typeof modalManager !== 'undefined') {
                modalManager.showAddShift(defaultDay, defaultHour);
            } else {
                console.error('❌ modalManager non disponible');
            }
        }

        /**
         * Affiche le modal d'édition de créneau
         */
        showEditShiftModal(shiftId) {
            console.log('🔄 Ouverture du modal d\'édition créneau:', shiftId);

            // Utiliser le système unifié de base.html
            if (typeof modalManager !== 'undefined') {
                modalManager.showEditShift(shiftId);
            } else {
                console.error('❌ modalManager non disponible');
            }
        }

        // ==================== GESTIONNAIRES D'ACTIONS (SIMPLIFIÉS) ====================

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
                const result = await this.createEmployeeAPI(employeeData);

                if (result && result.success) {
                    console.log('✅ Employé créé avec succès');

                    // Fermer le modal
                    if (typeof modalManager !== 'undefined') {
                        modalManager.closeModal();
                    }

                    this.showSuccessNotification('Équipier ajouté avec succès');

                    // Recharger la page ou les données
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.showErrorNotification(result?.error || 'Erreur lors de la création');
                }
            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
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
                const result = await this.updateEmployeeAPI(employeeId, employeeData);

                if (result && result.success) {
                    console.log('✅ Employé mis à jour avec succès');

                    // Fermer le modal
                    if (typeof modalManager !== 'undefined') {
                        modalManager.closeModal();
                    }

                    this.showSuccessNotification('Employé modifié avec succès');

                    // Recharger la page
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);

                } else {
                    this.showErrorNotification(result?.error || 'Erreur lors de la modification');
                }

            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            }
        }

        /**
         * Gère la suppression d'un employé
         */
        /* Gère la suppression d'un employé avec nettoyage complet
        */
        async handleDeleteEmployee(employeeId) {
    // Chercher l'employé dans toutes les sources possibles
    let employee = null;

    if (window.AppState?.employees) {
        employee = window.AppState.employees.get(employeeId);
    }

    if (!employee && window.employees) {
        employee = window.employees.get(employeeId);
    }

    if (!employee) {
        this.showErrorNotification('Employé introuvable');
        return;
    }

    const employeeName = employee.nom_complet || `${employee.prenom} ${employee.nom}`;

    // Compter les créneaux associés
    let associatedShiftsCount = 0;

    // Chercher dans AppState.shifts
    if (window.AppState?.shifts) {
        associatedShiftsCount = Array.from(window.AppState.shifts.values())
            .filter(shift => shift.employee_id === employeeId).length;
    }

    // Chercher dans window.shifts (page index)
    if (window.shifts && window.shifts instanceof Map) {
        associatedShiftsCount += Array.from(window.shifts.values())
            .filter(shift => shift.employee_id === employeeId).length;
    }

    // Message de confirmation avec info sur les créneaux
    let confirmMessage = `Êtes-vous sûr de vouloir supprimer ${employeeName} ?`;
    if (associatedShiftsCount > 0) {
        confirmMessage += `\n\n⚠️ ATTENTION: Cet employé a ${associatedShiftsCount} créneau(x) planifié(s) qui seront également supprimé(s).`;
    }
    confirmMessage += '\n\nCette action est irréversible.';

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        // Étape 1: Supprimer l'employé via l'API
        console.log('🗑️ Suppression de l\'employé:', employeeId);
        const result = await this.deleteEmployeeAPI(employeeId);

        if (!result.success) {
            this.showErrorNotification(result.error);
            return;
        }

        // Étape 2: Supprimer tous les créneaux associés via l'API
        console.log('🗑️ Recherche et suppression des créneaux associés...');

        const shiftsToDelete = [];

        // Collecter tous les créneaux à supprimer
        if (window.AppState?.shifts) {
            window.AppState.shifts.forEach((shift, shiftId) => {
                if (shift.employee_id === employeeId) {
                    shiftsToDelete.push(shiftId);
                }
            });
        }

        if (window.shifts && window.shifts instanceof Map) {
            window.shifts.forEach((shift, shiftId) => {
                if (shift.employee_id === employeeId) {
                    shiftsToDelete.push(shiftId);
                }
            });
        }

        // Supprimer chaque créneau via l'API
        for (const shiftId of shiftsToDelete) {
            try {
                console.log('🗑️ Suppression du créneau:', shiftId);
                await this.deleteShiftAPI(shiftId);

                // Supprimer des données locales
                if (window.AppState?.shifts) {
                    window.AppState.shifts.delete(shiftId);
                }
                if (window.shifts && window.shifts instanceof Map) {
                    window.shifts.delete(shiftId);
                }
            } catch (shiftError) {
                console.warn('⚠️ Erreur lors de la suppression du créneau:', shiftId, shiftError);
            }
        }

        // Étape 3: Nettoyer les données locales
        if (window.AppState?.employees) {
            window.AppState.employees.delete(employeeId);
        }
        if (window.employees && window.employees instanceof Map) {
            window.employees.delete(employeeId);
        }

        // Étape 4: Nettoyer le DOM immédiatement
        console.log('🧹 Nettoyage du DOM...');
        this.cleanupEmployeeFromDOM(employeeId);

        // Étape 5: Fermer le modal
        if (typeof modalManager !== 'undefined') {
            modalManager.closeModal();
        }

        this.showSuccessNotification(`Employé et ${shiftsToDelete.length} créneau(x) supprimé(s) avec succès`);

        // Étape 6: Recharger la page pour tout remettre à jour
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        this.showErrorNotification('Erreur de connexion');
    }
}
        /**
         * Nettoie un employé du DOM immédiatement
         */
        cleanupEmployeeFromDOM(employeeId) {
            console.log('🧹 Nettoyage DOM pour employé:', employeeId);

            // Supprimer de la légende
            const legendItem = document.querySelector(`[data-employee-id="${employeeId}"]`);
            if (legendItem) {
                legendItem.remove();
                console.log('✅ Supprimé de la légende');
            }

            // Supprimer tous les créneaux visuels
            const shiftBlocks = document.querySelectorAll(`[data-employee-id="${employeeId}"]`);
            shiftBlocks.forEach(block => {
                block.remove();
                console.log('✅ Bloc créneau supprimé');
            });

            // Supprimer des listes déroulantes
            const employeeOptions = document.querySelectorAll(`option[value="${employeeId}"]`);
            employeeOptions.forEach(option => {
                option.remove();
                console.log('✅ Supprimé des listes déroulantes');
            });

            // Forcer la régénération du planning si la fonction existe
            if (typeof generatePlanningGrid === 'function') {
                setTimeout(() => {
                    console.log('🔄 Régénération du planning...');
                    generatePlanningGrid();
                }, 100);
            }

            // Forcer la mise à jour de la légende si la fonction existe
            if (typeof updateLegendWithAvatars === 'function') {
                setTimeout(() => {
                    console.log('🔄 Mise à jour de la légende...');
                    updateLegendWithAvatars();
                }, 200);
            }
        }

        // ==================== SUPPRESSION D'API POUR LES CRÉNEAUX ====================
        // Ajoutez cette méthode dans ui-manager.js si elle n'existe pas déjà :

        /**
         * Supprime un créneau via l'API
         */
        async deleteShiftAPI(shiftId) {
            const response = await fetch(`/api/shifts/${shiftId}`, {
                method: 'DELETE'
            });
            return await response.json();
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
                const result = await this.createShiftAPI(shiftData);

                if (result.success) {
                    // Fermer le modal
                    if (typeof modalManager !== 'undefined') {
                        modalManager.closeModal();
                    }

                    this.showSuccessNotification('Créneau ajouté avec succès');

                    // Recharger la page
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.showErrorNotification(result.error || 'Erreur lors de la création');
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion au serveur');
            }
        }

        /**
         * Gère la mise à jour d'un créneau
         */
        async handleUpdateShift(shiftId) {
            console.log('🔄 Début de handleUpdateShift pour ID:', shiftId);

            const form = document.getElementById('editShiftForm');
            if (!form) {
                this.showErrorNotification('Formulaire introuvable');
                return;
            }

            if (!this.validateForm(form)) {
                return;
            }

            const shiftData = {
                employee_id: document.getElementById('editShiftEmployee').value,
                day: document.getElementById('editShiftDay').value,
                start_hour: parseInt(document.getElementById('editShiftStartHour').value),
                duration: parseInt(document.getElementById('editShiftDuration').value),
                notes: document.getElementById('editShiftNotes').value.trim()
            };

            try {
                const result = await this.updateShiftAPI(shiftId, shiftData);

                if (result && result.success) {
                    console.log('✅ Créneau mis à jour avec succès');

                    // Fermer le modal
                    if (typeof modalManager !== 'undefined') {
                        modalManager.closeModal();
                    }

                    this.showSuccessNotification('Créneau modifié avec succès');

                    // Recharger la page
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);

                } else {
                    this.showErrorNotification(result?.error || 'Erreur lors de la modification');
                }

            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            }
        }

        /**
         * Gère la suppression d'un créneau
         */
        async handleDeleteShift(shiftId) {
            if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?\n\nCette action est irréversible.')) {
                return;
            }

            try {
                const result = await this.deleteShiftAPI(shiftId);

                if (result.success) {
                    // Fermer le modal
                    if (typeof modalManager !== 'undefined') {
                        modalManager.closeModal();
                    }

                    this.showSuccessNotification('Créneau supprimé avec succès');

                    // Recharger la page
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.showErrorNotification(result.error);
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion');
            }
        }

        // ==================== EXTRACTION DE DONNÉES ====================

        /**
         * Extrait les données du formulaire d'ajout d'employé
         */
        extractEmployeeFormData() {
            console.log('📋 Extraction des données du formulaire...');

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
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
            return await response.json();
        }

        /**
         * Met à jour un employé via l'API
         */
        async updateEmployeeAPI(employeeId, employeeData) {
            const response = await fetch(`/api/employees/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
            return await response.json();
        }

        /**
         * Supprime un employé via l'API
         */
        async deleteEmployeeAPI(employeeId) {
            const response = await fetch(`/api/employees/${employeeId}`, {
                method: 'DELETE'
            });
            return await response.json();
        }

        /**
         * Crée un créneau via l'API
         */
        async createShiftAPI(shiftData) {
            const response = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shiftData)
            });
            return await response.json();
        }

        /**
         * Met à jour un créneau via l'API
         */
        async updateShiftAPI(shiftId, shiftData) {
            const response = await fetch(`/api/shifts/${shiftId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shiftData)
            });
            return await response.json();
        }

        /**
         * Supprime un créneau via l'API
         */
        async deleteShiftAPI(shiftId) {
            const response = await fetch(`/api/shifts/${shiftId}`, {
                method: 'DELETE'
            });
            return await response.json();
        }

        // ==================== VALIDATION DE FORMULAIRES ====================

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
         * Affiche une notification de succès
         */
        showSuccessNotification(message) {
            if (typeof showNotification !== 'undefined') {
                showNotification(`✅ ${message}`, 'success');
            } else {
                alert(message);
            }
            console.log('✅', message);
        }

        /**
         * Affiche une notification d'erreur
         */
        showErrorNotification(message) {
            if (typeof showNotification !== 'undefined') {
                showNotification(`❌ ${message}`, 'error');
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
         * Ferme un modal
         */
        closeModal(modalId) {
            if (typeof modalManager !== 'undefined') {
                modalManager.closeModal();
            } else {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            }
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

    window.showEditShiftModal = function(shiftId) {
        window.UIManager.showEditShiftModal(shiftId);
    };

    // Gestionnaires pour le système unifié
    window.handleAddEmployee = function() {
        window.UIManager.handleAddEmployee();
    };

    window.handleUpdateEmployee = function(employeeId) {
        window.UIManager.handleUpdateEmployee(employeeId);
    };

    window.handleDeleteEmployee = function(employeeId) {
        window.UIManager.handleDeleteEmployee(employeeId);
    };

    window.handleAddShift = function() {
        window.UIManager.handleAddShift();
    };

    window.handleUpdateShift = function(shiftId) {
        window.UIManager.handleUpdateShift(shiftId);
    };

    window.handleDeleteShift = function(shiftId) {
        window.UIManager.handleDeleteShift(shiftId);
    };

    // Fonctions de confirmation pour le système unifié
    window.confirmDeleteEmployee = function(employeeId) {
        window.UIManager.handleDeleteEmployee(employeeId);
    };

    window.confirmDeleteShift = function(shiftId) {
        window.UIManager.handleDeleteShift(shiftId);
    };

    console.log('✅ UIManager nettoyé chargé avec succès');

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

console.log('✅ UIManager nettoyé chargé');