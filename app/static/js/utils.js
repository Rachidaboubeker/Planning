/**
 * Utilitaires et fonctions communes
 */

// Logger simple
const Logger = {
    debug: (msg, ...args) => console.debug(`🔧 [DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.info(`ℹ️ [INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`⚠️ [WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`❌ [ERROR] ${msg}`, ...args)
};

// Utilitaires de planning
const PlanningUtils = {
    /**
     * Formate une heure pour l'affichage
     */
    formatHour(hour) {
        return `${hour.toString().padStart(2, '0')}h`;
    },

    /**
     * Formate une date
     */
    formatDate(date) {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Sécurise une chaîne pour l'affichage HTML
     */
    sanitizeString(str) {
        if (!str) return '';
        return str.toString().replace(/[<>&"]/g, (match) => {
            const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' };
            return entities[match];
        });
    },

    /**
     * Génère une clé unique pour une cellule
     */
    getCellKey(day, hour) {
        return `${day}-${hour}`;
    },

    /**
     * Calcule la position dans la grille
     */
    calculateGridPosition(day, startHour, duration) {
        const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(day);
        const hourIndex = PlanningConfig.HOURS_RANGE.indexOf(startHour);

        if (dayIndex === -1 || hourIndex === -1) {
            return { dayIndex: -1, hourIndex: -1, rowStart: -1, rowEnd: -1, column: -1 };
        }

        const rowStart = hourIndex + 1;
        const rowEnd = Math.min(rowStart + duration, PlanningConfig.HOURS_RANGE.length + 1);
        const column = dayIndex + 2; // +2 car la première colonne est pour les heures

        return { dayIndex, hourIndex, rowStart, rowEnd, column };
    },

    /**
     * Génère un ID unique
     */
    generateId() {
        return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    },

    /**
     * Vérifie les conflits entre créneaux
     */
    checkShiftConflicts(shift1, shift2) {
        if (shift1.employee_id !== shift2.employee_id || shift1.day !== shift2.day) {
            return false;
        }

        const start1 = shift1.start_hour;
        const end1 = start1 + shift1.duration;
        const start2 = shift2.start_hour;
        const end2 = start2 + shift2.duration;

        // Gestion simple sans traversée de minuit
        if (end1 <= 24 && end2 <= 24) {
            return !(end1 <= start2 || start1 >= end2);
        }

        // Cas complexe avec traversée de minuit (à améliorer si nécessaire)
        return false;
    }
};

// Fonctions globales utilitaires
function initializeDataStructures() {
    // Réorganiser les données si nécessaire
    Logger.debug('Structures de données initialisées');
}

console.log('🔧 Utilitaires Planning Restaurant chargés');