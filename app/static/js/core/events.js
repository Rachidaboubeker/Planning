/**
 * EVENTS MANAGER - Gestionnaire d'événements centralisé
 * Remplace le fichier events.js manquant (404)
 */

class EventsManager {
    constructor() {
        this.listeners = new Map();
        this.initialized = false;
        this.eventQueue = [];
    }

    /**
     * Initialise le gestionnaire d'événements
     */
    init() {
        if (this.initialized) return;

        console.log('🔧 Initialisation Events Manager...');

        this.setupGlobalListeners();
        this.processEventQueue();
        this.initialized = true;

        console.log('✅ Events Manager initialisé');
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalListeners() {
        // Gestion des erreurs JavaScript globales
        window.addEventListener('error', (e) => {
            console.error('❌ Erreur JavaScript:', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                error: e.error
            });

            this.emit('global:error', {
                type: 'javascript',
                message: e.message,
                source: e.filename,
                line: e.lineno
            });
        });

        // Gestion des erreurs de ressources (404, etc.)
        window.addEventListener('error', (e) => {
            if (e.target !== window) {
                console.error('❌ Erreur de ressource:', {
                    type: e.target.tagName,
                    source: e.target.src || e.target.href,
                    message: 'Ressource non trouvée'
                });

                this.emit('resource:error', {
                    type: e.target.tagName.toLowerCase(),
                    source: e.target.src || e.target.href,
                    element: e.target
                });
            }
        }, true);

        // Gestion des erreurs de promesses non catchées
        window.addEventListener('unhandledrejection', (e) => {
            console.error('❌ Promise rejetée:', e.reason);

            this.emit('promise:rejection', {
                reason: e.reason,
                promise: e.promise
            });
        });

        // Événements de navigation
        window.addEventListener('beforeunload', () => {
            this.emit('app:beforeunload');
        });

        window.addEventListener('load', () => {
            this.emit('app:loaded');
        });

        // Événements de réseau
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.emit('network:online');
        });

        window.addEventListener('offline', () => {
            console.log('📡 Connexion perdue');
            this.emit('network:offline');
        });
    }

    /**
     * Ajoute un écouteur d'événement
     */
    on(eventName, callback, options = {}) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: options.id || this.generateId()
        };

        this.listeners.get(eventName).push(listener);

        // Trier par priorité (plus haut = exécuté en premier)
        this.listeners.get(eventName).sort((a, b) => b.priority - a.priority);

        console.log(`📝 Écouteur ajouté pour '${eventName}'`);
        return listener.id;
    }

    /**
     * Supprime un écouteur d'événement
     */
    off(eventName, callbackOrId) {
        if (!this.listeners.has(eventName)) return false;

        const listeners = this.listeners.get(eventName);
        let index = -1;

        if (typeof callbackOrId === 'function') {
            index = listeners.findIndex(l => l.callback === callbackOrId);
        } else {
            index = listeners.findIndex(l => l.id === callbackOrId);
        }

        if (index > -1) {
            listeners.splice(index, 1);
            console.log(`🗑️ Écouteur supprimé pour '${eventName}'`);
            return true;
        }

        return false;
    }

    /**
     * Émet un événement
     */
    emit(eventName, data = null, options = {}) {
        if (!this.initialized && !options.force) {
            // Mettre en queue si pas encore initialisé
            this.eventQueue.push({ eventName, data, options });
            return;
        }

        console.log(`📢 Événement émis: ${eventName}`, data);

        if (!this.listeners.has(eventName)) {
            console.log(`⚠️ Aucun écouteur pour '${eventName}'`);
            return;
        }

        const listeners = [...this.listeners.get(eventName)];
        const results = [];

        for (const listener of listeners) {
            try {
                const result = listener.callback(data, eventName);
                results.push(result);

                // Supprimer si c'est un écouteur "once"
                if (listener.once) {
                    this.off(eventName, listener.id);
                }

            } catch (error) {
                console.error(`❌ Erreur dans l'écouteur '${eventName}':`, error);

                this.emit('listener:error', {
                    eventName,
                    error,
                    listenerId: listener.id
                }, { force: true });
            }
        }

        return results;
    }

    /**
     * Émet un événement avec délai
     */
    emitAsync(eventName, data = null, delay = 0) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = this.emit(eventName, data);
                resolve(results);
            }, delay);
        });
    }

    /**
     * Émet un événement une seule fois
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Traite la queue d'événements en attente
     */
    processEventQueue() {
        while (this.eventQueue.length > 0) {
            const { eventName, data, options } = this.eventQueue.shift();
            this.emit(eventName, data, { ...options, force: true });
        }
    }

    /**
     * Génère un ID unique pour les écouteurs
     */
    generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Supprime tous les écouteurs d'un événement
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.listeners.delete(eventName);
            console.log(`🧹 Tous les écouteurs supprimés pour '${eventName}'`);
        } else {
            this.listeners.clear();
            console.log('🧹 Tous les écouteurs supprimés');
        }
    }

    /**
     * Liste tous les événements avec leurs écouteurs
     */
    listEvents() {
        const events = {};
        for (const [eventName, listeners] of this.listeners) {
            events[eventName] = listeners.length;
        }
        return events;
    }

    /**
     * Diagnostic du gestionnaire d'événements
     */
    diagnose() {
        const stats = {
            initialized: this.initialized,
            totalEvents: this.listeners.size,
            totalListeners: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            queuedEvents: this.eventQueue.length,
            events: this.listEvents()
        };

        console.log('🔍 === DIAGNOSTIC EVENTS MANAGER ===');
        console.log('📊 Statistiques:', stats);

        return stats;
    }
}

