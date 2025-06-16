/**
 * Configuration globale de l'application Planning Restaurant
 */

// Configuration principale
const PlanningConfig = {
    API_BASE: '/api',
    CELL_HEIGHT: 60,
    MIN_SHIFT_DURATION: 1,
    MAX_SHIFT_DURATION: 12,
    HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
};

// État global de l'application
const AppState = {
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

console.log('📋 Configuration Planning Restaurant chargée');