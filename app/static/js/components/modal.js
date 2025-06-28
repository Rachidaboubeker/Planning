/**
 * MODAL MANAGER UNIFIÉ - VERSION FINALE CORRIGÉE
 * Correction de l'erreur 'backdrop' déclarée deux fois
 * Compatible avec la nouvelle architecture modulaire
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModals = [];
        this.modalContainer = null;
        this.isInitialized = false;
        this.zIndexBase = 1050;
        this.backdropElement = null; // ✅ Une seule déclaration

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
     * S'assure que le conteneur modal existe
     */
    ensureModalContainer() {
        this.modalContainer = document.getElementById('modalContainer');

        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modalContainer';
            this.modalContainer.className = 'modal-container';
            document.body.appendChild(this.modalContainer);
            console.log('📦 Conteneur modal créé');
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
     * Configure le verrouillage du scroll
     */
    setupScrollLock() {
        // Observer les changements de modals actifs
        const observer = new MutationObserver(() => {
            if (this.activeModals.length > 0) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        observer.observe(this.modalContainer || document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Ouvre un modal
     */
    openModal(modalId, options = {}) {
        try {
            console.log(`🔄 Ouverture modal: ${modalId}`);

            // Créer le modal
            const modalElement = this.createModalElement(modalId, options);

            // Ajouter au conteneur
            this.modalContainer.appendChild(modalElement);

            // Créer le backdrop
            this.createBackdrop();

            // Ajouter à la pile
            this.activeModals.push(modalId);
            this.modals.set(modalId, modalElement);

            // Animer l'ouverture
            requestAnimationFrame(() => {
                modalElement.classList.add('show');
                if (this.backdropElement) {
                    this.backdropElement.classList.add('show');
                }
            });

            // Événement personnalisé
            if (window.EventBus) {
                window.EventBus.emit('modal:opened', { modalId, options });
            }

            console.log(`✅ Modal '${modalId}' ouvert`);
            return modalElement;

        } catch (error) {
            console.error(`❌ Erreur ouverture modal '${modalId}':`, error);
            return null;
        }
    }

    /**
     * Crée un élément modal
     */
    createModalElement(modalId, options) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.style.zIndex = this.zIndexBase + this.activeModals.length;

        modal.innerHTML = `
            <div class="modal-dialog ${options.size || 'modal-lg'}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${options.title || 'Modal'}</h5>
                        <button type="button" class="btn-close" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${options.content || ''}
                    </div>
                    <div class="modal-footer">
                        ${this.createModalButtons(options.buttons || [])}
                    </div>
                </div>
            </div>
        `;

        // Configurer les événements
        this.setupModalEvents(modal);

        return modal;
    }

    /**
     * Crée les boutons du modal
     */
    createModalButtons(buttons) {
        return buttons.map(button => `
            <button type="button"
                    class="btn ${button.class || 'btn-secondary'}"
                    data-action="${button.action || 'close-modal'}"
                    ${button.onclick ? `onclick="${button.onclick}"` : ''}>
                ${button.icon ? `<i class="${button.icon}"></i> ` : ''}
                ${button.text}
            </button>
        `).join('');
    }

    /**
     * Crée le backdrop (une seule fois)
     */
    createBackdrop() {
        if (!this.backdropElement) {
            this.backdropElement = document.createElement('div');
            this.backdropElement.className = 'modal-backdrop fade';
            this.backdropElement.style.zIndex = this.zIndexBase - 1;
            this.modalContainer.appendChild(this.backdropElement);
        }
    }

    /**
     * Configure les événements du modal
     */
    setupModalEvents(modal) {
        // Bouton fermer
        const closeBtn = modal.querySelector('[data-action="close-modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal(modal.id));
        }

        // Délégation d'événements pour les actions
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action && action !== 'close-modal') {
                this.handleModalAction(action, e, modal);
            }
        });

        // Prévenir la fermeture en cliquant sur le contenu
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Gère les actions du modal
     */
    handleModalAction(action, event, modal) {
        console.log(`🎯 Action modal: ${action}`);

        switch (action) {
            case 'save-employee':
                this.handleSaveEmployee(modal);
                break;
            case 'delete-employee':
                this.handleDeleteEmployee(modal);
                break;
            case 'save-shift':
                this.handleSaveShift(modal);
                break;
            case 'delete-shift':
                this.handleDeleteShift(modal);
                break;
            default:
                // Événement personnalisé
                if (window.EventBus) {
                    window.EventBus.emit('modal:action', { action, event, modal });
                }
        }
    }

    /**
     * Ferme le modal du dessus
     */
    closeTopModal() {
        if (this.activeModals.length > 0) {
            const topModalId = this.activeModals[this.activeModals.length - 1];
            this.closeModal(topModalId);
        }
    }

    /**
     * Ferme un modal spécifique
     */
    closeModal(modalId) {
        try {
            const modal = this.modals.get(modalId);
            if (!modal) {
                console.warn(`⚠️ Modal '${modalId}' non trouvé`);
                return;
            }

            // Animer la fermeture
            modal.classList.remove('show');

            // Supprimer après animation
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }

                // Nettoyer les références
                this.modals.delete(modalId);
                const index = this.activeModals.indexOf(modalId);
                if (index > -1) {
                    this.activeModals.splice(index, 1);
                }

                // Supprimer le backdrop si plus de modals
                if (this.activeModals.length === 0 && this.backdropElement) {
                    this.backdropElement.classList.remove('show');
                    setTimeout(() => {
                        if (this.backdropElement && this.backdropElement.parentNode) {
                            this.backdropElement.parentNode.removeChild(this.backdropElement);
                            this.backdropElement = null;
                        }
                    }, 150);
                }

                // Événement personnalisé
                if (window.EventBus) {
                    window.EventBus.emit('modal:closed', { modalId });
                }

                console.log(`✅ Modal '${modalId}' fermé`);
            }, 150);

        } catch (error) {
            console.error(`❌ Erreur fermeture modal '${modalId}':`, error);
        }
    }

    /**
     * Ferme tous les modals
     */
    closeAll() {
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(modalId => this.closeModal(modalId));
    }

    /**
     * Affiche le modal d'ajout d'employé
     */
    showAddEmployeeModal() {
        const content = `
            <form id="addEmployeeForm" class="employee-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="employeePrenom">Prénom *</label>
                        <input type="text" id="employeePrenom" name="prenom" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="employeeNom">Nom *</label>
                        <input type="text" id="employeeNom" name="nom" required class="form-control">
                    </div>
                </div>

                <div class="form-group">
                    <label for="employeePoste">Poste *</label>
                    <select id="employeePoste" name="poste" required class="form-control">
                        <option value="">Sélectionner un poste</option>
                        <option value="serveur">Serveur</option>
                        <option value="cuisinier">Cuisinier</option>
                        <option value="barman">Barman</option>
                        <option value="manager">Manager</option>
                        <option value="commis">Commis</option>
                        <option value="aide">Aide de cuisine</option>
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeTauxHoraire">Taux horaire (€) *</label>
                        <input type="number" id="employeeTauxHoraire" name="taux_horaire"
                               min="10" max="50" step="0.5" required class="form-control">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeEmail">Email</label>
                        <input type="email" id="employeeEmail" name="email" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="employeeTelephone">Téléphone</label>
                        <input type="tel" id="employeeTelephone" name="telephone" class="form-control">
                    </div>
                </div>
            </form>
        `;

        const buttons = [
            { text: 'Annuler', class: 'btn-secondary', action: 'close-modal' },
            { text: 'Ajouter', class: 'btn-primary', action: 'save-employee', icon: 'fas fa-plus' }
        ];

        return this.openModal('addEmployeeModal', {
            title: '👤 Ajouter un équipier',
            content,
            buttons,
            size: 'modal-lg'
        });
    }

    /**
     * Affiche le modal d'édition d'employé
     */
    async showEditEmployeeModal(employeeId) {
        try {
            // Récupérer les données de l'employé
            const response = await fetch(`/api/employees/${employeeId}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            const employee = result.employee;

            const content = `
                <form id="editEmployeeForm" class="employee-form">
                    <input type="hidden" name="employee_id" value="${employee.id}">

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeePrenom">Prénom *</label>
                            <input type="text" id="editEmployeePrenom" name="prenom"
                                   value="${employee.prenom}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeNom">Nom *</label>
                            <input type="text" id="editEmployeeNom" name="nom"
                                   value="${employee.nom}" required class="form-control">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="editEmployeePoste">Poste *</label>
                        <select id="editEmployeePoste" name="poste" required class="form-control">
                            <option value="serveur" ${employee.poste === 'serveur' ? 'selected' : ''}>Serveur</option>
                            <option value="cuisinier" ${employee.poste === 'cuisinier' ? 'selected' : ''}>Cuisinier</option>
                            <option value="barman" ${employee.poste === 'barman' ? 'selected' : ''}>Barman</option>
                            <option value="manager" ${employee.poste === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="commis" ${employee.poste === 'commis' ? 'selected' : ''}>Commis</option>
                            <option value="aide" ${employee.poste === 'aide' ? 'selected' : ''}>Aide de cuisine</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeeTauxHoraire">Taux horaire (€) *</label>
                            <input type="number" id="editEmployeeTauxHoraire" name="taux_horaire"
                                   value="${employee.taux_horaire}" min="10" max="50" step="0.5" required class="form-control">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEmployeeEmail">Email</label>
                            <input type="email" id="editEmployeeEmail" name="email"
                                   value="${employee.email || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeTelephone">Téléphone</label>
                            <input type="tel" id="editEmployeeTelephone" name="telephone"
                                   value="${employee.telephone || ''}" class="form-control">
                        </div>
                    </div>
                </form>
            `;

            const buttons = [
                { text: 'Supprimer', class: 'btn-danger', action: 'delete-employee', icon: 'fas fa-trash' },
                { text: 'Annuler', class: 'btn-secondary', action: 'close-modal' },
                { text: 'Sauvegarder', class: 'btn-primary', action: 'save-employee', icon: 'fas fa-save' }
            ];

            return this.openModal('editEmployeeModal', {
                title: `✏️ Modifier ${employee.prenom} ${employee.nom}`,
                content,
                buttons,
                size: 'modal-lg'
            });

        } catch (error) {
            console.error('❌ Erreur chargement employé:', error);
            if (window.NotificationManager) {
                window.NotificationManager.show('Erreur lors du chargement de l\'employé', 'error');
            }
        }
    }

    // ==================== GESTIONNAIRES D'ACTIONS ====================

    /**
     * Gère la sauvegarde d'un employé
     */
    async handleSaveEmployee(modal) {
        const form = modal.querySelector('form');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const isEdit = !!data.employee_id;

        try {
            const url = isEdit ? `/api/employees/${data.employee_id}` : '/api/employees';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal(modal.id);

                if (window.NotificationManager) {
                    window.NotificationManager.show(
                        isEdit ? 'Employé modifié avec succès' : 'Employé ajouté avec succès',
                        'success'
                    );
                }

                // Recharger les données
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Erreur sauvegarde employé:', error);
            if (window.NotificationManager) {
                window.NotificationManager.show('Erreur lors de la sauvegarde', 'error');
            }
        }
    }

    /**
     * Gère la suppression d'un employé
     */
    async handleDeleteEmployee(modal) {
        const form = modal.querySelector('form');
        const employeeId = form.querySelector('[name="employee_id"]').value;

        if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?\n\nCette action est irréversible.')) {
            return;
        }

        try {
            const response = await fetch(`/api/employees/${employeeId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal(modal.id);

                if (window.NotificationManager) {
                    window.NotificationManager.show('Employé supprimé avec succès', 'success');
                }

                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Erreur suppression employé:', error);
            if (window.NotificationManager) {
                window.NotificationManager.show('Erreur lors de la suppression', 'error');
            }
        }
    }

    /**
     * Diagnostic du modal manager
     */
    diagnose() {
        return {
            initialized: this.isInitialized,
            activeModals: this.activeModals.length,
            totalModals: this.modals.size,
            hasContainer: !!this.modalContainer,
            hasBackdrop: !!this.backdropElement
        };
    }
}

// ==================== INITIALISATION ====================

// Instance globale
if (!window.ModalManager) {
    window.ModalManager = new ModalManager();
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    if (window.ModalManager && !window.ModalManager.isInitialized) {
        window.ModalManager.initialize();
    }
});

// Export pour compatibilité
window.modalManager = window.ModalManager;

console.log('✅ Modal Manager unifié corrigé chargé');