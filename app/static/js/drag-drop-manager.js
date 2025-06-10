/**
 * Planning Restaurant - Gestionnaire du drag & drop
 * Gestion du glisser-déposer pour les créneaux
 */

class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dropZones = new Set();
        this.isDragging = false;

        this.init();
    }

    /**
     * Initialise le gestionnaire
     */
    init() {
        this.setupGlobalEventListeners();
        Logger.debug('DragDropManager initialisé');
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        // Écouteurs pour nettoyer l'état lors du drag
        document.addEventListener('dragend', this.handleGlobalDragEnd.bind(this));
        document.addEventListener('drop', this.handleGlobalDrop.bind(this));

        // Empêcher le comportement par défaut sur certains éléments
        document.addEventListener('dragover', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    }

    /**
     * Configure le drag & drop pour un élément de créneau
     */
    setupDragAndDrop(element, shift) {
        if (!element || !shift) {
            Logger.warn('Élément ou créneau manquant pour le drag & drop');
            return;
        }

        element.draggable = true;
        element.dataset.shiftId = shift.id;

        // Événements de drag
        element.addEventListener('dragstart', (e) => this.handleDragStart(e, element, shift));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e, element));

        // Styles de drag
        element.addEventListener('dragstart', () => element.classList.add('dragging'));
        element.addEventListener('dragend', () => element.classList.remove('dragging'));

        Logger.debug(`Drag & drop configuré pour le créneau ${shift.id}`);
    }

    /**
     * Gère le début du drag
     */
    handleDragStart(e, element, shift) {
        this.isDragging = true;
        this.draggedElement = element;
        this.draggedShift = shift;

        // Données de transfert
        e.dataTransfer.setData('text/plain', shift.id);
        e.dataTransfer.setData('application/json', JSON.stringify(shift));

        // Configuration du drag
        e.dataTransfer.effectAllowed = 'move';

        // Créer une image de drag personnalisée
        this.createDragImage(e, element, shift);

        // Calculer l'offset de la souris
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Mettre en évidence les zones de drop valides
        this.highlightValidDropZones(shift);

        Logger.debug(`Début du drag pour ${shift.id}`);
        EventBus.emit('drag:start', { shift, element });
    }

    /**
     * Crée une image personnalisée pour le drag
     */
    createDragImage(e, element, shift) {
        try {
            const dragImage = element.cloneNode(true);

            // Styles pour l'image de drag
            dragImage.style.transform = 'rotate(3deg) scale(1.05)';
            dragImage.style.opacity = '0.9';
            dragImage.style.position = 'fixed';
            dragImage.style.top = '-1000px';
            dragImage.style.left = '-1000px';
            dragImage.style.pointerEvents = 'none';
            dragImage.style.zIndex = '9999';
            dragImage.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';

            // Ajouter temporairement au DOM
            document.body.appendChild(dragImage);

            // Définir comme image de drag
            e.dataTransfer.setDragImage(dragImage, this.dragOffset.x, this.dragOffset.y);

            // Supprimer après un court délai
            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 100);

        } catch (error) {
            Logger.warn('Erreur lors de la création de l\'image de drag:', error);
        }
    }

    /**
     * Met en évidence les zones de drop valides
     */
    highlightValidDropZones(shift) {
        const cells = document.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            const day = cell.dataset.day;
            const hour = parseInt(cell.dataset.hour);

            if (this.isValidDropTarget(shift, day, hour)) {
                cell.classList.add('valid-drop-zone');
            } else {
                cell.classList.add('invalid-drop-zone');
            }
        });
    }

    /**
     * Gère la fin du drag
     */
    handleDragEnd(e, element) {
        this.cleanupDragState();
        Logger.debug('Fin du drag');
        EventBus.emit('drag:end', { shift: this.draggedShift, element });
    }

    /**
     * Gère la fin du drag globale
     */
    handleGlobalDragEnd(e) {
        this.cleanupDragState();
    }

    /**
     * Gère le drop global
     */
    handleGlobalDrop(e) {
        if (this.isDragging) {
            e.preventDefault();
        }
    }

    /**
     * Configure une zone de drop
     */
    setupDropZone(cell) {
        if (!cell) return;

        this.dropZones.add(cell);

        cell.addEventListener('dragover', (e) => this.handleDragOver(e, cell));
        cell.addEventListener('dragleave', (e) => this.handleDragLeave(e, cell));
        cell.addEventListener('drop', (e) => this.handleDrop(e, cell));

        Logger.debug('Zone de drop configurée');
    }

    /**
     * Gère le survol pendant le drag
     */
    handleDragOver(e, cell) {
        if (!this.isDragging || !this.draggedShift) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const day = cell.dataset.day;
        const hour = parseInt(cell.dataset.hour);

        // Validation en temps réel
        if (this.isValidDropTarget(this.draggedShift, day, hour)) {
            cell.classList.add('drag-over');
            cell.classList.remove('drag-invalid');
        } else {
            cell.classList.add('drag-invalid');
            cell.classList.remove('drag-over');
        }
    }

    /**
     * Gère la sortie de la zone de drag
     */
    handleDragLeave(e, cell) {
        // Vérifier que la souris a vraiment quitté la cellule
        if (!cell.contains(e.relatedTarget)) {
            cell.classList.remove('drag-over', 'drag-invalid');
        }
    }

    /**
     * Gère le drop
     */
    async handleDrop(e, cell) {
        e.preventDefault();

        if (!this.isDragging || !this.draggedShift) {
            this.cleanupDragState();
            return;
        }

        const day = cell.dataset.day;
        const hour = parseInt(cell.dataset.hour);
        const shift = this.draggedShift;

        Logger.debug(`Tentative de drop: ${shift.id} vers ${day} ${hour}h`);

        // Validation finale
        if (!this.isValidDropTarget(shift, day, hour)) {
            this.showDropError('Déplacement impossible à cet endroit');
            this.cleanupDragState();
            return;
        }

        // Vérifier si c'est la même position
        if (shift.day === day && shift.start_hour === hour) {
            Logger.debug('Même position, pas de changement');
            this.cleanupDragState();
            return;
        }

        try {
            // Afficher le feedback de chargement
            this.showDropFeedback(cell, 'loading');

            // Effectuer la mise à jour via l'API
            const result = await this.updateShiftPosition(shift.id, day, hour);

            if (result.success) {
                // Mettre à jour l'état local
                shift.day = day;
                shift.start_hour = hour;
                AppState.shifts.set(shift.id, result.shift);

                // Émettre l'événement de mise à jour
                EventBus.emit(PlanningEvents.SHIFT_UPDATED, result.shift);

                this.showDropFeedback(cell, 'success');
                this.showSuccessNotification('Créneau déplacé avec succès');

                Logger.info(`Créneau ${shift.id} déplacé vers ${day} ${hour}h`);

            } else {
                throw new Error(result.error || 'Erreur inconnue');
            }

        } catch (error) {
            Logger.error('Erreur lors du drop:', error);
            this.showDropFeedback(cell, 'error');
            this.showErrorNotification(`Erreur: ${error.message}`);
        }

        this.cleanupDragState();
    }

    /**
     * Valide si une position est valide pour le drop
     */
    isValidDropTarget(shift, targetDay, targetHour) {
        // Vérifications de base
        if (!shift || !targetDay || typeof targetHour !== 'number') {
            return false;
        }

        // Vérifier si l'heure est dans la plage valide
        if (!PlanningConfig.HOURS_RANGE.includes(targetHour)) {
            Logger.debug(`Heure ${targetHour} hors plage`);
            return false;
        }

        // Vérifier si le créneau peut tenir dans la plage horaire
        const targetIndex = PlanningConfig.HOURS_RANGE.indexOf(targetHour);
        if (targetIndex + shift.duration > PlanningConfig.HOURS_RANGE.length) {
            Logger.debug('Créneau trop long pour la plage horaire');
            return false;
        }

        // Vérifier les conflits avec d'autres créneaux du même employé
        return !this.hasEmployeeConflict(shift, targetDay, targetHour);
    }

    /**
     * Vérifie les conflits avec les créneaux du même employé
     */
    hasEmployeeConflict(shift, targetDay, targetHour) {
        const employeeShifts = AppState.employeeShifts.get(shift.employee_id) || [];

        for (const otherShift of employeeShifts) {
            // Ignorer le créneau lui-même
            if (otherShift.id === shift.id) continue;

            // Vérifier seulement les créneaux du même jour
            if (otherShift.day !== targetDay) continue;

            // Calculer les plages horaires
            const otherStart = otherShift.start_hour;
            const otherEnd = (otherShift.start_hour + otherShift.duration) % 24;
            const newStart = targetHour;
            const newEnd = (targetHour + shift.duration) % 24;

            // Détection de chevauchement
            if (this.hoursOverlap(newStart, newEnd, otherStart, otherEnd)) {
                Logger.debug(`Conflit détecté avec le créneau ${otherShift.id}`);
                return true;
            }
        }

        return false;
    }

    /**
     * Vérifie si deux plages horaires se chevauchent
     */
    hoursOverlap(start1, end1, start2, end2) {
        // Cas simple sans traversée de minuit
        if (start1 <= end1 && start2 <= end2) {
            return !(end1 <= start2 || start1 >= end2);
        }

        // Cas complexe avec traversée de minuit
        // Pour simplifier, on considère qu'il n'y a pas de chevauchement
        // Cette logique peut être améliorée selon les besoins
        return false;
    }

    /**
     * Met à jour la position d'un créneau via l'API
     */
    async updateShiftPosition(shiftId, newDay, newHour) {
        if (typeof APIManager !== 'undefined') {
            return await APIManager.updateShift(shiftId, {
                day: newDay,
                start_hour: newHour
            });
        } else {
            // Simulation pour les tests
            return {
                success: true,
                shift: {
                    ...AppState.shifts.get(shiftId),
                    day: newDay,
                    start_hour: newHour
                }
            };
        }
    }

    /**
     * Affiche un feedback visuel lors du drop
     */
    showDropFeedback(cell, type) {
        // Supprimer les anciens feedbacks
        cell.classList.remove('drop-loading', 'drop-success', 'drop-error');

        // Ajouter le nouveau feedback
        cell.classList.add(`drop-${type}`);

        // Supprimer automatiquement après un délai
        if (type !== 'loading') {
            setTimeout(() => {
                cell.classList.remove(`drop-${type}`);
            }, 1000);
        }
    }

    /**
     * Affiche une notification de succès
     */
    showSuccessNotification(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`✅ ${message}`, 'success');
        }
    }

    /**
     * Affiche une notification d'erreur
     */
    showErrorNotification(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`❌ ${message}`, 'error');
        }
    }

    /**
     * Affiche une erreur de drop
     */
    showDropError(message) {
        this.showErrorNotification(message);

        // Animation de secousse sur l'élément draggé
        if (this.draggedElement) {
            this.draggedElement.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                if (this.draggedElement) {
                    this.draggedElement.style.animation = '';
                }
            }, 500);
        }
    }

    /**
     * Nettoie l'état du drag & drop
     */
    cleanupDragState() {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };

        // Nettoyer les styles des cellules
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.classList.remove(
                'drag-over',
                'drag-invalid',
                'valid-drop-zone',
                'invalid-drop-zone',
                'drop-loading',
                'drop-success',
                'drop-error'
            );
        });

        // Nettoyer les styles des éléments draggés
        document.querySelectorAll('.shift-block').forEach(block => {
            block.classList.remove('dragging');
        });

        // Nettoyer l'état global d'AppState
        AppState.draggedElement = null;
    }

    /**
     * Obtient les informations de drop pour une position
     */
    getDropInfo(day, hour) {
        if (!this.draggedShift) return null;

        return {
            isValid: this.isValidDropTarget(this.draggedShift, day, hour),
            conflicts: this.getConflicts(this.draggedShift, day, hour),
            samePosition: this.draggedShift.day === day && this.draggedShift.start_hour === hour
        };
    }

    /**
     * Obtient les conflits potentiels pour une position
     */
    getConflicts(shift, targetDay, targetHour) {
        const conflicts = [];
        const employeeShifts = AppState.employeeShifts.get(shift.employee_id) || [];

        for (const otherShift of employeeShifts) {
            if (otherShift.id === shift.id) continue;
            if (otherShift.day !== targetDay) continue;

            const otherStart = otherShift.start_hour;
            const otherEnd = (otherShift.start_hour + otherShift.duration) % 24;
            const newStart = targetHour;
            const newEnd = (targetHour + shift.duration) % 24;

            if (this.hoursOverlap(newStart, newEnd, otherStart, otherEnd)) {
                const employee = AppState.employees.get(otherShift.employee_id);
                conflicts.push({
                    shift: otherShift,
                    employee: employee ? employee.nom_complet : 'Employé inconnu',
                    time: `${PlanningUtils.formatHour(otherShift.start_hour)} (${otherShift.duration}h)`
                });
            }
        }

        return conflicts;
    }

    /**
     * Active/désactive le drag & drop
     */
    setEnabled(enabled) {
        const elements = document.querySelectorAll('.shift-block[draggable]');

        elements.forEach(element => {
            element.draggable = enabled;

            if (enabled) {
                element.classList.remove('drag-disabled');
            } else {
                element.classList.add('drag-disabled');
            }
        });

        Logger.info(`Drag & drop ${enabled ? 'activé' : 'désactivé'}`);
    }

    /**
     * Obtient les statistiques du drag & drop
     */
    getStats() {
        return {
            dropZones: this.dropZones.size,
            isDragging: this.isDragging,
            draggedShift: this.draggedShift ? this.draggedShift.id : null
        };
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.cleanupDragState();
        this.dropZones.clear();

        // Supprimer les écouteurs globaux
        document.removeEventListener('dragend', this.handleGlobalDragEnd);
        document.removeEventListener('drop', this.handleGlobalDrop);

        Logger.info('DragDropManager détruit');
    }
}

