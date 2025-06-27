/**
 * CONFIGURATION CENTRALISÉE - Planning Restaurant
 * Fichier unique pour toute la configuration de l'application
 * Élimine les doublons et conflits entre config.js, planning-core.js, etc.
 */

class PlanningConfig {
    constructor() {
        this.loadFlaskConfig();
        this.initializeDefaults();
        this.validateConfig();

        console.log('🔧 Configuration centralisée chargée');
    }

    /**
     * Charge la configuration depuis Flask (injectée dans le HTML)
     */
    loadFlaskConfig() {
        try {
            const configElement = document.getElementById('flask-config');
            if (configElement) {
                this.flaskConfig = JSON.parse(configElement.textContent);
                console.log('📊 Configuration Flask chargée:', this.flaskConfig);
            } else {
                console.warn('⚠️ Configuration Flask non trouvée, utilisation des valeurs par défaut');
                this.flaskConfig = {};
            }
        } catch (error) {
            console.error('❌ Erreur chargement configuration Flask:', error);
            this.flaskConfig = {};
        }
    }

    /**
     * Initialise les valeurs par défaut
     */
    initializeDefaults() {
        // API et endpoints
        this.API_BASE = this.flaskConfig.API_BASE || '/api';
        this.API_TIMEOUT = 10000; // 10 secondes

        // Granularité temporelle
        this.TIME_SLOT_GRANULARITY = this.flaskConfig.TIME_SLOT_GRANULARITY || 60;
        this.AVAILABLE_GRANULARITIES = [15, 30, 60];

        // Heures et jours
        this.HOURS_RANGE = this.flaskConfig.HOURS_RANGE || [
            8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2
        ];
        this.DAYS_OF_WEEK = this.flaskConfig.DAYS_OF_WEEK || [
            'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
        ];

        // Types d'employés avec couleurs
        this.EMPLOYEE_TYPES = this.flaskConfig.EMPLOYEE_TYPES || {
            'cuisinier': { color: '#74b9ff', name: 'Cuisinier' },
            'serveur': { color: '#00b894', name: 'Serveur/se' },
            'barman': { color: '#fdcb6e', name: 'Barman' },
            'manager': { color: '#a29bfe', name: 'Manager' },
            'aide': { color: '#6c5ce7', name: 'Aide de cuisine' },
            'commis': { color: '#fd79a8', name: 'Commis' }
        };

        // Interface utilisateur
        this.UI = {
            CELL_HEIGHT: {
                15: 15,
                30: 30,
                60: 60
            },
            AVATAR_SIZE: {
                small: 20,
                normal: 32,
                large: 48,
                xlarge: 64
            },
            ANIMATION_DURATION: 300,
            NOTIFICATION_DURATION: 3000,
            MODAL_ANIMATION: 250,
            DRAG_SENSITIVITY: 5
        };

        // Limites et validation
        this.LIMITS = {
            MIN_SHIFT_DURATION: 0.25, // 15 minutes minimum
            MAX_SHIFT_DURATION: 24,   // 24 heures maximum
            MAX_SHIFTS_PER_DAY: 50,   // Limite raisonnable
            MAX_EMPLOYEES: 100,       // Limite système
            MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
            PHOTO_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        };

        // Événements de l'application
        this.EVENTS = {
            // Données
            DATA_LOADED: 'planning:data:loaded',
            DATA_ERROR: 'planning:data:error',

            // Employés
            EMPLOYEE_ADDED: 'planning:employee:added',
            EMPLOYEE_UPDATED: 'planning:employee:updated',
            EMPLOYEE_DELETED: 'planning:employee:deleted',
            PHOTO_UPDATED: 'planning:photo:updated',

            // Créneaux
            SHIFT_ADDED: 'planning:shift:added',
            SHIFT_UPDATED: 'planning:shift:updated',
            SHIFT_DELETED: 'planning:shift:deleted',
            SHIFT_MOVED: 'planning:shift:moved',

            // Interface
            WEEK_CHANGED: 'planning:week:changed',
            VIEW_CHANGED: 'planning:view:changed',
            GRANULARITY_CHANGED: 'planning:granularity:changed',

            // Système
            ERROR_OCCURRED: 'planning:error',
            SUCCESS_MESSAGE: 'planning:success',
            LOADING_STARTED: 'planning:loading:start',
            LOADING_ENDED: 'planning:loading:end'
        };

        // Messages et textes
        this.MESSAGES = {
            LOADING: 'Chargement en cours...',
            SAVING: 'Sauvegarde en cours...',
            ERROR_GENERIC: 'Une erreur est survenue',
            ERROR_NETWORK: 'Erreur de connexion au serveur',
            ERROR_VALIDATION: 'Données invalides',
            SUCCESS_SAVED: 'Données sauvegardées avec succès',
            SUCCESS_DELETED: 'Suppression effectuée',
            CONFIRM_DELETE: 'Êtes-vous sûr de vouloir supprimer ?'
        };
    }

