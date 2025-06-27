/**
 * APPLICATION PRINCIPALE - Planning Restaurant
 * Point d'entrée unifié qui remplace app-init.js et tous les scripts d'initialisation
 * Orchestration complète de l'initialisation et du cycle de vie de l'application
 */

class PlanningApp {
    constructor() {
        this.isInitialized = false;
        this.startTime = performance.now();
        this.initializeQueue = [];

        console.log('🚀 Initialisation de Planning Restaurant v2.0...');
        this.bindGlobalEvents();
    }

    /**
     * Lie les événements globaux avant l'initialisation
     */
    bindGlobalEvents() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            // DOM déjà prêt
            this.initialize();
        }

        // Gestion des erreurs globales
        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e));

        // Gestion de la fermeture de l'application
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    }

    /**
     * Initialisation principale de l'application
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Application déjà initialisée');
            return;
        }

        try {
            console.log('📋 Démarrage de l\'initialisation...');

            // Phase 1 : Vérification des prérequis
            await this.checkPrerequisites();

            // Phase 2 : Initialisation des modules core
            await this.initializeCore();

            // Phase 3 : Initialisation des managers
            await this.initializeManagers();

            // Phase 4 : Initialisation des composants UI
            await this.initializeUI();

            // Phase 5 : Chargement des données
            await this.loadInitialData();

            // Phase 6 : Finalisation
            await this.finalize();

            this.isInitialized = true;
            const totalTime = performance.now() - this.startTime;

            console.log(`✅ Application initialisée en ${totalTime.toFixed(2)}ms`);
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Vérifie les prérequis de l'application
     */
    async checkPrerequisites() {
        console.log('🔍 Vérification des prérequis...');

        const requirements = [
            { name: 'Fetch API', check: () => typeof fetch !== 'undefined' },
            { name: 'ES6 Classes', check: () => typeof class {} === 'function' },
            { name: 'Map/Set', check: () => typeof Map !== 'undefined' && typeof Set !== 'undefined' },
            { name: 'Promise', check: () => typeof Promise !== 'undefined' },
            { name: 'Éléments DOM requis', check: () => this.checkRequiredElements() }
        ];

        const missing = requirements.filter(req => !req.check());

        if (missing.length > 0) {
            throw new Error(`Prérequis manquants: ${missing.map(r => r.name).join(', ')}`);
        }

        console.log('✅ Tous les prérequis sont satisfaits');
    }

    /**
     * Vérifie la présence des éléments DOM requis
     */
    checkRequiredElements() {
        const required = [
            '#app',
            '#planningGrid',
            '#planningHeader',
            '#modalContainer',
            '#notificationContainer'
        ];

        return required.every(selector => document.querySelector(selector));
    }

    /**
     * Initialise les modules core
     */
    async initializeCore() {
        console.log('🔧 Initialisation des modules core...');

        // Vérifier que les modules core sont chargés
        this.ensureModuleLoaded('Config', 'Configuration manquante');
        this.ensureModuleLoaded('State', 'State management manquant');

        // Initialiser EventBus s'il n'existe pas déjà
        if (!window.EventBus) {
            window.EventBus = this.createEventBus();
        }

        console.log('✅ Modules core initialisés');
    }

    /**
     * Crée un EventBus simple si pas déjà disponible
     */
    createEventBus() {
        return {
            events: new Map(),

            on(event, callback) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event).push(callback);
            },

            off(event, callback) {
                if (this.events.has(event)) {
                    const callbacks = this.events.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            },

            emit(event, data = null) {
                if (this.events.has(event)) {
                    this.events.get(event).forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error(`Erreur dans l'événement ${event}:`, error);
                        }
                    });
                }
            }
        };
    }

    /**
     * Initialise les managers principaux
     */
    async initializeManagers() {
        console.log('🎛️ Initialisation des managers...');

        // APIManager
        this.ensureModuleLoaded('APIManager', 'API Manager manquant');

        // PlanningManager
        this.ensureModuleLoaded('PlanningManager', 'Planning Manager manquant');

        // Initialiser les managers qui le nécessitent
        if (window.PlanningManager && typeof window.PlanningManager.initialize === 'function') {
            await window.PlanningManager.initialize();
        }

        console.log('✅ Managers initialisés');
    }

    /**
     * Initialise les composants UI
     */
    async initializeUI() {
        console.log('🎨 Initialisation de l\'interface utilisateur...');

        // Initialiser les composants si disponibles
        if (window.UIManager && typeof window.UIManager.initialize === 'function') {
            await window.UIManager.initialize();
        }

        if (window.NotificationManager && typeof window.NotificationManager.initialize === 'function') {
            await window.NotificationManager.initialize();
        }

        if (window.ModalManager && typeof window.ModalManager.initialize === 'function') {
            await window.ModalManager.initialize();
        }

        if (window.LegendManager && typeof window.LegendManager.initialize === 'function') {
            await window.LegendManager.initialize();
        }

        // Configurer les événements UI globaux
        this.setupGlobalUIEvents();

        console.log('✅ Interface utilisateur initialisée');
    }

    /**
     * Configure les événements UI globaux
     */
    setupGlobalUIEvents() {
        // Boutons d'action principaux
        const addEmployeeBtn = document.querySelector('[data-action="add-employee"]');
        const addShiftBtn = document.querySelector('[data-action="add-shift"]');

        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => this.handleAddEmployee());
        }

        if (addShiftBtn) {
            addShiftBtn.addEventListener('click', () => this.handleAddShift());
        }

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Gestion responsive
        this.setupResponsiveHandling();
    }

    /**
     * Gère les raccourcis clavier
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N : Nouvel employé
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
            e.preventDefault();
            this.handleAddEmployee();
        }

        // Ctrl/Cmd + Shift + N : Nouveau créneau
        if ((e.ctrlKey || e.metaKey) && e.key === 'N' && e.shiftKey) {
            e.preventDefault();
            this.handleAddShift();
        }

        // Échap : Fermer les modals
        if (e.key === 'Escape') {
            if (window.ModalManager && typeof window.ModalManager.closeAll === 'function') {
                window.ModalManager.closeAll();
            }
        }
    }

    /**
     * Configure la gestion responsive
     */
    setupResponsiveHandling() {
        // Media queries
        const mediaQueries = {
            mobile: window.matchMedia('(max-width: 768px)'),
            tablet: window.matchMedia('(max-width: 1024px)'),
            desktop: window.matchMedia('(min-width: 1025px)')
        };

        // Écouter les changements
        Object.entries(mediaQueries).forEach(([name, mq]) => {
            mq.addListener(() => this.handleBreakpointChange(name, mq.matches));
            // Exécuter immédiatement
            this.handleBreakpointChange(name, mq.matches);
        });
    }

    /**
     * Gère les changements de breakpoint
     */
    handleBreakpointChange(breakpoint, matches) {
        if (matches) {
            document.body.classList.add(`breakpoint-${breakpoint}`);
            console.log(`📱 Breakpoint actif: ${breakpoint}`);
        } else {
            document.body.classList.remove(`breakpoint-${breakpoint}`);
        }

        // Émettre l'événement
        window.EventBus?.emit('breakpoint:changed', { breakpoint, matches });
    }

    /**
     * Charge les données initiales
     */
    async loadInitialData() {
        console.log('📥 Chargement des données initiales...');

        if (window.APIManager && typeof window.APIManager.loadInitialData === 'function') {
            try {
                await window.APIManager.loadInitialData();
                console.log('✅ Données initiales chargées');
            } catch (error) {
                console.error('❌ Erreur chargement données:', error);
                this.showDataLoadError(error);
            }
        } else {
            console.warn('⚠️ APIManager.loadInitialData non disponible - mode hors ligne');
            this.loadFallbackData();
        }
    }

    /**
     * Charge des données de démonstration si l'API n'est pas disponible
     */
    loadFallbackData() {
        console.log('🔄 Chargement des données de démonstration...');

        // Données d'exemple
        const demoEmployees = [
            {
                id: 'demo-1',
                prenom: 'Jean',
                nom: 'Dupont',
                poste: 'cuisinier',
                taux_horaire: 15.0,
                actif: true
            },
            {
                id: 'demo-2',
                prenom: 'Marie',
                nom: 'Martin',
                poste: 'serveur',
                taux_horaire: 12.5,
                actif: true
            }
        ];

        const demoShifts = [
            {
                id: 'shift-1',
                employee_id: 'demo-1',
                day: 'Lundi',
                start_hour: 9,
                start_minutes: 0,
                duration: 8
            },
            {
                id: 'shift-2',
                employee_id: 'demo-2',
                day: 'Lundi',
                start_hour: 12,
                start_minutes: 0,
                duration: 6
            }
        ];

        // Charger dans le state
        if (window.State) {
            demoEmployees.forEach(emp => window.State.setEmployee(emp));
            demoShifts.forEach(shift => window.State.setShift(shift));
        }

        console.log('✅ Données de démonstration chargées');
    }

    /**
     * Finalise l'initialisation
     */
    async finalize() {
        console.log('🏁 Finalisation de l\'initialisation...');

        // Déclencher le rendu initial
        if (window.PlanningManager && typeof window.PlanningManager.refreshDisplay === 'function') {
            window.PlanningManager.refreshDisplay();
        }

        // Configurer le drag & drop si disponible
        if (window.DragDropManager && typeof window.DragDropManager.initialize === 'function') {
            await window.DragDropManager.initialize();
        }

        // Émettre l'événement d'initialisation complète
        window.EventBus?.emit(window.Config?.EVENTS.DATA_LOADED, {
            timestamp: new Date(),
            duration: performance.now() - this.startTime
        });

        // Nettoyer les états de chargement
        document.body.classList.remove('loading');
        document.body.classList.add('initialized');

        console.log('✅ Finalisation terminée');
    }

    /**
     * Affiche un message de bienvenue
     */
    showWelcomeMessage() {
        if (window.NotificationManager && typeof window.NotificationManager.success === 'function') {
            window.NotificationManager.success(
                'Application initialisée',
                'Planning Restaurant est prêt à utiliser !'
            );
        } else {
            console.log('🎉 Bienvenue dans Planning Restaurant !');
        }
    }

    /**
     * Gère les erreurs d'initialisation
     */
    handleInitializationError(error) {
        console.error('💥 Erreur critique d\'initialisation:', error);

        // Afficher une erreur à l'utilisateur
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                max-width: 500px;
                text-align: center;
                z-index: 9999;
            ">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">
                    ❌ Erreur d'initialisation
                </h2>
                <p style="margin-bottom: 1.5rem; color: #374151;">
                    Une erreur est survenue lors du chargement de l'application.
                </p>
                <details style="text-align: left; margin-bottom: 1.5rem;">
                    <summary style="cursor: pointer; color: #6b7280;">Détails techniques</summary>
                    <pre style="
                        background: #f3f4f6;
                        padding: 1rem;
                        border-radius: 4px;
                        margin-top: 0.5rem;
                        font-size: 0.875rem;
                        overflow-x: auto;
                    ">${error.message}\n\n${error.stack || ''}</pre>
                </details>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">
                    🔄 Recharger la page
                </button>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9998;
            "></div>
        `;

        document.body.appendChild(errorContainer);
    }

    /**
     * Gère les erreurs JavaScript globales
     */
    handleGlobalError(event) {
        console.error('🚨 Erreur JavaScript globale:', event.error);

        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(
                'Erreur application',
                'Une erreur inattendue s\'est produite'
            );
        }

        // Émettre l'événement d'erreur
        window.EventBus?.emit(window.Config?.EVENTS.ERROR_OCCURRED, {
            type: 'javascript',
            error: event.error,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date()
        });
    }

    /**
     * Gère les promesses rejetées non capturées
     */
    handleUnhandledRejection(event) {
        console.error('🚨 Promesse rejetée non capturée:', event.reason);

        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(
                'Erreur réseau',
                'Une opération a échoué de manière inattendue'
            );
        }

        // Émettre l'événement d'erreur
        window.EventBus?.emit(window.Config?.EVENTS.ERROR_OCCURRED, {
            type: 'unhandled_rejection',
            reason: event.reason,
            timestamp: new Date()
        });
    }

    /**
     * Gère la fermeture de l'application
     */
    handleBeforeUnload(event) {
        // Vérifier s'il y a des changements non sauvegardés
        const isDirty = window.State?.getState('temp.isDirty');

        if (isDirty) {
            const message = 'Des modifications non sauvegardées seront perdues. Continuer ?';
            event.returnValue = message;
            return message;
        }
    }

    /**
     * Gère l'ajout d'un employé
     */
    handleAddEmployee() {
        if (window.UIManager && typeof window.UIManager.showAddEmployeeModal === 'function') {
            window.UIManager.showAddEmployeeModal();
        } else {
            console.warn('UIManager.showAddEmployeeModal non disponible');
        }
    }

    /**
     * Gère l'ajout d'un créneau
     */
    handleAddShift() {
        if (window.UIManager && typeof window.UIManager.showAddShiftModal === 'function') {
            window.UIManager.showAddShiftModal();
        } else {
            console.warn('UIManager.showAddShiftModal non disponible');
        }
    }

    /**
     * Affiche une erreur de chargement de données
     */
    showDataLoadError(error) {
        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(
                'Erreur de chargement',
                'Impossible de charger les données. Mode hors ligne activé.'
            );
        }
    }

    /**
     * Vérifie qu'un module est chargé
     */
    ensureModuleLoaded(moduleName, errorMessage) {
        if (!window[moduleName]) {
            throw new Error(`${errorMessage} - Module ${moduleName} introuvable`);
        }
    }

    // ==================== API PUBLIQUE ====================

    /**
     * Redémarre l'application
     */
    async restart() {
        console.log('🔄 Redémarrage de l\'application...');

        // Réinitialiser les états
        this.isInitialized = false;
        this.startTime = performance.now();

        // Nettoyer les managers si possible
        if (window.PlanningManager && typeof window.PlanningManager.destroy === 'function') {
            window.PlanningManager.destroy();
        }

        // Vider les caches
        if (window.State && typeof window.State.reset === 'function') {
            window.State.reset();
        }

        // Relancer l'initialisation
        await this.initialize();
    }

    /**
     * Obtient l'état de l'application
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: {
                Config: !!window.Config,
                State: !!window.State,
                APIManager: !!window.APIManager,
                PlanningManager: !!window.PlanningManager,
                EventBus: !!window.EventBus
            },
            data: window.State ? window.State.getSummary() : null,
            performance: {
                initTime: this.isInitialized ? performance.now() - this.startTime : null
            }
        };
    }

    /**
     * Active/désactive le mode debug
     */
    toggleDebugMode(enabled = true) {
        if (enabled) {
            console.log('🐛 Mode debug activé');
            window.DEBUG = true;
            document.body.classList.add('debug-mode');

            // Exposer des utilitaires de debug
            window.debugApp = () => {
                console.table(this.getStatus());
                if (window.State) window.State.debug();
                if (window.Config) window.Config.debug();
            };

        } else {
            console.log('🐛 Mode debug désactivé');
            window.DEBUG = false;
            document.body.classList.remove('debug-mode');
            delete window.debugApp;
        }
    }

    /**
     * Exporte les données de l'application
     */
    exportData() {
        if (window.State && typeof window.State.exportData === 'function') {
            return window.State.exportData();
        }
        return null;
    }

    /**
     * Importe des données dans l'application
     */
    async importData(data) {
        if (window.State && typeof window.State.importData === 'function') {
            window.State.importData(data);

            // Rafraîchir l'affichage
            if (window.PlanningManager && typeof window.PlanningManager.refreshDisplay === 'function') {
                window.PlanningManager.refreshDisplay();
            }

            console.log('📥 Données importées avec succès');
        }
    }
}

// ==================== INITIALISATION GLOBALE ====================

// Créer l'instance globale de l'application
if (!window.App) {
    window.App = new PlanningApp();

    // Exposer les méthodes utiles pour le debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.App.toggleDebugMode(true);
        console.log('💻 Mode développement détecté - Debug activé');
    }
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningApp;
}

console.log('📱 Application Planning Restaurant chargée et prête à démarrer');