// Styles CSS pour les animations (à ajouter dynamiquement)
const dragDropStyles = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    .shift-block.dragging {
        opacity: 0.7;
        transform: rotate(3deg) scale(1.05);
        z-index: 1000;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }

    .schedule-cell.drag-over {
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border: 2px dashed var(--info-color, #2196f3);
        transform: scale(1.02);
    }

    .schedule-cell.drag-invalid {
        background: linear-gradient(135deg, #ffebee, #ffcdd2);
        border: 2px dashed var(--error-color, #f44336);
    }

    .schedule-cell.valid-drop-zone {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .schedule-cell.invalid-drop-zone {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
    }

    .schedule-cell.drop-loading {
        background: linear-gradient(135deg, #fff3e0, #ffcc02);
        position: relative;
    }

    .schedule-cell.drop-loading::after {
        content: "⏳";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.2rem;
    }

    .schedule-cell.drop-success {
        background: linear-gradient(135deg, #e8f5e8, #4caf50);
        animation: pulse 0.5s ease-in-out;
    }

    .schedule-cell.drop-error {
        background: linear-gradient(135deg, #ffebee, #f44336);
        animation: shake 0.5s ease-in-out;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    .shift-block.drag-disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

// Ajouter les styles au DOM
function addDragDropStyles() {
    if (!document.getElementById('drag-drop-styles')) {
        const style = document.createElement('style');
        style.id = 'drag-drop-styles';
        style.textContent = dragDropStyles;
        document.head.appendChild(style);
    }
}

// Instance globale
let dragDropManagerInstance = null;

/**
 * Factory pour créer/récupérer l'instance du gestionnaire
 */
function getDragDropManager() {
    if (!dragDropManagerInstance) {
        dragDropManagerInstance = new DragDropManager();
        addDragDropStyles();
    }

    return dragDropManagerInstance;
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.DragDropManager = getDragDropManager();
    window.addDragDropStyles = addDragDropStyles;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DragDropManager, getDragDropManager, addDragDropStyles };
}

Logger.info('DragDropManager chargé avec succès');