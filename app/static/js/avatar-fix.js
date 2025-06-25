/* ===============================================
   CORRECTIONS AVATARS ET INTERFACE
   Planning Restaurant - Avatar Fix
   =============================================== */

// Configuration des couleurs par type d'employé
const EMPLOYEE_TYPE_COLORS = {
    'cuisinier': {
        primary: '#74b9ff',
        secondary: '#0984e3',
        name: 'Cuisinier'
    },
    'serveur': {
        primary: '#00b894',
        secondary: '#00a085',
        name: 'Serveur/se'
    },
    'barman': {
        primary: '#fdcb6e',
        secondary: '#e17055',
        name: 'Barman'
    },
    'manager': {
        primary: '#a29bfe',
        secondary: '#6c5ce7',
        name: 'Manager'
    },
    'commis': {
        primary: '#fd79a8',
        secondary: '#e84393',
        name: 'Commis'
    }
};

/**
 * Classe pour gérer les avatars et la mise en forme
 */
class AvatarInterfaceManager {
    constructor() {
        this.avatarCache = new Map();
        this.defaultAvatars = new Map();
        this.init();
    }

    init() {
        console.log('🎨 Initialisation du gestionnaire d\'avatars et interface');
    init() {
        console.log('🎨 Initialisation du gestionnaire d\'avatars et interface');
        this.generateDefaultAvatars();
        this.enhanceEmployeeColumns();
        this.setupAvatarEvents();
        this.fixExistingAvatars();
    }

    /**
     * Génère des avatars par défaut pour tous les employés
     */
    generateDefaultAvatars() {
        if (!window.AppState?.employees) return;

        Array.from(window.AppState.employees.values()).forEach(employee => {
            const avatarUrl = this.createEmployeeAvatar(employee);
            this.defaultAvatars.set(employee.id, avatarUrl);
        });

        console.log(`✅ ${this.defaultAvatars.size} avatars par défaut générés`);
    }

    /**
     * Crée un avatar pour un employé
     */
    createEmployeeAvatar(employee) {
        const initials = this.getInitials(employee);
        const typeInfo = EMPLOYEE_TYPE_COLORS[employee.poste] || EMPLOYEE_TYPE_COLORS['serveur'];
        const bgColor = typeInfo.primary.replace('#', '');

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=128&background=${bgColor}&color=fff&font-size=0.4&bold=true&rounded=true`;
    }

    /**
     * Obtient les initiales d'un employé
     */
    getInitials(employee) {
        if (!employee.prenom || !employee.nom) return 'XX';
        return (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
    }

    /**
     * Améliore l'affichage des colonnes d'employés
     */
    enhanceEmployeeColumns() {
        const columns = document.querySelectorAll('.employee-column');

        columns.forEach((column, index) => {
            // Animation d'apparition décalée
            column.style.animationDelay = `${index * 0.1}s`;

            // Améliorer l'avatar si présent
            const avatar = column.querySelector('.employee-avatar');
            if (avatar) {
                this.enhanceAvatar(avatar, column.dataset.employeeId);
            }

            // Ajouter des événements
            this.addColumnEvents(column);
        });
    }

    /**
     * Améliore un avatar spécifique
     */
    enhanceAvatar(avatarElement, employeeId) {
        if (!avatarElement || !employeeId) return;

        const employee = window.AppState?.employees?.get(parseInt(employeeId));
        if (!employee) return;

        // Définir l'URL de l'avatar
        const avatarUrl = this.getEmployeeAvatar(employee);
        avatarElement.src = avatarUrl;

        // Gestion d'erreur de chargement
        avatarElement.onerror = () => {
            avatarElement.src = this.createEmployeeAvatar(employee);
        };

        // Ajouter un indicateur de chargement
        avatarElement.classList.add('loading');
        avatarElement.onload = () => {
            avatarElement.classList.remove('loading');
        };

        // Effet hover
        avatarElement.addEventListener('mouseenter', () => {
            avatarElement.style.transform = 'scale(1.1)';
        });

        avatarElement.addEventListener('mouseleave', () => {
            avatarElement.style.transform = 'scale(1)';
        });
    }

    /**
     * Obtient l'URL de l'avatar d'un employé
     */
    getEmployeeAvatar(employee) {
        // Vérifier si on a un avatar personnalisé
        if (this.avatarCache.has(employee.id)) {
            return this.avatarCache.get(employee.id);
        }

        // Sinon utiliser l'avatar par défaut
        return this.defaultAvatars.get(employee.id) || this.createEmployeeAvatar(employee);
    }

    /**
     * Ajoute des événements aux colonnes
     */
    addColumnEvents(column) {
        const employeeId = column.dataset.employeeId;

        // Clic pour modifier
        if (employeeId) {
            column.addEventListener('click', (e) => {
                if (e.target.classList.contains('employee-avatar')) return; // L'avatar a son propre événement

                if (typeof showEditEmployeeModal === 'function') {
                    showEditEmployeeModal(employeeId);
                }
            });

            // Tooltip
            column.title = 'Cliquer pour modifier cet employé';
        }

        // Effet de survol amélioré
        column.addEventListener('mouseenter', () => {
            column.style.transform = 'translateX(8px) translateY(-3px)';
        });

        column.addEventListener('mouseleave', () => {
            column.style.transform = 'translateX(0) translateY(0)';
        });
    }

    /**
     * Configure les événements liés aux avatars
     */
    setupAvatarEvents() {
        // Événement pour les avatars dans les colonnes
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('employee-avatar')) {
                e.stopPropagation();
                const column = e.target.closest('.employee-column');
                const employeeId = column?.dataset.employeeId;

                if (employeeId) {
                    this.showAvatarModal(employeeId);
                }
            }
        });

        // Événement pour les avatars dans les créneaux
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('shift-avatar') || e.target.classList.contains('shift-avatar-img')) {
                e.stopPropagation();
                const shiftBlock = e.target.closest('.shift-block');
                const employeeId = shiftBlock?.dataset.employeeId;

                if (employeeId) {
                    this.showAvatarModal(employeeId);
                }
            }
        });
    }

    /**
     * Corrige les avatars existants sur la page
     */
    fixExistingAvatars() {
        // Corriger les avatars dans les colonnes
        const columnAvatars = document.querySelectorAll('.employee-column .employee-avatar');
        columnAvatars.forEach(avatar => {
            const column = avatar.closest('.employee-column');
            const employeeId = column?.dataset.employeeId;
            if (employeeId) {
                this.enhanceAvatar(avatar, employeeId);
            }
        });

        // Corriger les avatars dans les créneaux
        this.fixShiftAvatars();
    }

    /**
     * Corrige les avatars dans les créneaux
     */
    fixShiftAvatars() {
        const shiftBlocks = document.querySelectorAll('.shift-block');

        shiftBlocks.forEach(block => {
            const employeeId = block.dataset.employeeId;
            const employee = window.AppState?.employees?.get(parseInt(employeeId));

            if (employee) {
                this.enhanceShiftBlock(block, employee);
            }
        });
    }

    /**
     * Améliore l'affichage d'un créneau
     */
    enhanceShiftBlock(shiftBlock, employee) {
        // Ajouter la classe de type d'employé
        shiftBlock.classList.add(employee.poste);

        // Créer ou améliorer l'avatar dans le créneau
        let avatar = shiftBlock.querySelector('.shift-avatar, .shift-avatar-img');

        if (!avatar) {
            avatar = this.createShiftAvatar(employee);
            shiftBlock.insertBefore(avatar, shiftBlock.firstChild);
        }

        // Définir l'URL de l'avatar
        avatar.src = this.getEmployeeAvatar(employee);
        avatar.alt = employee.nom_complet || `${employee.prenom} ${employee.nom}`;

        // Créer ou mettre à jour les initiales
        let initials = shiftBlock.querySelector('.shift-initiales');
        if (!initials) {
            initials = document.createElement('span');
            initials.className = 'shift-initiales';
            shiftBlock.appendChild(initials);
        }
        initials.textContent = this.getInitials(employee);

        // Ajouter des données pour faciliter les interactions
        shiftBlock.dataset.employeeId = employee.id;
        shiftBlock.dataset.employeeType = employee.poste;
    }

    /**
     * Crée un élément avatar pour un créneau
     */
    createShiftAvatar(employee) {
        const avatar = document.createElement('img');
        avatar.className = 'shift-avatar';
        avatar.style.cssText = `
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            object-fit: cover;
            flex-shrink: 0;
            transition: all 0.3s ease;
            cursor: pointer;
        `;

        return avatar;
    }

    /**
     * Affiche le modal pour gérer l'avatar d'un employé
     */
    showAvatarModal(employeeId) {
        const employee = window.AppState?.employees?.get(parseInt(employeeId));
        if (!employee) return;

        if (typeof showEditEmployeeModal === 'function') {
            showEditEmployeeModal(employeeId);
        } else {
            // Fallback: notification simple
            const message = `Gestion de la photo pour ${employee.nom_complet || `${employee.prenom} ${employee.nom}`}`;
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(message, 'info');
            } else {
                alert(message);
            }
        }
    }

    /**
     * Met à jour tous les avatars d'un employé
     */
    updateEmployeeAvatars(employeeId, newAvatarUrl) {
        if (newAvatarUrl) {
            this.avatarCache.set(employeeId, newAvatarUrl);
        }

        // Mettre à jour dans les colonnes
        const columnAvatar = document.querySelector(`.employee-column[data-employee-id="${employeeId}"] .employee-avatar`);
        if (columnAvatar) {
            columnAvatar.src = this.getEmployeeAvatar({ id: employeeId });
        }

        // Mettre à jour dans les créneaux
        const shiftAvatars = document.querySelectorAll(`.shift-block[data-employee-id="${employeeId}"] .shift-avatar, .shift-block[data-employee-id="${employeeId}"] .shift-avatar-img`);
        shiftAvatars.forEach(avatar => {
            avatar.src = this.getEmployeeAvatar({ id: employeeId });
        });
    }

    /**
     * Génère des avatars aléatoires pour tous les employés
     */
    generateRandomAvatars() {
        if (!window.AppState?.employees) return;

        const colors = ['74b9ff', '00b894', 'fdcb6e', 'a29bfe', 'fd79a8', '6c5ce7', 'e17055', '00a085'];

        Array.from(window.AppState.employees.values()).forEach(employee => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const initials = this.getInitials(employee);
            const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=128&background=${randomColor}&color=fff&font-size=0.4&bold=true&rounded=true&t=${Date.now()}`;

            this.updateEmployeeAvatars(employee.id, newAvatar);
        });

        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show('🎨 Nouveaux avatars générés aléatoirement', 'success');
        }
    }

    /**
     * Restaure les couleurs par défaut des avatars
     */
    restoreDefaultAvatars() {
        if (!window.AppState?.employees) return;

        Array.from(window.AppState.employees.values()).forEach(employee => {
            const defaultAvatar = this.createEmployeeAvatar(employee);
            this.updateEmployeeAvatars(employee.id, defaultAvatar);
        });

        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show('🔄 Avatars par défaut restaurés', 'success');
        }
    }
}

