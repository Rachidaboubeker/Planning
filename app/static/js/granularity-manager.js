// ==================== MODULE DE GESTION GRANULARITÉ COMPLET ====================

/**
 * Gestionnaire de granularité complet pour le planning restaurant
 * Corrige tous les problèmes d'échelle temporelle
 */

class GranularityManager {
    constructor() {
        this.currentGranularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
        this.isInitialized = false;
        this.observers = [];

        console.log('🎛️ GranularityManager initialisé avec granularité:', this.currentGranularity);
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        this.setupGranularitySelector();
        this.setupObservers();
        this.applyCurrentGranularity();

        this.isInitialized = true;
        console.log('✅ GranularityManager initialisé');
    }

    setupGranularitySelector() {
        const selector = document.getElementById('granularitySelect');
        if (!selector) return;

        selector.addEventListener('change', (e) => {
            const newGranularity = parseInt(e.target.value);
            this.changeGranularity(newGranularity);
        });

        // Mettre à jour l'affichage initial
        this.updateGranularityDisplay();
    }

    setupObservers() {
        // Observer les changements de DOM pour réappliquer la granularité
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                let shouldReapply = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' &&
                        (mutation.target.id === 'planningGrid' ||
                         mutation.target.classList.contains('planning-grid'))) {
                        shouldReapply = true;
                    }
                });

                if (shouldReapply && this.currentGranularity !== 60) {
                    setTimeout(() => {
                        this.applyGranularityStyles();
                    }, 100);
                }
            });

            setTimeout(() => {
                const grid = document.getElementById('planningGrid');
                if (grid) {
                    observer.observe(grid, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['style', 'class']
                    });
                }
            }, 1000);
        }
    }

    async changeGranularity(newGranularity) {
        if (newGranularity === this.currentGranularity) return;

        console.log('🔄 Changement granularité:', this.currentGranularity, '->', newGranularity);

        this.showLoadingIndicator('Changement de granularité...');

        try {
            const response = await fetch('/api/config/granularity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ granularity: newGranularity })
            });

            const data = await response.json();

            if (data.success) {
                // Mettre à jour la configuration locale
                this.currentGranularity = newGranularity;
                this.updateLocalConfig(data);

                // Notification de succès
                this.showNotification(data.message, 'success');

                // Appliquer immédiatement les changements
                this.applyCurrentGranularity();

                // Recharger après 2 secondes pour une application complète
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('❌ Erreur changement granularité:', error);
            this.showNotification('❌ Erreur lors du changement de granularité', 'error');

            // Restaurer la valeur précédente
            const selector = document.getElementById('granularitySelect');
            if (selector) {
                selector.value = this.currentGranularity;
            }

        } finally {
            this.hideLoadingIndicator();
        }
    }

    updateLocalConfig(data) {
        // Mettre à jour FLASK_CONFIG
        if (window.FLASK_CONFIG) {
            window.FLASK_CONFIG.TIME_SLOT_GRANULARITY = data.granularity;
            window.FLASK_CONFIG.ALL_TIME_SLOTS = data.all_time_slots;
            window.FLASK_CONFIG.GRANULARITY_INFO = data.granularity_info;
        }

        // Mettre à jour PlanningConfig
        if (typeof PlanningConfig !== 'undefined') {
            PlanningConfig.TIME_SLOT_GRANULARITY = data.granularity;
            PlanningConfig.ALL_TIME_SLOTS = data.all_time_slots;
        }

        // Mettre à jour l'affichage
        this.updateGranularityDisplay();
    }

    updateGranularityDisplay() {
        const slotsCount = document.getElementById('slotsCount');
        if (slotsCount && window.FLASK_CONFIG?.GRANULARITY_INFO) {
            slotsCount.textContent = window.FLASK_CONFIG.GRANULARITY_INFO.total_slots;
        }
    }

    applyCurrentGranularity() {
        console.log('🔧 Application granularité actuelle:', this.currentGranularity);

        // Générer la nouvelle échelle temporelle
        this.generateTimeScale();

        // Appliquer les styles
        this.applyGranularityStyles();

        // Régénérer la grille si possible
        if (window.PlanningRenderer?.generatePlanningGridWithColumns) {
            setTimeout(() => {
                window.PlanningRenderer.generatePlanningGridWithColumns();
            }, 200);
        } else if (typeof generatePlanningGrid === 'function') {
            setTimeout(() => {
                generatePlanningGrid();
            }, 200);
        }
    }

    generateTimeScale() {
        console.log('🕐 Génération échelle temporelle granularité:', this.currentGranularity);

        const hoursRange = window.FLASK_CONFIG?.HOURS_RANGE || [8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2];
        const allTimeSlots = [];

        hoursRange.forEach(hour => {
            if (this.currentGranularity === 60) {
                // Granularité 1h - seulement les heures pleines
                allTimeSlots.push({
                    hour: hour,
                    minutes: 0,
                    display: `${hour.toString().padStart(2, '0')}:00`,
                    isMainHour: true,
                    key: `${hour}_0`,
                    gridIndex: allTimeSlots.length
                });
            } else {
                // Granularité fine - créer tous les sous-créneaux
                const slotsInHour = 60 / this.currentGranularity;

                for (let slot = 0; slot < slotsInHour; slot++) {
                    const minutes = slot * this.currentGranularity;

                    allTimeSlots.push({
                        hour: hour,
                        minutes: minutes,
                        display: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                        isMainHour: minutes === 0,
                        isSubSlot: minutes !== 0,
                        key: `${hour}_${minutes}`,
                        gridIndex: allTimeSlots.length
                    });
                }
            }
        });

        console.log('✅ Échelle générée:', allTimeSlots.length, 'créneaux');

        // Mettre à jour la configuration
        if (window.FLASK_CONFIG) {
            window.FLASK_CONFIG.ALL_TIME_SLOTS = allTimeSlots;
        }

        return allTimeSlots;
    }

    applyGranularityStyles() {
        if (this.currentGranularity === 60) {
            console.log('✅ Granularité 1h - styles par défaut');
            this.removeGranularityStyles();
            return;
        }

        console.log('🎨 Application styles granularité:', this.currentGranularity, 'min');

        // Calculer les dimensions
        const cellHeight = this.calculateCellHeight();
        const totalSlots = window.FLASK_CONFIG?.ALL_TIME_SLOTS?.length || 0;

        // Supprimer l'ancien style
        this.removeGranularityStyles();

        // Créer le nouveau style
        const style = document.createElement('style');
        style.id = 'granularity-dynamic-style';
        style.textContent = this.generateGranularityCSS(cellHeight, totalSlots);

        document.head.appendChild(style);

        console.log('✅ Styles appliqués - hauteur cellule:', cellHeight + 'px');
    }

    calculateCellHeight() {
        const baseHeight = 60;

        switch (this.currentGranularity) {
            case 15: return 15;
            case 30: return 30;
            case 60: return baseHeight;
            default: return Math.max(10, baseHeight / (60 / this.currentGranularity));
        }
    }

    generateGranularityCSS(cellHeight, totalSlots) {
        const slotsPerHour = 60 / this.currentGranularity;

        return `
            /* === GRANULARITÉ ${this.currentGranularity} MINUTES === */

            /* Grille principale */
            .planning-grid {
                grid-template-rows: repeat(${totalSlots}, ${cellHeight}px) !important;
            }

            /* Cellules de planning */
            .planning-grid .schedule-cell {
                height: ${cellHeight}px !important;
                min-height: ${cellHeight}px !important;
                max-height: ${cellHeight}px !important;
            }

            /* Créneaux horaires */
            .planning-grid .time-slot {
                height: ${cellHeight}px !important;
                min-height: ${cellHeight}px !important;
                font-size: ${cellHeight < 20 ? '0.6rem' : cellHeight < 30 ? '0.7rem' : '0.8rem'} !important;
                padding: ${cellHeight < 20 ? '0.1rem' : '0.25rem'} !important;
            }

            /* Différenciation heures principales vs sous-créneaux */
            .time-slot:not(.sub-time-slot) {
                background: linear-gradient(135deg, #6f42c1, #8b5cf6) !important;
                color: white !important;
                font-weight: bold !important;
            }

            .time-slot.sub-time-slot {
                background: #f8f9fa !important;
                color: #6c757d !important;
                font-style: italic !important;
                position: relative;
            }

            .time-slot.sub-time-slot::before {
                content: '├';
                margin-right: 0.25rem;
                color: #6c757d;
            }

            /* Bordures pour distinguer les heures */
            .schedule-cell[data-minutes="0"] {
                border-top: 2px solid #6f42c1 !important;
            }

            .schedule-cell:not([data-minutes="0"]) {
                border-top: 1px dashed #ced4da !important;
            }

            /* Créneaux de travail */
            .shift-block {
                font-size: ${cellHeight < 20 ? '0.6rem' : cellHeight < 30 ? '0.7rem' : '0.8rem'} !important;
                line-height: 1.1 !important;
            }

            /* Adaptation du contenu selon la taille */
            ${cellHeight < 25 ? `
                .shift-block .shift-duration,
                .shift-block .shift-time {
                    display: none !important;
                }

                .shift-employee-name {
                    font-size: 0.6rem !important;
                }
            ` : ''}

            ${cellHeight < 40 ? `
                .multi-hour-block {
                    padding: 0.2rem !important;
                    min-height: ${cellHeight - 4}px !important;
                }

                .single-hour-block {
                    padding: 0.1rem !important;
                }
            ` : ''}

            /* Responsive pour mobile */
            @media (max-width: 768px) {
                .planning-grid .time-slot {
                    font-size: ${cellHeight < 20 ? '0.5rem' : '0.6rem'} !important;
                    padding: 0.1rem !important;
                }

                .shift-block {
                    font-size: ${cellHeight < 20 ? '0.5rem' : '0.6rem'} !important;
                }
            }
        `;
    }

    removeGranularityStyles() {
        const existingStyle = document.getElementById('granularity-dynamic-style');
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    // Méthodes utilitaires

    showLoadingIndicator(message) {
        this.hideLoadingIndicator(); // Supprimer l'ancien s'il existe

        const overlay = document.createElement('div');
        overlay.id = 'granularity-loading-overlay';
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="width: 50px; height: 50px; margin: 0 auto 1rem; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin: 0; font-size: 1.2rem; font-weight: 500;">${message}</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        document.body.appendChild(overlay);
    }

    hideLoadingIndicator() {
        const overlay = document.getElementById('granularity-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showNotification(message, type = 'info') {
        // Utiliser le système de notifications existant si disponible
        if (typeof NotificationManager !== 'undefined') {
            if (type === 'success' && NotificationManager.showSuccess) {
                NotificationManager.showSuccess(message);
            } else if (NotificationManager.show) {
                NotificationManager.show(message, type);
            }
            return;
        }

        // Fallback - notification simple
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        // Ajouter l'animation CSS
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Supprimer automatiquement
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Méthodes publiques pour l'API

    getCurrentGranularity() {
        return this.currentGranularity;
    }

    getAvailableGranularities() {
        return window.FLASK_CONFIG?.AVAILABLE_GRANULARITIES || {60: '1 heure'};
    }

    async resetToDefault() {
        await this.changeGranularity(60);
    }

    validateTimeSlot(hour, minutes) {
        if (hour < 0 || hour > 23) return false;
        if (minutes < 0 || minutes >= 60) return false;
        if (minutes % this.currentGranularity !== 0) return false;

        const hoursRange = window.FLASK_CONFIG?.HOURS_RANGE || [];
        return hoursRange.includes(hour);
    }

    getNextValidSlot(hour, minutes) {
        const adjustedMinutes = Math.ceil(minutes / this.currentGranularity) * this.currentGranularity;

        if (adjustedMinutes >= 60) {
            return {
                hour: (hour + 1) % 24,
                minutes: 0
            };
        }

        return {
            hour: hour,
            minutes: adjustedMinutes
        };
    }

    // Méthodes de debug

    debug() {
        console.log('🔍 === DEBUG GRANULARITÉ ===');
        console.log('Granularité actuelle:', this.currentGranularity);
        console.log('FLASK_CONFIG granularité:', window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY);
        console.log('Créneaux disponibles:', window.FLASK_CONFIG?.ALL_TIME_SLOTS?.length);
        console.log('Style appliqué:', !!document.getElementById('granularity-dynamic-style'));

        const grid = document.getElementById('planningGrid');
        if (grid) {
            const cells = grid.querySelectorAll('.schedule-cell');
            console.log('Cellules dans la grille:', cells.length);

            if (cells.length > 0) {
                const firstCell = cells[0];
                const computedStyle = window.getComputedStyle(firstCell);
                console.log('Hauteur cellule actuelle:', computedStyle.height);
            }
        }
        console.log('=== FIN DEBUG ===');
    }
}

// ==================== FONCTIONS GLOBALES DE COMPATIBILITÉ ====================

// Variables globales
let granularityManager = null;

// Fonction d'initialisation principale
function initializeGranularityManager() {
    if (!granularityManager) {
        granularityManager = new GranularityManager();
    }
    return granularityManager;
}

// Fonctions de compatibilité avec l'ancien code
function generateCorrectTimeScale() {
    console.log('📞 Appel generateCorrectTimeScale - délégation au GranularityManager');
    if (granularityManager) {
        return granularityManager.generateTimeScale();
    }
    return [];
}

function adaptPlanningRendererToGranularity(granularity) {
    console.log('📞 Appel adaptPlanningRendererToGranularity - délégation au GranularityManager');
    if (granularityManager) {
        granularityManager.currentGranularity = granularity;
        granularityManager.applyCurrentGranularity();
    }
}

function generateGridWithCorrectTimeScale() {
    console.log('📞 Appel generateGridWithCorrectTimeScale - délégation au GranularityManager');
    if (granularityManager) {
        granularityManager.applyCurrentGranularity();
    }
}

// Fonction de debug global
function debugGranularity() {
    if (granularityManager) {
        granularityManager.debug();
    } else {
        console.log('❌ GranularityManager non initialisé');
    }
}

// ==================== INTÉGRATION AVEC LE PLANNING EXISTANT ====================

// Fonction pour créer une grille avec granularité
function createPlanningGridWithGranularity() {
    const grid = document.getElementById('planningGrid');
    if (!grid) {
        console.error('❌ Grille de planning non trouvée');
        return;
    }

    console.log('🏗️ Création grille avec granularité');

    // Déléguer au système existant si disponible
    if (window.PlanningRenderer?.generatePlanningGridWithColumns) {
        console.log('🎨 Délégation au PlanningRenderer existant');

        // S'assurer que la granularité est appliquée
        if (granularityManager) {
            granularityManager.generateTimeScale();
        }

        window.PlanningRenderer.generatePlanningGridWithColumns();

        // Appliquer les styles après génération
        setTimeout(() => {
            if (granularityManager) {
                granularityManager.applyGranularityStyles();
            }
        }, 100);

        return;
    }

    // Génération manuelle si nécessaire
    generateManualPlanningGrid();
}

function generateManualPlanningGrid() {
    const grid = document.getElementById('planningGrid');
    if (!grid) return;

    console.log('🔧 Génération manuelle de la grille');

    grid.innerHTML = '';

    const timeSlots = granularityManager ? granularityManager.generateTimeScale() : [];
    const cellHeight = granularityManager ? granularityManager.calculateCellHeight() : 60;
    const daysOfWeek = window.FLASK_CONFIG?.DAYS_OF_WEEK ||
                      ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    // Configuration de la grille
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '80px repeat(7, 1fr)';
    grid.style.gridTemplateRows = `repeat(${timeSlots.length}, ${cellHeight}px)`;
    grid.style.gap = '1px';
    grid.style.background = '#dee2e6';

    timeSlots.forEach((timeSlot, index) => {
        // Créer la cellule d'heure
        const timeSlotElement = document.createElement('div');
        timeSlotElement.className = 'time-slot' + (timeSlot.isSubSlot ? ' sub-time-slot' : '');
        timeSlotElement.textContent = timeSlot.display;
        timeSlotElement.style.gridRow = `${index + 1}`;
        timeSlotElement.style.gridColumn = '1';

        grid.appendChild(timeSlotElement);

        // Créer les cellules pour chaque jour
        daysOfWeek.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell';
            cell.dataset.hour = timeSlot.hour;
            cell.dataset.minutes = timeSlot.minutes;
            cell.dataset.timeKey = timeSlot.key;
            cell.dataset.day = day;
            cell.dataset.dayIndex = dayIndex;

            cell.style.gridRow = `${index + 1}`;
            cell.style.gridColumn = `${dayIndex + 2}`;

            // Événements
            setupCellEvents(cell, day, timeSlot);

            grid.appendChild(cell);
        });
    });

    console.log('✅ Grille manuelle générée:', timeSlots.length, 'lignes');

    // Appliquer les styles de granularité
    if (granularityManager) {
        granularityManager.applyGranularityStyles();
    }
}

