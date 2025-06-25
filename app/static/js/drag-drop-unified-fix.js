/**
 * GESTIONNAIRE DRAG & DROP UNIFIÉ - VERSION COMPLÈTE FINALE
 * Correction de la sauvegarde + gestion complète du drag & drop
 */

class UnifiedDragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedShift = null;
        this.draggedElement = null;
        this.originalPosition = null;
        this.draggedEmployeeId = null;
        this.activeDropHandlers = new Set();

        console.log('🔧 Gestionnaire Drag & Drop Unifié initialisé');
        this.init();
    }

    /**
     * Initialisation complète
     */
    init() {
        this.setupGlobalEventListeners();
        this.disableOtherManagers();
        this.setupGlobalFunctions();
    }

    /**
     * Désactive tous les autres gestionnaires
     */
    disableOtherManagers() {
        // Désactiver les fonctions globales conflictuelles
        window.setupShiftDragAndDrop = (element, shift) => {
            return this.setupShiftDrag(element, shift);
        };

        window.setupCellDropZone = (cell) => {
            return this.setupDropZone(cell);
        };

        window.handleDropWithGranularity = () => {
            console.log('🚫 handleDropWithGranularity désactivé - gestionnaire unifié actif');
        };

        // Désactiver les gestionnaires dans les autres classes
        if (typeof window.DragDropManager !== 'undefined') {
            window.DragDropManager = {
                setupDropZone: (cell) => this.setupDropZone(cell),
                setupDragAndDrop: (element, shift) => this.setupShiftDrag(element, shift)
            };
        }

        // Désactiver employee-columns drag & drop
        if (typeof window.PlanningRendererColumnExtensions !== 'undefined') {
            const original = window.PlanningRendererColumnExtensions.initializeAllDragDrop;
            window.PlanningRendererColumnExtensions.initializeAllDragDrop = () => {
                console.log('🚫 employee-columns drag & drop désactivé - gestionnaire unifié actif');
                setTimeout(() => this.configureAll(), 100);
            };
        }

        console.log('✅ Autres gestionnaires désactivés');
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
            console.log('🚀 DRAG START (UNIFIÉ):', shift.id);

            this.isDragging = true;
            this.draggedShift = shift;
            this.draggedElement = element;
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
            this.showDragNotification(shift);

            // Mettre en évidence les colonnes si système actif
            this.highlightValidDropZones(shift);
        };

        // Dragend
        const dragEndHandler = (e) => {
            console.log('🏁 DRAG END (UNIFIÉ):', shift.id);
            this.cleanup();
        };

        element.addEventListener('dragstart', dragStartHandler);
        element.addEventListener('dragend', dragEndHandler);

        // Stocker les handlers pour pouvoir les supprimer
        element._unifiedDragStartHandler = dragStartHandler;
        element._unifiedDragEndHandler = dragEndHandler;

        console.log('✅ Drag unifié configuré pour shift:', shift.id);
        return true;
    }

    /**
     * Affiche la notification de drag avec info colonnes
     */
    showDragNotification(shift) {
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

            // Mettre en évidence la colonne
            this.highlightEmployeeColumn(columnIndex);
        }
    }

    /**
     * Met en évidence la colonne d'un employé
     */
    highlightEmployeeColumn(columnIndex) {
        if (typeof employeeColumnManager === 'undefined') return;

        const cells = document.querySelectorAll('.schedule-cell-with-columns, .schedule-cell');
        cells.forEach(cell => {
            const guides = cell.querySelectorAll('.employee-column-guide');
            if (guides[columnIndex]) {
                guides[columnIndex].style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                guides[columnIndex].style.borderRight = '2px solid #28a745';
            }
        });
    }

    /**
     * Met en évidence toutes les zones de drop valides
     */
    highlightValidDropZones(shift) {
        if (typeof employeeColumnManager === 'undefined') return;

        const columnIndex = employeeColumnManager.getEmployeeColumn(shift.employee_id);
        this.highlightEmployeeColumn(columnIndex);
    }

    /**
     * Supprime les event listeners de drag d'un élément
     */
    removeDragListeners(element) {
        if (element._unifiedDragStartHandler) {
            element.removeEventListener('dragstart', element._unifiedDragStartHandler);
        }
        if (element._unifiedDragEndHandler) {
            element.removeEventListener('dragend', element._unifiedDragEndHandler);
        }

        // Supprimer aussi les anciens handlers des autres systèmes
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
            if (this.isValidDrop(cell, e)) {
                e.dataTransfer.dropEffect = 'move';
                cell.classList.add('drag-over-valid');
                cell.classList.remove('drag-over-invalid');

                // Highlight spécifique de la colonne si système actif
                this.highlightTargetColumn(cell, e);
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
                this.removeTargetColumnHighlight(cell);
            }
        };

        // Drop - LE HANDLER PRINCIPAL
        const dropHandler = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('🎯 DROP EVENT TRIGGERED (UNIFIÉ)');

            // Nettoyer les classes CSS
            cell.classList.remove('drag-over-valid', 'drag-over-invalid');
            this.removeTargetColumnHighlight(cell);

            if (!this.isDragging || !this.draggedShift) {
                console.warn('❌ Pas de shift en cours de drag');
                return;
            }

            const shift = this.draggedShift;
            const shiftId = shift.id;
            const newDay = cell.dataset.day;
            const newHour = parseInt(cell.dataset.hour);

            console.log(`🎯 DROP: ${shiftId} → ${newDay} ${newHour}h`);

            // Vérifier si le drop est autorisé
            if (!this.isValidDrop(cell, e)) {
                console.warn('❌ Drop non autorisé');
                this.showDropError();
                return;
            }

            // Calculer les nouvelles valeurs avec granularité
            const newMinutes = this.calculateDropMinutes(e, cell);

            // Sauvegarder le mouvement avec méthode corrigée
            const success = await this.saveShiftMoveFixed(shiftId, newDay, newHour, newMinutes);

            if (success) {
                console.log('✅ Shift déplacé avec succès');
                this.showDropSuccess(shift, newDay, newHour, newMinutes);

                // Recharger l'affichage
                this.reloadPlanning();
            } else {
                console.error('❌ Échec de la sauvegarde');
                this.showDropError();
            }
        };

        // Attacher les handlers
        cell.addEventListener('dragover', dragOverHandler);
        cell.addEventListener('dragleave', dragLeaveHandler);
        cell.addEventListener('drop', dropHandler);

        // Stocker les handlers pour pouvoir les supprimer
        cell._unifiedDragOverHandler = dragOverHandler;
        cell._unifiedDragLeaveHandler = dragLeaveHandler;
        cell._unifiedDropHandler = dropHandler;

        return true;
    }

    /**
     * Supprime les event listeners de drop d'une cellule
     */
    removeDropListeners(cell) {
        // Supprimer les handlers unifiés
        if (cell._unifiedDragOverHandler) {
            cell.removeEventListener('dragover', cell._unifiedDragOverHandler);
        }
        if (cell._unifiedDragLeaveHandler) {
            cell.removeEventListener('dragleave', cell._unifiedDragLeaveHandler);
        }
        if (cell._unifiedDropHandler) {
            cell.removeEventListener('drop', cell._unifiedDropHandler);
        }

        // Supprimer aussi les anciens handlers des autres systèmes
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
     * Vérifie si un drop est valide (système de colonnes + granularité)
     */
    isValidDrop(cell, event) {
        if (!this.draggedShift || !this.draggedEmployeeId) {
            return true; // Pas de restriction
        }

        // Vérifier le système de colonnes si actif
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
     * Met en évidence la colonne cible lors du dragover
     */
    highlightTargetColumn(cell, event) {
        if (typeof employeeColumnManager === 'undefined' || !this.draggedEmployeeId) return;

        const expectedColumn = employeeColumnManager.getEmployeeColumn(this.draggedEmployeeId);
        const cellRect = cell.getBoundingClientRect();
        const mouseX = event.clientX - cellRect.left;
        const columnWidth = cellRect.width / employeeColumnManager.maxColumns;
        const hoveredColumn = Math.floor(mouseX / columnWidth);

        if (hoveredColumn === expectedColumn) {
            // Créer ou mettre à jour le highlight de colonne
            let highlight = cell.querySelector('.column-drop-highlight');
            if (!highlight) {
                highlight = document.createElement('div');
                highlight.className = 'column-drop-highlight';
                cell.appendChild(highlight);
            }

            const left = expectedColumn * (100 / employeeColumnManager.maxColumns);
            const width = 100 / employeeColumnManager.maxColumns;

            highlight.style.cssText = `
                position: absolute;
                left: ${left}%;
                top: 0;
                width: ${width}%;
                height: 100%;
                background: rgba(40, 167, 69, 0.2);
                border: 2px solid #28a745;
                pointer-events: none;
                z-index: 5;
                border-radius: 4px;
            `;
        }
    }

    /**
     * Supprime le highlight de colonne cible
     */
    removeTargetColumnHighlight(cell) {
        const highlight = cell.querySelector('.column-drop-highlight');
        if (highlight) {
            highlight.remove();
        }
    }

    /**
     * Calcule les minutes selon la granularité
     */
    calculateDropMinutes(event, cell) {
        const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;

        if (granularity >= 60) {
            return 0; // Pas de granularité fine
        }

        // Si la cellule a des minutes définies, les utiliser
        if (cell.dataset.minutes !== undefined) {
            return parseInt(cell.dataset.minutes);
        }

        // Sinon calculer selon la position dans la cellule
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
     * MÉTHODE CORRIGÉE - Sauvegarde le déplacement d'un shift
     */
    async saveShiftMoveFixed(shiftId, newDay, newHour, newMinutes = 0) {
        try {
            console.log('💾 Sauvegarde CORRIGÉE:', { shiftId, newDay, newHour, newMinutes });

            // Récupérer le shift pour avoir l'employee_id
            const shift = window.AppState?.shifts?.get(shiftId);
            if (!shift) {
                console.error('❌ Shift non trouvé dans AppState:', shiftId);
                return false;
            }

            // CORRECTION : Inclure TOUS les champs requis
            const data = {
                employee_id: shift.employee_id,  // REQUIS par le serveur
                day: newDay,
                start_hour: newHour,
                duration: shift.duration || 1,   // Garder la durée existante
                notes: shift.notes || ''         // Garder les notes existantes
            };

            // Ajouter start_minutes seulement si granularité fine
            const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
            if (granularity < 60) {
                data.start_minutes = newMinutes;
            }

            console.log('📡 Données complètes envoyées au serveur:', data);

            const response = await fetch(`/api/shifts/${shiftId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('📡 Statut réponse:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Réponse serveur:', result);

                if (result.success) {
                    // Mettre à jour l'état local
                    shift.day = newDay;
                    shift.start_hour = newHour;
                    if (data.start_minutes !== undefined) {
                        shift.start_minutes = newMinutes;
                    }
                    return true;
                }
            } else {
                const errorData = await response.json();
                console.error('❌ Erreur serveur:', response.status, errorData);
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
            return false;
        }
    }

    /**
     * Met à jour l'état local après sauvegarde
     */
    updateLocalState(shiftId, newDay, newHour, newMinutes) {
        const shift = window.AppState?.shifts?.get(shiftId);
        if (shift) {
            shift.day = newDay;
            shift.start_hour = newHour;
            shift.start_minutes = newMinutes;
        }
    }

    /**
     * Affiche la notification de succès
     */
    showDropSuccess(shift, newDay, newHour, newMinutes) {
        if (typeof NotificationManager !== 'undefined') {
            const employee = window.AppState?.employees?.get(shift.employee_id);
            const timeStr = newMinutes > 0 ?
                `${newHour}h${newMinutes.toString().padStart(2,'0')}` :
                `${newHour}h`;

            NotificationManager.show(
                `✅ ${employee?.prenom || 'Créneau'} déplacé vers ${newDay} ${timeStr}`,
                'success'
            );
        }
    }

    /**
     * Affiche la notification d'erreur
     */
    showDropError() {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show('❌ Erreur lors du déplacement', 'error');
        }
    }

    /**
     * Recharge l'affichage du planning
     */
    reloadPlanning() {
        if (typeof PlanningRenderer !== 'undefined' && PlanningRenderer.renderShifts) {
            setTimeout(() => PlanningRenderer.renderShifts(), 100);
        }
    }

    /**
     * Nettoie l'état après drag & drop
     */
    cleanup() {
        this.isDragging = false;
        this.draggedShift = null;
        this.draggedElement = null;
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

        // Nettoyer les highlights de colonnes
        document.querySelectorAll('.employee-column-guide').forEach(guide => {
            guide.style.backgroundColor = '';
            guide.style.borderRight = '1px solid rgba(0,0,0,0.05)';
        });

        // Nettoyer les highlights de colonnes cibles
        document.querySelectorAll('.column-drop-highlight').forEach(highlight => {
            highlight.remove();
        });

        console.log('🧹 Nettoyage drag & drop unifié terminé');
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

        console.log(`✅ ${configured} shifts configurés pour drag & drop unifié`);
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
        console.log('🎯 Configuration drag & drop UNIFIÉE complète terminée');
    }

    /**
     * Configure les fonctions globales
     */
    setupGlobalFunctions() {
        // Fonction de configuration globale
        window.configureUnifiedDragDrop = () => {
            setTimeout(() => this.configureAll(), 100);
        };

        // Fonction de diagnostic
        window.debugUnifiedDragDrop = () => {
            console.log('🔍 État du gestionnaire unifié:');
            console.log('  isDragging:', this.isDragging);
            console.log('  draggedShift:', this.draggedShift?.id);
            console.log('  activeDropHandlers:', this.activeDropHandlers.size);
            console.log('  AppState.shifts:', window.AppState?.shifts?.size);
        };
    }
}

// ==================== INSTALLATION GLOBALE ====================

// Créer l'instance globale
const unifiedDragDropManager = new UnifiedDragDropManager();

// Exposer globalement
window.UnifiedDragDropFix = unifiedDragDropManager;
window.UnifiedDragDropManager = unifiedDragDropManager;

// Auto-configuration quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => unifiedDragDropManager.configureAll(), 500);
    });
} else {
    setTimeout(() => unifiedDragDropManager.configureAll(), 500);
}

// Re-configuration après rendu
if (typeof EventBus !== 'undefined') {
    EventBus.on('SHIFT_RENDERED', () => {
        setTimeout(() => unifiedDragDropManager.configureAllShifts(), 100);
    });
}

// Configuration après changement de granularité
document.addEventListener('granularityChanged', () => {
    setTimeout(() => unifiedDragDropManager.configureAll(), 200);
});

console.log('🚀 Gestionnaire Drag & Drop UNIFIÉ installé avec sauvegarde CORRIGÉE - Version COMPLÈTE !');

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedDragDropManager;
}