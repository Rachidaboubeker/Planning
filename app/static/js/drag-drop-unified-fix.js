/**
 * GESTIONNAIRE DRAG & DROP UNIFIÉ - CORRECTION COMPLÈTE
 * Remplace tous les gestionnaires existants pour éviter les conflits
 * Support : Granularité + Colonnes + Sauvegarde
 */

class UnifiedDragDropFix {
    constructor() {
        this.isDragging = false;
        this.draggedShift = null;
        this.originalPosition = null;
        this.draggedEmployeeId = null;
        this.activeDropHandlers = new Set();

        console.log('🔧 Gestionnaire Drag & Drop Unifié initialisé');
        this.init();
    }

    /**
     * Initialisation
     */
    init() {
        this.setupGlobalEventListeners();
        this.disableConflictingManagers();
    }

    /**
     * Désactive les anciens gestionnaires pour éviter les conflits
     */
    disableConflictingManagers() {
        // Désactiver les anciens gestionnaires
        if (typeof window.handleDropWithGranularity !== 'undefined') {
            window.handleDropWithGranularity = () => {
                console.log('🚫 Ancien gestionnaire désactivé');
            };
        }

        // Supprimer les anciens event listeners si possible
        document.querySelectorAll('.shift-block').forEach(el => {
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
        });

        console.log('✅ Anciens gestionnaires désactivés');
    }

    /**
     * Configuration des event listeners globaux
     */
    setupGlobalEventListeners() {
        // Prévenir les drops non gérés
        document.addEventListener('dragover', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, true);

        document.addEventListener('drop', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, true);

        // Nettoyage global à la fin du drag
        document.addEventListener('dragend', (e) => {
            this.cleanup();
        }, true);
    }

    /**
     * Configure le drag pour un élément shift
     */
    setupShiftDrag(element, shift) {
        if (!element || !shift) {
            console.warn('❌ Élément ou shift manquant pour drag');
            return false;
        }

        // Supprimer les anciens event listeners
        this.removeDragListeners(element);

        element.draggable = true;
        element.dataset.shiftId = shift.id;

        // Dragstart
        const dragStartHandler = (e) => {
            console.log('🚀 DRAG START:', shift.id);

            this.isDragging = true;
            this.draggedShift = shift;
            this.draggedEmployeeId = shift.employee_id;
            this.originalPosition = {
                day: shift.day,
                hour: shift.start_hour,
                minutes: shift.start_minutes || 0
            };

            e.dataTransfer.setData('text/plain', shift.id);
            e.dataTransfer.effectAllowed = 'move';

            element.classList.add('dragging');
            element.style.opacity = '0.5';
            element.style.transform = 'rotate(2deg)';

            // Notification si système de colonnes actif
            if (typeof employeeColumnManager !== 'undefined') {
                const columnIndex = employeeColumnManager.getEmployeeColumn(shift.employee_id);
                const employee = window.AppState?.employees?.get(shift.employee_id);

                if (employee && typeof NotificationManager !== 'undefined') {
                    NotificationManager.show(
                        `🎯 ${employee.prenom} peut être déplacé dans la colonne ${columnIndex + 1}`,
                        'info',
                        3000
                    );
                }
            }
        };

        // Dragend
        const dragEndHandler = (e) => {
            console.log('🏁 DRAG END:', shift.id);
            this.cleanup();
        };

        element.addEventListener('dragstart', dragStartHandler);
        element.addEventListener('dragend', dragEndHandler);

        // Stocker les handlers pour pouvoir les supprimer
        element._dragStartHandler = dragStartHandler;
        element._dragEndHandler = dragEndHandler;

        console.log('✅ Drag configuré pour shift:', shift.id);
        return true;
    }

    /**
     * Supprime les event listeners de drag d'un élément
     */
    removeDragListeners(element) {
        if (element._dragStartHandler) {
            element.removeEventListener('dragstart', element._dragStartHandler);
        }
        if (element._dragEndHandler) {
            element.removeEventListener('dragend', element._dragEndHandler);
        }
    }

