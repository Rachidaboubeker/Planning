/**
 * Planning Restaurant - Gestionnaire des notifications
 * Système de notifications toast moderne et accessible
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 3000;
        this.position = 'top-right'; // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center

        this.init();
    }

    /**
     * Initialise le gestionnaire de notifications
     */
    init() {
        this.createContainer();
        this.setupStyles();
        Logger.debug('NotificationManager initialisé');
    }

    /**
     * Crée le conteneur des notifications
     */
    createContainer() {
        // Vérifier si le conteneur existe déjà
        this.container = document.getElementById('notifications-container');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications-container';
            this.container.className = `notifications-container position-${this.position}`;
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Configure les styles CSS
     */
    setupStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notifications-container {
                position: fixed;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                max-width: 400px;
                pointer-events: none;
            }

            .notifications-container.position-top-right {
                top: 20px;
                right: 20px;
            }

            .notifications-container.position-top-left {
                top: 20px;
                left: 20px;
            }

            .notifications-container.position-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .notifications-container.position-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .notifications-container.position-top-center {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .notifications-container.position-bottom-center {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .notification {
                display: flex;
                align-items: center;
                background: white;
                border-radius: 12px;
                padding: 1rem 1.25rem;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border-left: 4px solid #e9ecef;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                max-width: 100%;
                word-wrap: break-word;
                position: relative;
                overflow: hidden;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
                max-height: 0;
                padding: 0 1.25rem;
                margin: 0;
            }

            .notifications-container.position-top-left .notification,
            .notifications-container.position-bottom-left .notification {
                transform: translateX(-100%);
            }

            .notifications-container.position-top-left .notification.hide,
            .notifications-container.position-bottom-left .notification.hide {
                transform: translateX(-100%);
            }

            .notifications-container.position-top-center .notification,
            .notifications-container.position-bottom-center .notification {
                transform: translateY(-100%);
            }

            .notifications-container.position-top-center .notification.show,
            .notifications-container.position-bottom-center .notification.show {
                transform: translateY(0);
            }

            .notifications-container.position-top-center .notification.hide,
            .notifications-container.position-bottom-center .notification.hide {
                transform: translateY(-100%);
            }

            .notification-success {
                border-left-color: #00b894;
                background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
                color: white;
            }

            .notification-error {
                border-left-color: #ff6b6b;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
            }

            .notification-warning {
                border-left-color: #fdcb6e;
                background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
                color: white;
            }

            .notification-info {
                border-left-color: #74b9ff;
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
                color: white;
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
                min-width: 0;
            }

            .notification-icon {
                flex-shrink: 0;
                font-size: 1.2rem;
                opacity: 0.9;
            }

            .notification-message {
                flex: 1;
                font-weight: 500;
                line-height: 1.4;
                word-break: break-word;
            }

            .notification-actions {
                display: flex;
                gap: 0.5rem;
                margin-left: 0.75rem;
                flex-shrink: 0;
            }

            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s ease;
                opacity: 0.7;
                font-size: 0.9rem;
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }

            .notification-close:hover {
                background: rgba(255, 255, 255, 0.2);
                opacity: 1;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 12px 12px;
                transition: width linear;
            }

            .notification-action-button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: inherit;
                padding: 0.375rem 0.75rem;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .notification-action-button:hover {
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.5);
            }

            @media (max-width: 480px) {
                .notifications-container {
                    left: 10px !important;
                    right: 10px !important;
                    top: 10px;
                    max-width: none;
                    transform: none !important;
                }

                .notification {
                    margin: 0;
                    border-radius: 8px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .notification {
                    transition: opacity 0.2s ease;
                }
            }

            /* Animations d'entrée spéciales */
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideInDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes bounce {
                0%, 20%, 53%, 80%, 100% {
                    transform: translateX(0);
                }
                40%, 43% {
                    transform: translateX(-5px);
                }
                70% {
                    transform: translateX(-2px);
                }
                90% {
                    transform: translateX(-1px);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Affiche une notification
     */
    show(message, type = 'info', options = {}) {
        const config = {
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            persistent: options.persistent || false,
            actions: options.actions || [],
            icon: options.icon || this.getDefaultIcon(type),
            id: options.id || this.generateId(),
            showProgress: options.showProgress !== false,
            animate: options.animate !== false,
            sound: options.sound || false
        };

        // Éviter les doublons si un ID est spécifié
        if (this.notifications.has(config.id)) {
            this.remove(config.id);
        }

        // Limiter le nombre de notifications
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }

        const notification = this.createNotification(message, type, config);
        this.container.appendChild(notification.element);
        this.notifications.set(config.id, notification);

        // Animation d'entrée
        if (config.animate) {
            requestAnimationFrame(() => {
                notification.element.classList.add('show');
            });
        } else {
            notification.element.classList.add('show');
        }

        // Son de notification (si activé et supporté)
        if (config.sound && 'Audio' in window) {
            this.playNotificationSound(type);
        }

        // Suppression automatique
        if (config.duration > 0 && !config.persistent) {
            notification.timer = setTimeout(() => {
                this.remove(config.id);
            }, config.duration);
        }

        Logger.debug(`Notification affichée: ${config.id} (${type})`);
        EventBus.emit('notification:shown', { id: config.id, type, message });

        return config.id;
    }

    /**
     * Crée un élément de notification
     */
    createNotification(message, type, config) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.dataset.id = config.id;

        // Contenu principal
        const content = document.createElement('div');
        content.className = 'notification-content';

        // Icône
        if (config.icon) {
            const icon = document.createElement('i');
            icon.className = `notification-icon ${config.icon}`;
            content.appendChild(icon);
        }

        // Message
        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.innerHTML = PlanningUtils.sanitizeString(message);
        content.appendChild(messageEl);

        notification.appendChild(content);

        // Actions personnalisées
        if (config.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'notification-actions';

            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'notification-action-button';
                button.textContent = action.label;
                button.onclick = (e) => {
                    e.stopPropagation();
                    action.callback(config.id);
                };
                actionsContainer.appendChild(button);
            });

            notification.appendChild(actionsContainer);
        }

        // Bouton de fermeture
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.setAttribute('aria-label', 'Fermer la notification');
        closeButton.onclick = (e) => {
            e.stopPropagation();
            this.remove(config.id);
        };

        if (!config.actions.length) {
            content.appendChild(closeButton);
        } else {
            notification.appendChild(closeButton);
        }

        // Barre de progression
        if (config.showProgress && config.duration > 0 && !config.persistent) {
            const progress = document.createElement('div');
            progress.className = 'notification-progress';
            progress.style.width = '100%';
            progress.style.transition = `width ${config.duration}ms linear`;
            notification.appendChild(progress);

            // Lancer l'animation de la barre
            requestAnimationFrame(() => {
                progress.style.width = '0%';
            });
        }

        // Clic sur la notification pour la fermer
        notification.addEventListener('click', () => {
            if (!config.persistent) {
                this.remove(config.id);
            }
        });

        return {
            element: notification,
            config,
            timer: null
        };
    }

    /**
     * Supprime une notification
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Nettoyer le timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animation de sortie
        notification.element.classList.remove('show');
        notification.element.classList.add('hide');

        // Suppression du DOM après l'animation
        setTimeout(() => {
            if (this.container.contains(notification.element)) {
                this.container.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 400);

        Logger.debug(`Notification supprimée: ${id}`);
        EventBus.emit('notification:removed', { id });
    }

    /**
     * Supprime toutes les notifications
     */
    clear() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    /**
     * Obtient l'icône par défaut selon le type
     */
    getDefaultIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Génère un ID unique
     */
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    /**
     * Joue un son de notification
     */
    playNotificationSound(type) {
        try {
            // Fréquences pour différents types
            const frequencies = {
                success: [523.25, 659.25], // Do, Mi
                error: [329.63, 261.63],   // Mi, Do (descendant)
                warning: [440, 440],       // La, La
                info: [523.25]             // Do
            };

            const freq = frequencies[type] || frequencies.info;

            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContext();

                freq.forEach((frequency, index) => {
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);

                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.1);
                    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + index * 0.1 + 0.05);
                    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + index * 0.1 + 0.15);

                    oscillator.start(ctx.currentTime + index * 0.1);
                    oscillator.stop(ctx.currentTime + index * 0.1 + 0.15);
                });
            }
        } catch (error) {
            Logger.debug('Son de notification non disponible:', error);
        }
    }

    /**
     * Change la position des notifications
     */
    setPosition(position) {
        const validPositions = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

        if (!validPositions.includes(position)) {
            Logger.warn(`Position invalide: ${position}`);
            return;
        }

        this.position = position;
        this.container.className = `notifications-container position-${position}`;
        Logger.debug(`Position des notifications changée: ${position}`);
    }

    /**
     * Configure le nombre maximum de notifications
     */
    setMaxNotifications(max) {
        this.maxNotifications = Math.max(1, Math.min(10, max));
        Logger.debug(`Nombre maximum de notifications: ${this.maxNotifications}`);
    }

    /**
     * Configure la durée par défaut
     */
    setDefaultDuration(duration) {
        this.defaultDuration = Math.max(1000, duration);
        Logger.debug(`Durée par défaut des notifications: ${this.defaultDuration}ms`);
    }

    // ==================== MÉTHODES DE CONVENANCE ====================

    /**
     * Affiche une notification de succès
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Affiche une notification d'erreur
     */
    error(message, options = {}) {
        return this.show(message, 'error', { duration: 5000, ...options });
    }

    /**
     * Affiche une notification d'avertissement
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', { duration: 4000, ...options });
    }

    /**
     * Affiche une notification d'information
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Affiche une notification persistante
     */
    persistent(message, type = 'info', options = {}) {
        return this.show(message, type, { persistent: true, ...options });
    }

    /**
     * Affiche une notification avec actions
     */
    action(message, actions, type = 'info', options = {}) {
        return this.show(message, type, { actions, ...options });
    }

    /**
     * Affiche une notification de confirmation
     */
    confirm(message, onConfirm, onCancel = null, options = {}) {
        const actions = [
            {
                label: 'Confirmer',
                callback: (id) => {
                    this.remove(id);
                    if (onConfirm) onConfirm();
                }
            }
        ];

        if (onCancel) {
            actions.unshift({
                label: 'Annuler',
                callback: (id) => {
                    this.remove(id);
                    if (onCancel) onCancel();
                }
            });
        }

        return this.action(message, actions, 'warning', { persistent: true, ...options });
    }

    /**
     * Obtient les statistiques
     */
    getStats() {
        const stats = {
            total: this.notifications.size,
            byType: {},
            persistent: 0
        };

        this.notifications.forEach(notification => {
            const type = notification.element.className.match(/notification-(\w+)/)?.[1] || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            if (notification.config.persistent) {
                stats.persistent++;
            }
        });

        return stats;
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.clear();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        const styles = document.getElementById('notification-styles');
        if (styles) {
            styles.remove();
        }

        Logger.info('NotificationManager détruit');
    }
}

// Instance globale
let notificationManagerInstance = null;

/**
 * Factory pour créer/récupérer l'instance
 */
function getNotificationManager() {
    if (!notificationManagerInstance) {
        notificationManagerInstance = new NotificationManager();
    }
    return notificationManagerInstance;
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.NotificationManager = getNotificationManager();
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationManager, getNotificationManager };
}

Logger.info('NotificationManager chargé avec succès');