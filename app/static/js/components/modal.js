/**
 * MODAL MANAGER UNIFIÉ - Planning Restaurant
 * Remplace modal-manager.js et tous les systèmes de modals dispersés
 * Système de modals moderne, accessible et performant
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModals = [];
        this.modalContainer = null;
        this.isInitialized = false;
        this.zIndexBase = 1050;

        this.bindGlobalEvents();
        console.log('🔲 Modal Manager unifié initialisé');
    }

    /**
     * Initialise le modal manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('🔲 Modal Manager déjà initialisé');
            return;
        }

        try {
            // Créer le conteneur de modals s'il n'existe pas
            this.ensureModalContainer();

            // Configurer les événements globaux
            this.setupGlobalEvents();

            this.isInitialized = true;
            console.log('✅ Modal Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation Modal Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Gestion de la touche Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                e.preventDefault();
                this.closeTopModal();
            }
        });

        // Empêcher le scroll de la page quand un modal est ouvert
        this.setupScrollLock();
    }

    /**
     * Configure les événements globaux
     */
    setupGlobalEvents() {
        // Clic sur le backdrop pour fermer
        if (this.modalContainer) {
            this.modalContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.closeTopModal();
                }
            });
        }
    }

    /**
     * S'assure que le conteneur de modals existe
     */
    ensureModalContainer() {
        this.modalContainer = document.getElementById('modalContainer');

        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modalContainer';
            this.modalContainer.className = 'modal-container';
            this.modalContainer.setAttribute('role', 'dialog');
            this.modalContainer.setAttribute('aria-hidden', 'true');
            document.body.appendChild(this.modalContainer);
        }
    }

    // ==================== AFFICHAGE DES MODALS ====================

    /**
     * Affiche un modal
     */
    show(id, title, content, options = {}) {
        // Fermer le modal s'il existe déjà
        if (this.modals.has(id)) {
            this.close(id);
        }

        const modal = this.createModal(id, title, content, options);
        this.modals.set(id, modal);

        // Ajouter au conteneur
        this.modalContainer.appendChild(modal.element);

        // Ajouter à la pile des modals actifs
        this.activeModals.push(id);

        // Animer l'apparition
        this.animateIn(modal.element);

        // Configurer l'accessibilité
        this.setupAccessibility(modal.element);

        // Gérer le focus
        this.manageFocus(modal.element);

        // Émettre l'événement
        window.EventBus?.emit('modal:opened', { id, modal });

        console.log(`🔲 Modal ouvert: ${id}`);

        return modal;
    }

    /**
     * Crée un modal
     */
    createModal(id, title, content, options = {}) {
        const {
            size = 'medium',
            closable = true,
            backdrop = true,
            keyboard = true,
            onSave = null,
            onDelete = null,
            onClose = null,
            className = '',
            buttons = null
        } = options;

        // Créer la structure du modal
        const backdrop = this.createBackdrop();
        const modalElement = this.createModalElement(id, title, content, {
            size, closable, onSave, onDelete, className, buttons
        });

        backdrop.appendChild(modalElement);

        const modal = {
            id,
            element: backdrop,
            modalElement,
            options,
            onSave,
            onDelete,
            onClose
        };

        // Configurer les événements
        this.setupModalEvents(modal);

        return modal;
    }

    /**
     * Crée le backdrop
     */
    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.zIndex = this.zIndexBase + this.activeModals.length;
        return backdrop;
    }

    /**
     * Crée l'élément modal
     */
    createModalElement(id, title, content, options) {
        const { size, closable, className, buttons } = options;

        const modal = document.createElement('div');
        modal.className = `modal modal-${size} ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', `modal-title-${id}`);
        modal.setAttribute('aria-modal', 'true');

        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title-${id}">${this.sanitize(title)}</h3>
                ${closable ? `
                    <button class="modal-close" aria-label="Fermer le modal">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                ` : ''}
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${this.generateModalButtons(buttons, options)}
            </div>
        `;

        return modal;
    }

    /**
     * Génère les boutons du modal
     */
    generateModalButtons(customButtons, options) {
        if (customButtons) {
            return customButtons.map(btn =>
                `<button class="btn ${btn.className || 'btn-secondary'}" data-action="${btn.action}">
                    ${btn.icon ? `<i class="${btn.icon}"></i>` : ''}
                    ${this.sanitize(btn.text)}
                </button>`
            ).join('');
        }

        // Boutons par défaut
        let buttons = '';

        if (options.onDelete) {
            buttons += `<button class="btn btn-danger" data-action="delete">
                <i class="fas fa-trash"></i>
                Supprimer
            </button>`;
        }

        buttons += `<button class="btn btn-secondary" data-action="cancel">
            Annuler
        </button>`;

        if (options.onSave) {
            buttons += `<button class="btn btn-primary" data-action="save">
                <i class="fas fa-save"></i>
                Enregistrer
            </button>`;
        }

        return buttons;
    }

    /**
     * Configure les événements d'un modal
     */
    setupModalEvents(modal) {
        const { element, id, onSave, onDelete, onClose } = modal;

        // Bouton de fermeture
        const closeBtn = element.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(id));
        }

        // Boutons d'action
        const buttons = element.querySelectorAll('.modal-footer button[data-action]');
        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;

                try {
                    switch (action) {
                        case 'save':
                            if (onSave) {
                                const formData = this.extractFormData(element);
                                await onSave(formData);
                                this.close(id);
                            }
                            break;

                        case 'delete':
                            if (onDelete) {
                                const confirmed = await this.confirmDeletion();
                                if (confirmed) {
                                    await onDelete();
                                    this.close(id);
                                }
                            }
                            break;

                        case 'cancel':
                            this.close(id);
                            break;

                        default:
                            // Action personnalisée
                            if (onClose) {
                                await onClose(action);
                            }
                            this.close(id);
                    }
                } catch (error) {
                    console.error(`Erreur action modal ${action}:`, error);
                    this.showError(`Erreur: ${error.message}`);
                }
            });
        });

        // Validation en temps réel des formulaires
        const form = element.querySelector('form');
        if (form) {
            this.setupFormValidation(form);
        }
    }

    // ==================== FERMETURE DES MODALS ====================

    /**
     * Ferme un modal spécifique
     */
    close(id) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        // Animer la sortie
        this.animateOut(modal.element, () => {
            // Supprimer du DOM
            modal.element.remove();

            // Supprimer de la Map
            this.modals.delete(id);

            // Supprimer de la pile
            const index = this.activeModals.indexOf(id);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }

            // Restaurer le focus si c'était le dernier modal
            if (this.activeModals.length === 0) {
                this.restoreFocus();
            }

            // Émettre l'événement
            window.EventBus?.emit('modal:closed', { id });

            console.log(`🔲 Modal fermé: ${id}`);
        });

        return true;
    }

    /**
     * Ferme le modal le plus récent
     */
    closeTopModal() {
        if (this.activeModals.length > 0) {
            const topModalId = this.activeModals[this.activeModals.length - 1];
            this.close(topModalId);
        }
    }

    /**
     * Ferme tous les modals
     */
    closeAll() {
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(id => this.close(id));
    }

    // ==================== ANIMATIONS ====================

    /**
     * Anime l'apparition d'un modal
     */
    animateIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.9)';

        // Forcer un reflow
        element.offsetHeight;

        element.style.transition = 'all 0.2s ease-out';
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
    }

    /**
     * Anime la sortie d'un modal
     */
    animateOut(element, callback) {
        element.style.transition = 'all 0.15s ease-in';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.9)';

        setTimeout(callback, 150);
    }

    // ==================== ACCESSIBILITÉ ====================

    /**
     * Configure l'accessibilité d'un modal
     */
    setupAccessibility(element) {
        // Piéger le focus dans le modal
        this.trapFocus(element);

        // Gérer les annonces screen reader
        element.setAttribute('aria-live', 'polite');
    }

    /**
     * Gère le focus d'un modal
     */
    manageFocus(element) {
        // Sauvegarder l'élément actuellement focusé
        this.previousFocusedElement = document.activeElement;

        // Donner le focus au premier élément focusable
        setTimeout(() => {
            const firstFocusable = this.getFirstFocusableElement(element);
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
    }

    /**
     * Piège le focus dans un modal
     */
    trapFocus(element) {
        const focusableElements = this.getFocusableElements(element);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    /**
     * Obtient les éléments focusables
     */
    getFocusableElements(container) {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector))
            .filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
    }

    /**
     * Obtient le premier élément focusable
     */
    getFirstFocusableElement(container) {
        const focusable = this.getFocusableElements(container);
        return focusable[0] || null;
    }

    /**
     * Restaure le focus précédent
     */
    restoreFocus() {
        if (this.previousFocusedElement) {
            this.previousFocusedElement.focus();
            this.previousFocusedElement = null;
        }
    }

    // ==================== GESTION DES FORMULAIRES ====================

    /**
     * Extrait les données d'un formulaire
     */
    extractFormData(element) {
        const form = element.querySelector('form');
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Gérer les checkboxes
            if (form.querySelector(`[name="${key}"][type="checkbox"]`)) {
                data[key] = form.querySelector(`[name="${key}"]`).checked;
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * Configure la validation des formulaires
     */
    setupFormValidation(form) {
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateForm(form);
        });
    }

    /**
     * Valide un champ
     */
    validateField(field) {
        const errors = [];

        // Validation required
        if (field.required && !field.value.trim()) {
            errors.push('Ce champ est obligatoire');
        }

        // Validation email
        if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
            errors.push('Email invalide');
        }

        // Validation number
        if (field.type === 'number') {
            const value = parseFloat(field.value);
            if (field.min && value < parseFloat(field.min)) {
                errors.push(`La valeur doit être supérieure à ${field.min}`);
            }
            if (field.max && value > parseFloat(field.max)) {
                errors.push(`La valeur doit être inférieure à ${field.max}`);
            }
        }

        this.showFieldErrors(field, errors);
        return errors.length === 0;
    }

    /**
     * Valide un formulaire complet
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Affiche les erreurs d'un champ
     */
    showFieldErrors(field, errors) {
        this.clearFieldError(field);

        if (errors.length > 0) {
            field.classList.add('field-error');

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error-message';
            errorDiv.textContent = errors[0];

            field.parentNode.appendChild(errorDiv);
        }
    }

    /**
     * Efface les erreurs d'un champ
     */
    clearFieldError(field) {
        field.classList.remove('field-error');

        const errorMsg = field.parentNode.querySelector('.field-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    // ==================== MODALS SPÉCIALISÉS ====================

    /**
     * Affiche un modal de confirmation
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="confirmation-message">
                    <i class="fas fa-question-circle confirmation-icon"></i>
                    <p>${this.sanitize(message)}</p>
                </div>
            `;

            const buttons = [
                {
                    text: options.cancelText || 'Annuler',
                    className: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: options.confirmText || 'Confirmer',
                    className: 'btn-primary',
                    action: 'confirm'
                }
            ];

            this.show('confirmation', title, content, {
                size: 'small',
                buttons,
                onClose: (action) => {
                    resolve(action === 'confirm');
                }
            });
        });
    }

    /**
     * Affiche un modal d'alerte
     */
    alert(title, message, type = 'info') {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };

        const content = `
            <div class="alert-message alert-${type}">
                <i class="${icons[type]} alert-icon"></i>
                <p>${this.sanitize(message)}</p>
            </div>
        `;

        const buttons = [
            {
                text: 'OK',
                className: 'btn-primary',
                action: 'ok'
            }
        ];

        this.show('alert', title, content, {
            size: 'small',
            buttons
        });
    }

    /**
     * Affiche un modal de confirmation de suppression
     */
    confirmDeletion(itemName = 'cet élément') {
        return this.confirm(
            'Confirmer la suppression',
            `Êtes-vous sûr de vouloir supprimer ${itemName} ?\n\nCette action est irréversible.`,
            {
                confirmText: 'Supprimer',
                cancelText: 'Annuler'
            }
        );
    }

    /**
     * Affiche un modal de chargement
     */
    showLoading(message = 'Chargement...') {
        const content = `
            <div class="loading-content">
                <div class="spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>${this.sanitize(message)}</p>
            </div>
        `;

        this.show('loading', 'Patientez', content, {
            size: 'small',
            closable: false,
            backdrop: false,
            keyboard: false
        });
    }

    /**
     * Cache le modal de chargement
     */
    hideLoading() {
        this.close('loading');
    }

    // ==================== GESTION DU SCROLL ====================

    /**
     * Configure le verrouillage du scroll
     */
    setupScrollLock() {
        let scrollTop = 0;

        // Verrouiller le scroll quand un modal s'ouvre
        window.EventBus?.on('modal:opened', () => {
            if (this.activeModals.length === 1) {
                scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollTop}px`;
                document.body.style.width = '100%';
                document.body.classList.add('modal-open');
            }
        });

        // Déverrouiller le scroll quand tous les modals sont fermés
        window.EventBus?.on('modal:closed', () => {
            if (this.activeModals.length === 0) {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.classList.remove('modal-open');
                window.scrollTo(0, scrollTop);
            }
        });
    }

    // ==================== UTILITAIRES ====================

    /**
     * Valide un email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
     * Affiche une erreur dans le modal actuel
     */
    showError(message) {
        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(message);
        } else {
            this.alert('Erreur', message, 'error');
        }
    }

    // ==================== GESTION D'ÉTAT ====================

    /**
     * Vérifie si un modal est ouvert
     */
    isOpen(id = null) {
        if (id) {
            return this.modals.has(id);
        }
        return this.activeModals.length > 0;
    }

    /**
     * Obtient le modal actif
     */
    getActiveModal() {
        if (this.activeModals.length === 0) return null;

        const topModalId = this.activeModals[this.activeModals.length - 1];
        return this.modals.get(topModalId);
    }

    /**
     * Obtient tous les modals ouverts
     */
    getOpenModals() {
        return this.activeModals.map(id => this.modals.get(id));
    }

    /**
     * Redimensionne un modal
     */
    resize(id, size) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        const modalElement = modal.modalElement;
        modalElement.className = modalElement.className.replace(/modal-\w+/, `modal-${size}`);

        return true;
    }

    /**
     * Met à jour le contenu d'un modal
     */
    updateContent(id, content) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        const body = modal.modalElement.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;

            // Reconfigurer la validation si nécessaire
            const form = body.querySelector('form');
            if (form) {
                this.setupFormValidation(form);
            }
        }

        return true;
    }

    /**
     * Met à jour le titre d'un modal
     */
    updateTitle(id, title) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        const titleElement = modal.modalElement.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }

        return true;
    }

    // ==================== DEBUG ET MONITORING ====================

    /**
     * Obtient l'état actuel des modals
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            totalModals: this.modals.size,
            activeModals: this.activeModals.length,
            openModals: this.activeModals,
            hasContainer: !!this.modalContainer
        };
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('🔲 ModalManager Debug');
        console.table(this.getState());
        console.log('Modals ouverts:', this.getOpenModals());
        console.log('Pile des modals:', this.activeModals);
        console.groupEnd();
    }

    /**
     * Compte les modals par type
     */
    getModalStats() {
        const stats = {
            bySize: {},
            byType: {},
            total: this.modals.size
        };

        this.modals.forEach(modal => {
            const size = modal.options.size || 'medium';
            stats.bySize[size] = (stats.bySize[size] || 0) + 1;

            const type = modal.id.includes('-') ? modal.id.split('-')[0] : 'custom';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return stats;
    }

    // ==================== NETTOYAGE ====================

    /**
     * Nettoie les modals orphelins
     */
    cleanup() {
        // Supprimer les modals du DOM qui ne sont plus dans la Map
        const domModals = this.modalContainer?.querySelectorAll('.modal-backdrop') || [];

        domModals.forEach(backdrop => {
            const modalElement = backdrop.querySelector('.modal');
            const titleElement = modalElement?.querySelector('.modal-title');

            if (titleElement) {
                const id = titleElement.id.replace('modal-title-', '');
                if (!this.modals.has(id)) {
                    backdrop.remove();
                    console.log(`🧹 Modal orphelin supprimé: ${id}`);
                }
            }
        });

        // Nettoyer la pile des modals actifs
        this.activeModals = this.activeModals.filter(id => this.modals.has(id));
    }

    /**
     * Détruit le modal manager
     */
    destroy() {
        this.closeAll();

        if (this.modalContainer) {
            this.modalContainer.remove();
        }

        this.modals.clear();
        this.activeModals = [];
        this.isInitialized = false;

        console.log('🗑️ Modal Manager détruit');
    }

    // ==================== HOOKS ET ÉVÉNEMENTS ====================

    /**
     * Hook avant l'ouverture d'un modal
     */
    onBeforeOpen(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('modal:before_open', callback);
        }
    }

    /**
     * Hook après l'ouverture d'un modal
     */
    onAfterOpen(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('modal:opened', callback);
        }
    }

    /**
     * Hook avant la fermeture d'un modal
     */
    onBeforeClose(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('modal:before_close', callback);
        }
    }

    /**
     * Hook après la fermeture d'un modal
     */
    onAfterClose(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('modal:closed', callback);
        }
    }
}

// Instance globale unique
if (!window.ModalManager) {
    window.ModalManager = new ModalManager();

    // Exposer pour debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugModals = () => window.ModalManager.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}