/**
 * Configuration globale de l'application Planning Restaurant
 * CORRECTION : Ne pas redéclarer AppState s'il existe déjà
 */

// Configuration principale
const PlanningConfig = {
    API_BASE: '/api',
    CELL_HEIGHT: 60,
    MIN_SHIFT_DURATION: 1,
    MAX_SHIFT_DURATION: 12,
    HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],

    AVATAR_SIZE: {
        small: 24,
        normal: 32,
        large: 48,
        xlarge: 64
    },

    EMPLOYEE_TYPES: {
        'cuisinier': { color: '#74b9ff', name: 'Cuisinier' },
        'serveur': { color: '#00b894', name: 'Serveur/se' },
        'barman': { color: '#fdcb6e', name: 'Barman' },
        'manager': { color: '#a29bfe', name: 'Manager' },
        'aide': { color: '#6c5ce7', name: 'Aide de cuisine' },
        'commis': { color: '#fd79a8', name: 'Commis' }
    }
};

// CORRECTION : Ne créer AppState que s'il n'existe pas déjà
if (typeof window.AppState === 'undefined') {
    window.AppState = {
        employees: new Map(),
        shifts: new Map(),
        draggedElement: null,
        dragOffset: { x: 0, y: 0 },
        isResizing: false,
        resizeDirection: null,
        currentWeekOffset: 0,
        isDirty: false,
        isLoading: false
    };
    console.log('📋 AppState créé par config.js');
} else {
    console.log('📋 AppState existe déjà, conservation des données');
}

// Événements personnalisés
const PlanningEvents = {
    DATA_LOADED: 'data_loaded',
    SHIFT_CREATED: 'shift_created',
    SHIFT_UPDATED: 'shift_updated',
    SHIFT_DELETED: 'shift_deleted',
    SHIFT_ADDED: 'shift_added',
    EMPLOYEE_ADDED: 'employee_added',
    PHOTO_UPDATED: 'photo_updated',
    WEEK_CHANGED: 'week_changed',
    ERROR_OCCURRED: 'error_occurred'
};

// Event Bus simple
const EventBus = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    },
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
};

// Protection contre les boucles DOM
let isDOMConfiguring = false;
let lastDOMConfigTime = 0;

window.configureEvents = function() {
    const now = Date.now();
    if (isDOMConfiguring || (now - lastDOMConfigTime) < 2000) {
        return; // Ignorer si trop récent
    }

    isDOMConfiguring = true;
    lastDOMConfigTime = now;

    // Votre code de configuration existant...

    setTimeout(() => {
        isDOMConfiguring = false;
    }, 1000);
};

// Fonction de diagnostic AppState
window.debugAppState = function() {
    console.log('🔍 Debug AppState:');
    console.log('  employees.size:', window.AppState?.employees?.size);
    console.log('  shifts.size:', window.AppState?.shifts?.size);
    console.log('  employees:', window.AppState?.employees);
    console.log('  shifts:', window.AppState?.shifts);
};

console.log('📋 Configuration Planning Restaurant chargée (avec protection AppState)');