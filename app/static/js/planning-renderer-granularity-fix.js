// ==================== CORRECTION UNIFIÉE GRANULARITÉ + COLONNES ====================
// Ce fichier corrige l'intégration entre la granularité et les colonnes d'employés

/**
 * CORRECTION UNIFIÉE : Granularité + Colonnes d'employés
 * Cette correction résout les conflits entre les deux systèmes
 */

console.log('🔧 Chargement de la correction unifiée granularité + colonnes...');

// ==================== MÉTHODES UTILITAIRES ====================

/**
 * Génère les créneaux temporels selon la granularité
 */
function generateTimeSlots(granularity, hoursRange) {
    const timeSlots = [];

    hoursRange.forEach(hour => {
        if (granularity === 60) {
            // Granularité 1h - seulement les heures pleines
            timeSlots.push({
                hour: hour,
                minutes: 0,
                display: `${hour.toString().padStart(2, '0')}:00`,
                isMainHour: true,
                isSubSlot: false,
                key: `${hour}_0`
            });
        } else {
            // Granularité fine - créer tous les sous-créneaux
            const slotsInHour = 60 / granularity;

            for (let slot = 0; slot < slotsInHour; slot++) {
                const minutes = slot * granularity;

                timeSlots.push({
                    hour: hour,
                    minutes: minutes,
                    display: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                    isMainHour: minutes === 0,
                    isSubSlot: minutes !== 0,
                    key: `${hour}_${minutes}`
                });
            }
        }
    });

    return timeSlots;
}

/**
 * Calcule la hauteur des cellules selon la granularité
 */
function calculateCellHeight(granularity) {
    switch (granularity) {
        case 15: return 15;
        case 30: return 30;
        case 60: return 60;
        default: return Math.max(10, 60 / (60 / granularity));
    }
}

// ==================== CORRECTION PLANNINGRENDERER ====================

// Sauvegarder les méthodes originales
const originalGeneratePlanningGrid = PlanningRenderer.generatePlanningGrid;
const originalRenderShifts = PlanningRenderer.renderShifts;

/**
 * Méthode unifiée generatePlanningGrid
 * Gère à la fois la granularité ET les colonnes d'employés
 */
