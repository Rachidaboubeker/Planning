/**
 * DRAG & DROP MANAGER UNIFIÉ - Planning Restaurant
 * Remplace drag-drop-manager.js, drag-drop-unified-fix.js et tous les gestionnaires dispersés
 * Système de drag & drop stable et performant
 */

class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dropZones = new Set();
        this.isInitialized = false;
        this.isDragging = false;

        this.bindGlobalEvents();
        console.log('🔧 Drag & Drop Manager unifié initialisé');
    }

    /**
     * Initialise le drag & drop manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('🔧 Drag & Drop Manager déjà initialisé');
            return;
        }

        try {
            // Configurer tous les éléments draggables
            this.setupDraggableElements();

            // Configurer toutes les zones de drop
            this.setupDropZones();

            // Observer les changements d'état
            this.setupStateObservers();

            this.isInitialized = true;
            console.log('✅ Drag & Drop Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation Drag & Drop Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Observer les changements de créneaux
        if (window.EventBus) {
            window.EventBus.on(window.Config?.EVENTS.SHIFT_ADDED, () => {
                this.refreshDraggableElements();
            });

            window.EventBus.on(window.Config?.EVENTS.SHIFT_UPDATED, () => {
                this.refreshDraggableElements();
            });

            window.EventBus.on(window.Config?.EVENTS.SHIFT_DELETED, () => {
                this.refreshDraggableElements();
            });
        }

        // Événements globaux de drag
        document.addEventListener('dragstart', (e) => this.handleGlobalDragStart(e));
        document.addEventListener('dragend', (e) => this.handleGlobalDragEnd(e));
        document.addEventListener('dragover', (e) => this.handleGlobalDragOver(e));
        document.addEventListener('drop', (e) => this.handleGlobalDrop(e));

        // Gestion clavier pendant le drag
        document.addEventListener('keydown', (e) => {
            if (this.isDragging && e.key === 'Escape') {
                this.cancelDrag();
            }
        });
    }

    /**
     * Configure les observateurs d'état
     */
    setupStateObservers() {
        if (window.State) {
            window.State.observe('shifts', () => {
                setTimeout(() => this.refreshDraggableElements(), 100);
            });
        }
    }

    // ==================== CONFIGURATION DES ÉLÉMENTS DRAGGABLES ====================

    /**
     * Configure tous les éléments draggables
     */
    setupDraggableElements() {
        const shiftBlocks = document.querySelectorAll('.shift-block');

        shiftBlocks.forEach(block => {
            this.makeDraggable(block);
        });

        console.log(`🔧 ${shiftBlocks.length} créneaux configurés pour le drag & drop`);
    }

    /**
     * Rafraîchit les éléments draggables
     */
    refreshDraggableElements() {
        // Supprimer les anciens listeners
        const oldBlocks = document.querySelectorAll('.shift-block[draggable="true"]');
        oldBlocks.forEach(block => {
            this.removeDraggable(block);
        });

        // Reconfigurer tous les blocs
        setTimeout(() => {
            this.setupDraggableElements();
        }, 50);
    }

    /**
     * Rend un élément draggable
     */
    makeDraggable(element) {
        if (!element || element.draggable) {
            return; // Déjà configuré
        }

        element.draggable = true;
        element.classList.add('draggable-element');

        // Événements de drag spécifiques à l'élément
        element.addEventListener('dragstart', (e) => this.handleDragStart(e, element));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e, element));

        // Effet visuel au survol
        element.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                element.style.cursor = 'grab';
            }
        });

        element.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                element.style.cursor = '';
            }
        });
    }

    /**
     * Supprime le drag d'un élément
     */
    removeDraggable(element) {
        if (!element) return;

        element.draggable = false;
        element.classList.remove('draggable-element');

        // Cloner l'élément pour supprimer tous les listeners
        const newElement = element.cloneNode(true);
        element.parentNode?.replaceChild(newElement, element);
    }

    // ==================== CONFIGURATION DES ZONES DE DROP ====================

    /**
     * Configure toutes les zones de drop
     */
    setupDropZones() {
        const scheduleCells = document.querySelectorAll('.schedule-cell');

        this.dropZones.clear();

        scheduleCells.forEach(cell => {
            this.makeDroppable(cell);
            this.dropZones.add(cell);
        });

        console.log(`🎯 ${scheduleCells.length} zones de drop configurées`);
    }

    /**
     * Rend une cellule droppable
     */
    makeDroppable(cell) {
        if (!cell) return;

        cell.classList.add('drop-zone');

        // Événements de drop
        cell.addEventListener('dragenter', (e) => this.handleDragEnter(e, cell));
        cell.addEventListener('dragleave', (e) => this.handleDragLeave(e, cell));
        cell.addEventListener('dragover', (e) => this.handleDragOver(e, cell));
        cell.addEventListener('drop', (e) => this.handleDrop(e, cell));
    }

    // ==================== GESTIONNAIRES D'ÉVÉNEMENTS DRAG ====================

    /**
     * Début de drag global
     */
    handleGlobalDragStart(e) {
        this.isDragging = true;
        document.body.classList.add('dragging-active');

        // Désactiver la sélection de texte pendant le drag
        document.body.style.userSelect = 'none';
    }

    /**
     * Fin de drag global
     */
    handleGlobalDragEnd(e) {
        this.isDragging = false;
        document.body.classList.remove('dragging-active');

        // Réactiver la sélection de texte
        document.body.style.userSelect = '';

        // Nettoyer les états visuels
        this.clearAllDropStates();
    }

    /**
     * Début de drag d'un créneau
     */
    handleDragStart(e, element) {
        this.draggedElement = element;
        this.draggedShift = this.getShiftFromElement(element);

        if (!this.draggedShift) {
            e.preventDefault();
            return;
        }

        // Calculer l'offset de la souris par rapport à l'élément
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Configurer les données de transfert
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedShift.id);

        // Effet visuel
        element.classList.add('dragging');
        element.style.opacity = '0.7';
        element.style.transform = 'scale(1.05)';
        element.style.zIndex = '1000';

        console.log(`🔧 Début drag créneau:`, this.draggedShift.id);

        // Émettre l'événement
        window.EventBus?.emit('dragdrop:start', {
            shift: this.draggedShift,
            element: element
        });
    }

    /**
     * Fin de drag d'un créneau
     */
    handleDragEnd(e, element) {
        if (element) {
            // Restaurer l'apparence
            element.classList.remove('dragging');
            element.style.opacity = '';
            element.style.transform = '';
            element.style.zIndex = '';
            element.style.cursor = '';
        }

        // Nettoyer les références
        this.draggedElement = null;
        this.draggedShift = null;
        this.dragOffset = { x: 0, y: 0 };

        console.log('🔧 Fin drag créneau');

        // Émettre l'événement
        window.EventBus?.emit('dragdrop:end', {
            element: element
        });
    }

    /**
     * Survol global pendant drag
     */
    handleGlobalDragOver(e) {
        e.preventDefault(); // Nécessaire pour autoriser le drop
    }

    /**
     * Drop global
     */
    handleGlobalDrop(e) {
        e.preventDefault();
    }

    // ==================== GESTIONNAIRES D'ÉVÉNEMENTS DROP ====================

    /**
     * Entrée dans une zone de drop
     */
    handleDragEnter(e, cell) {
        if (!this.draggedShift) return;

        e.preventDefault();

        // Vérifier si le drop est valide
        const isValid = this.isValidDrop(cell);

        if (isValid) {
            cell.classList.add('drag-over');
            cell.style.backgroundColor = 'rgba(5, 150, 105, 0.1)';
            cell.style.border = '2px dashed #059669';
        } else {
            cell.classList.add('drag-invalid');
            cell.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
            cell.style.border = '2px dashed #dc2626';
        }
    }

    /**
     * Sortie d'une zone de drop
     */
    handleDragLeave(e, cell) {
        // Vérifier que la souris sort vraiment de la cellule
        const rect = cell.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            this.clearDropState(cell);
        }
    }

    /**
     * Survol d'une zone de drop
     */
    handleDragOver(e, cell) {
        if (!this.draggedShift) return;

        e.preventDefault();

        // Maintenir l'état visuel
        const isValid = this.isValidDrop(cell);
        e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
    }

    /**
     * Drop dans une zone
     */
    async handleDrop(e, cell) {
        e.preventDefault();

        if (!this.draggedShift) return;

        this.clearDropState(cell);

        // Vérifier que le drop est valide
        if (!this.isValidDrop(cell)) {
            this.showDropError('Position invalide pour ce créneau');
            return;
        }

        try {
            // Extraire les informations de la cellule cible
            const targetInfo = this.getCellInfo(cell);

            console.log('🎯 Drop créneau:', this.draggedShift.id, 'vers', targetInfo);

            // Effectuer le déplacement
            await this.moveShift(this.draggedShift, targetInfo);

            // Succès
            this.showDropSuccess('Créneau déplacé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du drop:', error);
            this.showDropError(`Erreur: ${error.message}`);
        }
    }

    // ==================== VALIDATION ET LOGIQUE MÉTIER ====================

    /**
     * Vérifie si un drop est valide
     */
    isValidDrop(cell) {
        if (!this.draggedShift || !cell) return false;

        const targetInfo = this.getCellInfo(cell);
        if (!targetInfo) return false;

        // Vérifier que ce n'est pas la même position
        if (targetInfo.day === this.draggedShift.day &&
            targetInfo.hour === this.draggedShift.start_hour &&
            targetInfo.minutes === (this.draggedShift.start_minutes || 0)) {
            return false;
        }

        // Vérifier les conflits potentiels
        return !this.hasConflict(this.draggedShift, targetInfo);
    }

    /**
     * Vérifie les conflits de planning
     */
    hasConflict(shift, targetInfo) {
        if (!window.State) return false;

        const existingShifts = window.State.getDayShifts(targetInfo.day);

        // Calculer l'heure de fin du créneau déplacé
        const shiftStartTime = targetInfo.hour + (targetInfo.minutes / 60);
        const shiftEndTime = shiftStartTime + (shift.duration || 1);

        for (const existing of existingShifts) {
            // Ignorer le créneau lui-même
            if (existing.id === shift.id) continue;

            // Vérifier si c'est le même employé
            if (existing.employee_id === shift.employee_id) {
                const existingStartTime = existing.start_hour + ((existing.start_minutes || 0) / 60);
                const existingEndTime = existingStartTime + (existing.duration || 1);

                // Vérifier le chevauchement
                if (shiftStartTime < existingEndTime && shiftEndTime > existingStartTime) {
                    return true; // Conflit détecté
                }
            }
        }

        return false;
    }

    /**
     * Déplace un créneau vers une nouvelle position
     */
    async moveShift(shift, targetInfo) {
        const newShiftData = {
            ...shift,
            day: targetInfo.day,
            start_hour: targetInfo.hour,
            start_minutes: targetInfo.minutes
        };

        if (window.APIManager && typeof window.APIManager.moveShift === 'function') {
            // Déplacement via API
            await window.APIManager.moveShift(
                shift.id,
                targetInfo.day,
                targetInfo.hour,
                targetInfo.minutes
            );
        } else {
            // Déplacement local
            window.State?.setShift(newShiftData);
        }

        // Émettre l'événement de déplacement
        window.EventBus?.emit(window.Config?.EVENTS.SHIFT_MOVED, {
            shift: newShiftData,
            oldPosition: {
                day: shift.day,
                hour: shift.start_hour,
                minutes: shift.start_minutes || 0
            },
            newPosition: targetInfo
        });
    }

    // ==================== UTILITAIRES ====================

    /**
     * Extrait les informations d'un créneau depuis son élément DOM
     */
    getShiftFromElement(element) {
        const shiftId = element.dataset.shiftId;
        if (!shiftId || !window.State) return null;

        return window.State.state.shifts.get(shiftId);
    }

    /**
     * Extrait les informations d'une cellule
     */
    getCellInfo(cell) {
        if (!cell || !cell.dataset) return null;

        return {
            day: cell.dataset.day,
            hour: parseInt(cell.dataset.hour),
            minutes: parseInt(cell.dataset.minutes || 0)
        };
    }

    /**
     * Nettoie l'état visuel d'une cellule
     */
    clearDropState(cell) {
        if (!cell) return;

        cell.classList.remove('drag-over', 'drag-invalid');
        cell.style.backgroundColor = '';
        cell.style.border = '';
    }

    /**
     * Nettoie tous les états visuels
     */
    clearAllDropStates() {
        this.dropZones.forEach(cell => {
            this.clearDropState(cell);
        });
    }

    /**
     * Annule le drag en cours
     */
    cancelDrag() {
        if (this.draggedElement) {
            // Déclencher l'événement dragend
            const dragEndEvent = new Event('dragend', { bubbles: true });
            this.draggedElement.dispatchEvent(dragEndEvent);
        }

        this.clearAllDropStates();
        console.log('🔧 Drag annulé par l\'utilisateur');
    }

    // ==================== FEEDBACK UTILISATEUR ====================

    /**
     * Affiche un message de succès du drop
     */
    showDropSuccess(message) {
        if (window.NotificationManager && typeof window.NotificationManager.success === 'function') {
            window.NotificationManager.success(message);
        } else {
            console.log('✅', message);
        }
    }

    /**
     * Affiche un message d'erreur du drop
     */
    showDropError(message) {
        if (window.NotificationManager && typeof window.NotificationManager.error === 'function') {
            window.NotificationManager.error(message);
        } else {
            console.error('❌', message);
        }
    }

    // ==================== CONFIGURATION AVANCÉE ====================

    /**
     * Active/désactive le drag & drop
     */
    setEnabled(enabled) {
        const shiftBlocks = document.querySelectorAll('.shift-block');

        shiftBlocks.forEach(block => {
            if (enabled) {
                this.makeDraggable(block);
            } else {
                this.removeDraggable(block);
            }
        });

        console.log(`🔧 Drag & Drop ${enabled ? 'activé' : 'désactivé'}`);
    }

    /**
     * Configure la sensibilité du drag
     */
    setSensitivity(pixels = 5) {
        // Cette valeur peut être utilisée pour configurer quand commencer le drag
        this.dragSensitivity = pixels;
    }

    /**
     * Configure les animations
     */
    setAnimationDuration(duration = 300) {
        const style = document.createElement('style');
        style.textContent = `
            .shift-block {
                transition: all ${duration}ms ease-in-out !important;
            }
            .drop-zone {
                transition: all ${duration}ms ease-in-out !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== GESTION DES CONFLITS ====================

    /**
     * Vérifie tous les conflits de planning
     */
    checkAllConflicts() {
        if (!window.State) return [];

        return window.State.detectConflicts();
    }

    /**
     * Résout automatiquement les conflits mineurs
     */
    resolveConflicts() {
        const conflicts = this.checkAllConflicts();

        conflicts.forEach(conflict => {
            if (conflict.type === 'overlap') {
                // Tentative de résolution automatique
                this.tryResolveOverlap(conflict);
            }
        });
    }

    /**
     * Tente de résoudre un chevauchement
     */
    tryResolveOverlap(conflict) {
        // Logique simple : décaler le second créneau
        const shift2 = conflict.shift2;
        const shift1EndTime = conflict.shift1.start_hour + (conflict.shift1.duration || 1);

        const newShift2Data = {
            ...shift2,
            start_hour: Math.ceil(shift1EndTime),
            start_minutes: 0
        };

        // Vérifier que la nouvelle position est valide
        const targetCell = document.querySelector(
            `[data-day="${newShift2Data.day}"][data-hour="${newShift2Data.start_hour}"][data-minutes="0"]`
        );

        if (targetCell && this.isValidDrop(targetCell)) {
            window.State?.setShift(newShift2Data);
            this.showDropSuccess('Conflit résolu automatiquement');
        }
    }

    // ==================== ÉTAT ET DEBUG ====================

    /**
     * Obtient l'état actuel du drag & drop
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isDragging: this.isDragging,
            draggedShift: this.draggedShift?.id || null,
            dropZonesCount: this.dropZones.size,
            draggableElements: document.querySelectorAll('.shift-block[draggable="true"]').length
        };
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('🔧 DragDropManager Debug');
        console.table(this.getState());
        console.log('Drop zones:', Array.from(this.dropZones));
        console.log('Conflits détectés:', this.checkAllConflicts());
        console.groupEnd();
    }

    /**
     * Réinitialise complètement le drag & drop
     */
    reset() {
        this.clearAllDropStates();
        this.draggedElement = null;
        this.draggedShift = null;
        this.isDragging = false;

        // Reconfigurer tout
        this.setupDraggableElements();
        this.setupDropZones();

        console.log('🔧 Drag & Drop réinitialisé');
    }

    /**
     * Détruit le drag & drop manager
     */
    destroy() {
        this.clearAllDropStates();

        // Supprimer tous les listeners
        const draggableElements = document.querySelectorAll('.draggable-element');
        draggableElements.forEach(element => {
            this.removeDraggable(element);
        });

        this.dropZones.clear();
        this.isInitialized = false;

        console.log('🗑️ Drag & Drop Manager détruit');
    }

    // ==================== HOOKS POUR EXTENSIONS ====================

    /**
     * Hook appelé avant le début d'un drag
     */
    onBeforeDragStart(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('dragdrop:start', callback);
        }
    }

    /**
     * Hook appelé après la fin d'un drag
     */
    onAfterDragEnd(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('dragdrop:end', callback);
        }
    }

    /**
     * Hook appelé lors d'un déplacement réussi
     */
    onShiftMoved(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on(window.Config?.EVENTS.SHIFT_MOVED, callback);
        }
    }
}

// Instance globale unique
if (!window.DragDropManager) {
    window.DragDropManager = new DragDropManager();

    // Exposer pour debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugDragDrop = () => window.DragDropManager.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropManager;
}