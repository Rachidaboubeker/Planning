/**
 * Planning Restaurant - Gestionnaire du drag & drop (AVEC SAUVEGARDE)
 * Corrige le problème de non-sauvegarde lors du drag & drop
 */

class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dropZones = new Set();
        this.isDragging = false;
        this.originalPosition = null;

        this.init();
    }

    /**
     * Initialise le gestionnaire
     */
    init() {
        this.setupGlobalEventListeners();
        console.log('🔧 DragDropManager initialisé avec sauvegarde');
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
     * Configure une zone de drop avec sauvegarde
     */
    static setupDropZone(cell) {
        if (!cell) return;

        cell.classList.add('drop-zone');

        // Dragover - autoriser le drop
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            cell.classList.add('drag-over');
        });

        // Dragleave - nettoyer
        cell.addEventListener('dragleave', (e) => {
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over');
            }
        });

        // CORRECTION: Drop avec sauvegarde effective
        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');

            const shiftId = e.dataTransfer.getData('text/plain');
            const newDay = cell.dataset.day;
            const newHour = parseInt(cell.dataset.hour);

            console.log(`🎯 Drop détecté: ${shiftId} → ${newDay} ${newHour}h`);

            // Effectuer la sauvegarde
            await DragDropManagerStatic.saveShiftMove(shiftId, newDay, newHour);
        });
    }

    /**
     * Configure le drag & drop pour un élément
     */
    static setupDragAndDrop(element, shift) {
        if (!element || !shift) {
            console.warn('Élément ou créneau manquant pour le drag & drop');
            return;
        }

        element.draggable = true;
        element.dataset.shiftId = shift.id;

        // CORRECTION: Sauvegarder position originale
        element.addEventListener('dragstart', (e) => {
            console.log('🚀 Début du drag:', shift.id, `${shift.day} ${shift.start_hour}h`);

            e.dataTransfer.setData('text/plain', shift.id);
            element.classList.add('dragging');

            // Sauvegarder position originale
            DragDropManagerStatic.originalPosition = {
                day: shift.day,
                hour: shift.start_hour
            };
        });

        element.addEventListener('dragend', (e) => {
            console.log('🏁 Fin du drag:', shift.id);
            element.classList.remove('dragging');
            DragDropManagerStatic.originalPosition = null;
        });
    }

    /**
     * NOUVEAU: Sauvegarde effective du déplacement
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
     * Vérifie si un déplacement est valide
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

        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
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
    originalPosition: null,

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

console.log('🔧 DragDropManager chargé avec SAUVEGARDE effective');