// ==================== CORRECTION DRAG & DROP UNIFIÉ ====================
// Résout les conflits entre les différents systèmes de drag & drop

console.log('🔧 Chargement de la correction drag & drop unifiée...');

/**
 * Gestionnaire unifié de drag & drop
 * Combine granularité, colonnes et sauvegarde
 */
class UnifiedDragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedShift = null;
        this.originalPosition = null;
        this.activeDropHandlers = new Set();
    }

    /**
     * Configure le drag & drop pour un élément de créneau
     */
    setupShiftDragAndDrop(element, shift) {
        if (!element || !shift) {
            console.warn('❌ Élément ou créneau manquant pour drag & drop');
            return;
        }

        // Nettoyer les anciens événements
        this.removeExistingDragEvents(element);

        element.draggable = true;
        element.dataset.shiftId = shift.id;

        // Dragstart unifié
        element.addEventListener('dragstart', (e) => {
            console.log('🚀 DRAG START:', shift.id);

            this.isDragging = true;
            this.draggedShift = shift;
            this.originalPosition = {
                day: shift.day,
                hour: shift.start_hour,
                minutes: shift.start_minutes || 0
            };

            e.dataTransfer.setData('text/plain', shift.id);
            e.dataTransfer.effectAllowed = 'move';

            element.classList.add('dragging');
            element.style.opacity = '0.5';

            // Sauvegarder dans le contexte global si nécessaire
            if (typeof employeeColumnManager !== 'undefined') {
                const employee = AppState.employees.get(shift.employee_id);
                if (employee) {
                    console.log(`👤 ${employee.prenom} peut être déplacé dans colonne ${employeeColumnManager.getEmployeeColumn(employee.id) + 1}`);
                }
            }
        });

        // Dragend unifié
        element.addEventListener('dragend', (e) => {
            console.log('🏁 DRAG END:', shift.id);

            this.isDragging = false;
            this.draggedShift = null;
            this.originalPosition = null;

            element.classList.remove('dragging');
            element.style.opacity = '1';

            // Nettoyer toutes les zones de drop
            document.querySelectorAll('.drag-over, .invalid-drop').forEach(el => {
                el.classList.remove('drag-over', 'invalid-drop');
            });
        });
    }

    /**
     * Configure une zone de drop unifiée
     */
    setupDropZone(cell) {
        if (!cell || this.activeDropHandlers.has(cell)) {
            return; // Éviter les doublons
        }

        this.activeDropHandlers.add(cell);

        // Dragover
        cell.addEventListener('dragover', (e) => {
            if (!this.isDragging) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (this.isValidDrop(cell)) {
                cell.classList.add('drag-over');
                cell.classList.remove('invalid-drop');
            } else {
                cell.classList.add('invalid-drop');
                cell.classList.remove('drag-over');
            }
        });

        // Dragleave
        cell.addEventListener('dragleave', (e) => {
            // Vérifier que la souris quitte vraiment la cellule
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over', 'invalid-drop');
            }
        });

        // Drop unifié
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over', 'invalid-drop');

            if (!this.isDragging || !this.draggedShift) {
                console.warn('❌ Aucun créneau en cours de déplacement');
                return;
            }

            this.handleUnifiedDrop(e, cell);
        });
    }

    /**
     * Valide si un drop est possible
     */
    isValidDrop(cell) {
        if (!this.draggedShift) return false;

        const targetDay = cell.dataset.day;
        const targetHour = parseInt(cell.dataset.hour);
        const targetMinutes = parseInt(cell.dataset.minutes) || 0;

        // Vérifier si c'est la même position
        if (this.draggedShift.day === targetDay &&
            this.draggedShift.start_hour === targetHour &&
            (this.draggedShift.start_minutes || 0) === targetMinutes) {
            return false;
        }

        // Vérifier les conflits d'employé
        const employeeId = this.draggedShift.employee_id;

        for (const [shiftId, shift] of AppState.shifts) {
            if (shiftId === this.draggedShift.id) continue;
            if (shift.employee_id !== employeeId) continue;
            if (shift.day !== targetDay) continue;

            // Calculer les plages horaires
            const existingStart = shift.start_hour + (shift.start_minutes || 0) / 60;
            const existingEnd = existingStart + shift.duration;

            const newStart = targetHour + targetMinutes / 60;
            const newEnd = newStart + this.draggedShift.duration;

            // Vérifier chevauchement
            if (!(newEnd <= existingStart || newStart >= existingEnd)) {
                console.warn(`⚠️ Conflit détecté avec créneau ${shiftId}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Gère le drop unifié
     */
    async handleUnifiedDrop(e, cell) {
        const shiftId = e.dataTransfer.getData('text/plain');

        if (shiftId !== this.draggedShift.id) {
            console.warn('❌ ID de créneau incohérent');
            return;
        }

        if (!this.isValidDrop(cell)) {
            console.warn('❌ Drop invalide');
            return;
        }

        const newDay = cell.dataset.day;
        const newHour = parseInt(cell.dataset.hour);
        const newMinutes = parseInt(cell.dataset.minutes) || 0;

        console.log(`🎯 DROP UNIFIÉ: ${shiftId} → ${newDay} ${newHour}:${newMinutes.toString().padStart(2, '0')}`);

        // Déterminer le système de coordonnées selon la granularité
        const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;

        let updateData;
        if (granularity === 60) {
            // Granularité 60min - ne pas envoyer les minutes
            updateData = {
                day: newDay,
                start_hour: newHour
            };
        } else {
            // Granularité fine - inclure les minutes
            updateData = {
                day: newDay,
                start_hour: newHour,
                start_minutes: newMinutes
            };
        }

        try {
            // Mettre à jour localement d'abord
            this.draggedShift.day = newDay;
            this.draggedShift.start_hour = newHour;
            if (granularity !== 60) {
                this.draggedShift.start_minutes = newMinutes;
            }

            // Sauvegarder sur le serveur
            if (typeof APIManager !== 'undefined' && APIManager.put) {
                console.log('💾 Sauvegarde sur serveur...');

                const response = await APIManager.put(`/shifts/${shiftId}`, updateData);

                if (response.success) {
                    console.log('✅ Déplacement sauvegardé');

                    // Mettre à jour AppState avec les données du serveur
                    AppState.shifts.set(shiftId, response.shift);

                    // Régénérer l'affichage
                    if (typeof PlanningRenderer !== 'undefined') {
                        PlanningRenderer.renderShifts();
                    }

                    // Notification
                    if (typeof showNotification === 'function') {
                        showNotification('✅ Créneau déplacé avec succès', 'success');
                    }
                } else {
                    console.error('❌ Erreur de sauvegarde:', response.error);
                    this.revertMove();

                    if (typeof showNotification === 'function') {
                        showNotification(`❌ ${response.error}`, 'error');
                    }
                }
            } else {
                console.log('🔄 Pas d\'APIManager, rendu local seulement');

                // Juste régénérer l'affichage
                if (typeof PlanningRenderer !== 'undefined') {
                    PlanningRenderer.renderShifts();
                }
            }

        } catch (error) {
            console.error('❌ Erreur lors du déplacement:', error);
            this.revertMove();

            if (typeof showNotification === 'function') {
                showNotification('❌ Erreur de connexion', 'error');
            }
        }
    }

    /**
     * Revient à la position originale en cas d'erreur
     */
    revertMove() {
        if (this.draggedShift && this.originalPosition) {
            console.log('🔄 Revert vers position originale');

            this.draggedShift.day = this.originalPosition.day;
            this.draggedShift.start_hour = this.originalPosition.hour;
            this.draggedShift.start_minutes = this.originalPosition.minutes;

            if (typeof PlanningRenderer !== 'undefined') {
                PlanningRenderer.renderShifts();
            }
        }
    }

    /**
     * Nettoie les anciens événements de drag
     */
    removeExistingDragEvents(element) {
        // Cloner l'élément pour supprimer tous les événements
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
        return clone;
    }

    /**
     * Nettoie toutes les zones de drop actives
     */
    cleanup() {
        this.activeDropHandlers.clear();
        this.isDragging = false;
        this.draggedShift = null;
        this.originalPosition = null;
    }
}

// ==================== INTÉGRATION DANS LE SYSTÈME EXISTANT ====================

// Créer l'instance globale
const unifiedDragDropManager = new UnifiedDragDropManager();

// Remplacer les méthodes dans setupShiftEvents
if (typeof window !== 'undefined') {
    // Override de la fonction setupShiftEvents dans planning-renderer-unified-fix.js
    window.setupShiftEvents = function(block, shift, employee) {
        // Utiliser le gestionnaire unifié
        unifiedDragDropManager.setupShiftDragAndDrop(block, shift);

        // Double-clic pour modifier (conserver)
        block.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            if (typeof PlanningUI !== 'undefined' && PlanningUI.showEditShiftModal) {
                PlanningUI.showEditShiftModal(shift.id);
            }
        });

        // Tooltip (conserver)
        const endHour = shift.start_hour + shift.duration;
        const startMinutes = shift.start_minutes || 0;
        block.title = [
            `👤 ${employee.nom_complet}`,
            `📅 ${shift.day}`,
            `🕐 ${shift.start_hour}:${startMinutes.toString().padStart(2, '0')} - ${endHour}:00 (${shift.duration}h)`,
            `💼 ${employee.poste}`,
            shift.notes ? `📝 ${shift.notes}` : '',
            employee.taux_horaire ? `💰 ${(employee.taux_horaire * shift.duration).toFixed(2)}€` : ''
        ].filter(Boolean).join('\n');

        // Hover (conserver mais simplifier)
        block.addEventListener('mouseenter', function() {
            if (!unifiedDragDropManager.isDragging) {
                this.style.transform = 'scale(1.02)';
                this.style.zIndex = '20';
            }
        });

        block.addEventListener('mouseleave', function() {
            if (!unifiedDragDropManager.isDragging) {
                this.style.transform = 'scale(1)';
                this.style.zIndex = '10';
            }
        });
    };

    // Override de setupUnifiedCellEvents
    window.setupUnifiedCellEvents = function(cell, day, timeSlot) {
        // Double-clic pour créer un créneau (conserver)
        cell.addEventListener('dblclick', function(e) {
            e.preventDefault();
            if (typeof PlanningUI !== 'undefined' && PlanningUI.showAddShiftModal) {
                PlanningUI.showAddShiftModal(day, timeSlot.hour);
            }
        });

        // Configuration drop zone avec gestionnaire unifié
        unifiedDragDropManager.setupDropZone(cell);

        // Hover (conserver)
        cell.addEventListener('mouseenter', function() {
            if (!unifiedDragDropManager.isDragging) {
                this.style.background = 'rgba(99, 102, 241, 0.05)';
            }
        });

        cell.addEventListener('mouseleave', function() {
            if (!unifiedDragDropManager.isDragging) {
                this.style.background = 'white';
            }
        });
    };

    // Exposer le gestionnaire pour usage externe
    window.UnifiedDragDropManager = unifiedDragDropManager;
}

// ==================== OVERRIDE DES SYSTÈMES EXISTANTS ====================

// Désactiver les anciens gestionnaires pour éviter les conflits
if (typeof window.handleDropWithGranularity !== 'undefined') {
    const originalHandleDropWithGranularity = window.handleDropWithGranularity;
    window.handleDropWithGranularity = function() {
        console.log('🚫 handleDropWithGranularity désactivé - utilisation du gestionnaire unifié');
        // Ne rien faire, le gestionnaire unifié s'en charge
    };
}

// Nettoyer au changement de page
window.addEventListener('beforeunload', () => {
    unifiedDragDropManager.cleanup();
});

console.log('✅ Gestionnaire drag & drop unifié installé');
console.log('🎯 Fonctionnalités: granularité + colonnes + sauvegarde + gestion d\'erreur');

// ==================== CORRECTION ERREUR SERVEUR ====================

/**
 * Wrapper pour APIManager qui gère les erreurs serveur
 */
if (typeof window.APIManager !== 'undefined') {
    const originalPut = window.APIManager.put;

    window.APIManager.put = async function(endpoint, data) {
        try {
            console.log('📡 Requête PUT:', endpoint, data);

            // Nettoyer les données selon l'endpoint
            if (endpoint.includes('/shifts/')) {
                // Pour les shifts, s'assurer que les données sont dans le bon format
                const cleanData = {
                    day: data.day,
                    start_hour: data.start_hour
                };

                // Ajouter start_minutes seulement si granularité != 60
                const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
                if (granularity !== 60 && typeof data.start_minutes !== 'undefined') {
                    cleanData.start_minutes = data.start_minutes;
                }

                console.log('🧹 Données nettoyées:', cleanData);
                return await originalPut.call(this, endpoint, cleanData);
            }

            return await originalPut.call(this, endpoint, data);

        } catch (error) {
            console.error('❌ Erreur APIManager.put:', error);

            // Retourner une réponse d'erreur standard
            return {
                success: false,
                error: error.message || 'Erreur de connexion'
            };
        }
    };
}