/**
 * Classe pour améliorer l'interface globale
 */
class InterfaceEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.enhanceNotifications();
        this.enhanceModals();
        this.enhanceButtons();
        this.addKeyboardShortcuts();
    }

    /**
     * Améliore les notifications
     */
    enhanceNotifications() {
        // Observer pour les nouvelles notifications
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('notification')) {
                        this.enhanceNotification(node);
                    }
                });
            });
        });

        const notificationContainer = document.getElementById('notifications');
        if (notificationContainer) {
            observer.observe(notificationContainer, { childList: true });
        }
    }

    /**
     * Améliore une notification spécifique
     */
    enhanceNotification(notification) {
        // Ajouter une icône selon le type
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        const type = Array.from(notification.classList).find(cls => icons[cls]);
        if (type && icons[type]) {
            const icon = document.createElement('span');
            icon.textContent = icons[type];
            icon.style.marginRight = '8px';
            notification.insertBefore(icon, notification.firstChild);
        }

        // Animation d'entrée améliorée
        notification.style.transform = 'translateX(100%) scale(0.8)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notification.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.opacity = '1';
        }, 10);
    }

    /**
     * Améliore les modals
     */
    enhanceModals() {
        const modal = document.getElementById('globalModal');
        if (!modal) return;

        // Améliorer l'animation d'ouverture
        const originalDisplay = modal.style.display;
        const showModal = () => {
            modal.style.display = 'block';
            modal.style.opacity = '0';

            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'translateY(-50px) scale(0.9)';
                modalContent.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            }

            setTimeout(() => {
                modal.style.opacity = '1';
                if (modalContent) {
                    modalContent.style.transform = 'translateY(0) scale(1)';
                }
            }, 10);
        };

        // Observer les changements d'affichage du modal
        const observer = new MutationObserver(() => {
            if (modal.style.display === 'block' && originalDisplay !== 'block') {
                showModal();
            }
        });

        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }

    /**
     * Améliore les boutons
     */
    enhanceButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn')) {
                this.addRippleEffect(e.target, e);
            }
        });
    }

    /**
     * Ajoute un effet ripple aux boutons
     */
    addRippleEffect(button, event) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        // Ajouter l'animation CSS si elle n'existe pas
        if (!document.querySelector('#ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Ajoute des raccourcis clavier
     */
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+N : Nouveau créneau
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof showAddShiftModal === 'function') {
                    showAddShiftModal();
                }
            }

            // Ctrl+E : Nouvel employé
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                if (typeof showAddEmployeeModal === 'function') {
                    showAddEmployeeModal();
                }
            }

            // Ctrl+P : Gestion des photos
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                if (typeof showBulkPhotoModal === 'function') {
                    showBulkPhotoModal();
                }
            }
        });
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que les autres scripts soient chargés
    setTimeout(() => {
        window.avatarInterfaceManager = new AvatarInterfaceManager();
        window.interfaceEnhancer = new InterfaceEnhancer();

        console.log('✅ Gestionnaire d\'avatars et améliorations d\'interface initialisés');
    }, 1000);
});

// Fonctions globales pour compatibilité
window.generateRandomAvatars = function() {
    if (window.avatarInterfaceManager) {
        window.avatarInterfaceManager.generateRandomAvatars();
    }
};

window.restoreDefaultAvatars = function() {
    if (window.avatarInterfaceManager) {
        window.avatarInterfaceManager.restoreDefaultAvatars();
    }
};

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AvatarInterfaceManager, InterfaceEnhancer };
}