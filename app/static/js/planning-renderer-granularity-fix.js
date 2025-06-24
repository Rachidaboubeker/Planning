/**
 * CORRECTION UNIFIÉE GRANULARITÉ + COLONNES - SANS DRAG & DROP
 * Le drag & drop est maintenant géré par drag-drop-unified-fix.js
 * Ce fichier se contente du rendu selon la granularité et les colonnes
 */

console.log('🔧 Chargement de la correction unifiée granularité + colonnes (sans drag & drop)...');

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

// Sauvegarder la méthode originale
const originalGeneratePlanningGrid = PlanningRenderer.generatePlanningGrid;

/**
 * Génération unifiée de la grille (granularité + colonnes)
 */
PlanningRenderer.generatePlanningGrid = function() {
    console.log('🏗️ Génération grille UNIFIÉE (granularité + colonnes)...');

    const grid = document.getElementById('planningGrid');
    if (!grid) {
        console.error('❌ Element planningGrid non trouvé');
        return;
    }

    // Configuration
    const granularity = window.FLASK_CONFIG?.TIME_SLOT_GRANULARITY || 60;
    const hoursRange = window.FLASK_CONFIG?.HOURS_RANGE || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const hasColumnSystem = typeof employeeColumnManager !== 'undefined';

    console.log('📏 Configuration détectée:', {
        granularité: granularity + ' min',
        colonnes: hasColumnSystem ? 'OUI' : 'NON',
        heures: hoursRange.length
    });

    // Nettoyer la grille
    grid.innerHTML = '';
    grid.className = 'planning-grid unified-grid';

    // Générer les créneaux temporels
    const timeSlots = generateTimeSlots(granularity, hoursRange);
    const cellHeight = calculateCellHeight(granularity);

    console.log('⏰ Créneaux générés:', timeSlots.length, 'avec hauteur', cellHeight + 'px');

    // Configuration CSS Grid
    const days = window.FLASK_CONFIG?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    grid.style.gridTemplateColumns = `80px repeat(${days.length}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${timeSlots.length}, ${cellHeight}px)`;

    // En-têtes des jours
    const emptyCorner = document.createElement('div');
    emptyCorner.className = 'corner-cell';
    emptyCorner.style.gridColumn = '1';
    emptyCorner.style.gridRow = '1';
    grid.appendChild(emptyCorner);

    days.forEach((day, dayIndex) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dayHeader.style.gridColumn = `${dayIndex + 2}`;
        dayHeader.style.gridRow = '1';
        grid.appendChild(dayHeader);
    });

    // Générer les cellules
    timeSlots.forEach((timeSlot, rowIndex) => {
        // Colonne heure
        const timeCell = document.createElement('div');
        timeCell.className = `time-cell ${timeSlot.isSubSlot ? 'sub-slot' : 'main-hour'}`;
        timeCell.textContent = timeSlot.display;
        timeCell.style.gridColumn = '1';
        timeCell.style.gridRow = `${rowIndex + 2}`;

        // Style différent pour les sous-créneaux
        if (timeSlot.isSubSlot) {
            timeCell.style.fontSize = '0.7rem';
            timeCell.style.opacity = '0.7';
            timeCell.style.borderTop = '1px dotted #ddd';
        }

        grid.appendChild(timeCell);

        // Cellules pour chaque jour
        days.forEach((day, dayIndex) => {
            const dayCell = document.createElement('div');
            dayCell.className = hasColumnSystem ? 'schedule-cell-with-columns' : 'schedule-cell';
            dayCell.dataset.day = day;
            dayCell.dataset.hour = timeSlot.hour;
            dayCell.dataset.minutes = timeSlot.minutes;
            dayCell.dataset.key = timeSlot.key;
            dayCell.style.gridColumn = `${dayIndex + 2}`;
            dayCell.style.gridRow = `${rowIndex + 2}`;
            dayCell.style.position = 'relative';
            dayCell.style.height = `${cellHeight}px`;

            // Ajouter les guides de colonnes si système disponible
            if (hasColumnSystem && typeof PlanningRendererColumnExtensions !== 'undefined') {
                PlanningRendererColumnExtensions.addColumnGuides(dayCell);
            }

            // Configuration des événements (SANS drag & drop)
            setupUnifiedCellEvents(dayCell, day, timeSlot);

            grid.appendChild(dayCell);
        });
    });

    console.log('✅ Grille unifiée générée:', timeSlots.length, 'lignes');

    // Rendre les créneaux après génération de la grille
    setTimeout(() => {
        this.renderShifts();

        // Déclencher la configuration du drag & drop unifié
        if (typeof window.UnifiedDragDropFix !== 'undefined') {
            setTimeout(() => window.UnifiedDragDropFix.configureAll(), 100);
        }
    }, 100);
};