    /**
     * Configure une zone de drop
     */
    setupDropZone(cell) {
        if (!cell || this.activeDropHandlers.has(cell)) {
            return false; // Éviter les doublons
        }

        this.activeDropHandlers.add(cell);

        // Supprimer les anciens handlers
        this.removeDropListeners(cell);

        // Dragover
        const dragOverHandler = (e) => {
            if (!this.isDragging) return;

            e.preventDefault();
            e.stopPropagation();

            // Vérifier si le drop est valide
            if (this.isValidDrop(cell)) {
                e.dataTransfer.dropEffect = 'move';
                cell.classList.add('drag-over-valid');
                cell.classList.remove('drag-over-invalid');
            } else {
                e.dataTransfer.dropEffect = 'none';
                cell.classList.add('drag-over-invalid');
                cell.classList.remove('drag-over-valid');
            }
        };

        // Dragleave
        const dragLeaveHandler = (e) => {
            // S'assurer qu'on quitte vraiment la cellule
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over-valid', 'drag-over-invalid');
            }
        };

        // Drop - LE HANDLER PRINCIPAL QUI ÉTAIT CASSÉ
        const dropHandler = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('🎯 DROP EVENT TRIGGERED');

            // Nettoyer les classes CSS
            cell.classList.remove('drag-over-valid', 'drag-over-invalid');

            if (!this.isDragging || !this.draggedShift) {
                console.warn('❌ Pas de shift en cours de drag');
                return;
            }

            const shiftId = e.dataTransfer.getData('text/plain');
            const newDay = cell.dataset.day;
            const newHour = parseInt(cell.dataset.hour);

            console.log(`🎯 DROP: ${shiftId} → ${newDay} ${newHour}h`);

            // Vérifier si le drop est autorisé
            if (!this.isValidDrop(cell)) {
                console.warn('❌ Drop non autorisé');
                return;
            }

            // Calculer les nouvelles valeurs
            const newMinutes = this.calculateDropMinutes(e, cell);

            // Sauvegarder le mouvement
            const success = await this.saveShiftMove(shiftId, newDay, newHour, newMinutes);

