/**
 * DRAG & DROP MANAGER - Version corrigée et optimisée
 * Gestion robuste du drag & drop avec validation JSON et gestion d'erreurs
 */

class DragDropManager {
    constructor() {
        this.isInitialized = false;
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedShift = null;
        this.dropZones = new Set();
        this.dragOffset = { x: 0, y: 0 };
        this.dragSensitivity = 5;
        this.lastValidDrop = null;

        // Configuration visuelle
        this.styles = {
            dragging: 'opacity: 0.5; transform: scale(0.95); z-index: 1000;',
            validDrop: 'background-color: rgba(5, 150, 105, 0.1); border: 2px dashed #059669;',
            invalidDrop: 'background-color: rgba(220, 38, 38, 0.1); border: 2px dashed #dc2626;',
            dropZone: 'transition: all 0.2s ease-in-out;'
        };

        this.init();
    }

    /**
     * Initialisation du drag & drop
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ DragDropManager déjà initialisé');
            return;
        }

        try {
            this.setupGlobalListeners();
            this.setupDraggableElements();
            this.setupDropZones();
            this.isInitialized = true;

            console.log('🎯 DragDropManager initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation DragDrop:', error);
        }
    }

    /**
     * Configuration des listeners globaux
     */
    setupGlobalListeners() {
        // Listeners pour gérer le drag global
        document.addEventListener('dragover', this.handleGlobalDragOver.bind(this), { passive: false });
        document.addEventListener('drop', this.handleGlobalDrop.bind(this), { passive: false });

        // Nettoyage sur échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDragging) {
                this.cancelDrag();
            }
        });

        // Observer pour les changements du DOM
        this.setupMutationObserver();
    }

    /**
     * Observer pour détecter les nouveaux éléments
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.setupNewElement(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.mutationObserver = observer;
    }

    /**
     * Configure un nouvel élément ajouté au DOM
     */
    setupNewElement(element) {
        // Éléments draggables
        const draggableElements = element.querySelectorAll?.('.shift-block') || [];
        draggableElements.forEach(el => this.makeDraggable(el));

        // Zones de drop
        const dropElements = element.querySelectorAll?.('.time-slot') || [];
        dropElements.forEach(el => this.makeDroppable(el));

        // L'élément lui-même
        if (element.classList?.contains('shift-block')) {
            this.makeDraggable(element);
        }
        if (element.classList?.contains('time-slot')) {
            this.makeDroppable(element);
        }
    }

    /**
     * Configure tous les éléments draggables
     */
    setupDraggableElements() {
        const shiftBlocks = document.querySelectorAll('.shift-block');
        shiftBlocks.forEach(element => this.makeDraggable(element));

        console.log(`🎯 ${shiftBlocks.length} éléments draggables configurés`);
    }

    /**
     * Rend un élément draggable
     */
    makeDraggable(element) {
        if (!element || element.draggable) return;

        element.draggable = true;
        element.style.cursor = 'grab';

        // Nettoyage des anciens listeners
        this.removeDraggable(element);

        // Nouveaux listeners avec validation
        element.addEventListener('dragstart', (e) => this.handleDragStart(e, element));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e, element));

        // Stockage pour nettoyage ultérieur
        element._dragListeners = true;
    }

    /**
     * Supprime les capacités drag d'un élément
     */
    removeDraggable(element) {
        if (!element || !element._dragListeners) return;

        element.draggable = false;
        element.style.cursor = '';
        element._dragListeners = false;

        // Note: removeEventListener nécessiterait de stocker les références
        // Pour simplifier, on utilise un flag pour ignorer les anciens listeners
    }

    /**
     * Configure toutes les zones de drop
     */
    setupDropZones() {
        const timeSlots = document.querySelectorAll('.time-slot');
        timeSlots.forEach(cell => this.makeDroppable(cell));

        console.log(`🎯 ${timeSlots.length} zones de drop configurées`);
    }

    /**
     * Rend une cellule droppable
     */
    makeDroppable(cell) {
        if (!cell || this.dropZones.has(cell)) return;

        // Ajout du style de base
        cell.style.cssText += this.styles.dropZone;

        // Listeners avec gestion d'erreurs robuste
        const dragEnterHandler = (e) => this.safeHandleDragEnter(e, cell);
        const dragLeaveHandler = (e) => this.safeHandleDragLeave(e, cell);
        const dragOverHandler = (e) => this.safeHandleDragOver(e, cell);
        const dropHandler = (e) => this.safeHandleDrop(e, cell);

        cell.addEventListener('dragenter', dragEnterHandler);
        cell.addEventListener('dragleave', dragLeaveHandler);
        cell.addEventListener('dragover', dragOverHandler);
        cell.addEventListener('drop', dropHandler);

        // Stockage pour nettoyage
        cell._dropListeners = {
            dragenter: dragEnterHandler,
            dragleave: dragLeaveHandler,
            dragover: dragOverHandler,
            drop: dropHandler
        };

        this.dropZones.add(cell);
    }

    // ==================== GESTIONNAIRES DRAG SÉCURISÉS ====================

    /**
     * Gestionnaire dragenter sécurisé
     */
    safeHandleDragEnter(e, cell) {
        try {
            this.handleDragEnter(e, cell);
        } catch (error) {
            console.error('❌ Erreur dragenter:', error);
        }
    }

    /**
     * Gestionnaire dragleave sécurisé
     */
    safeHandleDragLeave(e, cell) {
        try {
            this.handleDragLeave(e, cell);
        } catch (error) {
            console.error('❌ Erreur dragleave:', error);
        }
    }

    /**
     * Gestionnaire dragover sécurisé
     */
    safeHandleDragOver(e, cell) {
        try {
            this.handleDragOver(e, cell);
        } catch (error) {
            console.error('❌ Erreur dragover:', error);
        }
    }

    /**
     * Gestionnaire drop sécurisé
     */
    safeHandleDrop(e, cell) {
        try {
            this.handleDrop(e, cell);
        } catch (error) {
            console.error('❌ Erreur lors du drop:', error);
            this.showError('Erreur lors du déplacement');
        }
    }

    // ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

    /**
     * Début du drag
     */
    handleDragStart(e, element) {
        if (!element._dragListeners) return; // Ignorer les anciens listeners

        try {
            // Récupération des données du créneau avec validation
            const shiftData = this.extractShiftData(element);
            if (!shiftData) {
                e.preventDefault();
                console.error('❌ Données de créneau invalides');
                return;
            }

            this.draggedElement = element;
            this.draggedShift = shiftData;
            this.isDragging = true;

            // Configuration du dataTransfer avec gestion d'erreurs
            try {
                const transferData = JSON.stringify({
                    type: 'shift',
                    shift: shiftData,
                    timestamp: Date.now()
                });

                e.dataTransfer.setData('application/json', transferData);
                e.dataTransfer.setData('text/plain', `Créneau: ${shiftData.id}`);
                e.dataTransfer.effectAllowed = 'move';
            } catch (jsonError) {
                console.error('❌ Erreur sérialisation dataTransfer:', jsonError);
                // Fallback sans JSON
                e.dataTransfer.setData('text/plain', shiftData.id);
            }

            // Style visuel
            element.style.cssText += this.styles.dragging;

            // Calcul de l'offset pour un positionnement précis
            const rect = element.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            console.log('🎯 Début drag créneau:', shiftData.id);

        } catch (error) {
            console.error('❌ Erreur début drag:', error);
            e.preventDefault();
        }
    }

    /**
     * Extraction sécurisée des données de créneau
     */
    extractShiftData(element) {
        try {
            // Plusieurs méthodes pour récupérer les données
            let shiftData = null;

            // Méthode 1: Dataset
            if (element.dataset.shiftId) {
                const shifts = window.StateManager?.getState('shifts');
                if (shifts) {
                    shiftData = shifts.get(element.dataset.shiftId);
                }
            }

            // Méthode 2: Attributs data-*
            if (!shiftData && element.dataset.day) {
                shiftData = {
                    id: element.dataset.shiftId || `temp_${Date.now()}`,
                    employee_id: element.dataset.employeeId,
                    day: element.dataset.day,
                    start_hour: parseInt(element.dataset.hour),
                    start_minutes: parseInt(element.dataset.minutes || 0),
                    duration: parseFloat(element.dataset.duration || 1)
                };
            }

            // Méthode 3: Recherche dans le DOM parent
            if (!shiftData) {
                const timeSlot = element.closest('.time-slot');
                if (timeSlot) {
                    shiftData = {
                        id: element.id || `temp_${Date.now()}`,
                        employee_id: element.querySelector('.employee-info')?.dataset.employeeId,
                        day: timeSlot.dataset.day,
                        start_hour: parseInt(timeSlot.dataset.hour),
                        start_minutes: parseInt(timeSlot.dataset.minutes || 0),
                        duration: 1
                    };
                }
            }

            // Validation des données extraites
            if (shiftData && this.validateShiftData(shiftData)) {
                return shiftData;
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur extraction données créneau:', error);
            return null;
        }
    }

    /**
     * Validation des données de créneau
     */
    validateShiftData(shiftData) {
        if (!shiftData || typeof shiftData !== 'object') return false;

        const required = ['id', 'day'];
        return required.every(field => shiftData[field] !== undefined && shiftData[field] !== null);
    }

    /**
     * Fin du drag
     */
    handleDragEnd(e, element) {
        if (!this.isDragging) return;

        try {
            // Nettoyage visuel
            if (element) {
                element.style.opacity = '';
                element.style.transform = '';
                element.style.zIndex = '';
                element.style.cursor = 'grab';
            }

            this.clearAllDropStates();
            this.resetDragState();

            console.log('🎯 Fin drag créneau');

        } catch (error) {
            console.error('❌ Erreur fin drag:', error);
        }
    }

    /**
     * Survol d'une zone de drop
     */
    handleDragEnter(e, cell) {
        if (!this.isDragging || !this.draggedShift) return;

        e.preventDefault();

        const isValid = this.isValidDrop(cell);
        this.applyDropVisual(cell, isValid);
    }

    /**
     * Sortie d'une zone de drop
     */
    handleDragLeave(e, cell) {
        if (!this.isDragging) return;

        // Vérifier que la souris sort vraiment de la cellule
        const rect = cell.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            this.clearDropState(cell);
        }
    }

    /**
     * Survol continu d'une zone de drop
     */
    handleDragOver(e, cell) {
        if (!this.isDragging || !this.draggedShift) return;

        e.preventDefault();

        const isValid = this.isValidDrop(cell);
        e.dataTransfer.dropEffect = isValid ? 'move' : 'none';

        // Maintenir l'état visuel
        this.applyDropVisual(cell, isValid);
    }

    /**
     * Drop effectif
     */
    async handleDrop(e, cell) {
        e.preventDefault();

        if (!this.isDragging || !this.draggedShift) {
            console.warn('⚠️ Pas de données de drag disponibles');
            return;
        }

        try {
            // Récupération sécurisée des données transfer
            const transferData = this.getTransferData(e);
            if (!transferData) {
                throw new Error('Données de transfert invalides');
            }

            // Validation de la position de drop
            if (!this.isValidDrop(cell)) {
                throw new Error('Position de drop invalide');
            }

            // Extraction des coordonnées de destination
            const dropPosition = this.extractDropPosition(cell);
            if (!dropPosition) {
                throw new Error('Position de destination invalide');
            }

            console.log('🎯 Drop validé:', dropPosition);

            // Appel API pour déplacer le créneau
            await this.executeMove(this.draggedShift.id, dropPosition);

            this.showSuccess('Créneau déplacé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du drop:', error);
            this.showError(`Erreur lors du drop: ${error.message}`);
        } finally {
            this.clearAllDropStates();
            this.resetDragState();
        }
    }

    /**
     * Récupère les données de transfert de manière sécurisée
     */
    getTransferData(e) {
        try {
            // Tentative de récupération JSON
            const jsonData = e.dataTransfer.getData('application/json');
            if (jsonData && jsonData.trim()) {
                const parsed = JSON.parse(jsonData);
                if (parsed.type === 'shift' && parsed.shift) {
                    return parsed;
                }
            }
        } catch (jsonError) {
            console.warn('⚠️ Échec parsing JSON transfer, utilisation des données drag actuelles');
        }

        // Fallback avec les données actuelles
        if (this.draggedShift) {
            return {
                type: 'shift',
                shift: this.draggedShift,
                timestamp: Date.now()
            };
        }

        return null;
    }

    /**
     * Extrait la position de drop de la cellule
     */
    extractDropPosition(cell) {
        try {
            const day = cell.dataset.day;
            const hour = parseInt(cell.dataset.hour);
            const minutes = parseInt(cell.dataset.minutes || 0);

            if (!day || isNaN(hour)) {
                return null;
            }

            return { day, hour, minutes };
        } catch (error) {
            console.error('❌ Erreur extraction position drop:', error);
            return null;
        }
    }

    /**
     * Exécute le déplacement via l'API
     */
    async executeMove(shiftId, position) {
        if (!window.APIManager) {
            throw new Error('APIManager non disponible');
        }

        try {
            const response = await window.APIManager.moveShift(
                shiftId,
                position.day,
                position.hour,
                position.minutes
            );

            if (!response.success) {
                throw new Error(response.error || 'Échec du déplacement');
            }

            // Mise à jour locale du state
            if (response.shift && window.StateManager) {
                window.StateManager.setShift(response.shift);
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur API moveShift:', error);
            throw error;
        }
    }

    // ==================== VALIDATION ET LOGIQUE MÉTIER ====================

    /**
     * Vérifie si un drop est valide
     */
    isValidDrop(cell) {
        if (!cell || !this.draggedShift) return false;

        try {
            // Vérification de base de la cellule
            if (!cell.classList.contains('time-slot')) return false;

            const targetDay = cell.dataset.day;
            const targetHour = parseInt(cell.dataset.hour);

            if (!targetDay || isNaN(targetHour)) return false;

            // Vérification des conflits
            const wouldConflict = this.checkConflictAtPosition(
                this.draggedShift.employee_id,
                targetDay,
                targetHour,
                this.draggedShift.duration || 1,
                this.draggedShift.id // Exclure le créneau actuel
            );

            if (wouldConflict) {
                console.log('⚠️ Conflit détecté à la position cible');
                return false;
            }

            // Vérification des contraintes horaires
            if (!this.isValidTimeSlot(targetHour, targetDay)) return false;

            return true;
        } catch (error) {
            console.error('❌ Erreur validation drop:', error);
            return false;
        }
    }

    /**
     * Vérifie les conflits à une position donnée
     */
    checkConflictAtPosition(employeeId, day, hour, duration, excludeShiftId) {
        if (!window.StateManager) return false;

        const shifts = window.StateManager.getState('shifts');
        if (!shifts) return false;

        const endHour = hour + duration;

        for (const [shiftId, shift] of shifts.entries()) {
            // Ignorer le créneau en cours de déplacement
            if (shiftId === excludeShiftId) continue;

            // Même employé et même jour
            if (shift.employee_id === employeeId && shift.day === day) {
                const shiftStart = shift.start_hour + (shift.start_minutes || 0) / 60;
                const shiftEnd = shiftStart + (shift.duration || 1);

                // Vérification du chevauchement
                if (!(endHour <= shiftStart || hour >= shiftEnd)) {
                    return true; // Conflit détecté
                }
            }
        }

        return false;
    }

    /**
     * Vérifie si un créneau horaire est valide
     */
    isValidTimeSlot(hour, day) {
        // Récupération des heures autorisées depuis la config
        const validHours = window.Config?.HOURS_RANGE || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
        const validDays = window.Config?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        return validHours.includes(hour) && validDays.includes(day);
    }

    // ==================== GESTION VISUELLE ====================

    /**
     * Applique l'état visuel de drop
     */
    applyDropVisual(cell, isValid) {
        this.clearDropState(cell);

        if (isValid) {
            cell.style.cssText += this.styles.validDrop;
            cell.classList.add('drag-over-valid');
        } else {
            cell.style.cssText += this.styles.invalidDrop;
            cell.classList.add('drag-over-invalid');
        }
    }

    /**
     * Nettoie l'état visuel d'une cellule
     */
    clearDropState(cell) {
        if (!cell) return;

        cell.style.backgroundColor = '';
        cell.style.border = '';
        cell.classList.remove('drag-over-valid', 'drag-over-invalid', 'drag-over');
    }

    /**
     * Nettoie tous les états visuels de drop
     */
    clearAllDropStates() {
        this.dropZones.forEach(cell => this.clearDropState(cell));
    }

    /**
     * Remet à zéro l'état du drag
     */
    resetDragState() {
        this.draggedElement = null;
        this.draggedShift = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
    }

    /**
     * Annule un drag en cours
     */
    cancelDrag() {
        if (!this.isDragging) return;

        console.log('🚫 Drag annulé');

        if (this.draggedElement) {
            this.draggedElement.style.opacity = '';
            this.draggedElement.style.transform = '';
            this.draggedElement.style.zIndex = '';
        }

        this.clearAllDropStates();
        this.resetDragState();
    }

    // ==================== GESTIONNAIRES GLOBAUX ====================

    /**
     * Gestionnaire dragover global
     */
    handleGlobalDragOver(e) {
        if (this.isDragging) {
            e.preventDefault();
        }
    }

    /**
     * Gestionnaire drop global
     */
    handleGlobalDrop(e) {
        if (this.isDragging) {
            e.preventDefault();
            // Si on arrive ici, c'est un drop en dehors des zones valides
            console.log('🎯 Drop en dehors des zones valides - annulation');
            this.cancelDrag();
        }
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Affiche un message de succès
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Affiche un message d'erreur
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Réutilisation du système de notification de l'APIManager
        if (window.APIManager && window.APIManager.showNotification) {
            window.APIManager.showNotification(message, type);
            return;
        }

        // Fallback simple
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    // ==================== UTILITAIRES ====================

    /**
     * Reconfigure tous les éléments drag & drop
     */
    refresh() {
        this.clearAllDropStates();
        this.resetDragState();

        // Reconfiguration
        this.setupDraggableElements();
        this.setupDropZones();

        console.log('🔄 DragDropManager rafraîchi');
    }

    /**
     * Obtient l'état actuel
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
     * Détruit le manager et nettoie les ressources
     */
    destroy() {
        this.cancelDrag();
        this.clearAllDropStates();

        // Suppression des listeners globaux
        document.removeEventListener('dragover', this.handleGlobalDragOver);
        document.removeEventListener('drop', this.handleGlobalDrop);

        // Arrêt de l'observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        // Nettoyage des éléments
        document.querySelectorAll('[draggable="true"]').forEach(el => {
            this.removeDraggable(el);
        });

        this.dropZones.clear();
        this.isInitialized = false;

        console.log('🗑️ DragDropManager détruit');
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('🎯 DragDropManager Debug');
        console.table(this.getState());
        console.log('Drop zones:', Array.from(this.dropZones));
        console.log('Conflits détectés:', window.StateManager?.detectConflicts() || []);
        console.log('Configuration:', {
            sensitivity: this.dragSensitivity,
            styles: this.styles
        });
        console.groupEnd();
    }
}

// Instance globale unique
if (!window.DragDropManager) {
    window.DragDropManager = new DragDropManager();

    // Exposition pour debug en développement
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugDragDrop = () => window.DragDropManager.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropManager;
}