function setupCellEvents(cell, day, timeSlot) {
    // Double-clic pour créer un créneau
    cell.addEventListener('dblclick', () => {
        if (typeof showAddShiftModal === 'function') {
            showAddShiftModal(day, timeSlot.hour);
        }
    });

    // Drag & drop
    cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.style.background = 'rgba(99, 102, 241, 0.1)';
    });

    cell.addEventListener('dragleave', () => {
        cell.style.background = '';
    });

    cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.style.background = '';

        if (typeof handleDropWithGranularity === 'function') {
            handleDropWithGranularity(e, cell);
        }
    });

    // Hover
    cell.addEventListener('mouseenter', () => {
        cell.style.background = 'rgba(99, 102, 241, 0.05)';

        const granularity = granularityManager ? granularityManager.getCurrentGranularity() : 60;
        const timeInfo = granularity === 60 ?
            `${timeSlot.hour}:00` :
            timeSlot.display;

        cell.title = `${day} ${timeInfo}\nDouble-clic pour ajouter un créneau`;
    });

    cell.addEventListener('mouseleave', () => {
        cell.style.background = '';
    });
}

// ==================== INITIALISATION AUTOMATIQUE ====================

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation automatique du GranularityManager...');

    // Attendre que les autres modules soient chargés
    setTimeout(() => {
        granularityManager = initializeGranularityManager();

        // Remplacer les fonctions globales pour compatibilité
        window.generateCorrectTimeScale = generateCorrectTimeScale;
        window.adaptPlanningRendererToGranularity = adaptPlanningRendererToGranularity;
        window.generateGridWithCorrectTimeScale = generateGridWithCorrectTimeScale;
        window.generatePlanningGrid = createPlanningGridWithGranularity;
        window.debugGranularity = debugGranularity;

        // Exposer le gestionnaire globalement
        window.granularityManager = granularityManager;

        console.log('✅ GranularityManager prêt et fonctions globales mises à jour');

    }, 2000);
});

// Backup - initialiser aussi au chargement de la fenêtre
window.addEventListener('load', function() {
    if (!granularityManager) {
        console.log('🔄 Initialisation backup du GranularityManager...');
        granularityManager = initializeGranularityManager();
        window.granularityManager = granularityManager;
    }
});

console.log('📦 Module GranularityManager chargé');