            if (success) {
                console.log('✅ Shift déplacé avec succès');

                // Notification de succès
                if (typeof NotificationManager !== 'undefined') {
                    const employee = window.AppState?.employees?.get(this.draggedEmployeeId);
                    NotificationManager.show(
                        `✅ ${employee?.prenom || 'Créneau'} déplacé vers ${newDay} ${newHour}h${newMinutes > 0 ? newMinutes : ''}`,
                        'success'
                    );
                }

                // Recharger l'affichage
                if (typeof PlanningRenderer !== 'undefined' && PlanningRenderer.renderShifts) {
                    PlanningRenderer.renderShifts();
                }
            } else {
                console.error('❌ Échec de la sauvegarde');

                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show('❌ Erreur lors du déplacement', 'error');
                }
            }
        };

        // Attacher les handlers
        cell.addEventListener('dragover', dragOverHandler);
        cell.addEventListener('dragleave', dragLeaveHandler);
        cell.addEventListener('drop', dropHandler);

        // Stocker les handlers pour pouvoir les supprimer
        cell._dragOverHandler = dragOverHandler;
        cell._dragLeaveHandler = dragLeaveHandler;
        cell._dropHandler = dropHandler;

        console.log('✅ Drop zone configurée:', cell.dataset.day, cell.dataset.hour);
        return true;
    }

    /**
     * Supprime les event listeners de drop d'une cellule
     */
    removeDropListeners(cell) {
        if (cell._dragOverHandler) {
            cell.removeEventListener('dragover', cell._dragOverHandler);
        }
        if (cell._dragLeaveHandler) {
            cell.removeEventListener('dragleave', cell._dragLeaveHandler);
        }
        if (cell._dropHandler) {
            cell.removeEventListener('drop', cell._dropHandler);
        }
    }

    /**
     * Vérifie si un drop est valide (système de colonnes)
     */
    isValidDrop(cell) {
        if (!this.draggedShift || !this.draggedEmployeeId) {
            return true; // Pas de restriction si pas de système de colonnes
        }

        // Si système de colonnes actif, vérifier la colonne
        if (typeof employeeColumnManager !== 'undefined') {
            const expectedColumn = employeeColumnManager.getEmployeeColumn(this.draggedEmployeeId);

            // Calculer dans quelle colonne on drop
            const cellRect = cell.getBoundingClientRect();
            const mouseX = event.clientX - cellRect.left;
            const columnWidth = cellRect.width / employeeColumnManager.maxColumns;
            const droppedColumn = Math.floor(mouseX / columnWidth);

            return droppedColumn === expectedColumn;
        }

        return true; // Pas de restriction
    }

    /**
     * Calcule les minutes selon la granularité
     */
    calculateDropMinutes(event, cell) {
        const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;

        if (granularity >= 60) {
            return 0; // Pas de granularité fine
        }

        // Calculer la position dans la cellule
        const cellRect = cell.getBoundingClientRect();
        const mouseY = event.clientY - cellRect.top;
        const cellHeight = cellRect.height;

        // Calculer les minutes selon la position
        const minutesPerPixel = 60 / cellHeight;
        const minutes = Math.floor(mouseY * minutesPerPixel);

        // Arrondir selon la granularité
        return Math.floor(minutes / granularity) * granularity;
    }

    /**
     * Sauvegarde le déplacement d'un shift
     */
    async saveShiftMove(shiftId, newDay, newHour, newMinutes = 0) {
        try {
            console.log('💾 Sauvegarde du déplacement:', { shiftId, newDay, newHour, newMinutes });

            // Utiliser l'API Manager si disponible
            if (typeof APIManager !== 'undefined') {
                const response = await APIManager.put(`/shifts/${shiftId}`, {
                    day: newDay,
                    start_hour: newHour,
                    start_minutes: newMinutes
                });

                if (response.success) {
                    // Mettre à jour l'état local
                    const shift = window.AppState?.shifts?.get(shiftId);
                    if (shift) {
                        shift.day = newDay;
                        shift.start_hour = newHour;
                        shift.start_minutes = newMinutes;
                    }
                    return true;
                }
            } else {
                // Fallback avec fetch
                const response = await fetch(`/api/shifts/${shiftId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        day: newDay,
                        start_hour: newHour,
                        start_minutes: newMinutes
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.success;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
            return false;
        }
    }

    /**
     * Nettoie l'état après drag & drop
     */
    cleanup() {
        this.isDragging = false;
        this.draggedShift = null;
        this.draggedEmployeeId = null;
        this.originalPosition = null;

        // Nettoyer les éléments en cours de drag
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
            el.style.opacity = '1';
            el.style.transform = 'none';
        });

        // Nettoyer les zones de drop
        document.querySelectorAll('.drag-over-valid, .drag-over-invalid').forEach(el => {
            el.classList.remove('drag-over-valid', 'drag-over-invalid');
        });

        console.log('🧹 Nettoyage drag & drop terminé');
    }

    /**
     * Configure tous les shifts existants
     */
    configureAllShifts() {
        if (!window.AppState?.shifts) {
            console.warn('AppState.shifts non disponible');
            return;
        }

        let configured = 0;
        document.querySelectorAll('.shift-block').forEach(element => {
            const shiftId = element.dataset.shiftId;
            const shift = window.AppState.shifts.get(shiftId);

            if (shift && this.setupShiftDrag(element, shift)) {
                configured++;
            }
        });

        console.log(`✅ ${configured} shifts configurés pour drag & drop`);
    }

    /**
     * Configure toutes les cellules comme zones de drop
     */
    configureAllDropZones() {
        let configured = 0;
        document.querySelectorAll('[data-day][data-hour]').forEach(cell => {
            if (this.setupDropZone(cell)) {
                configured++;
            }
        });

        console.log(`✅ ${configured} zones de drop configurées`);
    }

    /**
     * Configuration complète
     */
    configureAll() {
        this.configureAllShifts();
        this.configureAllDropZones();
        console.log('🎯 Configuration drag & drop complète terminée');
    }
}

// ==================== INSTALLATION GLOBALE ====================

// Créer l'instance globale
const unifiedDragDropFix = new UnifiedDragDropFix();

// Exposer globalement
window.UnifiedDragDropFix = unifiedDragDropFix;

// Override des fonctions existantes pour éviter les conflits
window.setupShiftDragAndDrop = function(element, shift) {
    return unifiedDragDropFix.setupShiftDrag(element, shift);
};

window.setupCellDropZone = function(cell) {
    return unifiedDragDropFix.setupDropZone(cell);
};

// Auto-configuration quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => unifiedDragDropFix.configureAll(), 500);
    });
} else {
    setTimeout(() => unifiedDragDropFix.configureAll(), 500);
}

// Re-configuration après rendu
if (typeof EventBus !== 'undefined') {
    EventBus.on('SHIFT_RENDERED', () => {
        setTimeout(() => unifiedDragDropFix.configureAllShifts(), 100);
    });
}

console.log('🚀 Gestionnaire Drag & Drop Unifié installé - Le drop devrait maintenant fonctionner !');

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedDragDropFix;
}