/**
 * Configuration unifiée des événements de cellule (SANS drag & drop)
 */
function setupUnifiedCellEvents(cell, day, timeSlot) {
    // Double-clic pour créer un créneau
    cell.addEventListener('dblclick', function(e) {
        e.preventDefault();
        if (typeof PlanningUI !== 'undefined' && PlanningUI.showAddShiftModal) {
            PlanningUI.showAddShiftModal(day, timeSlot.hour, timeSlot.minutes);
        }
    });

    // Hover simple
    cell.addEventListener('mouseenter', function() {
        if (!this.classList.contains('drag-over-valid') && !this.classList.contains('drag-over-invalid')) {
            this.style.background = 'rgba(99, 102, 241, 0.05)';
        }
    });

    cell.addEventListener('mouseleave', function() {
        if (!this.classList.contains('drag-over-valid') && !this.classList.contains('drag-over-invalid')) {
            this.style.background = 'white';
        }
    });

    // Le drag & drop sera configuré par le gestionnaire unifié
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

    // Déclencher la configuration du drag & drop après le rendu
    if (typeof window.UnifiedDragDropFix !== 'undefined') {
        setTimeout(() => window.UnifiedDragDropFix.configureAllShifts(), 50);
    }
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
        align-items: center;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 10;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    // Contenu du bloc
    block.innerHTML = `
        <div class="shift-employee">${employee.prenom}</div>
        <div class="shift-time" style="font-size: 0.7em; opacity: 0.9;">
            ${shift.start_hour}:${startMinutes.toString().padStart(2,'0')}
        </div>
    `;

    // Tooltip
    block.title = [
        `👤 ${employee.nom_complet}`,
        `📍 ${shift.day}`,
        `⏰ ${shift.start_hour}:${startMinutes.toString().padStart(2,'0')} (${shift.duration}h)`,
        shift.notes ? `📝 ${shift.notes}` : '',
        employee.taux_horaire ? `💰 ${(employee.taux_horaire * shift.duration).toFixed(2)}€` : ''
    ].filter(Boolean).join('\n');

    // Events (sans drag & drop - géré par le gestionnaire unifié)
    setupShiftEvents(block, shift, employee);

    // Ajouter à la cellule
    startCell.appendChild(block);
};

/**
 * Rendu d'un créneau dans une colonne avec granularité
 */
PlanningRenderer.renderShiftInColumnWithGranularity = function(shift, employee, cellHeight, granularity) {
    const grid = document.getElementById('planningGrid');

    // Trouver la cellule de départ
    const startMinutes = shift.start_minutes || 0;
    const cellSelector = `[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-minutes="${startMinutes}"]`;
    const startCell = grid.querySelector(cellSelector);

    if (!startCell) {
        console.warn('❌ Cellule non trouvée pour colonne:', cellSelector);
        return;
    }

    // Récupérer l'index de colonne
    const columnIndex = employeeColumnManager.getEmployeeColumn(shift.employee_id);

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
 * Configuration des événements de créneau (sans drag & drop)
 */
function setupShiftEvents(block, shift, employee) {
    // Double-clic pour modifier
    block.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        if (typeof PlanningUI !== 'undefined' && PlanningUI.showEditShiftModal) {
            PlanningUI.showEditShiftModal(shift.id);
        }
    });

    // Hover (sans conflit avec le drag & drop)
    block.addEventListener('mouseenter', function() {
        if (!this.classList.contains('dragging')) {
            this.style.transform = 'scale(1.02)';
            this.style.zIndex = '20';
        }
    });

    block.addEventListener('mouseleave', function() {
        if (!this.classList.contains('dragging')) {
            this.style.transform = 'scale(1)';
            this.style.zIndex = '10';
        }
    });

    // Le drag & drop sera configuré par le gestionnaire unifié
}

// ==================== DÉSACTIVATION DES ANCIENS HANDLERS ====================

// Désactiver handleDropWithGranularity
window.handleDropWithGranularity = function() {
    console.log('🚫 handleDropWithGranularity désactivé - gestionnaire unifié actif');
};

// ==================== PROTECTION ET INSTALLATION ====================

// S'assurer que notre version unifiée est utilisée
setTimeout(() => {
    if (window.PlanningRenderer && typeof window.PlanningRenderer.generatePlanningGrid === 'function') {
        console.log('✅ PlanningRenderer unifié installé (granularité + colonnes, SANS drag & drop)');

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

console.log('🔧 Correction unifiée chargée (granularité + colonnes, SANS drag & drop)');