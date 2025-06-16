/**
 * Planning Restaurant - Configuration et état global (VERSION SANS LOGGER)
 * Fichier central pour la configuration et les variables globales
 */


// Configuration globale de l'application
const PlanningConfig = {
    API_BASE: '/api',
    CELL_HEIGHT: 60,
    MIN_SHIFT_DURATION: 1,
    MAX_SHIFT_DURATION: 12,
    HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],

    // Paramètres d'affichage
    AVATAR_SIZE: {
        small: 20,
        normal: 32,
        large: 48
    },

    // Limites
    MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
    PHOTO_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'],

    // Animation
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 3000
};

// État global de l'application
const AppState = {
    // Données
    employees: new Map(),
    shifts: new Map(),

    // Interface
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    isResizing: false,
    resizeDirection: null,
    currentWeekOffset: 0,

    // État de l'application
    isDirty: false,
    isLoading: false,
    currentView: 'week', // week, day, employee

    // Cache des données organisées
    shiftsByCell: new Map(), // key: "day-hour", value: [shifts]
    employeeShifts: new Map(), // key: employeeId, value: [shifts]

    // Filtres
    filters: {
        employee: '',
        day: '',
        type: ''
    }
};

// Événements personnalisés
const PlanningEvents = {
    SHIFT_ADDED: 'planning:shift:added',
    SHIFT_UPDATED: 'planning:shift:updated',
    SHIFT_DELETED: 'planning:shift:deleted',
    EMPLOYEE_ADDED: 'planning:employee:added',
    EMPLOYEE_UPDATED: 'planning:employee:updated',
    PHOTO_UPDATED: 'planning:photo:updated',
    WEEK_CHANGED: 'planning:week:changed',
    VIEW_CHANGED: 'planning:view:changed',
    DATA_LOADED: 'planning:data:loaded',
    ERROR_OCCURRED: 'planning:error'
};

// Gestionnaire d'événements global
const EventBus = {
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

// Utilitaires globaux
const PlanningUtils = {
    /**
     * Génère un ID unique
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Formate une heure
     */
    formatHour(hour) {
        return hour.toString().padStart(2, '0') + ':00';
    },

    /**
     * Crée une clé de cellule
     */
    getCellKey(day, hour) {
        return `${day}-${hour}`;
    },

    /**
     * Calcule la position d'un élément dans une grille
     */
    calculateGridPosition(day, hour, duration = 1) {
        const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(day);
        const hourIndex = PlanningConfig.HOURS_RANGE.indexOf(hour);

        return {
            dayIndex,
            hourIndex,
            column: dayIndex + 2, // +2 pour la colonne des heures
            rowStart: hourIndex + 1,
            rowEnd: hourIndex + 1 + duration
        };
    },

    /**
     * Vérifie si deux créneaux se chevauchent
     */
    shiftsOverlap(shift1, shift2) {
        if (shift1.day !== shift2.day) return false;
        if (shift1.employee_id === shift2.employee_id && shift1.id === shift2.id) return false;

        const start1 = shift1.start_hour;
        const end1 = (shift1.start_hour + shift1.duration) % 24;
        const start2 = shift2.start_hour;
        const end2 = (shift2.start_hour + shift2.duration) % 24;

        // Cas simple sans traversée de minuit
        if (start1 <= end1 && start2 <= end2) {
            return !(end1 <= start2 || start1 >= end2);
        }

        // Cas complexe avec traversée de minuit (à améliorer si nécessaire)
        return false;
    },

    /**
     * Organise les créneaux par cellule
     */
    organizeShiftsByCell(shifts) {
        const organized = new Map();

        shifts.forEach(shift => {
            // Pour chaque heure du créneau
            for (let i = 0; i < shift.duration; i++) {
                const hour = (shift.start_hour + i) % 24;
                const cellKey = this.getCellKey(shift.day, hour);

                if (!organized.has(cellKey)) {
                    organized.set(cellKey, []);
                }

                // Ajouter seulement à la première heure pour éviter les doublons
                if (i === 0) {
                    organized.get(cellKey).push({
                        shift,
                        isStart: true,
                        hourOffset: i
                    });
                }
            }
        });

        return organized;
    },

    /**
     * Débounce une fonction
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle une fonction
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    /**
     * Vérifie si un élément est visible dans le viewport
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};

// Initialisation des données organisées
function initializeDataStructures() {
    AppState.shiftsByCell.clear();
    AppState.employeeShifts.clear();

    // Organiser les créneaux par cellule
    const organized = PlanningUtils.organizeShiftsByCell(Array.from(AppState.shifts.values()));
    AppState.shiftsByCell = organized;

    // Organiser les créneaux par employé
    AppState.shifts.forEach(shift => {
        if (!AppState.employeeShifts.has(shift.employee_id)) {
            AppState.employeeShifts.set(shift.employee_id, []);
        }
        AppState.employeeShifts.get(shift.employee_id).push(shift);
    });

    // Utiliser Logger seulement s'il existe (défini dans logger-fix.js)
    if (typeof Logger !== 'undefined') {
        Logger.info('Structures de données initialisées', {
            cells: AppState.shiftsByCell.size,
            employees: AppState.employeeShifts.size
        });
    } else {
        console.log('ℹ️ Structures de données initialisées');
    }
}

// Export des objets globaux (SANS LOGGER pour éviter duplicate)
if (typeof window !== 'undefined') {
    // Vérifier avant d'assigner pour éviter les doublons
    if (typeof window.PlanningConfig === 'undefined') {
        window.PlanningConfig = PlanningConfig;
    }

    if (typeof window.AppState === 'undefined') {
        window.AppState = AppState;
    }

    if (typeof window.PlanningUtils === 'undefined') {
        window.PlanningUtils = PlanningUtils;
    }

    if (typeof window.PlanningEvents === 'undefined') {
        window.PlanningEvents = PlanningEvents;
    }

    if (typeof window.EventBus === 'undefined') {
        window.EventBus = EventBus;
    }

    if (typeof window.initializeDataStructures === 'undefined') {
        window.initializeDataStructures = initializeDataStructures;
    }
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanningConfig,
        AppState,
        PlanningUtils,
        PlanningEvents,
        EventBus,
        initializeDataStructures
    };
}

// Utiliser Logger seulement s'il existe
if (typeof Logger !== 'undefined') {
    Logger.info('Planning Core chargé avec succès (sans Logger)');
} else {
    console.log('ℹ️ Planning Core chargé avec succès (sans Logger)');
}