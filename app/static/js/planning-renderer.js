/**
 * Planning Restaurant - Gestionnaire de rendu (OPTIMISÉ POUR 5 PERSONNES SIMULTANÉES)
 * Version ultra-compacte : initiales + avatar seulement
 */

class PlanningRenderer {
    static isRendering = false;
    static resizeTimeout = null;

    /**
     * Génère la grille de planning complète
     */

    /* LEGACY
    static generatePlanningGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) {
            console.warn('Élément planningGrid non trouvé');
            return;
        }

        console.log('🏗️ Génération de la grille (OPTIMISÉE POUR 5 PERSONNES)...');

        // Vider complètement la grille
        grid.innerHTML = '';

        // Configuration CSS Grid pour 24 heures
        const numDays = PlanningConfig.DAYS_OF_WEEK.length;
        const allHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

        grid.style.cssText = `
            display: grid;
            grid-template-columns: 100px repeat(${numDays}, 1fr);
            grid-template-rows: repeat(24, ${PlanningConfig.CELL_HEIGHT}px);
            gap: 1px;
            background-color: #e2e8f0;
            position: relative;
            width: 100%;
        `;

        // Créer toutes les cellules (24h x 7 jours)
        allHours.forEach((hour, rowIndex) => {
            // Cellule d'heure
            const timeCell = document.createElement('div');
            timeCell.className = 'time-slot';
            timeCell.textContent = PlanningUtils.formatHour(hour);
            timeCell.style.cssText = `
                grid-column: 1;
                grid-row: ${rowIndex + 1};
                background: #f7fafc;
                border: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
                color: #4a5568;
            `;
            grid.appendChild(timeCell);

            // Cellules de jours
            PlanningConfig.DAYS_OF_WEEK.forEach((day, colIndex) => {
                const dayCell = document.createElement('div');
                dayCell.className = 'schedule-cell';
                dayCell.dataset.hour = hour;
                dayCell.dataset.day = day;
                dayCell.dataset.hourIndex = rowIndex;
                dayCell.dataset.dayIndex = colIndex;

                dayCell.style.cssText = `
                    grid-column: ${colIndex + 2};
                    grid-row: ${rowIndex + 1};
                    background: white;
                    border: 1px solid #e2e8f0;
                    position: relative;
                    min-height: ${PlanningConfig.CELL_HEIGHT}px;
                `;

                this.setupCellEvents(dayCell, day, hour);
                grid.appendChild(dayCell);
            });
        });

        console.log(`✅ Grille créée: 24 heures × ${numDays} jours`);

        // Rendre les créneaux
        setTimeout(() => {
            this.renderShifts();
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.updateLegend();
            }
        }, 100);
    }
    */

