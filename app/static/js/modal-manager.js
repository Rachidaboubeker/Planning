/**
 * Planning Restaurant - Gestionnaire de Modals
 * Gestion spécialisée des modals et de leurs interactions
 * Fichier: modal-manager.js
 */

class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.modalQueue = [];
        this.isInitialized = false;
        this.eventHandlers = new Map();

        this.init();
    }

    /**
     * Initialise le gestionnaire de modals
     */
    init() {
        try {
            this.setupGlobalEventListeners();
            this.setupModalSystem();
            this.isInitialized = true;
            console.log('✅ ModalManager initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de ModalManager:', error);
        }
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        // Fermeture avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Clic à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Focus trap
        document.addEventListener('keydown', this.handleFocusTrap.bind(this));
    }

    /**
     * Configure le système de modals
     */
    setupModalSystem() {
        if (!document.getElementById('globalModal')) {
            this.createGlobalModal();
        }
        this.setupModalObserver();
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
                    <span class="modal-close" data-action="close">&times;</span>
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
     * Configure l'observateur de modals
     */
    setupModalObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.classList.contains('modal') && target.style.display === 'block') {
                        console.log('🔄 Modal ouvert détecté, configuration des boutons...');
                        setTimeout(() => this.setupModalButtons(target), 150);
                    }
                }
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
        });

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
     * Ouvre un modal avec configuration complète
     */
    openModal(config) {
        const {
            title,
            content,
            buttons = [],
            options = {},
            data = {}
        } = config;

        const modal = document.getElementById('globalModal');
        if (!modal) {
            console.error('❌ Modal global non trouvé');
            return;
        }

        // Configuration du contenu
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        if (modalTitle) modalTitle.innerHTML = title;
        if (modalBody) modalBody.innerHTML = content;

        // Stockage des données associées
        Object.entries(data).forEach(([key, value]) => {
            modal.dataset[key] = value;
        });

        // Configuration des boutons avec événements
        if (modalFooter) {
            modalFooter.innerHTML = '';
            buttons.forEach((buttonConfig, index) => {
                const btn = this.createButton(buttonConfig, modal, data);
                modalFooter.appendChild(btn);
            });
        }

        // Options du modal
        if (options.size) {
            modal.classList.add(`modal-${options.size}`);
        }

        // Affichage
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.activeModals.add('globalModal');

        // Focus et configuration
        setTimeout(() => {
            this.focusFirstElement(modal);
            this.setupModalButtons(modal);
        }, 100);

        console.log(`📱 Modal ouvert: ${title}`);
        return modal;
    }

    /**
     * Crée un bouton avec gestionnaire d'événements
     */
    createButton(config, modal, modalData) {
        const {
            text,
            class: className = 'btn-primary',
            action,
            data = {},
            disabled = false
        } = config;

        const btn = document.createElement('button');
        btn.className = `btn ${className}`;
        btn.innerHTML = text;
        btn.type = 'button';
        btn.disabled = disabled;

        // Stockage des données du bouton
        Object.entries(data).forEach(([key, value]) => {
            btn.dataset[key] = value;
        });

        // Configuration de l'action
        if (action) {
            btn.dataset.action = action;
            btn.onclick = (e) => this.handleButtonClick(e, action, modalData);
        }

        return btn;
    }

    /**
     * Gestionnaire centralisé des clics de boutons
     */
    handleButtonClick(event, action, modalData) {
        event.preventDefault();
        event.stopPropagation();

        console.log(`🔘 Action déclenchée: ${action}`, modalData);

        // Actions prédéfinies
        switch (action) {
            case 'close':
                this.closeModal('globalModal');
                break;

            case 'add-employee':
                this.handleAddEmployee();
                break;

            case 'update-employee':
                this.handleUpdateEmployee(modalData.employeeId);
                break;

            case 'delete-employee':
                this.handleDeleteEmployee(modalData.employeeId);
                break;

            case 'add-shift':
                this.handleAddShift();
                break;

            case 'update-shift':
                this.handleUpdateShift(modalData.shiftId);
                break;

            case 'delete-shift':
                this.handleDeleteShift(modalData.shiftId);
                break;

            default:
                // Action personnalisée
                if (this.eventHandlers.has(action)) {
                    const handler = this.eventHandlers.get(action);
                    handler(event, modalData);
                } else {
                    console.warn(`⚠️ Action non reconnue: ${action}`);
                }
                break;
        }
    }

    /**
     * Enregistre un gestionnaire d'événements personnalisé
     */
    registerEventHandler(action, handler) {
        this.eventHandlers.set(action, handler);
        console.log(`✅ Gestionnaire enregistré pour l'action: ${action}`);
    }

    /**
     * Configure les boutons du modal (système de fallback)
     */
    setupModalButtons(modal) {
        const buttons = modal.querySelectorAll('button:not([data-action])');

        buttons.forEach(button => {
            const text = button.textContent.trim();

            // Attribution automatique d'actions basée sur le texte
            if (text.includes('Créer')) {
                button.dataset.action = 'add-employee';
                button.onclick = (e) => this.handleButtonClick(e, 'add-employee', this.getModalData(modal));
            } else if (text.includes('Modifier') || text.includes('Sauvegarder')) {
                button.dataset.action = 'update-employee';
                button.onclick = (e) => this.handleButtonClick(e, 'update-employee', this.getModalData(modal));
            } else if (text.includes('Supprimer')) {
                button.dataset.action = 'delete-employee';
                button.onclick = (e) => this.handleButtonClick(e, 'delete-employee', this.getModalData(modal));
            } else if (text.includes('Ajouter')) {
                button.dataset.action = 'add-shift';
                button.onclick = (e) => this.handleButtonClick(e, 'add-shift', this.getModalData(modal));
            } else if (text.includes('Annuler')) {
                button.dataset.action = 'close';
                button.onclick = (e) => this.handleButtonClick(e, 'close', {});
            }
        });

        console.log(`✅ ${buttons.length} boutons configurés pour le modal`);
    }

    /**
     * Récupère les données du modal
     */
    getModalData(modal) {
        const data = {};
        Object.entries(modal.dataset).forEach(([key, value]) => {
            data[key] = value;
        });
        return data;
    }

    /**
     * Ferme un modal spécifique
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        this.activeModals.delete(modalId);

        // Nettoyage
        Object.keys(modal.dataset).forEach(key => {
            delete modal.dataset[key];
        });
        modal.classList.remove('modal-small', 'modal-large', 'modal-fullscreen');

        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        console.log(`📱 Modal fermé: ${modalId}`);
    }

    /**
     * Ferme le modal du dessus
     */
    closeTopModal() {
        const activeModal = Array.from(this.activeModals).pop();
        if (activeModal) {
            this.closeModal(activeModal);
        }
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
     * Gestion du focus trap
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
     * Obtient les éléments focusables
     */
    getFocusableElements(container) {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector))
            .filter(el => !el.disabled && !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0);
    }

    /**
     * Focus sur le premier élément
     */
    focusFirstElement(container) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Affiche l'état de chargement sur un bouton
     */
    setButtonLoading(selector, loading, modal = null) {
        const container = modal || document.querySelector('.modal[style*="block"]') || document;
        const button = container.querySelector(selector);

        if (!button) {
            console.warn(`⚠️ Bouton non trouvé: ${selector}`);
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
                delete button.dataset.originalText;
            }
        }
    }

    // ==================== GESTIONNAIRES D'ACTIONS ====================

    /**
     * Gère l'ajout d'employé
     */
    async handleAddEmployee() {
        console.log('🔄 Action: Ajout d\'employé');

        if (window.UIManager && window.UIManager.handleAddEmployee) {
            await window.UIManager.handleAddEmployee();
        } else {
            console.error('❌ UIManager.handleAddEmployee non disponible');
        }
    }

    /**
     * Gère la mise à jour d'employé
     */
    async handleUpdateEmployee(employeeId) {
        console.log('🔄 Action: Mise à jour employé', employeeId);

        if (window.UIManager && window.UIManager.handleUpdateEmployee) {
            await window.UIManager.handleUpdateEmployee(employeeId);
        } else {
            console.error('❌ UIManager.handleUpdateEmployee non disponible');
        }
    }

    /**
     * Gère la suppression d'employé
     */
    async handleDeleteEmployee(employeeId) {
        console.log('🔄 Action: Suppression employé', employeeId);

        if (window.UIManager && window.UIManager.handleDeleteEmployee) {
            await window.UIManager.handleDeleteEmployee(employeeId);
        } else {
            console.error('❌ UIManager.handleDeleteEmployee non disponible');
        }
    }

    /**
     * Gère l'ajout de créneau
     */
    async handleAddShift() {
        console.log('🔄 Action: Ajout créneau');

        if (window.UIManager && window.UIManager.handleAddShift) {
            await window.UIManager.handleAddShift();
        } else {
            console.error('❌ UIManager.handleAddShift non disponible');
        }
    }

    /**
     * Gère la mise à jour de créneau
     */
    async handleUpdateShift(shiftId) {
        console.log('🔄 Action: Mise à jour créneau', shiftId);

        if (window.UIManager && window.UIManager.handleUpdateShift) {
            await window.UIManager.handleUpdateShift(shiftId);
        } else {
            console.error('❌ UIManager.handleUpdateShift non disponible');
        }
    }

    /**
     * Gère la suppression de créneau
     */
    async handleDeleteShift(shiftId) {
        console.log('🔄 Action: Suppression créneau', shiftId);

        if (window.UIManager && window.UIManager.handleDeleteShift) {
            await window.UIManager.handleDeleteShift(shiftId);
        } else {
            console.error('❌ UIManager.handleDeleteShift non disponible');
        }
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.closeAllModals();
        this.eventHandlers.clear();
        this.isInitialized = false;
        console.log('ModalManager détruit');
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager };
}

console.log('✅ ModalManager chargé avec succès');