// ==================== ÉVÉNEMENTS SPÉCIFIQUES AU PLANNING ====================

class PlanningEvents extends EventsManager {
    constructor() {
        super();
        this.setupPlanningEvents();
    }

    /**
     * Configure les événements spécifiques au planning
     */
    setupPlanningEvents() {
        // Événements employés
        this.registerEventType('employee:added');
        this.registerEventType('employee:updated');
        this.registerEventType('employee:deleted');
        this.registerEventType('employee:selected');

        // Événements créneaux
        this.registerEventType('shift:added');
        this.registerEventType('shift:updated');
        this.registerEventType('shift:deleted');
        this.registerEventType('shift:moved');
        this.registerEventType('shift:selected');

        // Événements planning
        this.registerEventType('planning:refresh');
        this.registerEventType('planning:week-changed');
        this.registerEventType('planning:view-changed');
        this.registerEventType('planning:data-loaded');

        // Événements UI
        this.registerEventType('modal:opened');
        this.registerEventType('modal:closed');
        this.registerEventType('notification:shown');
        this.registerEventType('notification:dismissed');

        // Événements drag & drop
        this.registerEventType('drag:start');
        this.registerEventType('drag:end');
        this.registerEventType('drop:success');
        this.registerEventType('drop:failed');
    }

    /**
     * Enregistre un type d'événement
     */
    registerEventType(eventType) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
    }

    /**
     * Émission d'événements raccourcis pour le planning
     */

    // Employés
    employeeAdded(employee) {
        this.emit('employee:added', { employee });
    }

    employeeUpdated(employeeId, employee) {
        this.emit('employee:updated', { id: employeeId, employee });
    }

    employeeDeleted(employeeId) {
        this.emit('employee:deleted', { id: employeeId });
    }

    // Créneaux
    shiftAdded(shift) {
        this.emit('shift:added', { shift });
    }

    shiftUpdated(shiftId, shift) {
        this.emit('shift:updated', { id: shiftId, shift });
    }

    shiftDeleted(shiftId) {
        this.emit('shift:deleted', { id: shiftId });
    }

    shiftMoved(shiftId, from, to) {
        this.emit('shift:moved', { id: shiftId, from, to });
    }

    // Planning
    planningRefresh() {
        this.emit('planning:refresh');
    }

    weekChanged(weekOffset) {
        this.emit('planning:week-changed', { weekOffset });
    }

    dataLoaded(data) {
        this.emit('planning:data-loaded', data);
    }
}