PlanningRenderer.generatePlanningGrid = function() {
    console.log('🏗️ Génération grille UNIFIÉE (granularité + colonnes)...');

    const grid = document.getElementById('planningGrid');
    if (!grid) {
        console.warn('❌ Élément planningGrid non trouvé');
        return;
    }

    // Récupérer la configuration
    const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
    const hoursRange = window.FLASK_CONFIG?.HOURS_RANGE || PlanningConfig.HOURS_RANGE || [8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
    const hasColumnSystem = typeof employeeColumnManager !== 'undefined';

    console.log('📏 Configuration détectée:', {
        granularité: granularity + ' min',
        colonnes: hasColumnSystem ? 'OUI' : 'NON',
        heures: hoursRange.length
    });

    // Initialiser les colonnes d'employés si disponibles
    if (hasColumnSystem) {
        employeeColumnManager.initializeEmployeeColumns();
    }

    // Vider la grille
    grid.innerHTML = '';

    // Générer l'échelle temporelle selon la granularité
    const timeSlots = generateTimeSlots(granularity, hoursRange);
    const cellHeight = calculateCellHeight(granularity);

    console.log('⏰ Créneaux générés:', timeSlots.length, 'avec hauteur', cellHeight + 'px');

    // Configuration de la grille CSS
    const numDays = PlanningConfig.DAYS_OF_WEEK.length;
    grid.style.cssText = `
        display: grid;
        grid-template-columns: 100px repeat(${numDays}, 1fr);
        grid-template-rows: repeat(${timeSlots.length}, ${cellHeight}px);
        gap: 1px;
        background-color: #e2e8f0;
        position: relative;
        width: 100%;
    `;

    // Créer les cellules selon la granularité
    timeSlots.forEach((timeSlot, rowIndex) => {
        // Cellule d'heure (première colonne)
        const timeCell = document.createElement('div');
        timeCell.className = 'time-slot' + (timeSlot.isSubSlot ? ' sub-time-slot' : '');
        timeCell.textContent = timeSlot.display;
        timeCell.style.cssText = `
            grid-column: 1;
            grid-row: ${rowIndex + 1};
            background: ${timeSlot.isMainHour ? 'linear-gradient(135deg, #6f42c1, #8b5cf6)' : '#f8f9fa'};
            color: ${timeSlot.isMainHour ? 'white' : '#6c757d'};
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: ${timeSlot.isMainHour ? '600' : '400'};
            font-size: ${cellHeight < 20 ? '0.6rem' : '0.875rem'};
            font-style: ${timeSlot.isSubSlot ? 'italic' : 'normal'};
        `;
        grid.appendChild(timeCell);

        // Cellules de jours (colonnes 2 à 8)
        PlanningConfig.DAYS_OF_WEEK.forEach((day, dayIndex) => {
            const dayCell = document.createElement('div');

            // Classes selon le système disponible
            if (hasColumnSystem) {
                dayCell.className = 'schedule-cell-with-columns';
            } else {
                dayCell.className = 'schedule-cell';
            }

            // Attributs de données
            dayCell.dataset.hour = timeSlot.hour;
            dayCell.dataset.minutes = timeSlot.minutes || 0;
            dayCell.dataset.day = day;
            dayCell.dataset.dayIndex = dayIndex;
            dayCell.dataset.timeKey = timeSlot.key;

            dayCell.style.cssText = `
                grid-column: ${dayIndex + 2};
                grid-row: ${rowIndex + 1};
                background: white;
                border: 1px solid #e2e8f0;
                position: relative;
                cursor: pointer;
                min-height: ${cellHeight}px;
                height: ${cellHeight}px;
            `;

            // Bordures spéciales pour granularité
            if (timeSlot.isMainHour) {
                dayCell.style.borderTop = '2px solid #6f42c1';
            } else if (timeSlot.isSubSlot) {
                dayCell.style.borderTop = '1px dashed #ced4da';
            }

            // Ajouter les guides de colonnes si système disponible
            if (hasColumnSystem && typeof PlanningRendererColumnExtensions !== 'undefined') {
                PlanningRendererColumnExtensions.addColumnGuides(dayCell);
            }

            // Configuration des événements
            setupUnifiedCellEvents(dayCell, day, timeSlot);

            grid.appendChild(dayCell);
        });
    });

    console.log('✅ Grille unifiée générée:', timeSlots.length, 'lignes');

    // Rendre les créneaux après génération de la grille
    setTimeout(() => {
        this.renderShifts();

        // Initialiser le drag & drop pour les colonnes si disponible
        if (hasColumnSystem && typeof PlanningRendererColumnExtensions !== 'undefined') {
            PlanningRendererColumnExtensions.initializeAllDragDrop();
        }
    }, 100);
};

/**
 * Configuration unifiée des événements de cellule
 */
function setupUnifiedCellEvents(cell, day, timeSlot) {
    // Double-clic pour créer un créneau
    cell.addEventListener('dblclick', function(e) {
        e.preventDefault();
        if (typeof PlanningUI !== 'undefined' && PlanningUI.showAddShiftModal) {
            PlanningUI.showAddShiftModal(day, timeSlot.hour);
        }
    });

    // Drag & drop
    cell.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.background = 'rgba(99, 102, 241, 0.1)';
    });

    cell.addEventListener('dragleave', function() {
        this.style.background = 'white';
    });

    cell.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.background = 'white';

        // Utiliser le gestionnaire approprié selon le système
        if (typeof handleDropWithGranularity === 'function') {
            handleDropWithGranularity(e, this);
        } else if (typeof DragDropManager !== 'undefined' && DragDropManager.handleDrop) {
            DragDropManager.handleDrop(e, this);
        }
    });

    // Hover
    cell.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    cell.addEventListener('mouseleave', function() {
        this.style.background = 'white';
    });
}

/**
 * Méthode unifiée renderShifts
 * Gère le rendu selon la granularité ET le système de colonnes
 */
PlanningRenderer.renderShifts = function() {
    console.log('🎨 Rendu créneaux UNIFIÉ (granularité + colonnes)...');

    // Supprimer les anciens créneaux
    document.querySelectorAll('.shift-block').forEach(block => block.remove());

    if (!AppState?.shifts || AppState.shifts.size === 0) {
        console.log('Aucun créneau à rendre');
        return;
    }

    const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
    const hasColumnSystem = typeof employeeColumnManager !== 'undefined';

    console.log('🎨 Mode de rendu:', {
        granularité: granularity + ' min',
        colonnes: hasColumnSystem ? 'OUI' : 'NON'
    });

    if (hasColumnSystem && granularity === 60) {
        // Système de colonnes avec granularité 60min
        this.renderShiftsWithColumns();
    } else if (granularity !== 60) {
        // Granularité fine (avec ou sans colonnes)
        this.renderShiftsWithGranularity(granularity, hasColumnSystem);
    } else {
        // Fallback vers le système legacy
        this.renderShiftsLegacy();
    }

    console.log('✅ Créneaux rendus (mode unifié)');
};