    /**
     * Valide la configuration
     */
    validateConfig() {
        const errors = [];

        // Vérifier les heures
        if (!Array.isArray(this.HOURS_RANGE) || this.HOURS_RANGE.length === 0) {
            errors.push('HOURS_RANGE doit être un tableau non vide');
        }

        // Vérifier les jours
        if (!Array.isArray(this.DAYS_OF_WEEK) || this.DAYS_OF_WEEK.length !== 7) {
            errors.push('DAYS_OF_WEEK doit contenir exactement 7 jours');
        }

        // Vérifier la granularité
        if (!this.AVAILABLE_GRANULARITIES.includes(this.TIME_SLOT_GRANULARITY)) {
            errors.push(`Granularité ${this.TIME_SLOT_GRANULARITY} non supportée`);
        }

        // Vérifier les types d'employés
        if (!this.EMPLOYEE_TYPES || typeof this.EMPLOYEE_TYPES !== 'object') {
            errors.push('EMPLOYEE_TYPES doit être un objet');
        } else {
            for (const [type, config] of Object.entries(this.EMPLOYEE_TYPES)) {
                if (!config.color || !config.name) {
                    errors.push(`Type d'employé '${type}' mal configuré`);
                }
            }
        }

        if (errors.length > 0) {
            console.error('❌ Erreurs de configuration:', errors);
            throw new Error(`Configuration invalide: ${errors.join(', ')}`);
        }

        console.log('✅ Configuration validée avec succès');
    }

    /**
     * Met à jour la granularité
     */
    setGranularity(granularity) {
        if (!this.AVAILABLE_GRANULARITIES.includes(granularity)) {
            throw new Error(`Granularité ${granularity} non supportée`);
        }

        const oldGranularity = this.TIME_SLOT_GRANULARITY;
        this.TIME_SLOT_GRANULARITY = granularity;

        console.log(`🕐 Granularité changée: ${oldGranularity}min → ${granularity}min`);

        // Émettre l'événement de changement
        if (window.EventBus) {
            window.EventBus.emit(this.EVENTS.GRANULARITY_CHANGED, {
                old: oldGranularity,
                new: granularity
            });
        }
    }

    /**
     * Obtient la hauteur de cellule selon la granularité
     */
    getCellHeight() {
        return this.UI.CELL_HEIGHT[this.TIME_SLOT_GRANULARITY] || 60;
    }

    /**
     * Génère les créneaux temporels selon la granularité
     */
    generateTimeSlots() {
        const slots = [];

        this.HOURS_RANGE.forEach(hour => {
            if (this.TIME_SLOT_GRANULARITY === 60) {
                // Une seule entrée par heure
                slots.push({
                    hour,
                    minutes: 0,
                    display: `${hour.toString().padStart(2, '0')}:00`,
                    key: `${hour}_0`,
                    isMainHour: true
                });
            } else {
                // Sous-créneaux selon la granularité
                const slotsPerHour = 60 / this.TIME_SLOT_GRANULARITY;

                for (let slot = 0; slot < slotsPerHour; slot++) {
                    const minutes = slot * this.TIME_SLOT_GRANULARITY;

                    slots.push({
                        hour,
                        minutes,
                        display: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                        key: `${hour}_${minutes}`,
                        isMainHour: minutes === 0
                    });
                }
            }
        });

        return slots;
    }

    /**
     * Obtient la configuration d'un type d'employé
     */
    getEmployeeTypeConfig(type) {
        return this.EMPLOYEE_TYPES[type] || {
            color: '#6c757d',
            name: type || 'Inconnu'
        };
    }

    /**
     * Vérifie si une durée est valide
     */
    isValidDuration(duration) {
        return duration >= this.LIMITS.MIN_SHIFT_DURATION &&
               duration <= this.LIMITS.MAX_SHIFT_DURATION;
    }

    /**
     * Convertit une durée en nombre de créneaux
     */
    durationToSlots(duration) {
        if (this.TIME_SLOT_GRANULARITY === 60) {
            return Math.ceil(duration);
        }
        return Math.ceil((duration * 60) / this.TIME_SLOT_GRANULARITY);
    }

    /**
     * Convertit un nombre de créneaux en durée
     */
    slotsToDuration(slots) {
        if (this.TIME_SLOT_GRANULARITY === 60) {
            return slots;
        }
        return (slots * this.TIME_SLOT_GRANULARITY) / 60;
    }

    /**
     * Exporte la configuration pour le debugging
     */
    export() {
        return {
            api: { base: this.API_BASE, timeout: this.API_TIMEOUT },
            time: {
                granularity: this.TIME_SLOT_GRANULARITY,
                available: this.AVAILABLE_GRANULARITIES,
                hours: this.HOURS_RANGE,
                days: this.DAYS_OF_WEEK
            },
            employees: this.EMPLOYEE_TYPES,
            ui: this.UI,
            limits: this.LIMITS,
            events: this.EVENTS
        };
    }
}

// Instance globale unique
if (!window.Config) {
    window.Config = new PlanningConfig();

    // Exposer pour le debugging
    window.Config.debug = () => {
        console.table(window.Config.export());
    };
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningConfig;
}