// ==================== GESTIONNAIRE D'ÉVÉNEMENTS DOM ====================

class DOMEventsManager {
    constructor() {
        this.delegatedEvents = new Map();
        this.setupDelegation();
    }

    /**
     * Configure la délégation d'événements
     */
    setupDelegation() {
        // Délégation pour les clics
        document.addEventListener('click', (e) => {
            this.handleDelegatedEvent('click', e);
        });

        // Délégation pour les changements
        document.addEventListener('change', (e) => {
            this.handleDelegatedEvent('change', e);
        });

        // Délégation pour les soumissions de formulaires
        document.addEventListener('submit', (e) => {
            this.handleDelegatedEvent('submit', e);
        });

        // Délégation pour les événements input
        document.addEventListener('input', (e) => {
            this.handleDelegatedEvent('input', e);
        });
    }

    /**
     * Gère un événement délégué
     */
    handleDelegatedEvent(eventType, e) {
        const element = e.target;

        // Vérifier les attributs data-action
        if (element.dataset.action) {
            this.handleDataAction(element.dataset.action, e, element);
        }

        // Vérifier les classes CSS pour les actions
        this.handleCSSClassActions(element, e);
    }

    /**
     * Gère les actions basées sur data-action
     */
    handleDataAction(action, event, element) {
        console.log(`🎯 Action détectée: ${action}`);

        switch (action) {
            case 'add-employee':
                event.preventDefault();
                if (window.UIManager) {
                    window.UIManager.showAddEmployeeModal();
                }
                break;

            case 'edit-employee':
                event.preventDefault();
                const employeeId = element.dataset.employeeId;
                if (employeeId && window.UIManager) {
                    window.UIManager.showEditEmployeeModal(employeeId);
                }
                break;

            case 'add-shift':
                event.preventDefault();
                if (window.UIManager) {
                    window.UIManager.showAddShiftModal();
                }
                break;

            case 'close-modal':
                event.preventDefault();
                if (window.modalManager) {
                    window.modalManager.closeModal();
                }
                break;

            default:
                console.log(`⚠️ Action non gérée: ${action}`);
        }
    }

    /**
     * Gère les actions basées sur les classes CSS
     */
    handleCSSClassActions(element, event) {
        // Fermeture des notifications
        if (element.classList.contains('notification-close')) {
            const notification = element.closest('.notification');
            if (notification && window.NotificationManager) {
                window.NotificationManager.dismiss(notification.id);
            }
        }

        // Fermeture des modals en cliquant sur le backdrop
        if (element.classList.contains('modal')) {
            if (window.modalManager) {
                window.modalManager.closeModal();
            }
        }
    }
}

// ==================== INITIALISATION GLOBALE ====================

// Instance globale du gestionnaire d'événements
const eventsManager = new PlanningEvents();
const domEventsManager = new DOMEventsManager();

// Export global
window.eventsManager = eventsManager;
window.domEventsManager = domEventsManager;

// Raccourcis globaux pour compatibilité
window.EventBus = eventsManager;
window.on = (event, callback, options) => eventsManager.on(event, callback, options);
window.emit = (event, data) => eventsManager.emit(event, data);
window.off = (event, callback) => eventsManager.off(event, callback);

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation Events Manager...');
    eventsManager.init();
});

// Fonctions utilitaires globales
window.addEventListener('load', () => {
    // Notifier que l'application est complètement chargée
    eventsManager.emit('app:ready');

    // Diagnostic automatique en mode debug
    if (window.location.search.includes('debug=true')) {
        setTimeout(() => {
            eventsManager.diagnose();
        }, 2000);
    }
});

// Gestion des erreurs de chargement de fichiers
window.addEventListener('error', (e) => {
    if (e.target.src && e.target.src.includes('events.js')) {
        console.log('✅ Fichier events.js manquant remplacé par ce gestionnaire');
    }
}, true);

console.log('✅ Events Manager chargé et remplace events.js');