/**
 * EVENT BUS UNIFIÉ - Planning Restaurant
 * Communication centralisée entre tous les modules
 * Remplace les événements dispersés dans l'ancienne architecture
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.middlewares = [];
        this.debugMode = false;

        this.setupGlobalEventHandling();
        console.log('📡 Event Bus unifié initialisé');
    }

    /**
     * Configure la gestion globale des événements
     */
    setupGlobalEventHandling() {
        // Intercepter les erreurs globales
        window.addEventListener('error', (e) => {
            this.emit('system:error', {
                type: 'javascript',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                error: e.error,
                timestamp: new Date()
            });
        });

        // Intercepter les promesses rejetées
        window.addEventListener('unhandledrejection', (e) => {
            this.emit('system:promise_rejected', {
                type: 'promise',
                reason: e.reason,
                timestamp: new Date()
            });
        });

        // Événements de visibilité
        document.addEventListener('visibilitychange', () => {
            this.emit('system:visibility_changed', {
                hidden: document.hidden,
                timestamp: new Date()
            });
        });

        // Événements réseau
        window.addEventListener('online', () => {
            this.emit('system:network_online', { timestamp: new Date() });
        });

        window.addEventListener('offline', () => {
            this.emit('system:network_offline', { timestamp: new Date() });
        });
    }

    /**
     * Abonne un callback à un événement
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Le callback doit être une fonction');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const subscription = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: this.generateSubscriptionId()
        };

        this.events.get(event).push(subscription);

        // Trier par priorité (plus élevée en premier)
        this.events.get(event).sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`📡 Abonnement: ${event}`, subscription);
        }

        // Retourner une fonction de désabonnement
        return () => this.off(event, subscription.id);
    }

    /**
     * Abonne un callback pour une seule exécution
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * Désabonne un callback d'un événement
     */
    off(event, callbackOrId) {
        if (!this.events.has(event)) {
            return false;
        }

        const callbacks = this.events.get(event);
        let removed = false;

        if (typeof callbackOrId === 'string') {
            // Désabonnement par ID
            const index = callbacks.findIndex(sub => sub.id === callbackOrId);
            if (index > -1) {
                callbacks.splice(index, 1);
                removed = true;
            }
        } else if (typeof callbackOrId === 'function') {
            // Désabonnement par fonction
            const index = callbacks.findIndex(sub => sub.callback === callbackOrId);
            if (index > -1) {
                callbacks.splice(index, 1);
                removed = true;
            }
        }

        // Supprimer l'événement s'il n'y a plus d'abonnés
        if (callbacks.length === 0) {
            this.events.delete(event);
        }

        if (this.debugMode && removed) {
            console.log(`📡 Désabonnement: ${event}`);
        }

        return removed;
    }

    /**
     * Émet un événement
     */
    emit(event, data = null) {
        if (this.debugMode) {
            console.log(`📡 Émission: ${event}`, data);
        }

        // Passer par les middlewares
        const eventData = this.applyMiddlewares(event, data);

        if (!this.events.has(event)) {
            if (this.debugMode) {
                console.log(`📡 Aucun abonné pour: ${event}`);
            }
            return [];
        }

        const callbacks = [...this.events.get(event)]; // Copie pour éviter les modifications concurrentes
        const results = [];

        for (let i = 0; i < callbacks.length; i++) {
            const subscription = callbacks[i];

            try {
                const result = subscription.context
                    ? subscription.callback.call(subscription.context, eventData)
                    : subscription.callback(eventData);

                results.push(result);

                // Supprimer si c'est un abonnement "once"
                if (subscription.once) {
                    this.off(event, subscription.id);
                }

            } catch (error) {
                console.error(`📡 Erreur dans callback ${event}:`, error);

                // Émettre une erreur système
                setTimeout(() => {
                    this.emit('system:callback_error', {
                        event,
                        error,
                        subscription: subscription.id,
                        timestamp: new Date()
                    });
                }, 0);
            }
        }

        return results;
    }

    /**
     * Émet un événement de manière asynchrone
     */
    async emitAsync(event, data = null) {
        if (this.debugMode) {
            console.log(`📡 Émission async: ${event}`, data);
        }

        const eventData = this.applyMiddlewares(event, data);

        if (!this.events.has(event)) {
            return [];
        }

        const callbacks = [...this.events.get(event)];
        const results = [];

        for (const subscription of callbacks) {
            try {
                const result = subscription.context
                    ? subscription.callback.call(subscription.context, eventData)
                    : subscription.callback(eventData);

                // Attendre si c'est une promesse
                const finalResult = result instanceof Promise ? await result : result;
                results.push(finalResult);

                if (subscription.once) {
                    this.off(event, subscription.id);
                }

            } catch (error) {
                console.error(`📡 Erreur async callback ${event}:`, error);
                results.push({ error });
            }
        }

        return results;
    }

    /**
     * Ajoute un middleware
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Le middleware doit être une fonction');
        }

        this.middlewares.push(middleware);
        console.log('📡 Middleware ajouté');
    }

    /**
     * Applique les middlewares
     */
    applyMiddlewares(event, data) {
        let eventData = data;

        for (const middleware of this.middlewares) {
            try {
                const result = middleware(event, eventData);
                if (result !== undefined) {
                    eventData = result;
                }
            } catch (error) {
                console.error('📡 Erreur middleware:', error);
            }
        }

        return eventData;
    }

    /**
     * Génère un ID unique pour les abonnements
     */
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Supprime tous les abonnés d'un événement
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
            if (this.debugMode) {
                console.log(`📡 Tous les abonnés supprimés pour: ${event}`);
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log('📡 Tous les abonnés supprimés');
            }
        }
    }

    /**
     * Obtient la liste des événements actifs
     */
    getActiveEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * Obtient le nombre d'abonnés pour un événement
     */
    getListenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }

    /**
     * Active/désactive le mode debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`📡 Mode debug: ${enabled ? 'activé' : 'désactivé'}`);
    }

    /**
     * Crée un namespace d'événements
     */
    namespace(prefix) {
        return {
            on: (event, callback, options) => this.on(`${prefix}:${event}`, callback, options),
            once: (event, callback, options) => this.once(`${prefix}:${event}`, callback, options),
            off: (event, callbackOrId) => this.off(`${prefix}:${event}`, callbackOrId),
            emit: (event, data) => this.emit(`${prefix}:${event}`, data),
            emitAsync: (event, data) => this.emitAsync(`${prefix}:${event}`, data)
        };
    }

    /**
     * Attend qu'un événement soit émis
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(event, handler);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout);

            const handler = (data) => {
                clearTimeout(timeoutId);
                resolve(data);
            };

            this.once(event, handler);
        });
    }

    /**
     * Pipe les événements d'un événement source vers un événement cible
     */
    pipe(sourceEvent, targetEvent, transform = null) {
        return this.on(sourceEvent, (data) => {
            const transformedData = transform ? transform(data) : data;
            this.emit(targetEvent, transformedData);
        });
    }

    /**
     * Débounce les événements
     */
    debounce(event, delay = 300) {
        let timeoutId = null;
        const debouncedEvent = `${event}:debounced`;

        return this.on(event, (data) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                this.emit(debouncedEvent, data);
            }, delay);
        });
    }

    /**
     * Throttle les événements
     */
    throttle(event, interval = 100) {
        let lastEmit = 0;
        const throttledEvent = `${event}:throttled`;

        return this.on(event, (data) => {
            const now = Date.now();
            if (now - lastEmit >= interval) {
                lastEmit = now;
                this.emit(throttledEvent, data);
            }
        });
    }

    /**
     * Debug - Affiche les statistiques
     */
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalListeners: 0,
            events: {}
        };

        for (const [event, listeners] of this.events.entries()) {
            stats.totalListeners += listeners.length;
            stats.events[event] = {
                listenerCount: listeners.length,
                listeners: listeners.map(sub => ({
                    id: sub.id,
                    priority: sub.priority,
                    once: sub.once,
                    hasContext: !!sub.context
                }))
            };
        }

        return stats;
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('📡 EventBus Debug');
        console.log('Mode debug:', this.debugMode);
        console.log('Middlewares:', this.middlewares.length);
        console.table(this.getStats().events);
        console.groupEnd();
    }

    /**
     * Nettoyage complet
     */
    destroy() {
        this.events.clear();
        this.middlewares = [];
        console.log('📡 EventBus détruit');
    }
}

// Instance globale unique
if (!window.EventBus) {
    window.EventBus = new EventBus();

    // Exposer pour debugging en mode développement
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.EventBus.setDebugMode(true);
        window.debugEventBus = () => window.EventBus.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}