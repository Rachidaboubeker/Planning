/**
 * PLANNING MANAGER UNIFIÉ - Planning Restaurant
 * Remplace PlanningRenderer, PlanningCore, et tous les gestionnaires de planning dispersés
 * Logique métier centralisée pour l'affichage et la manipulation du planning
 */

class PlanningManager {
    constructor() {
        this.currentView = 'week';
        this.isInitialized = false;
        this.resizeObserver = null;

        this.bindEvents();
        console.log('📅 Planning Manager unifié initialisé');
    }

    /**
     * Initialise le planning manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('📅 Planning Manager déjà initialisé');
            return;
        }

        try {
            // Générer la grille initiale
            this.generateGrid();

            // Rendre les créneaux
            this.renderShifts();

            // Mettre à jour les statistiques
            this.updateStatistics();

            // Configurer les observateurs
            this.setupObservers();

            // Configurer le responsive
            this.setupResponsive();

            this.isInitialized = true;
            console.log('✅ Planning Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation Planning Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindEvents() {
        // Observer les changements d'état
        if (window.State) {
            window.State.observe('employees', () => this.onDataChanged());
            window.State.observe('shifts', () => this.onDataChanged());
            window.State.observe('week', () => this.onWeekChanged());
        }

        // Observer les événements globaux
        if (window.EventBus) {
            window.EventBus.on(window.Config?.EVENTS.GRANULARITY_CHANGED, (data) => {
                this.onGranularityChanged(data.granularity);
            });

            window.EventBus.on(window.Config?.EVENTS.DATA_LOADED, () => {
                this.refreshDisplay();
            });
        }

        // Événements DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.setupDOMEvents();
        });
    }

    /**
     * Configure les événements DOM
     */
    setupDOMEvents() {
        // Navigation semaine
        const prevWeekBtn = document.querySelector('[data-action="prev-week"]');
        const nextWeekBtn = document.querySelector('[data-action="next-week"]');

        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => this.changeWeek(-1));
        }

        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => this.changeWeek(1));
        }

        // Sélecteur de granularité
        const granularitySelect = document.getElementById('granularitySelect');
        if (granularitySelect) {
            granularitySelect.addEventListener('change', (e) => {
                this.changeGranularity(parseInt(e.target.value));
            });
        }

        // Sélecteur de vue
        const viewSelect = document.getElementById('viewSelect');
        if (viewSelect) {
            viewSelect.addEventListener('change', (e) => {
                this.changeView(e.target.value);
            });
        }
    }

    // ==================== GÉNÉRATION DE LA GRILLE ====================

    /**
     * Génère la grille de planning selon la configuration actuelle
     */
    generateGrid() {
        console.log('🏗️ Génération de la grille de planning...');

        const headerContainer = document.getElementById('planningHeader');
        const gridContainer = document.getElementById('planningGrid');

        if (!headerContainer || !gridContainer) {
            console.error('❌ Conteneurs de grille non trouvés');
            return;
        }

        // Nettoyer les conteneurs
        headerContainer.innerHTML = '';
        gridContainer.innerHTML = '';

        // Générer les en-têtes
        this.generateHeaders(headerContainer);

        // Générer les cellules de temps et de planning
        this.generateCells(gridContainer);

        // Appliquer les styles de granularité
        this.applyGranularityStyles(gridContainer);

        console.log('✅ Grille de planning générée');
    }

    /**
     * Génère les en-têtes de la grille
     */
    generateHeaders(container) {
        const days = window.Config?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        // Cellule vide pour l'angle
        const cornerCell = document.createElement('div');
        cornerCell.className = 'time-cell corner-cell';
        cornerCell.innerHTML = '<i class="fas fa-calendar-week"></i>';
        container.appendChild(cornerCell);

        // En-têtes des jours
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            dayHeader.dataset.day = day;
            container.appendChild(dayHeader);
        });
    }

    /**
     * Génère les cellules de la grille
     */
    generateCells(container) {
        const days = window.Config?.DAYS_OF_WEEK || [];
        const timeSlots = window.Config?.generateTimeSlots() || [];
        const granularity = window.State?.getState('temp.granularity') || 60;

        console.log(`📏 Génération avec granularité ${granularity}min - ${timeSlots.length} créneaux`);

        timeSlots.forEach((timeSlot, rowIndex) => {
            // Cellule de temps
            const timeCell = document.createElement('div');
            timeCell.className = `time-cell ${timeSlot.isMainHour ? 'main-hour' : 'sub-hour'}`;
            timeCell.textContent = timeSlot.display;
            timeCell.dataset.hour = timeSlot.hour;
            timeCell.dataset.minutes = timeSlot.minutes;
            timeCell.style.gridColumn = '1';
            timeCell.style.gridRow = `${rowIndex + 1}`;
            container.appendChild(timeCell);

            // Cellules de planning pour chaque jour
            days.forEach((day, dayIndex) => {
                const scheduleCell = document.createElement('div');
                scheduleCell.className = 'schedule-cell';
                scheduleCell.dataset.day = day;
                scheduleCell.dataset.hour = timeSlot.hour;
                scheduleCell.dataset.minutes = timeSlot.minutes;
                scheduleCell.dataset.key = timeSlot.key;
                scheduleCell.style.gridColumn = `${dayIndex + 2}`;
                scheduleCell.style.gridRow = `${rowIndex + 1}`;

                // Configurer les événements de cellule
                this.setupCellEvents(scheduleCell, day, timeSlot);

                container.appendChild(scheduleCell);
            });
        });

        // Mettre à jour les styles de grille
        container.style.gridTemplateColumns = `100px repeat(${days.length}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${timeSlots.length}, ${window.Config?.getCellHeight()}px)`;
    }

    /**
     * Configure les événements d'une cellule
     */
    setupCellEvents(cell, day, timeSlot) {
        // Double-clic pour créer un créneau
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.handleCellDoubleClick(day, timeSlot.hour, timeSlot.minutes);
        });

        // Survol
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('drag-over')) {
                cell.classList.add('cell-hover');
            }
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('cell-hover');
        });

        // Support du drag & drop (configuré par DragDropManager)
        cell.classList.add('drop-zone');
    }

    /**
     * Gère le double-clic sur une cellule
     */
    handleCellDoubleClick(day, hour, minutes) {
        console.log(`🖱️ Double-clic sur ${day} ${hour}:${minutes}`);

        if (window.UIManager && window.UIManager.showAddShiftModal) {
            window.UIManager.showAddShiftModal(day, hour, minutes);
        } else {
            console.warn('UIManager.showAddShiftModal non disponible');
        }
    }

    /**
     * Applique les styles selon la granularité
     */
    applyGranularityStyles(container) {
        const granularity = window.State?.getState('temp.granularity') || 60;

        // Supprimer les anciennes classes
        container.classList.remove('granularity-15', 'granularity-30', 'granularity-60');

        // Ajouter la nouvelle classe
        container.classList.add(`granularity-${granularity}`);

        console.log(`🎨 Styles de granularité ${granularity}min appliqués`);
    }

    // ==================== RENDU DES CRÉNEAUX ====================

    /**
     * Rend tous les créneaux dans la grille
     */
    renderShifts() {
        console.log('🎨 Rendu des créneaux...');

        // Supprimer les anciens créneaux
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        const shifts = window.State?.state.shifts;
        if (!shifts || shifts.size === 0) {
            console.log('Aucun créneau à rendre');
            return;
        }

        let renderedCount = 0;

        shifts.forEach(shift => {
            const employee = window.State?.state.employees.get(shift.employee_id);
            if (employee) {
                this.renderShift(shift, employee);
                renderedCount++;
            } else {
                console.warn(`Employé non trouvé pour le créneau:`, shift);
            }
        });

        console.log(`✅ ${renderedCount} créneaux rendus`);
    }

    /**
     * Rend un créneau individuel
     */
    renderShift(shift, employee) {
        const cellSelector = this.buildCellSelector(shift.day, shift.start_hour, shift.start_minutes || 0);
        const startCell = document.querySelector(cellSelector);

        if (!startCell) {
            console.warn(`Cellule non trouvée pour le créneau:`, cellSelector);
            return;
        }

        // Créer le bloc de créneau
        const shiftBlock = this.createShiftBlock(shift, employee);

        // Calculer la position et la taille
        this.positionShiftBlock(shiftBlock, shift, startCell);

        // Configurer les événements
        this.setupShiftEvents(shiftBlock, shift, employee);

        // Ajouter à la cellule
        startCell.appendChild(shiftBlock);
    }

    /**
     * Construit le sélecteur CSS pour une cellule
     */
    buildCellSelector(day, hour, minutes) {
        return `[data-day="${day}"][data-hour="${hour}"][data-minutes="${minutes}"]`;
    }

    /**
     * Crée un bloc de créneau
     */
    createShiftBlock(shift, employee) {
        const block = document.createElement('div');
        block.className = `shift-block ${employee.poste}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;
        block.draggable = true;

        // Contenu du créneau
        const employeeType = window.Config?.getEmployeeTypeConfig(employee.poste);

        block.innerHTML = `
            <div class="shift-content">
                <div class="shift-employee-name">${this.sanitize(employee.prenom)} ${this.sanitize(employee.nom)}</div>
                <div class="shift-time">${shift.start_hour}:${(shift.start_minutes || 0).toString().padStart(2, '0')} - ${this.calculateEndTime(shift)}</div>
                <div class="shift-employee-type">${employeeType.name}</div>
            </div>
        `;

        return block;
    }

    /**
     * Positionne un bloc de créneau
     */
    positionShiftBlock(block, shift, startCell) {
        const granularity = window.State?.getState('temp.granularity') || 60;
        const cellHeight = window.Config?.getCellHeight() || 60;

        // Calculer la hauteur selon la durée
        const durationInSlots = granularity === 60 ?
            Math.ceil(shift.duration || 1) :
            Math.ceil((shift.duration || 1) * 60 / granularity);

        const totalHeight = (durationInSlots * cellHeight) - 4; // -4px pour les marges

        block.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            height: ${totalHeight}px;
            z-index: 10;
        `;
    }

    /**
     * Configure les événements d'un créneau
     */
    setupShiftEvents(block, shift, employee) {
        // Double-clic pour modifier
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleShiftDoubleClick(shift);
        });

        // Hover
        block.addEventListener('mouseenter', () => {
            if (!block.classList.contains('dragging')) {
                block.style.transform = 'scale(1.02)';
                block.style.zIndex = '20';
            }
        });

        block.addEventListener('mouseleave', () => {
            if (!block.classList.contains('dragging')) {
                block.style.transform = 'scale(1)';
                block.style.zIndex = '10';
            }
        });

        // Les événements de drag seront gérés par DragDropManager
    }

    /**
     * Gère le double-clic sur un créneau
     */
    handleShiftDoubleClick(shift) {
        console.log(`🖱️ Double-clic sur créneau:`, shift.id);

        if (window.UIManager && window.UIManager.showEditShiftModal) {
            window.UIManager.showEditShiftModal(shift.id);
        } else {
            console.warn('UIManager.showEditShiftModal non disponible');
        }
    }

    // ==================== GESTION DES CHANGEMENTS ====================

    /**
     * Gère les changements de données
     */
    onDataChanged() {
        if (this.isInitialized) {
            this.renderShifts();
            this.updateStatistics();
        }
    }

    /**
     * Gère le changement de semaine
     */
    onWeekChanged() {
        if (this.isInitialized) {
            // Pas besoin de regénérer la grille, juste mettre à jour l'affichage
            this.renderShifts();
            this.updateStatistics();
        }
    }

    /**
     * Gère le changement de granularité
     */
    onGranularityChanged(granularity) {
        console.log(`🕐 Changement de granularité: ${granularity}min`);

        // Regénérer complètement la grille
        this.generateGrid();
        this.renderShifts();

        // Mettre à jour le sélecteur
        const select = document.getElementById('granularitySelect');
        if (select && select.value !== granularity.toString()) {
            select.value = granularity.toString();
        }
    }

    /**
     * Change la semaine
     */
    changeWeek(offset) {
        window.State?.changeWeek(offset);
    }

    /**
     * Change la granularité
     */
    async changeGranularity(granularity) {
        try {
            if (window.APIManager) {
                await window.APIManager.updateGranularity(granularity);
            } else {
                // Fallback local
                window.Config?.setGranularity(granularity);
                window.State?.setState('temp.granularity', granularity);
                this.onGranularityChanged(granularity);
            }
        } catch (error) {
            console.error('Erreur changement granularité:', error);
        }
    }

    /**
     * Change la vue
     */
    changeView(view) {
        this.currentView = view;
        window.State?.setState('ui.currentView', view);

        console.log(`👁️ Changement de vue: ${view}`);

        // TODO: Implémenter les vues spécialisées
        switch (view) {
            case 'week':
                this.showWeekView();
                break;
            case 'day':
                this.showDayView();
                break;
            case 'employee':
                this.showEmployeeView();
                break;
        }
    }

    /**
     * Affiche la vue semaine
     */
    showWeekView() {
        // Vue par défaut - déjà implémentée
        this.generateGrid();
        this.renderShifts();
    }

    /**
     * Affiche la vue jour
     */
    showDayView() {
        // TODO: Implémenter la vue jour
        console.log('📅 Vue jour - À implémenter');
    }

    /**
     * Affiche la vue par employé
     */
    showEmployeeView() {
        // TODO: Implémenter la vue par employé
        console.log('👤 Vue employé - À implémenter');
    }

    // ==================== STATISTIQUES ====================

    /**
     * Met à jour les statistiques affichées
     */
    updateStatistics() {
        const stats = window.State?.calculateStatistics();

        if (stats) {
            // Mettre à jour les compteurs dans l'interface
            this.updateStatElement('employeeCount', stats.activeEmployees);
            this.updateStatElement('totalHours', Math.round(stats.totalHours * 10) / 10);

            console.log(`📊 Statistiques: ${stats.activeEmployees} employés, ${stats.totalHours}h`);
        }
    }

    /**
     * Met à jour un élément de statistique
     */
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // ==================== RESPONSIVE ====================

    /**
     * Configure le comportement responsive
     */
    setupResponsive() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(entries => {
                this.handleResize();
            });

            const container = document.getElementById('planningGrid');
            if (container) {
                this.resizeObserver.observe(container);
            }
        }

        // Fallback pour les navigateurs plus anciens
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.handleResize(), 300);
        });
    }

    /**
     * Gère le redimensionnement
     */
    handleResize() {
        // Réajuster si nécessaire
        const container = document.getElementById('planningGrid');
        if (container) {
            // Recalculer les positions si la largeur a changé significativement
            this.renderShifts();
        }
    }

    // ==================== OBSERVATEURS ====================

    /**
     * Configure les observateurs d'état
     */
    setupObservers() {
        // Observer les changements de loading
        window.State?.observe('ui.isLoading', (isLoading) => {
            this.toggleLoadingState(isLoading);
        });
    }

    /**
     * Gère l'état de chargement
     */
    toggleLoadingState(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('active', isLoading);
        }
    }

    // ==================== UTILITAIRES ====================

    /**
     * Actualise complètement l'affichage
     */
    refreshDisplay() {
        if (this.isInitialized) {
            this.generateGrid();
            this.renderShifts();
            this.updateStatistics();
        }
    }

    /**
     * Calcule l'heure de fin d'un créneau
     */
    calculateEndTime(shift) {
        const startHour = shift.start_hour;
        const startMinutes = shift.start_minutes || 0;
        const duration = shift.duration || 1;

        const totalMinutes = startMinutes + (duration * 60);
        const endHour = startHour + Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;

        return `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    }

    /**
     * Sanitise les chaînes pour l'affichage
     */
    sanitize(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>&"']/g, (match) => {
            const escape = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return escape[match];
        });
    }

    /**
     * Détruit le planning manager
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.isInitialized = false;
        console.log('🗑️ Planning Manager détruit');
    }
}

// Instance globale unique
if (!window.PlanningManager) {
    window.PlanningManager = new PlanningManager();
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningManager;
}