    static generatePlanningGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) {
            console.warn('❌ Élément planningGrid non trouvé');
            return;
        }

        console.log('🏗️ Génération de la grille avec colonnes d\'employés...');

        // Initialiser les colonnes d'employés
        if (typeof employeeColumnManager !== 'undefined') {
            employeeColumnManager.initializeEmployeeColumns();
        }

        // Vider la grille
        grid.innerHTML = '';

        // Configuration CSS Grid
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '80px repeat(7, 1fr)';
        grid.style.gridTemplateRows = `repeat(${PlanningConfig.HOURS_RANGE.length}, 60px)`;
        grid.style.gap = '0';

        // Créer les cellules
        PlanningConfig.HOURS_RANGE.forEach((hour, hourIndex) => {
            // Colonne heure
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = PlanningUtils.formatHour(hour);
            timeSlot.style.gridColumn = '1';
            timeSlot.style.gridRow = `${hourIndex + 1}`;
            grid.appendChild(timeSlot);

            // Colonnes jours avec subdivisions
            PlanningConfig.DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell-with-columns';
                cell.dataset.hour = hour;
                cell.dataset.day = day;
                cell.dataset.dayIndex = dayIndex;
                cell.style.gridColumn = `${dayIndex + 2}`;
                cell.style.gridRow = `${hourIndex + 1}`;
                cell.style.position = 'relative';

                // Ajouter les guides visuels de colonnes
                if (typeof PlanningRendererColumnExtensions !== 'undefined') {
                    PlanningRendererColumnExtensions.addColumnGuides(cell);
                }

                this.setupCellEvents(cell, day, hour);
                grid.appendChild(cell);
            });
        });

        // Rendre les créneaux avec positionnement par colonnes
        this.renderShiftsWithColumns();

        console.log('✅ Grille avec colonnes générée');
        setTimeout(() => {
            if (typeof PlanningRendererColumnExtensions !== 'undefined') {
                PlanningRendererColumnExtensions.initializeAllDragDrop();
            }
        }, 100); // Petit délai pour que les éléments soient complètement rendus
    }

    /**
     * Configure les événements d'une cellule
     */
    static setupCellEvents(cell, day, hour) {
        // Double-clic pour ajouter
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.showAddShiftModal(day, hour);
            }
        });

        // Hover
        cell.addEventListener('mouseenter', () => {
            cell.style.backgroundColor = '#ebf8ff';
        });

        cell.addEventListener('mouseleave', () => {
            cell.style.backgroundColor = 'white';
        });

        // Drop zone pour drag & drop
        if (typeof DragDropManager !== 'undefined' && typeof DragDropManager.setupDropZone === 'function') {
            DragDropManager.setupDropZone(cell);
        }
    }

    /**
     * Rend les créneaux avec détection complète des conflits
     */

    static renderShiftsLegacy() {
        if (this.isRendering) {
            console.log('Rendu en cours, ignoré');
            return;
        }

        this.isRendering = true;
        console.log('🎨 Rendu OPTIMISÉ pour 5 personnes simultanées');

        try {
            // Nettoyer tous les créneaux existants
            document.querySelectorAll('.shift-block').forEach(el => el.remove());

            const shifts = Array.from(AppState.shifts.values());
            if (shifts.length === 0) {
                console.log('Aucun créneau à rendre');
                this.isRendering = false;
                return;
            }

            // Analyser les conflits
            const conflictMatrix = this.buildCompleteConflictMatrix(shifts);

            // Rendre avec positionnement optimisé
            this.renderWithOptimizedPositioning(shifts, conflictMatrix);

            console.log(`✅ ${shifts.length} créneaux rendus (OPTIMISÉ)`);

        } catch (error) {
            console.error('Erreur lors du rendu:', error);
        } finally {
            this.isRendering = false;
        }
    }

    static renderShifts() {
        // Si le système de colonnes est disponible, l'utiliser
        if (typeof employeeColumnManager !== 'undefined' && typeof this.renderShiftsWithColumns === 'function') {
            this.renderShiftsWithColumns();
        } else {
            // Sinon, utiliser l'ancien système (fallback)
            this.renderShiftsLegacy();
        }
    }

    // 🆕 AJOUTER CETTE NOUVELLE MÉTHODE :
    static renderShiftsWithColumns() {
        const grid = document.getElementById('planningGrid');

        // Supprimer les anciens créneaux
        grid.querySelectorAll('.shift-block').forEach(block => block.remove());

        // Grouper les créneaux par cellule
        const shiftsByCell = new Map();

        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (!employee) return;

            const cellKey = `${shift.day}-${shift.start_hour}`;
            if (!shiftsByCell.has(cellKey)) {
                shiftsByCell.set(cellKey, []);
            }

            shiftsByCell.get(cellKey).push({ shift, employee });
        });

        // Rendre chaque groupe de créneaux
        shiftsByCell.forEach((shiftsInCell, cellKey) => {
            const [day, startHour] = cellKey.split('-');
            const hour = parseInt(startHour);

            // Séparer créneaux simples et multi-heures
            const singleHourShifts = shiftsInCell.filter(s => s.shift.duration === 1);
            const multiHourShifts = shiftsInCell.filter(s => s.shift.duration > 1);

            // Rendre les créneaux d'une heure avec colonnes fixes
            singleHourShifts.forEach(({ shift, employee }) => {
                this.renderShiftInColumn(shift, employee);
            });

            // Rendre les créneaux multi-heures avec colonnes fixes
            multiHourShifts.forEach(({ shift, employee }) => {
                this.renderMultiHourShiftInColumn(shift, employee);
            });
        });

        console.log('✅ Créneaux rendus avec système de colonnes');
    }

    // 🆕 AJOUTER CES NOUVELLES MÉTHODES :
    static renderShiftInColumn(shift, employee) {
        const cell = document.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);
        if (!cell) return;

        console.log(`🎨 Rendu: ${employee.prenom} → Col. ${employeeColumnManager.getEmployeeColumn(employee.id) + 1}`);

        const columnIndex = employeeColumnManager.getEmployeeColumn(employee.id);
        const block = PlanningRendererColumnExtensions.createShiftBlockForColumn(shift, employee, false);

        // Positionnement dans la colonne
        PlanningRendererColumnExtensions.positionShiftInColumn(block, columnIndex, 1);

        cell.appendChild(block);
    }

    static renderMultiHourShiftInColumn(shift, employee) {
    const startCell = document.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);
    if (!startCell) {
        console.warn(`❌ Cellule de départ introuvable: ${shift.day} ${shift.start_hour}h`);
        return;
    }

    console.log(`🎨 Rendu multi-heures: ${employee.prenom} → Col. ${employeeColumnManager.getEmployeeColumn(employee.id) + 1}`);

    const columnIndex = employeeColumnManager.getEmployeeColumn(employee.id);
    const block = PlanningRendererColumnExtensions.createShiftBlockForColumn(shift, employee, true);

    // Calculer la hauteur totale pour couvrir toutes les heures
    const cellHeight = (typeof PlanningConfig !== 'undefined' && PlanningConfig.CELL_HEIGHT) ?
        PlanningConfig.CELL_HEIGHT : 60;
    const totalHeight = (cellHeight * shift.duration) - 4;

    // Position dans la colonne avec hauteur étendue
    const columnWidth = employeeColumnManager.getColumnWidth();
    const left = employeeColumnManager.getColumnLeft(columnIndex);

    // Appliquer le positionnement spécial pour multi-heures
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
    `;

    console.log(`🎯 Multi-heures: Col.${columnIndex + 1}, Left: ${left}%, Height: ${totalHeight}px`);

    // Attacher à la cellule de départ (pas à la grille)
    startCell.appendChild(block);
}




    /**
     * Construit une matrice complète des conflits
     */
    static buildCompleteConflictMatrix(shifts) {
        const matrix = new Map();

        // Pour chaque cellule de la grille, identifier tous les créneaux qui l'occupent
        for (let dayIndex = 0; dayIndex < PlanningConfig.DAYS_OF_WEEK.length; dayIndex++) {
            const day = PlanningConfig.DAYS_OF_WEEK[dayIndex];

            for (let hour = 0; hour < 24; hour++) {
                const cellKey = `${day}-${hour}`;
                const occupyingShifts = [];

                // Trouver tous les créneaux qui occupent cette cellule
                shifts.forEach(shift => {
                    if (shift.day === day) {
                        const shiftStart = shift.start_hour;
                        const shiftEnd = (shift.start_hour + shift.duration) % 24;

                        let occupiesThisHour = false;

                        if (shiftEnd > shiftStart) {
                            occupiesThisHour = (hour >= shiftStart && hour < shiftEnd);
                        } else {
                            occupiesThisHour = (hour >= shiftStart || hour < shiftEnd);
                        }

                        if (occupiesThisHour) {
                            occupyingShifts.push(shift);
                        }
                    }
                });

                if (occupyingShifts.length > 1) {
                    console.log(`⚠️ ${occupyingShifts.length} personnes simultanées sur ${cellKey}`);
                }

                matrix.set(cellKey, occupyingShifts);
            }
        }

        return matrix;
    }

    /**
     * Rendu avec positionnement optimisé
     */
    static renderWithOptimizedPositioning(shifts, conflictMatrix) {
        const shiftPositions = new Map();

        shifts.forEach(shift => {
            const position = this.calculateOptimalPosition(shift, conflictMatrix, shiftPositions);
            shiftPositions.set(shift.id, position);

            // Rendre le créneau optimisé
            this.renderOptimizedShift(shift, position);
        });
    }

    /**
     * Calcule la position optimale d'un créneau
     */
    static calculateOptimalPosition(shift, conflictMatrix, existingPositions) {
        const day = shift.day;
        const startHour = shift.start_hour;
        const duration = shift.duration;

        // Trouver le nombre maximum de conflits
        let maxConflicts = 1;
        const conflictingShifts = new Set();

        for (let i = 0; i < duration; i++) {
            const hour = (startHour + i) % 24;
            const cellKey = `${day}-${hour}`;
            const cellConflicts = conflictMatrix.get(cellKey) || [];

            maxConflicts = Math.max(maxConflicts, cellConflicts.length);

            cellConflicts.forEach(conflictShift => {
                if (conflictShift.id !== shift.id) {
                    conflictingShifts.add(conflictShift);
                }
            });
        }

        // Ordre déterministe pour positionnement
        const conflictArray = Array.from(conflictingShifts);
        conflictArray.push(shift);
        conflictArray.sort((a, b) => {
            if (a.start_hour !== b.start_hour) {
                return a.start_hour - b.start_hour;
            }
            return a.id.localeCompare(b.id);
        });

        const positionIndex = conflictArray.findIndex(s => s.id === shift.id);
        const totalConflicts = Math.max(maxConflicts, conflictArray.length);

        return {
            index: positionIndex,
            total: totalConflicts,
            maxConflicts: maxConflicts
        };
    }

    /**
     * Rend un créneau optimisé pour 5 personnes
     */
    static renderOptimizedShift(shift, position) {
        const employee = AppState.employees.get(shift.employee_id);
        if (!employee) {
            console.warn(`Employé ${shift.employee_id} non trouvé`);
            return;
        }

        // Trouver la cellule de départ
        const startCell = document.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);
        if (!startCell) {
            console.warn(`Cellule non trouvée: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        // Créer l'élément optimisé
        const shiftElement = this.createOptimizedShiftElement(shift, employee, position);
        if (!shiftElement) return;

        // Position précise
        this.positionOptimizedShift(shiftElement, shift, startCell, position);

        // Ajouter à la grille
        const grid = document.getElementById('planningGrid');
        grid.appendChild(shiftElement);

        console.log(`✅ Créneau optimisé: ${employee.prenom} ${employee.nom} (${position.index + 1}/${position.total})`);
    }

    /**
     * NOUVEAU: Crée un élément de créneau ultra-optimisé
     */
    static createOptimizedShiftElement(shift, employee, position) {
        // Couleur de l'employé
        const color = typeof ColorManager !== 'undefined' ?
            ColorManager.getEmployeeColor(employee.id) :
            { bg: '#74b9ff', border: '#0984e3', text: 'white' };

        // Créer l'élément
        const element = document.createElement('div');
        element.className = 'shift-block optimized';
        element.dataset.shiftId = shift.id;
        element.dataset.employeeId = shift.employee_id;
        element.dataset.day = shift.day;
        element.dataset.startHour = shift.start_hour;

        // OPTIMISATION: Styles adaptatifs selon le nombre de personnes
        const isMany = position.total >= 4; // 4+ personnes
        const isCrowded = position.total >= 3; // 3+ personnes

        element.style.cssText = `
            background-color: ${color.bg};
            border: ${isMany ? '1px' : '2px'} solid ${color.border};
            color: ${color.text};
            border-radius: ${isMany ? '3px' : '4px'};
            padding: ${isMany ? '1px' : isCrowded ? '2px' : '3px'};
            font-size: ${isMany ? '0.65rem' : isCrowded ? '0.7rem' : '0.75rem'};
            font-weight: 600;
            cursor: pointer;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.15);
            transition: all 0.2s ease;
            user-select: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: ${Math.max(30, PlanningConfig.CELL_HEIGHT - 10)}px;
        `;

        // OPTIMISATION: Contenu ultra-compact
        const content = this.createUltraCompactContent(shift, employee, position);
        element.appendChild(content);

        // Événements
        this.setupOptimizedShiftEvents(element, shift, employee);

        return element;
    }

    /**
     * NOUVEAU: Contenu ultra-compact (initiales + avatar seulement)
     */
    static createUltraCompactContent(shift, employee, position) {
        const container = document.createElement('div');
        const isMany = position.total >= 4;
        const isCrowded = position.total >= 3;

        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: ${isMany ? '1px' : '2px'};
            height: 100%;
            width: 100%;
        `;

        // AVATAR (taille optimisée)
        const avatarSize = isMany ? '14px' : isCrowded ? '16px' : '20px';

        const avatar = document.createElement('img');
        avatar.className = 'shift-avatar-img optimized';
        avatar.style.cssText = `
            width: ${avatarSize};
            height: ${avatarSize};
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.4);
            object-fit: cover;
            flex-shrink: 0;
        `;

        // Source de l'avatar
        if (typeof window.avatarManager !== 'undefined') {
            avatar.src = window.avatarManager.getEmployeeAvatar(employee);
        } else {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&size=${avatarSize.replace('px', '')}&background=fff&color=000`;
        }

        avatar.alt = employee.nom_complet;

        // Gestion d'erreur
        avatar.onerror = () => {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&size=${avatarSize.replace('px', '')}&background=fff&color=000`;
        };

        // Clic sur avatar pour photo
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.avatarManager && typeof window.avatarManager.showPhotoModal === 'function') {
                window.avatarManager.showPhotoModal(employee);
            }
        });

        container.appendChild(avatar);

        // INITIALES (optimisées)
        const initiales = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
        const initialesDiv = document.createElement('div');
        initialesDiv.className = 'shift-initiales';
        initialesDiv.textContent = initiales;
        initialesDiv.style.cssText = `
            font-size: ${isMany ? '0.6rem' : isCrowded ? '0.65rem' : '0.7rem'};
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        `;

        container.appendChild(initialesDiv);

        return container;
    }

    /**
     * Positionnement optimisé
     */
     /*
    static positionOptimizedShift(shiftElement, shift, startCell, position) {
        const grid = document.getElementById('planningGrid');
        const gridRect = grid.getBoundingClientRect();
        const cellRect = startCell.getBoundingClientRect();

        // OPTIMISATION: Calcul précis pour 5 personnes max
        const totalWidth = cellRect.width;
        const minWidth = 30; // Largeur minimum pour lisibilité
        const maxPossible = Math.floor(totalWidth / minWidth);

        // Si plus de personnes que possible, on adapte
        const effectiveTotal = Math.min(position.total, maxPossible);
        const individualWidth = Math.floor(totalWidth / effectiveTotal) - 1;
        const leftOffset = Math.min(position.index, effectiveTotal - 1) * (individualWidth + 1);

        // Position absolue
        const leftPosition = (cellRect.left - gridRect.left) + leftOffset;
        const topPosition = cellRect.top - gridRect.top;
        const height = (PlanningConfig.CELL_HEIGHT * shift.duration) - 2;

        // Application avec forçage
        shiftElement.style.cssText += `
            position: absolute !important;
            left: ${leftPosition}px !important;
            top: ${topPosition}px !important;
            width: ${Math.max(individualWidth, minWidth)}px !important;
            height: ${height}px !important;
            z-index: ${20 + position.index} !important;
            box-sizing: border-box !important;
        `;

        console.log(`📐 Position optimisée: ${leftPosition}px, largeur: ${individualWidth}px (${position.index + 1}/${position.total})`);
    }
    */
    /**
     * Configure les événements d'un créneau optimisé
     */
    static setupOptimizedShiftEvents(element, shift, employee) {
        // Clic pour éditer
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.showEditShiftModal(shift);
            }
        });

        // Tooltip détaillé (compense l'affichage minimal)
        const endHour = (shift.start_hour + shift.duration) % 24;
        element.title = [
            `👤 ${employee.nom_complet}`,
            `📅 ${shift.day}`,
            `🕐 ${PlanningUtils.formatHour(shift.start_hour)} - ${PlanningUtils.formatHour(endHour)} (${shift.duration}h)`,
            `💼 ${employee.poste}`,
            shift.notes ? `📝 ${shift.notes}` : '',
            employee.taux_horaire ? `💰 ${(employee.taux_horaire * shift.duration).toFixed(2)}€` : ''
        ].filter(Boolean).join('\n');

        // Hover optimisé
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.05)';
            element.style.zIndex = '100';
            element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
            element.style.borderWidth = '2px';
        });

        element.addEventListener('mouseleave', () => {
            if (!element.classList.contains('dragging')) {
                try {
                    element.style.transform = 'scale(1)';
                    element.style.zIndex = element.dataset.originalZ || '20';
                    element.style.boxShadow = '0 1px 2px rgba(0,0,0,0.15)';

                    // Calculer le nombre d'éléments dans la cellule parent
                    const parentCell = element.closest('.schedule-cell');
                    if (parentCell) {
                        const totalShifts = parentCell.querySelectorAll('.shift-block').length;
                        element.style.borderWidth = totalShifts >= 4 ? '1px' : '2px';
                    } else {
                        element.style.borderWidth = '2px'; // valeur par défaut
                    }
                } catch (error) {
                    console.warn('Erreur dans mouseleave:', error);
                    // Rétablir les styles par défaut en cas d'erreur
                    element.style.transform = '';
                    element.style.zIndex = '';
                    element.style.boxShadow = '';
                    element.style.borderWidth = '';
                }
            }
        });

        // Drag & drop
        if (typeof DragDropManager !== 'undefined' && typeof DragDropManager.setupDragAndDrop === 'function') {
            DragDropManager.setupDragAndDrop(element, shift);
        }
    }

    /**
     * Actualise l'affichage
     */
    static refreshShifts() {
        console.log('🔄 Actualisation OPTIMISÉE');

        if (typeof initializeDataStructures === 'function') {
            initializeDataStructures();
        }

        this.renderShifts();

        if (typeof PlanningUI !== 'undefined') {
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();
        }
    }

    /**
     * Gère le redimensionnement
     */
    static handleWindowResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.refreshShifts();
        }, 300);
    }

    /**
     * Initialise le renderer
     */
    static initialize() {
        console.log('🎨 Initialisation PlanningRenderer (OPTIMISÉ POUR 5 PERSONNES)');

        window.addEventListener('resize', () => this.handleWindowResize());

        if (typeof EventBus !== 'undefined') {
            EventBus.on(PlanningEvents.SHIFT_ADDED, () => this.refreshShifts());
            EventBus.on(PlanningEvents.SHIFT_UPDATED, () => this.refreshShifts());
            EventBus.on(PlanningEvents.SHIFT_DELETED, () => this.refreshShifts());
            EventBus.on(PlanningEvents.EMPLOYEE_UPDATED, () => this.refreshShifts());
        }

        console.log('✅ PlanningRenderer OPTIMISÉ initialisé');
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    PlanningRenderer.initialize();
});

// Export global
if (typeof window !== 'undefined') {
    window.PlanningRenderer = PlanningRenderer;
}

console.log('🎨 PlanningRenderer chargé (VERSION OPTIMISÉE POUR 5 PERSONNES SIMULTANÉES)');