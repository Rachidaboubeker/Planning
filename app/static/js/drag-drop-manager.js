/**
 * Planning Restaurant - Gestionnaire du drag & drop (AVEC SAUVEGARDE + COLONNES)
 * Corrige le problème de non-sauvegarde lors du drag & drop
 * NOUVEAU : Support des colonnes d'employés
 */

class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dropZones = new Set();
        this.isDragging = false;
        this.originalPosition = null;
        this.draggedEmployeeId = null; // NOUVEAU : ID de l'employé en cours de drag

        this.init();
    }

    /**
     * Initialise le gestionnaire
     */
    init() {
        this.setupGlobalEventListeners();
        console.log('🔧 DragDropManager initialisé avec sauvegarde + colonnes');
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        document.addEventListener('dragend', this.handleGlobalDragEnd.bind(this));
        document.addEventListener('drop', this.handleGlobalDrop.bind(this));

        document.addEventListener('dragover', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    }

    /**
     * NOUVEAU : Configure une zone de drop avec support des colonnes
     */
    static setupDropZone(cell) {
        if (!cell) return;

        cell.classList.add('drop-zone');

        // Dragover - autoriser le drop SEULEMENT dans la bonne colonne
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();

            // NOUVEAU : Vérifier si le drop est autorisé dans cette colonne
            if (DragDropManagerStatic.draggedEmployeeId && typeof employeeColumnManager !== 'undefined') {
                const draggedColumnIndex = employeeColumnManager.getEmployeeColumn(DragDropManagerStatic.draggedEmployeeId);

                // Calculer la position de la souris dans la cellule
                const cellRect = cell.getBoundingClientRect();
                const mouseX = e.clientX - cellRect.left;
                const columnWidth = cellRect.width / employeeColumnManager.maxColumns;
                const hoveredColumnIndex = Math.floor(mouseX / columnWidth);

                if (hoveredColumnIndex === draggedColumnIndex) {
                    // Drop autorisé dans la bonne colonne
                    e.dataTransfer.dropEffect = 'move';
                    cell.classList.add('drag-over-valid');

                    // Highlight spécifique de la colonne
                    DragDropManagerStatic.highlightTargetColumn(cell, draggedColumnIndex);
                } else {
                    // Drop non autorisé
                    e.dataTransfer.dropEffect = 'none';
                    cell.classList.add('drag-over-invalid');
                }
            } else {
                // Fallback si pas de système de colonnes
                e.dataTransfer.dropEffect = 'move';
                cell.classList.add('drag-over');
            }
        });

        // Dragleave - nettoyer
        cell.addEventListener('dragleave', (e) => {
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over', 'drag-over-valid', 'drag-over-invalid');
                DragDropManagerStatic.removeColumnHighlight(cell);
            }
        });

        // MODIFIÉ: Drop avec vérification de colonne
        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over', 'drag-over-valid', 'drag-over-invalid');
            DragDropManagerStatic.removeColumnHighlight(cell);

            const shiftId = e.dataTransfer.getData('text/plain');
            const newDay = cell.dataset.day;
            const newHour = parseInt(cell.dataset.hour);

            console.log(`🎯 Drop détecté: ${shiftId} → ${newDay} ${newHour}h`);

            // NOUVEAU : Vérifier la colonne avant de sauvegarder
            if (DragDropManagerStatic.draggedEmployeeId && typeof employeeColumnManager !== 'undefined') {
                const draggedColumnIndex = employeeColumnManager.getEmployeeColumn(DragDropManagerStatic.draggedEmployeeId);

                // Calculer dans quelle colonne on a droppé
                const cellRect = cell.getBoundingClientRect();
                const mouseX = e.clientX - cellRect.left;
                const columnWidth = cellRect.width / employeeColumnManager.maxColumns;
                const droppedColumnIndex = Math.floor(mouseX / columnWidth);

                if (droppedColumnIndex !== draggedColumnIndex) {
                    console.warn(`❌ Drop refusé: colonne ${droppedColumnIndex + 1} != colonne attendue ${draggedColumnIndex + 1}`);

                    if (typeof NotificationManager !== 'undefined') {
                        const employee = AppState.employees.get(DragDropManagerStatic.draggedEmployeeId);
                        const employeeName = employee ? employee.prenom : 'Cet employé';
                        NotificationManager.show(
                            `❌ ${employeeName} ne peut être déplacé que dans sa colonne (${draggedColumnIndex + 1})`,
                            'warning'
                        );
                    }
                    return;
                }
            }

            // Effectuer la sauvegarde
            await DragDropManagerStatic.saveShiftMove(shiftId, newDay, newHour);
        });
    }

    /**
     * NOUVEAU : Met en évidence la colonne cible
     */
    static highlightTargetColumn(cell, columnIndex) {
        const columnWidth = 100 / employeeColumnManager.maxColumns;
        const left = columnIndex * columnWidth;

        // Créer ou mettre à jour le highlight de colonne
        let highlight = cell.querySelector('.column-drop-highlight');
        if (!highlight) {
            highlight = document.createElement('div');
            highlight.className = 'column-drop-highlight';
            cell.appendChild(highlight);
        }

        highlight.style.cssText = `
            position: absolute;
            left: ${left}%;
            top: 0;
            width: ${columnWidth}%;
            height: 100%;
            background: rgba(40, 167, 69, 0.2);
            border: 2px solid #28a745;
            pointer-events: none;
            z-index: 5;
            border-radius: 4px;
        `;
    }

    /**
     * NOUVEAU : Supprime le highlight de colonne
     */
    static removeColumnHighlight(cell) {
        const highlight = cell.querySelector('.column-drop-highlight');
        if (highlight) {
            highlight.remove();
        }
    }

    /**
     * MODIFIÉ : Configure le drag & drop pour un élément avec support colonnes
     */
    static setupDragAndDrop(element, shift) {
        if (!element || !shift) {
            console.warn('Élément ou créneau manquant pour le drag & drop');
            return;
        }

        element.draggable = true;
        element.dataset.shiftId = shift.id;

        // MODIFIÉ : Dragstart avec info employé
        element.addEventListener('dragstart', (e) => {
            const employee = AppState.employees.get(shift.employee_id);
            console.log(`🚀 Début du drag: ${shift.id} (${employee ? employee.prenom : 'Inconnu'}) ${shift.day} ${shift.start_hour}h`);

            e.dataTransfer.setData('text/plain', shift.id);
            element.classList.add('dragging');

            // NOUVEAU : Stocker l'ID de l'employé pour les vérifications de colonne
            DragDropManagerStatic.draggedEmployeeId = shift.employee_id;

            // Sauvegarder position originale
            DragDropManagerStatic.originalPosition = {
                day: shift.day,
                hour: shift.start_hour
            };

            // NOUVEAU : Mettre en évidence toutes les zones de drop valides pour cet employé
            if (typeof employeeColumnManager !== 'undefined') {
                DragDropManagerStatic.highlightAllValidDropZones(shift.employee_id);
            }
        });

        element.addEventListener('dragend', (e) => {
            console.log('🏁 Fin du drag:', shift.id);
            element.classList.remove('dragging');
            DragDropManagerStatic.originalPosition = null;
            DragDropManagerStatic.draggedEmployeeId = null;

            // NOUVEAU : Supprimer tous les highlights
            DragDropManagerStatic.removeAllDropZoneHighlights();
        });
    }

    /**
     * NOUVEAU : Met en évidence toutes les zones de drop valides pour un employé
     */
    static highlightAllValidDropZones(employeeId) {
        if (typeof employeeColumnManager === 'undefined') return;

        const columnIndex = employeeColumnManager.getEmployeeColumn(employeeId);
        const employee = AppState.employees.get(employeeId);
        const employeeName = employee ? employee.prenom : 'Cet employé';

        console.log(`💡 Highlighting colonne ${columnIndex + 1} pour ${employeeName}`);

        // Parcourir toutes les cellules du planning
        document.querySelectorAll('.schedule-cell-with-columns, .schedule-cell').forEach(cell => {
            const guide = cell.querySelector('.employee-column-guide:nth-child(' + (columnIndex + 1) + ')');
            if (guide) {
                guide.style.backgroundColor = 'rgba(40, 167, 69, 0.15)';
                guide.style.borderRight = '2px solid #28a745';
            }
        });

        // Ajouter une notification visuelle
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(
                `🎯 ${employeeName} peut être déplacé dans la colonne ${columnIndex + 1}`,
                'info',
                2000
            );
        }
    }

    /**
     * NOUVEAU : Supprime tous les highlights de zones de drop
     */
    static removeAllDropZoneHighlights() {
        // Supprimer les highlights de guides
        document.querySelectorAll('.employee-column-guide').forEach(guide => {
            guide.style.backgroundColor = '';
            guide.style.borderRight = '1px solid rgba(0,0,0,0.05)';
        });

        // Supprimer les highlights de colonnes
        document.querySelectorAll('.column-drop-highlight').forEach(highlight => {
            highlight.remove();
        });

        // Supprimer les classes de drag over
        document.querySelectorAll('.drag-over-valid, .drag-over-invalid').forEach(cell => {
            cell.classList.remove('drag-over-valid', 'drag-over-invalid');
        });
    }

    /**
     * NOUVEAU: Sauvegarde effective du déplacement (inchangé mais avec meilleure validation)
     */
    static async saveShiftMove(shiftId, newDay, newHour) {
        try {
            console.log(`💾 Sauvegarde du déplacement: ${shiftId} → ${newDay} ${newHour}h`);

            // Récupérer le créneau
            const shift = AppState.shifts.get(shiftId);
            if (!shift) {
                console.error('❌ Créneau non trouvé:', shiftId);
                return false;
            }

            const originalDay = shift.day;
            const originalHour = shift.start_hour;

            // Vérifier si position différente
            if (originalDay === newDay && originalHour === newHour) {
                console.log('⚠️ Position inchangée, pas de sauvegarde');
                return true;
            }

            // NOUVEAU : Validation supplémentaire avec les colonnes
            if (!DragDropManagerStatic.isValidMove(shiftId, newDay, newHour)) {
                console.warn('❌ Déplacement non valide');
                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show('❌ Déplacement non autorisé (conflit détecté)', 'error');
                }
                return false;
            }

            // Mettre à jour le créneau localement
            shift.day = newDay;
            shift.start_hour = newHour;
            AppState.shifts.set(shiftId, shift);

            // CORRECTION: Sauvegarder via API
            if (typeof APIManager !== 'undefined') {
                const response = await APIManager.put(`/shifts/${shiftId}`, {
                    day: newDay,
                    start_hour: newHour,
                    duration: shift.duration,
                    employee_id: shift.employee_id,
                    notes: shift.notes
                });

                if (response.success) {
                    console.log('✅ Déplacement sauvegardé avec succès');

                    // Notification de succès
                    if (typeof NotificationManager !== 'undefined') {
                        const employee = AppState.employees.get(shift.employee_id);
                        const employeeName = employee ? employee.nom_complet : 'Équipier';
                        NotificationManager.show(
                            `✅ ${employeeName} déplacé: ${originalDay} ${originalHour}h → ${newDay} ${newHour}h`,
                            'success'
                        );
                    }

                    // Rafraîchir l'affichage
                    if (typeof PlanningRenderer !== 'undefined') {
                        PlanningRenderer.refreshShifts();
                    }

                    // Émettre événement
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit(PlanningEvents.SHIFT_UPDATED, shift);
                    }

                    return true;
                } else {
                    throw new Error(response.error || 'Erreur API');
                }
            } else {
                console.warn('⚠️ APIManager non disponible, sauvegarde locale seulement');

                // Rafraîchir quand même l'affichage
                if (typeof PlanningRenderer !== 'undefined') {
                    PlanningRenderer.refreshShifts();
                }

                return true;
            }

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du déplacement:', error);

            // Restaurer position originale en cas d'erreur
            const shift = AppState.shifts.get(shiftId);
            if (shift && DragDropManagerStatic.originalPosition) {
                shift.day = DragDropManagerStatic.originalPosition.day;
                shift.start_hour = DragDropManagerStatic.originalPosition.hour;
                AppState.shifts.set(shiftId, shift);

                if (typeof PlanningRenderer !== 'undefined') {
                    PlanningRenderer.refreshShifts();
                }
            }

            // Notification d'erreur
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors du déplacement', 'error');
            }

            return false;
        }
    }

    /**
     * AMÉLIORÉ : Vérifie si un déplacement est valide (avec support colonnes)
     */
    static isValidMove(shiftId, newDay, newHour) {
        const shift = AppState.shifts.get(shiftId);
        if (!shift) return false;

        // Vérifier les conflits avec d'autres créneaux du même employé
        const employee = AppState.employees.get(shift.employee_id);
        if (!employee) return false;

        const employeeShifts = AppState.employeeShifts.get(shift.employee_id) || [];

        for (const otherShift of employeeShifts) {
            if (otherShift.id === shiftId) continue; // Ignorer le créneau qu'on déplace

            if (otherShift.day === newDay) {
                // Vérifier le chevauchement horaire
                const otherStart = otherShift.start_hour;
                const otherEnd = otherStart + otherShift.duration;
                const newEnd = newHour + shift.duration;

                if ((newHour < otherEnd && newEnd > otherStart)) {
                    console.warn(`⚠️ Conflit détecté avec créneau ${otherShift.id}`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Gère la fin du drag globale
     */
    handleGlobalDragEnd(e) {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedShift = null;

        // Nettoyer les classes
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });

        document.querySelectorAll('.drag-over, .drag-over-valid, .drag-over-invalid').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-valid', 'drag-over-invalid');
        });

        // NOUVEAU : Supprimer les highlights de colonnes
        DragDropManagerStatic.removeAllDropZoneHighlights();
    }

    /**
     * Gère le drop global
     */
    handleGlobalDrop(e) {
        if (this.isDragging) {
            e.preventDefault();
        }
    }
}

// Créer l'instance et exposer les méthodes statiques
const dragDropManagerInstance = new DragDropManager();

const DragDropManagerStatic = {
    setupDropZone: DragDropManager.setupDropZone,
    setupDragAndDrop: DragDropManager.setupDragAndDrop,
    saveShiftMove: DragDropManager.saveShiftMove,
    isValidMove: DragDropManager.isValidMove,
    highlightAllValidDropZones: DragDropManager.highlightAllValidDropZones,
    removeAllDropZoneHighlights: DragDropManager.removeAllDropZoneHighlights,
    highlightTargetColumn: DragDropManager.highlightTargetColumn,
    removeColumnHighlight: DragDropManager.removeColumnHighlight,
    originalPosition: null,
    draggedEmployeeId: null,

    getInstance: () => dragDropManagerInstance
};

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.DragDropManager = DragDropManagerStatic;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DragDropManager: DragDropManagerStatic };
}

console.log('🔧 DragDropManager chargé avec SAUVEGARDE effective + SUPPORT COLONNES');