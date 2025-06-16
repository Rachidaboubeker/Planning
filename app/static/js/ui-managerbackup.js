/**
 * Planning Restaurant - Gestionnaire de l'interface utilisateur
 * Gestion des modals, formulaires et interactions UI
 * VERSION COMPLÈTE ET CORRIGÉE
 */

// Vérifier si UIManager n'est pas déjà défini
if (typeof window.UIManager === 'undefined') {
    console.log('🔄 Initialisation d\'UIManager...');

    class UIManager {
        constructor() {
            this.activeModals = new Set();
            this.formValidators = new Map();
            this.isInitialized = false;
            this.buttonFixAttempts = 0;
            this.maxButtonFixAttempts = 3;

            // Initialisation avec vérification des dépendances
            this.waitForDependencies();
        }

        /**
         * Attend que les dépendances soient chargées
         */
        waitForDependencies() {
            const checkDependencies = () => {
                const dependencies = ['Logger', 'PlanningConfig', 'AppState'];
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
                this.setupGlobalEventListeners();
                this.setupModalSystem();
                this.setupFormValidation();
                this.setupButtonFixSystem();
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
         * Configure le système de correction des boutons
         */
        setupButtonFixSystem() {
            // Observer les mutations DOM pour détecter les nouveaux modals
            this.setupModalObserver();

            // Correction automatique après chargement complet
            setTimeout(() => {
                this.fixAllModalButtons();
            }, 1000);
        }

        /**
         * Configure l'observateur de modals
         */
        setupModalObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.classList.contains('modal') && target.style.display === 'block') {
                            console.log('🔄 Nouveau modal détecté, correction des boutons...');
                            setTimeout(() => this.fixModalButtons(target), 100);
                        }
                    }
                });
            });

            // Observer tous les modals existants et futurs
            document.querySelectorAll('.modal').forEach(modal => {
                observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
            });

            // Observer l'ajout de nouveaux modals
            const bodyObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList?.contains('modal')) {
                            observer.observe(node, { attributes: true, attributeFilter: ['style'] });
                        }
                    });
                });
            });

            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }

        /**
         * Met à jour la liste déroulante des employés dans les formulaires de créneaux
         */
        updateShiftEmployeeDropdown() {
            const shiftEmployeeSelect = document.getElementById('shiftEmployee');
            if (!shiftEmployeeSelect) return;

            // Sauvegarder la valeur actuelle
            const currentValue = shiftEmployeeSelect.value;

            // Vider et repeupler
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
         * Corrige les boutons de tous les modals
         */
        fixAllModalButtons() {
            console.log('🔧 Correction de tous les boutons de modals...');
            document.querySelectorAll('.modal').forEach(modal => {
                this.fixModalButtons(modal);
            });
        }

        /**
         * Corrige les boutons d'un modal spécifique
         */
        fixModalButtons(modal) {
            if (!modal) return;

            const buttons = modal.querySelectorAll('button');

            buttons.forEach(button => {
                const buttonText = button.textContent.trim();

                // Supprimer tous les événements existants
                const newButton = button.cloneNode(true);

                // Nettoyer l'onclick défaillant après clonage
                newButton.onclick = null;
                newButton.removeAttribute('onclick');

                button.parentNode.replaceChild(newButton, button);

                // Attacher les nouveaux événements selon le texte du bouton
                if (buttonText.includes('Créer')) {
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Bouton Créer cliqué');
                        this.handleAddEmployee();
                    });
                } else if (buttonText.includes('Sauvegarder') || buttonText.includes('Modifier')) {
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Bouton Modifier cliqué');
                        const employeeId = this.extractEmployeeIdFromModal(modal);
                        if (employeeId) {
                            this.handleUpdateEmployee(employeeId);
                        } else {
                            this.showErrorNotification('ID employé non trouvé');
                        }
                    });
                } else if (buttonText.includes('Ajouter') && modal.querySelector('#addShiftForm')) {
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Bouton Ajouter créneau cliqué');
                        this.handleAddShift();
                    });
                } else if (buttonText === 'Supprimer' && newButton.classList.contains('btn-danger')) {
                    // SECTION SUPPRIMER avec activation forcée
                    newButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Bouton Supprimer cliqué');

                        // Récupérer l'ID de l'employé
                        const employeeId = this.extractEmployeeIdFromModal(modal);

                        if (!employeeId) {
                            this.showErrorNotification('Impossible d\'identifier l\'employé à supprimer');
                            return;
                        }

                        const employee = AppState.employees.get(employeeId);
                        const employeeName = employee ? employee.nom_complet : 'cet employé';

                        if (confirm(`Êtes-vous sûr de vouloir supprimer ${employeeName} ?\n\nCette action est irréversible.`)) {
                            await this.handleDeleteEmployee(employeeId);
                        }
                    });

                    // ✅ CORRECTION: Forcer l'activation du bouton Supprimer
                    newButton.disabled = false;
                    newButton.style.opacity = '1';
                    newButton.style.cursor = 'pointer';
                    newButton.style.backgroundColor = '#dc3545';
                    newButton.style.borderColor = '#dc3545';
                    console.log('✅ Bouton Supprimer forcé actif dans fixModalButtons');

                } else if (buttonText.includes('Annuler')) {
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Bouton Annuler cliqué');
                        this.closeModal('globalModal');
                    });
                }
            });

            console.log(`✅ Boutons corrigés pour le modal: ${modal.id || 'sans-id'}`);
        }

        /**
         * Extrait l'ID d'employé depuis le modal
         */
        extractEmployeeIdFromModal(modal) {
            // Méthode 1: Dataset du modal
            let employeeId = modal.dataset.employeeId;
            if (employeeId) return employeeId;

            // Méthode 2: Depuis le titre du modal
            const modalTitle = modal.querySelector('#modalTitle, h2');
            if (modalTitle) {
                const titleText = modalTitle.textContent;
                const match = titleText.match(/Modifier\s*-?\s*(.+)/);
                if (match) {
                    const employeeName = match[1].trim().replace('✏️', '').trim();
                    if (typeof AppState !== 'undefined' && AppState.employees) {
                        for (const [id, employee] of AppState.employees) {
                            const fullName = `${employee.prenom} ${employee.nom}`.trim();
                            if (fullName === employeeName || employee.nom_complet === employeeName) {
                                return id;
                            }
                        }
                    }
                }
            }

            // Méthode 3: Champ caché
            const hiddenField = modal.querySelector('input[name="employee_id"], input[data-employee-id]');
            if (hiddenField) {
                return hiddenField.value || hiddenField.dataset.employeeId;
            }

            console.warn('⚠️ ID d\'employé non trouvé dans le modal');
            return null;
        }

        /**
         * Extrait l'ID de créneau depuis le modal
         */
        extractShiftIdFromModal(modal) {
            let shiftId = modal.dataset.shiftId;
            if (shiftId) return shiftId;

            const hiddenField = modal.querySelector('input[name="shift_id"], input[data-shift-id]');
            if (hiddenField) {
                return hiddenField.value || hiddenField.dataset.shiftId;
            }

            console.warn('⚠️ ID de créneau non trouvé dans le modal');
            return null;
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
                        <span class="modal-close" onclick="window.UIManager.closeModal('globalModal')">&times;</span>
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
            // Règles de validation améliorées
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
                console.error('❌ Modal global non trouvé');
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
                buttons.forEach((button, index) => {
                    const btn = document.createElement('button');
                    btn.className = `btn ${button.class || 'btn-primary'}`;
                    btn.innerHTML = button.text;
                    btn.type = 'button';

                    if (button.disabled) btn.disabled = true;
                    if (button.id) btn.id = button.id;
                    if (button.employeeId) btn.dataset.employeeId = button.employeeId;

                    modalFooter.appendChild(btn);
                });
            }

            // Options du modal
            if (options.size) {
                modal.classList.add(`modal-${options.size}`);
            }
            if (options.employeeId) {
                modal.dataset.employeeId = options.employeeId;
            }

            // Affichage
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.activeModals.add('globalModal');

            // Focus sur le premier élément focusable
            setTimeout(() => this.focusFirstElement(modal), 100);

            // Correction automatique des boutons après ouverture
            setTimeout(() => {
                this.fixModalButtons(modal);
            }, 150);

            console.log(`📱 Modal ouvert: ${title}`);
        }

        /**
         * Ferme un modal spécifique
         */
        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            modal.style.display = 'none';
            this.activeModals.delete(modalId);

            // Nettoyer les datasets
            delete modal.dataset.employeeId;
            delete modal.dataset.shiftId;

            // Retirer les classes de taille
            modal.classList.remove('modal-small', 'modal-large', 'modal-fullscreen');

            // Restaurer le scroll du body si aucun modal actif
            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }

            console.log(`📱 Modal fermé: ${modalId}`);
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
         * Affiche le modal d'ajout d'employé
         */
        showAddEmployeeModal() {
            console.log('🔄 Ouverture du modal d\'ajout d\'employé');

            const employeeTypes = this.getEmployeeTypes();

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

            const buttons = [
                {
                    text: 'Annuler',
                    class: 'btn-secondary'
                },
                {
                    text: '<i class="fas fa-user-plus"></i> Créer',
                    class: 'btn-primary'
                }
            ];

            this.openModal('<i class="fas fa-user-plus"></i> Nouvel équipier', content, buttons);
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

            const content = `
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
                        <small class="form-help">JPG, PNG - Max 5MB - Laissez vide pour conserver la photo actuelle</small>
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

            const buttons = [
                {
                    text: '<i class="fas fa-trash"></i> Supprimer',
                    class: 'btn-danger',
                    employeeId: employeeId
                },
                {
                    text: 'Annuler',
                    class: 'btn-secondary'
                },
                {
                    text: '<i class="fas fa-save"></i> Modifier',
                    class: 'btn-primary',
                    employeeId: employeeId
                }
            ];

            this.openModal(`✏️ Modifier - ${employee.prenom} ${employee.nom}`, content, buttons, { employeeId: employeeId });
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

            const content = `
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

            const buttons = [
                {
                    text: 'Annuler',
                    class: 'btn-secondary'
                },
                {
                    text: '<i class="fas fa-plus"></i> Ajouter',
                    class: 'btn-primary'
                }
            ];

            this.openModal('<i class="fas fa-clock"></i> Ajouter un créneau', content, buttons);
            this.setupFormValidation('addShiftForm');
        }

        // ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

        /**
         * Gère l'ajout d'un employé
         */
        async handleAddEmployee() {
            console.log('🔄 Début de handleAddEmployee');

            // Récupération sécurisée des valeurs
            const getCorrectFieldValue = (selector) => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    const lastElement = elements[elements.length - 1];
                    const value = lastElement.value?.trim() || '';
                    return value;
                }
                return '';
            };

            const employeeData = {
                prenom: getCorrectFieldValue('#employeePrenom'),
                nom: getCorrectFieldValue('#employeeNom'),
                poste: getCorrectFieldValue('#employeePoste'),
                taux_horaire: parseFloat(getCorrectFieldValue('#employeeTauxHoraire')) || 15,
                email: getCorrectFieldValue('#employeeEmail'),
                telephone: getCorrectFieldValue('#employeeTelephone')
            };

            console.log('📋 Données récupérées:', employeeData);

            // Validation
            const errors = [];
            if (!employeeData.prenom) errors.push('Prénom manquant');
            if (!employeeData.nom) errors.push('Nom manquant');
            if (!employeeData.poste) errors.push('Poste manquant');
            if (isNaN(employeeData.taux_horaire) || employeeData.taux_horaire < 10 || employeeData.taux_horaire > 50) {
                errors.push('Taux horaire invalide (10-50€)');
            }

            if (errors.length > 0) {
                console.error('❌ Erreurs:', errors);
                this.showErrorNotification('Erreurs : ' + errors.join(', '));
                return;
            }

            console.log('✅ Validation réussie, envoi API...');

            try {
                this.setButtonLoading('btn-primary', true);
                const result = await this.createEmployeeAPI(employeeData);

                if (result && result.success) {
                    console.log('✅ Employé créé avec succès');
                    this.closeModal('globalModal');
                    this.showSuccessNotification('Équipier ajouté avec succès');
                    await this.refreshEmployeeData();
                } else {
                    console.error('❌ Erreur API:', result?.error);
                    this.showErrorNotification(result?.error || 'Erreur lors de la création');
                }
            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.setButtonLoading('btn-primary', false);
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
                this.setButtonLoading('btn-primary', true);
                const result = await this.createShiftAPI(shiftData);

                if (result.success) {
                    this.closeModal('globalModal');
                    this.showSuccessNotification('Créneau ajouté avec succès');
                    form.reset();
                    await this.refreshShiftData();
                } else {
                    this.showErrorNotification(result.error || 'Erreur lors de la création');
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.setButtonLoading('btn-primary', false);
            }
        }

        /**
         * Gère la mise à jour d'un employé
         */
        async handleUpdateEmployee(employeeId) {
            console.log('🔄 Début de handleUpdateEmployee pour ID:', employeeId);

            const form = document.getElementById('editEmployeeForm');
            if (!form) {
                console.error('❌ Formulaire editEmployeeForm introuvable');
                this.showErrorNotification('Formulaire introuvable');
                return;
            }

            if (!this.validateForm(form)) {
                console.warn('⚠️ Validation du formulaire échouée');
                return;
            }

            // Récupération sécurisée des données
            const getFieldValue = (fieldId) => {
                const field = document.getElementById(fieldId);
                if (!field) {
                    console.warn(`⚠️ Champ ${fieldId} non trouvé`);
                    return '';
                }
                return field.value ? field.value.trim() : '';
            };

            const employeeData = {
                nom: getFieldValue('editEmployeeNom'),
                prenom: getFieldValue('editEmployeePrenom'),
                poste: getFieldValue('editEmployeePoste'),
                taux_horaire: parseFloat(getFieldValue('editEmployeeTauxHoraire')),
                email: getFieldValue('editEmployeeEmail'),
                telephone: getFieldValue('editEmployeeTelephone'),
                actif: document.getElementById('editEmployeeActif')?.checked ?? true
            };

            console.log('📋 Données à mettre à jour:', employeeData);

            // Validation des données
            const errors = [];
            if (!employeeData.nom) errors.push('Nom requis');
            if (!employeeData.prenom) errors.push('Prénom requis');
            if (!employeeData.poste) errors.push('Poste requis');
            if (isNaN(employeeData.taux_horaire) || employeeData.taux_horaire <= 0) {
                errors.push('Taux horaire invalide');
            }

            if (errors.length > 0) {
                console.error('❌ Erreurs de validation:', errors);
                this.showErrorNotification('Erreurs: ' + errors.join(', '));
                return;
            }

            try {
                this.setButtonLoading('btn-primary', true);

                // Appel API via APIManager
                const result = await this.updateEmployeeAPI(employeeId, employeeData);

                if (result && result.success) {
                    console.log('✅ Employé mis à jour avec succès');

                    // Mettre à jour les données locales
                    if (typeof AppState !== 'undefined' && AppState.employees) {
                        AppState.employees.set(employeeId, result.employee);
                    }

                    // Gérer la photo si une nouvelle a été sélectionnée
                    const photoFile = document.getElementById('editEmployeePhoto')?.files[0];
                    if (photoFile && window.avatarManager) {
                        try {
                            await window.avatarManager.setEmployeePhoto(employeeId, photoFile);
                            console.log('✅ Photo mise à jour');
                        } catch (photoError) {
                            console.warn('⚠️ Erreur photo:', photoError);
                        }
                    }

                    // Mettre à jour la liste déroulante des créneaux
                    this.updateShiftEmployeeDropdown();

                    // Regénérer le planning si possible
                    if (typeof PlanningManager !== 'undefined') {
                        PlanningManager.generatePlanningGrid();
                        PlanningManager.updateLegend();
                    }

                    this.closeModal('globalModal');
                    this.showSuccessNotification('Employé modifié avec succès');

                } else {
                    console.error('❌ Erreur API:', result?.error);
                    this.showErrorNotification(result?.error || 'Erreur lors de la modification');
                }

            } catch (error) {
                console.error('❌ Erreur critique:', error);
                this.showErrorNotification('Erreur de connexion au serveur');
            } finally {
                this.setButtonLoading('btn-primary', false);
            }
        }

        /**
         * Gère la suppression d'un employé
         */
        async handleDeleteEmployee(employeeId) {
            try {
                this.setButtonLoading('btn-danger', true);
                const result = await this.deleteEmployeeAPI(employeeId);

                if (result.success) {
                    // Supprimer de l'état local
                    AppState.employees.delete(employeeId);

                    // Supprimer les créneaux associés
                    const associatedShifts = Array.from(AppState.shifts.entries())
                        .filter(([_, shift]) => shift.employee_id === employeeId);

                    associatedShifts.forEach(([shiftId, _]) => {
                        AppState.shifts.delete(shiftId);
                    });

                    // Mettre à jour l'interface
                    this.updateShiftEmployeeDropdown();

                    if (typeof PlanningManager !== 'undefined') {
                        PlanningManager.generatePlanningGrid();
                        PlanningManager.updateLegend();
                    }

                    this.closeModal('globalModal');
                    this.showSuccessNotification('Employé supprimé avec succès');
                } else {
                    this.showErrorNotification(result.error);
                }
            } catch (error) {
                this.showErrorNotification('Erreur de connexion');
            } finally {
                this.setButtonLoading('btn-danger', false);
            }
        }

        // ==================== APPELS API ====================

        /**
         * Crée un employé via l'API
         */
        async createEmployeeAPI(employeeData) {
            try {
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
            } catch (error) {
                console.error('Erreur API createEmployee:', error);
                throw error;
            }
        }

        /**
         * Met à jour un employé via l'API
         */
        async updateEmployeeAPI(employeeId, employeeData) {
            try {
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
            } catch (error) {
                console.error('Erreur API updateEmployee:', error);
                throw error;
            }
        }

        /**
         * Supprime un employé via l'API
         */
        async deleteEmployeeAPI(employeeId) {
            try {
                if (typeof APIManager !== 'undefined' && APIManager.deleteEmployee) {
                    return await APIManager.deleteEmployee(employeeId);
                } else {
                    const response = await fetch(`/api/employees/${employeeId}`, {
                        method: 'DELETE'
                    });
                    return await response.json();
                }
            } catch (error) {
                console.error('Erreur API deleteEmployee:', error);
                throw error;
            }
        }

        /**
         * Crée un créneau via l'API
         */
        async createShiftAPI(shiftData) {
            try {
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
            } catch (error) {
                console.error('Erreur API createShift:', error);
                throw error;
            }
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

                // Recharger la page en dernier recours
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

        // ==================== VALIDATION DE FORMULAIRES ====================

        /**
         * Configure la validation pour un formulaire
         */
        setupFormValidation(formId) {
            const form = document.getElementById(formId);
            if (!form) return;

            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                // Ajouter seulement l'événement de nettoyage d'erreur
                input.addEventListener('input', () => this.clearFieldError(input));
            });

            this.formValidators.set(formId, { form });
            console.log(`✅ Validation configurée pour ${formId}`);
        }

        /**
         * Valide un formulaire complet
         */
        validateForm(form) {
            if (!form) {
                console.error('❌ Formulaire non fourni pour validation');
                return false;
            }

            console.log('🔍 Validation du formulaire:', form.id);

            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            let firstErrorField = null;

            // Validation des champs requis
            requiredFields.forEach(field => {
                const fieldId = field.id || field.name || 'unknown';
                let value;

                if (field.tagName.toLowerCase() === 'select') {
                    value = field.value;
                    console.log(`🔍 Select ${fieldId}: value="${value}"`);

                    const isEmpty = !value || value === '';

                    if (isEmpty) {
                        console.warn(`⚠️ Select requis vide: ${fieldId}`);
                        this.showFieldError(field, 'Veuillez sélectionner une option');
                        if (!firstErrorField) firstErrorField = field;
                        isValid = false;
                    } else {
                        console.log(`✅ Select valide: ${fieldId} = "${value}"`);
                        this.clearFieldError(field);
                    }
                } else {
                    value = field.value ? field.value.trim() : '';
                    console.log(`🔍 Input ${fieldId}: value="${value}"`);

                    const isEmpty = !value || value === '';

                    if (isEmpty) {
                        console.warn(`⚠️ Champ requis vide: ${fieldId}`);
                        this.showFieldError(field, 'Ce champ est obligatoire');
                        if (!firstErrorField) firstErrorField = field;
                        isValid = false;
                    } else {
                        console.log(`✅ Champ valide: ${fieldId} = "${value}"`);
                        this.clearFieldError(field);
                    }
                }
            });

            // Validations spécifiques additionnelles
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                const value = field.value ? field.value.trim() : '';
                if (value && !this.validationRules.email(value)) {
                    this.showFieldError(field, 'Format d\'email invalide');
                    if (!firstErrorField) firstErrorField = field;
                    isValid = false;
                }
            });

            const numberFields = form.querySelectorAll('input[type="number"]');
            numberFields.forEach(field => {
                const value = parseFloat(field.value);
                if (field.hasAttribute('required') && (isNaN(value) || value <= 0)) {
                    this.showFieldError(field, 'Doit être un nombre positif');
                    if (!firstErrorField) firstErrorField = field;
                    isValid = false;
                }
            });

            // Focus sur le premier champ en erreur
            if (!isValid && firstErrorField) {
                firstErrorField.focus();
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            console.log(`📋 Validation ${isValid ? 'réussie' : 'échouée'}`);
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

        // ==================== UTILITAIRES UI ====================

        /**
         * Affiche/masque l'état de chargement d'un bouton
         */
        setButtonLoading(buttonSelector, loading) {
            let button;

            const activeModal = document.querySelector('.modal[style*="block"]');
            if (activeModal) {
                button = activeModal.querySelector(`.${buttonSelector}`);
            }

            if (!button) {
                button = document.querySelector(`.${buttonSelector}`);
            }

            if (!button) {
                console.warn(`⚠️ Bouton non trouvé: ${buttonSelector}`);
                return;
            }

            if (loading) {
                button.disabled = true;
                if (!button.dataset.originalText) {
                    button.dataset.originalText = button.innerHTML;
                }
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
            } else {
                button.disabled = false;
                if (button.dataset.originalText) {
                    button.innerHTML = button.dataset.originalText;
                }
            }
        }

        /**
         * Affiche une notification de succès
         */
        showSuccessNotification(message) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(`✅ ${message}`, 'success');
            } else if (typeof showNotification === 'function') {
                showNotification(message, 'success');
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
            } else if (typeof showNotification === 'function') {
                showNotification('Erreur: ' + message, 'error');
            } else {
                alert('Erreur: ' + message);
            }
            console.error('❌', message);
        }

        // ==================== UTILITAIRES ====================

        /**
         * Nettoie une chaîne de caractères pour l'affichage
         */
        sanitizeString(str) {
            if (!str) return '';
            return str.toString().trim().replace(/[<>]/g, '');
        }

        /**
         * Formate une heure pour l'affichage
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
            this.closeAllModals();
            this.formValidators.clear();
            this.isInitialized = false;
            console.log('UIManager détruit');
        }
    }

    // ==================== EXPORT ET INITIALISATION ====================

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

    // Export immédiat vers window
    window.UIManager = getUIManager();

    // Fonctions globales pour la compatibilité
    window.openModal = function(title, content, buttons, options) {
        window.UIManager.openModal(title, content, buttons, options);
    };

    window.closeModal = function(modalId) {
        window.UIManager.closeModal(modalId);
    };

    window.showAddShiftModal = function(day, hour) {
        window.UIManager.showAddShiftModal(day, hour);
    };

    window.showAddEmployeeModal = function() {
        window.UIManager.showAddEmployeeModal();
    };

    window.showEditEmployeeModal = function(employeeId) {
        window.UIManager.showEditEmployeeModal(employeeId);
    };

    console.log('✅ UIManager forcé disponible');

} // FERMETURE DU IF

// ==================== CODE QUI S'EXÉCUTE TOUJOURS ====================

// Gestionnaire global pour les modals
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 UIManager - DOM Content Loaded');

    // Vérification de l'état après chargement
    setTimeout(() => {
        console.log('🔍 Vérification UIManager:');
        console.log('- window.UIManager:', !!window.UIManager);
        console.log('- Instance initialisée:', window.UIManager?.isInitialized);

        if (!window.UIManager) {
            console.error('❌ ERREUR CRITIQUE: UIManager non disponible !');
        } else {
            console.log('✅ UIManager prêt pour utilisation');
        }
    }, 500);

    // Configuration du gestionnaire global de modal
    setTimeout(() => {
        const globalModal = document.getElementById('globalModal');
        if (globalModal) {
            console.log('🎯 Configuration du gestionnaire global de modal');

            // Observer l'ouverture du modal
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const modal = mutation.target;
                        if (modal.style.display === 'block') {
                            console.log('📱 Modal ouvert, correction des boutons...');

                            // Corriger les boutons après ouverture
                            setTimeout(() => {
                                if (window.UIManager && window.UIManager.fixModalButtons) {
                                    window.UIManager.fixModalButtons(modal);
                                }
                            }, 200);
                        }
                    }
                });
            });

            observer.observe(globalModal, { attributes: true, attributeFilter: ['style'] });

            // Gestionnaire de clic global pour tous les boutons du modal
            globalModal.addEventListener('click', function(e) {
                const button = e.target;
                if (button.tagName === 'BUTTON') {
                    const buttonText = button.textContent.trim();
                    console.log(`🔘 Clic global détecté sur: "${buttonText}"`);

                    // Laisser les événements fixés par fixModalButtons s'exécuter
                    // Ce gestionnaire sert de fallback
                }
            });

        } else {
            console.warn('⚠️ Modal globalModal non trouvé');
        }
    }, 1000);

    // Intercepter et corriger les boutons existants dans la page
    setTimeout(() => {
        const employeeButtons = document.querySelectorAll('button[onclick*="showAddEmployeeModal"]');
        employeeButtons.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Bouton Nouvel équipier intercepté');
                if (window.UIManager) {
                    window.UIManager.showAddEmployeeModal();
                }
            });
        });

        const shiftButtons = document.querySelectorAll('button[onclick*="showAddShiftModal"]');
        shiftButtons.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Bouton Ajouter créneau intercepté');
                if (window.UIManager) {
                    window.UIManager.showAddShiftModal();
                }
            });
        });

        console.log(`✅ ${employeeButtons.length + shiftButtons.length} boutons existants interceptés`);
    }, 1500);
});

// Ajouter le CSS pour les erreurs de validation
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

    .form-control-readonly {
        background-color: #f8f9fa;
        border-color: #dee2e6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// ==================== FONCTIONS DE DEBUG ====================

window.testUIManager = function() {
    console.log('🧪 Test d\'UIManager...');
    console.log('- UIManager défini:', !!window.UIManager);
    console.log('- showAddEmployeeModal:', typeof window.UIManager?.showAddEmployeeModal);
    console.log('- showEditEmployeeModal:', typeof window.UIManager?.showEditEmployeeModal);
    console.log('- showAddShiftModal:', typeof window.UIManager?.showAddShiftModal);

    // Test d'ouverture de modal
    try {
        window.UIManager.showAddEmployeeModal();
        console.log('✅ Modal employé ouvert avec succès');
        setTimeout(() => {
            window.UIManager.closeModal('globalModal');
            console.log('✅ Modal fermé avec succès');
        }, 2000);
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    }
};

window.fixModalButtonsManually = function() {
    console.log('🔧 Correction manuelle des boutons...');
    if (window.UIManager && window.UIManager.fixAllModalButtons) {
        window.UIManager.fixAllModalButtons();
    }
};

// Log de chargement final
console.log('✅ UIManager complet chargé avec succès');

// Vérification immédiate
if (typeof window !== 'undefined' && window.UIManager) {
    console.log('✅ window.UIManager disponible:', typeof window.UIManager.showAddEmployeeModal);
} else {
    console.error('❌ PROBLÈME: window.UIManager non disponible !');
}

// Export pour modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager: window.UIManager };
}