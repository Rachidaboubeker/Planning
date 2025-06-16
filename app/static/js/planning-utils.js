/**
 * Planning Restaurant - Utilitaires Planning (VERSION SANS DOUBLON)
 * Utilitaires spécialisés pour le planning (évite duplicate avec planning-core.js)
 */

// CORRECTION: Vérifier que PlanningUtils n'existe pas déjà
if (typeof window.PlanningUtils === 'undefined') {
    // Créer PlanningUtils seulement s'il n'existe pas
    window.PlanningUtils = {
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
         * Organise les créneaux par cellule
         */
        organizeShiftsByCell(shifts) {
            const organized = new Map();

            shifts.forEach(shift => {
                for (let i = 0; i < shift.duration; i++) {
                    const hour = (shift.start_hour + i) % 24;
                    const cellKey = this.getCellKey(shift.day, hour);

                    if (!organized.has(cellKey)) {
                        organized.set(cellKey, []);
                    }

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
        }
    };

    console.log('✅ PlanningUtils créé par planning-utils.js');
} else {
    console.log('⚠️ PlanningUtils existe déjà, pas de redéfinition');
}

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.PlanningUtils;
}