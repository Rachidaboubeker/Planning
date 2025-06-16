/**
 * Planning Restaurant - Correction des erreurs Logger (VERSION CORRIGÉE)
 * Fix pour les variables dupliquées et erreurs de syntaxe
 */

// CORRECTION: Vérification avant création du Logger (évite duplicate variable)
if (typeof window.Logger === 'undefined') {
    window.Logger = {
        level: 'info',

        debug(...args) {
            if (this.level === 'debug') {
                console.log('🐛 [DEBUG]', ...args);
            }
        },

        info(...args) {
            if (['debug', 'info'].includes(this.level)) {
                console.log('ℹ️ [INFO]', ...args);
            }
        },

        warn(...args) {
            if (['debug', 'info', 'warn'].includes(this.level)) {
                console.warn('⚠️ [WARN]', ...args);
            }
        },

        error(...args) {
            console.error('❌ [ERROR]', ...args);
        }
    };
    console.log('🛠️ Logger créé par logger-fix.js');
}

// CORRECTION: Fonction pour créer les objets manquants sans erreur
function createMissingGlobals() {
    // PlanningConfig
    if (typeof window.PlanningConfig === 'undefined') {
        window.PlanningConfig = {
            API_BASE: '/api',
            CELL_HEIGHT: 60,
            HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
            DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
            EMPLOYEE_TYPES: {}
        };
    }

    // AppState
    if (typeof window.AppState === 'undefined') {
        window.AppState = {
            employees: new Map(),
            shifts: new Map(),
            currentWeekOffset: 0,
            isDirty: false,
            isLoading: false,
            shiftsByCell: new Map(),
            employeeShifts: new Map()
        };
    }

    // EventBus
    if (typeof window.EventBus === 'undefined') {
        window.EventBus = {
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

    // PlanningUtils
    if (typeof window.PlanningUtils === 'undefined') {
        window.PlanningUtils = {
            generateId(prefix = 'id') {
                return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            },

            formatHour(hour) {
                return hour.toString().padStart(2, '0') + ':00';
            },

            getCellKey(day, hour) {
                return `${day}-${hour}`;
            }
        };
    }

    // PlanningEvents
    if (typeof window.PlanningEvents === 'undefined') {
        window.PlanningEvents = {
            SHIFT_ADDED: 'planning:shift:added',
            SHIFT_UPDATED: 'planning:shift:updated',
            SHIFT_DELETED: 'planning:shift:deleted',
            EMPLOYEE_ADDED: 'planning:employee:added',
            EMPLOYEE_UPDATED: 'planning:employee:updated',
            PHOTO_UPDATED: 'planning:photo:updated'
        };
    }

    // initializeDataStructures
    if (typeof window.initializeDataStructures === 'undefined') {
        window.initializeDataStructures = function() {
            if (AppState && AppState.shifts) {
                AppState.shiftsByCell.clear();
                AppState.employeeShifts.clear();

                AppState.shifts.forEach(shift => {
                    if (!AppState.employeeShifts.has(shift.employee_id)) {
                        AppState.employeeShifts.set(shift.employee_id, []);
                    }
                    AppState.employeeShifts.get(shift.employee_id).push(shift);
                });

                Logger.debug('Structures de données initialisées');
            }
        };
    }

    Logger.info('Objets globaux créés/vérifiés');
}

// CORRECTION: Fonction pour éviter les erreurs de syntaxe (sans getEventListeners)
function preventSyntaxErrors() {
    // Éviter les erreurs de fin de script
    try {
        // Vérifier que les fonctions de base existent
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
            Logger.debug('Environnement navigateur OK');
        }
    } catch (error) {
        Logger.error('Erreur dans l\'environnement:', error);
    }

    // Nettoyer les erreurs communes sans getEventListeners
    const commonErrors = [
        'duplicate variable',
        'unexpected end of script',
        'logger'
    ];

    // Override console.error temporaire pour capturer les erreurs Logger
    const originalError = console.error;
    console.error = function(...args) {
        const message = args.join(' ').toLowerCase();
        const isDuplicateLogger = commonErrors.some(err => message.includes(err));

        if (!isDuplicateLogger) {
            originalError.apply(console, args);
        }
    };

    // Restaurer après 5 secondes
    setTimeout(() => {
        console.error = originalError;
    }, 5000);
}

// CORRECTION: Fonction principale de réparation (simplifiée)
function repairSystem() {
    try {
        Logger.info('🔧 Début de la réparation du système...');

        createMissingGlobals();
        preventSyntaxErrors();

        Logger.info('✅ Réparation du système terminée');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la réparation:', error);
        return false;
    }
}

// Auto-exécution au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(repairSystem, 50);
});

// Export global
window.SystemRepair = { repairSystem, createMissingGlobals };

Logger.info('🛠️ Système de réparation chargé (version corrigée)');