/**
 * Rendu avec granularité fine
 */
PlanningRenderer.renderShiftsWithGranularity = function(granularity, hasColumnSystem) {
    const cellHeight = calculateCellHeight(granularity);

    AppState.shifts.forEach(shift => {
        const employee = AppState.employees?.get(shift.employee_id);
        if (employee) {
            if (hasColumnSystem) {
                this.renderShiftInColumnWithGranularity(shift, employee, cellHeight, granularity);
            } else {
                this.renderShiftWithGranularity(shift, employee, cellHeight, granularity);
            }
        }
    });
};

/**
 * Rendu d'un créneau avec granularité (sans colonnes)
 */
PlanningRenderer.renderShiftWithGranularity = function(shift, employee, cellHeight, granularity) {
    const grid = document.getElementById('planningGrid');

    // Trouver la cellule de départ selon la granularité
    const startMinutes = shift.start_minutes || 0;
    const cellSelector = `[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-minutes="${startMinutes}"]`;
    const startCell = grid.querySelector(cellSelector);

    if (!startCell) {
        console.warn('❌ Cellule non trouvée:', cellSelector);
        return;
    }

    // Créer le bloc de créneau
    const block = document.createElement('div');
    block.className = 'shift-block granularity-mode';
    block.dataset.shiftId = shift.id;
    block.dataset.employeeId = shift.employee_id;

    // Calculer la hauteur selon la granularité
    const durationInSlots = granularity === 60 ?
        shift.duration :
        Math.ceil((shift.duration * 60) / granularity);

    const blockHeight = (durationInSlots * cellHeight) - 4;

    // Style du bloc
    const employeeType = window.FLASK_CONFIG?.EMPLOYEE_TYPES?.[employee.poste] || { color: '#007bff' };
    const backgroundColor = employeeType.color;

    block.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(100% - 4px);
        height: ${blockHeight}px;
        background: ${backgroundColor};
        color: white;
        border-radius: 6px;
        padding: ${blockHeight < 25 ? '0.2rem' : '0.4rem'};
        font-size: ${blockHeight < 25 ? '0.6rem' : '0.8rem'};
        font-weight: 600;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        cursor: grab;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        overflow: hidden;
    `;

    // Contenu adaptatif selon la taille
    if (blockHeight >= 40) {
        block.innerHTML = `
            <div>${employee.prenom}</div>
            <div style="font-size: 0.8em; opacity: 0.9;">${shift.duration}h</div>
            <div style="font-size: 0.7em; opacity: 0.8;">${shift.start_hour}:${(startMinutes).toString().padStart(2, '0')}</div>
        `;
    } else if (blockHeight >= 25) {
        block.innerHTML = `
            <div>${employee.prenom}</div>
            <div style="font-size: 0.8em;">${shift.duration}h</div>
        `;
    } else {
        block.innerHTML = `<div>${employee.prenom.slice(0, 3)}</div>`;
    }

    // Tooltip
    block.title = `${employee.nom_complet || `${employee.prenom} ${employee.nom}`}\n${employee.poste}\n${shift.day} ${shift.start_hour}:${startMinutes.toString().padStart(2, '0')} (${shift.duration}h)`;

    // Événements
    setupShiftEvents(block, shift, employee);

    // Ajouter à la cellule
    startCell.appendChild(block);
};

/**
 * Rendu d'un créneau avec granularité ET colonnes
 */
PlanningRenderer.renderShiftInColumnWithGranularity = function(shift, employee, cellHeight, granularity) {
    const grid = document.getElementById('planningGrid');

    // Trouver la cellule de départ
    const startMinutes = shift.start_minutes || 0;
    const cellSelector = `[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-minutes="${startMinutes}"]`;
    const startCell = grid.querySelector(cellSelector);

    if (!startCell) {
        console.warn('❌ Cellule non trouvée:', cellSelector);
        return;
    }

    const columnIndex = employeeColumnManager.getEmployeeColumn(employee.id);

    console.log(`🎨 Rendu avec granularité: ${employee.prenom} → Col. ${columnIndex + 1}`);

    // Créer le bloc avec système de colonnes
    const block = PlanningRendererColumnExtensions.createShiftBlockForColumn(shift, employee, shift.duration > 1);

    // Calculer la hauteur selon la granularité
    const durationInSlots = granularity === 60 ?
        shift.duration :
        Math.ceil((shift.duration * 60) / granularity);

    const totalHeight = (durationInSlots * cellHeight) - 4;

    // Positionnement dans la colonne avec granularité
    const columnWidth = employeeColumnManager.getColumnWidth();
    const left = employeeColumnManager.getColumnLeft(columnIndex);

    block.style.cssText = `
        position: absolute !important;
        left: ${left}% !important;
        top: 2px !important;
        width: ${columnWidth - 1}% !important;
        height: ${totalHeight}px !important;
        z-index: 10 !important;
        background: ${employee.type_info?.color || '#74b9ff'} !important;
        border-radius: 6px !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
        color: white !important;
        font-weight: 600 !important;
        font-size: ${totalHeight < 25 ? '0.6rem' : '0.8rem'} !important;
        padding: ${totalHeight < 25 ? '0.2rem' : '0.4rem'} !important;
    `;

    console.log(`🎯 Granularité+Colonnes: Col.${columnIndex + 1}, Left: ${left}%, Height: ${totalHeight}px`);

    // Ajouter à la cellule de départ
    startCell.appendChild(block);
};

/**
 * Configuration des événements de créneau
 */
function setupShiftEvents(block, shift, employee) {
    // Double-clic pour modifier
    block.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        if (typeof PlanningUI !== 'undefined' && PlanningUI.showEditShiftModal) {
            PlanningUI.showEditShiftModal(shift.id);
        }
    });

    // Drag and drop
    block.draggable = true;

    block.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', shift.id);
        this.style.opacity = '0.5';
    });

    block.addEventListener('dragend', function() {
        this.style.opacity = '1';
    });

    // Hover
    block.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.02)';
        this.style.zIndex = '20';
    });

    block.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '10';
    });
}

// ==================== GESTION COMBINÉE ====================

/**
 * Méthode pour gérer le drop avec granularité
 */
function handleDropWithGranularity(e, cell) {
    const shiftId = e.dataTransfer.getData('text/plain');
    if (!shiftId) return;

    const shift = AppState.shifts.get(shiftId);
    if (!shift) return;

    const newDay = cell.dataset.day;
    const newHour = parseInt(cell.dataset.hour);
    const newMinutes = parseInt(cell.dataset.minutes) || 0;

    console.log(`🎯 Drop avec granularité: ${shift.employee_id} → ${newDay} ${newHour}:${newMinutes.toString().padStart(2, '0')}`);

    // Mettre à jour le créneau
    shift.day = newDay;
    shift.start_hour = newHour;
    shift.start_minutes = newMinutes;

    // Sauvegarder si possible
    if (typeof APIManager !== 'undefined' && APIManager.put) {
        APIManager.put(`/shifts/${shiftId}`, shift)
            .then(response => {
                if (response.success) {
                    console.log('✅ Créneau déplacé avec granularité');
                    PlanningRenderer.renderShifts();
                } else {
                    console.error('❌ Erreur de sauvegarde');
                }
            })
            .catch(error => {
                console.error('❌ Erreur de déplacement:', error);
            });
    } else {
        // Rendu immédiat sans sauvegarde
        PlanningRenderer.renderShifts();
    }
}

// ==================== PROTECTION ET INSTALLATION ====================

// S'assurer que notre version unifiée est utilisée
setTimeout(() => {
    if (window.PlanningRenderer && typeof window.PlanningRenderer.generatePlanningGrid === 'function') {
        console.log('✅ PlanningRenderer unifié installé (granularité + colonnes)');

        // Test de régénération si granularité active
        const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
        if (granularity !== 60) {
            console.log('🔄 Test régénération avec granularité unifiée...');
            setTimeout(() => {
                window.PlanningRenderer.generatePlanningGrid();
            }, 1000);
        }
    }
}, 2000);

console.log('🔧 Correction unifiée chargée (granularité + colonnes d\'employés)');