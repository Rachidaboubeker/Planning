/**
 * NOTIFICATION MANAGER UNIFIÉ - Planning Restaurant
 * Remplace notification.js et tous les systèmes de notifications dispersés
 * Système de notifications modernes, accessibles et configurables
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.isInitialized = false;
        this.defaultDuration = 5000;
        this.maxNotifications = 5;
        this.position = 'top-right';
        this.queue = [];
        this.isProcessingQueue = false;

        this.bindGlobalEvents();
        console.log('📢 Notification Manager unifié initialisé');
    }

    /**
     * Initialise le notification manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('📢 Notification Manager déjà initialisé');
            return;
        }

        try {
            // Créer le conteneur de notifications
            this.ensureNotificationContainer();

            // Configurer les événements globaux
            this.setupGlobalEvents();

            // Traiter la queue initiale
            this.processQueue();

            this.isInitialized = true;
            console.log('✅ Notification Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation Notification Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Observer les événements de l'application
        if (window.EventBus) {
            window.EventBus.on(window.Config?.EVENTS.ERROR_OCCURRED, (data) => {
                this.error('Erreur', data.message || 'Une erreur est survenue');
            });

            window.EventBus.on(window.Config?.EVENTS.SUCCESS_MESSAGE, (data) => {
                this.success(data.message || 'Opération réussie');
            });

            window.EventBus.on('system:network_offline', () => {
                this.warning('Connexion perdue', 'Vous êtes maintenant hors ligne');
            });

            window.EventBus.on('system:network_online', () => {
                this.success('Connexion rétablie', 'Vous êtes de nouveau en ligne');
            });
        }
    }

    /**
     * Configure les événements globaux
     */
    setupGlobalEvents() {
        // Gestion du redimensionnement
        window.addEventListener('resize', () => {
            this.adjustPosition();
        });

        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTimers();
            } else {
                this.resumeTimers();
            }
        });
    }

    /**
     * S'assure que le conteneur de notifications existe
     */
    ensureNotificationContainer() {
        this.container = document.getElementById('notificationContainer');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = `notification-container notification-${this.position}`;
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', 'Notifications');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        }
    }

    // ==================== MÉTHODES PRINCIPALES ====================

    /**
     * Affiche une notification de succès
     */
    success(title, message = '', options = {}) {
        return this.show('success', title, message, {
            icon: 'fas fa-check-circle',
            duration: this.defaultDuration,
            ...options
        });
    }

    /**
     * Affiche une notification d'erreur
     */
    error(title, message = '', options = {}) {
        return this.show('error', title, message, {
            icon: 'fas fa-times-circle',
            duration: this.defaultDuration * 2, // Erreurs restent plus longtemps
            persistent: false,
            ...options
        });
    }

    /**
     * Affiche une notification d'avertissement
     */
    warning(title, message = '', options = {}) {
        return this.show('warning', title, message, {
            icon: 'fas fa-exclamation-triangle',
            duration: this.defaultDuration * 1.5,
            ...options
        });
    }

    /**
     * Affiche une notification d'information
     */
    info(title, message = '', options = {}) {
        return this.show('info', title, message, {
            icon: 'fas fa-info-circle',
            duration: this.defaultDuration,
            ...options
        });
    }

    /**
     * Affiche une notification personnalisée
     */
    show(type, title, message = '', options = {}) {
        const notification = this.createNotification(type, title, message, options);

        // Ajouter à la queue si pas encore initialisé
        if (!this.isInitialized) {
            this.queue.push(notification);
            return notification.id;
        }

        return this.displayNotification(notification);
    }

    /**
     * Crée une notification
     */
    createNotification(type, title, message, options = {}) {
        const {
            icon = 'fas fa-bell',
            duration = this.defaultDuration,
            persistent = false,
            closable = true,
            actions = [],
            className = '',
            position = this.position,
            sound = false,
            priority = 'normal'
        } = options;

        const notification = {
            id: this.generateId(),
            type,
            title: title || '',
            message: message || '',
            icon,
            duration,
            persistent,
            closable,
            actions,
            className,
            position,
            sound,
            priority,
            timestamp: new Date(),
            element: null,
            timer: null,
            paused: false
        };

        return notification;
    }

    /**
     * Affiche une notification
     */
    displayNotification(notification) {
        // Vérifier les limites
        if (this.notifications.size >= this.maxNotifications) {
            this.removeOldestNotification();
        }

        // Créer l'élément DOM
        notification.element = this.createNotificationElement(notification);

        // Ajouter au conteneur
        this.container.appendChild(notification.element);

        // Enregistrer
        this.notifications.set(notification.id, notification);

        // Animer l'apparition
        this.animateIn(notification.element);

        // Configurer la fermeture automatique
        if (!notification.persistent && notification.duration > 0) {
            this.setupAutoClose(notification);
        }

        // Jouer un son si configuré
        if (notification.sound) {
            this.playNotificationSound(notification.type);
        }

        // Émettre l'événement
        window.EventBus?.emit('notification:shown', notification);

        console.log(`📢 Notification affichée: ${notification.type} - ${notification.title}`);

        return notification.id;
    }

    /**
     * Crée l'élément DOM d'une notification
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type} ${notification.className}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        element.dataset.notificationId = notification.id;

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${notification.icon}" aria-hidden="true"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${this.sanitize(notification.title)}</div>
                    ${notification.message ? `<div class="notification-message">${this.sanitize(notification.message)}</div>` : ''}
                </div>
                ${notification.closable ? `
                    <button class="notification-close" aria-label="Fermer la notification">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                ` : ''}
            </div>
            ${notification.actions.length > 0 ? `
                <div class="notification-actions">
                    ${notification.actions.map(action => `
                        <button class="notification-action btn btn-sm ${action.className || 'btn-secondary'}"
                                data-action="${action.id}">
                            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                            ${this.sanitize(action.text)}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
            ${notification.duration > 0 && !notification.persistent ? `
                <div class="notification-progress">
                    <div class="notification-progress-bar" style="animation-duration: ${notification.duration}ms;"></div>
                </div>
            ` : ''}
        `;

        // Configurer les événements
        this.setupNotificationEvents(notification, element);

        return element;
    }

    /**
     * Configure les événements d'une notification
     */
    setupNotificationEvents(notification, element) {
        // Bouton de fermeture
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(notification.id);
            });
        }

        // Boutons d'action
        const actionBtns = element.querySelectorAll('.notification-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = btn.dataset.action;
                const action = notification.actions.find(a => a.id === actionId);

                if (action && action.handler) {
                    action.handler(notification);
                }

                // Fermer la notification après l'action sauf si spécifié
                if (!action || action.closeAfter !== false) {
                    this.close(notification.id);
                }
            });
        });

        // Pause/resume au survol
        element.addEventListener('mouseenter', () => {
            this.pauseTimer(notification.id);
        });

        element.addEventListener('mouseleave', () => {
            this.resumeTimer(notification.id);
        });

        // Fermeture par clic (optionnel)
        if (notification.closable) {
            element.addEventListener('click', (e) => {
                // Ne pas fermer si on clique sur un bouton
                if (!e.target.closest('button')) {
                    this.close(notification.id);
                }
            });
        }
    }

    // ==================== GESTION DES TIMERS ====================

    /**
     * Configure la fermeture automatique
     */
    setupAutoClose(notification) {
        notification.timer = setTimeout(() => {
            this.close(notification.id);
        }, notification.duration);
    }

    /**
     * Met en pause un timer
     */
    pauseTimer(id) {
        const notification = this.notifications.get(id);
        if (notification && notification.timer && !notification.paused) {
            clearTimeout(notification.timer);
            notification.paused = true;

            // Calculer le temps restant
            const elapsed = Date.now() - notification.timestamp.getTime();
            notification.remainingTime = notification.duration - elapsed;

            // Mettre en pause l'animation de la barre de progression
            const progressBar = notification.element?.querySelector('.notification-progress-bar');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        }
    }

    /**
     * Reprend un timer
     */
    resumeTimer(id) {
        const notification = this.notifications.get(id);
        if (notification && notification.paused && !notification.persistent) {
            notification.paused = false;

            // Redémarrer avec le temps restant
            notification.timer = setTimeout(() => {
                this.close(notification.id);
            }, notification.remainingTime || notification.duration);

            // Reprendre l'animation
            const progressBar = notification.element?.querySelector('.notification-progress-bar');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
        }
    }

    /**
     * Met en pause tous les timers
     */
    pauseTimers() {
        this.notifications.forEach((_, id) => {
            this.pauseTimer(id);
        });
    }

    /**
     * Reprend tous les timers
     */
    resumeTimers() {
        this.notifications.forEach((_, id) => {
            this.resumeTimer(id);
        });
    }

    // ==================== FERMETURE DES NOTIFICATIONS ====================

    /**
     * Ferme une notification
     */
    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) return false;

        // Annuler le timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animer la sortie
        this.animateOut(notification.element, () => {
            // Supprimer du DOM
            notification.element?.remove();

            // Supprimer de la Map
            this.notifications.delete(id);

            // Émettre l'événement
            window.EventBus?.emit('notification:closed', notification);

            console.log(`📢 Notification fermée: ${id}`);
        });

        return true;
    }

    /**
     * Ferme toutes les notifications
     */
    closeAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.close(id));
    }

    /**
     * Ferme les notifications d'un type spécifique
     */
    closeByType(type) {
        this.notifications.forEach((notification, id) => {
            if (notification.type === type) {
                this.close(id);
            }
        });
    }

    /**
     * Supprime la notification la plus ancienne
     */
    removeOldestNotification() {
        // Trouver la notification la plus ancienne (non persistante)
        let oldest = null;
        let oldestTime = Date.now();

        this.notifications.forEach((notification) => {
            if (!notification.persistent && notification.timestamp.getTime() < oldestTime) {
                oldest = notification;
                oldestTime = notification.timestamp.getTime();
            }
        });

        if (oldest) {
            this.close(oldest.id);
        }
    }

    // ==================== ANIMATIONS ====================

    /**
     * Anime l'apparition d'une notification
     */
    animateIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';

        // Forcer un reflow
        element.offsetHeight;

        element.style.transition = 'all 0.3s ease-out';
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
    }

    /**
     * Anime la sortie d'une notification
     */
    animateOut(element, callback) {
        if (!element) {
            callback();
            return;
        }

        element.style.transition = 'all 0.2s ease-in';
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';
        element.style.height = '0';
        element.style.margin = '0';
        element.style.padding = '0';

        setTimeout(callback, 200);
    }

    // ==================== CONFIGURATION ====================

    /**
     * Change la position des notifications
     */
    setPosition(position) {
        this.position = position;

        if (this.container) {
            this.container.className = `notification-container notification-${position}`;
        }
    }

    /**
     * Change la durée par défaut
     */
    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }

    /**
     * Change le nombre maximum de notifications
     */
    setMaxNotifications(max) {
        this.maxNotifications = max;

        // Fermer l'excès de notifications si nécessaire
        while (this.notifications.size > max) {
            this.removeOldestNotification();
        }
    }

    /**
     * Ajuste la position selon la taille de l'écran
     */
    adjustPosition() {
        if (!this.container) return;

        const isMobile = window.innerWidth <= 768;

        if (isMobile && !this.position.includes('bottom')) {
            // Sur mobile, préférer le bottom pour éviter de couvrir le contenu
            this.setPosition('bottom-center');
        }
    }

    // ==================== SONS ====================

    /**
     * Joue un son de notification
     */
    playNotificationSound(type) {
        if (!('Audio' in window)) return;

        try {
            // Fréquences différentes selon le type
            const frequencies = {
                success: [523.25, 659.25], // Do, Mi
                error: [392.00, 293.66],   // Sol, Ré
                warning: [440.00, 493.88], // La, Si
                info: [523.25, 523.25]     // Do, Do
            };

            const freq = frequencies[type] || frequencies.info;
            this.playBeep(freq[0], 150);

            if (freq[1] !== freq[0]) {
                setTimeout(() => this.playBeep(freq[1], 150), 100);
            }

        } catch (error) {
            console.warn('Impossible de jouer le son de notification:', error);
        }
    }

    /**
     * Joue un bip à une fréquence donnée
     */
    playBeep(frequency, duration) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    // ==================== GESTION DE LA QUEUE ====================

    /**
     * Traite la queue des notifications en attente
     */
    processQueue() {
        if (this.isProcessingQueue || this.queue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.queue.length > 0) {
            const notification = this.queue.shift();
            this.displayNotification(notification);

            // Pause entre les notifications pour éviter le spam
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 100);
                break;
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Vide la queue
     */
    clearQueue() {
        this.queue = [];
        this.isProcessingQueue = false;
    }

    // ==================== NOTIFICATIONS SPÉCIALISÉES ====================

    /**
     * Notification de progression
     */
    progress(title, initialProgress = 0, options = {}) {
        const progressContent = `
            <div class="progress-notification">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${initialProgress}%"></div>
                </div>
                <div class="progress-text">${initialProgress}%</div>
            </div>
        `;

        const id = this.show('info', title, progressContent, {
            persistent: true,
            closable: false,
            ...options
        });

        return {
            id,
            update: (progress, text = null) => this.updateProgress(id, progress, text),
            complete: (message = 'Terminé') => this.completeProgress(id, message),
            error: (message = 'Erreur') => this.errorProgress(id, message)
        };
    }

    /**
     * Met à jour une notification de progression
     */
    updateProgress(id, progress, text = null) {
        const notification = this.notifications.get(id);
        if (!notification || !notification.element) return;

        const progressFill = notification.element.querySelector('.progress-fill');
        const progressText = notification.element.querySelector('.progress-text');

        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }

        if (progressText) {
            progressText.textContent = text || `${progress}%`;
        }
    }

    /**
     * Complète une notification de progression
     */
    completeProgress(id, message) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Transformer en notification de succès
        notification.type = 'success';
        notification.element.className = notification.element.className.replace('notification-info', 'notification-success');

        const icon = notification.element.querySelector('.notification-icon i');
        if (icon) {
            icon.className = 'fas fa-check-circle';
        }

        const messageEl = notification.element.querySelector('.notification-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        // Fermer automatiquement après 2 secondes
        setTimeout(() => this.close(id), 2000);
    }

    /**
     * Marque une progression comme échouée
     */
    errorProgress(id, message) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Transformer en notification d'erreur
        notification.type = 'error';
        notification.element.className = notification.element.className.replace('notification-info', 'notification-error');

        const icon = notification.element.querySelector('.notification-icon i');
        if (icon) {
            icon.className = 'fas fa-times-circle';
        }

        const messageEl = notification.element.querySelector('.notification-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        // Permettre la fermeture manuelle
        notification.persistent = false;
        notification.closable = true;

        // Ajouter le bouton de fermeture s'il n'existe pas
        if (!notification.element.querySelector('.notification-close')) {
            const content = notification.element.querySelector('.notification-content');
            content.insertAdjacentHTML('beforeend', `
                <button class="notification-close" aria-label="Fermer la notification">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            `);

            const closeBtn = content.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => this.close(id));
        }
    }

    /**
     * Notification persistante avec actions
     */
    persistent(title, message, actions = []) {
        return this.show('info', title, message, {
            persistent: true,
            closable: true,
            actions: actions
        });
    }

    /**
     * Notification de confirmation
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const actions = [
                {
                    id: 'cancel',
                    text: options.cancelText || 'Annuler',
                    className: 'btn-secondary',
                    handler: () => resolve(false)
                },
                {
                    id: 'confirm',
                    text: options.confirmText || 'Confirmer',
                    className: 'btn-primary',
                    handler: () => resolve(true)
                }
            ];

            this.show('warning', title, message, {
                persistent: true,
                closable: false,
                actions: actions
            });
        });
    }

    // ==================== UTILITAIRES ====================

    /**
     * Génère un ID unique
     */
    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Trouve une notification par titre
     */
    findByTitle(title) {
        for (const notification of this.notifications.values()) {
            if (notification.title === title) {
                return notification;
            }
        }
        return null;
    }

    /**
     * Trouve les notifications par type
     */
    findByType(type) {
        return Array.from(this.notifications.values())
            .filter(notification => notification.type === type);
    }

    // ==================== ÉTAT ET DEBUG ====================

    /**
     * Obtient l'état actuel des notifications
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            totalNotifications: this.notifications.size,
            queueLength: this.queue.length,
            maxNotifications: this.maxNotifications,
            defaultDuration: this.defaultDuration,
            position: this.position,
            hasContainer: !!this.container
        };
    }

    /**
     * Obtient les statistiques des notifications
     */
    getStats() {
        const stats = {
            byType: {},
            total: this.notifications.size,
            persistent: 0,
            withActions: 0
        };

        this.notifications.forEach(notification => {
            // Par type
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

            // Persistantes
            if (notification.persistent) {
                stats.persistent++;
            }

            // Avec actions
            if (notification.actions.length > 0) {
                stats.withActions++;
            }
        });

        return stats;
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('📢 NotificationManager Debug');
        console.table(this.getState());
        console.log('Statistiques:', this.getStats());
        console.log('Notifications actives:', Array.from(this.notifications.values()));
        console.log('Queue:', this.queue);
        console.groupEnd();
    }

    /**
     * Teste toutes les notifications
     */
    test() {
        console.log('🧪 Test des notifications...');

        this.success('Test Succès', 'Ceci est une notification de succès');
        setTimeout(() => this.error('Test Erreur', 'Ceci est une notification d\'erreur'), 500);
        setTimeout(() => this.warning('Test Avertissement', 'Ceci est un avertissement'), 1000);
        setTimeout(() => this.info('Test Information', 'Ceci est une information'), 1500);

        // Test progression
        setTimeout(() => {
            const progress = this.progress('Test Progression');
            let p = 0;
            const interval = setInterval(() => {
                p += 10;
                progress.update(p);
                if (p >= 100) {
                    clearInterval(interval);
                    progress.complete('Progression terminée !');
                }
            }, 200);
        }, 2000);
    }

    // ==================== NETTOYAGE ====================

    /**
     * Nettoie les notifications orphelines
     */
    cleanup() {
        if (!this.container) return;

        // Supprimer les éléments DOM orphelins
        const domNotifications = this.container.querySelectorAll('.notification');

        domNotifications.forEach(element => {
            const id = element.dataset.notificationId;
            if (id && !this.notifications.has(id)) {
                element.remove();
                console.log(`🧹 Notification orpheline supprimée: ${id}`);
            }
        });
    }

    /**
     * Détruit le notification manager
     */
    destroy() {
        this.closeAll();
        this.clearQueue();

        if (this.container) {
            this.container.remove();
        }

        this.notifications.clear();
        this.isInitialized = false;

        console.log('🗑️ Notification Manager détruit');
    }

    // ==================== HOOKS ET ÉVÉNEMENTS ====================

    /**
     * Hook avant l'affichage d'une notification
     */
    onBeforeShow(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('notification:before_show', callback);
        }
    }

    /**
     * Hook après l'affichage d'une notification
     */
    onAfterShow(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('notification:shown', callback);
        }
    }

    /**
     * Hook après la fermeture d'une notification
     */
    onAfterClose(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('notification:closed', callback);
        }
    }
}

// Instance globale unique
if (!window.NotificationManager) {
    window.NotificationManager = new NotificationManager();

    // Exposer pour debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugNotifications = () => window.NotificationManager.debug();
        window.testNotifications = () => window.NotificationManager.test();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}