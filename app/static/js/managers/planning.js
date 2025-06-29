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

/**
 * PATCH POUR PLANNING.JS EXISTANT
 * Ajouter ces méthodes à votre PlanningManager existant
 * pour implémenter la vue semaine avec colonnes employés
 */

// ==================== MÉTHODES À AJOUTER DANS PLANNING.JS ====================

/**
 * Génère la grille avec vue semaine (colonnes par jour + sous-colonnes employés)
 * Remplace ou modifie la méthode generateGrid() existante
 */
generateWeekViewGrid() {
    console.log('🏗️ Génération grille vue semaine avec colonnes employés...');

    const headerContainer = document.getElementById('planningHeader');
    const gridContainer = document.getElementById('planningGrid');

    if (!headerContainer || !gridContainer) {
        console.error('❌ Conteneurs manquants pour la vue semaine');
        return;
    }

    // Récupérer les données
    const employees = this.getActiveEmployees();
    const shifts = window.State?.state.shifts || new Map();
    const employeesByDay = this.calculateEmployeesByDay(employees, shifts);

    console.log(`📊 Vue semaine: ${employees.length} employés total`);
    console.log('📊 Répartition par jour:', employeesByDay);

    // Générer l'en-tête semaine
    this.generateWeekHeader(headerContainer, employeesByDay);

    // Générer la grille corps
    this.generateWeekBody(gridContainer, employeesByDay);

    console.log('✅ Grille vue semaine générée');
}

/**
 * Calcule quels employés travaillent quels jours
 */
calculateEmployeesByDay(employees, shifts) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const employeesByDay = {};

    // Initialiser chaque jour
    days.forEach(day => {
        employeesByDay[day] = [];
    });

    // Analyser les créneaux pour déterminer les assignations
    if (shifts && shifts.size > 0) {
        shifts.forEach(shift => {
            if (shift.day && shift.employee_id) {
                const employee = employees.find(emp => emp.id === shift.employee_id);
                if (employee && !employeesByDay[shift.day].find(emp => emp.id === employee.id)) {
                    employeesByDay[shift.day].push(employee);
                }
            }
        });
    }

    // Si aucun créneau, mettre au moins un employé par jour pour la démo
    const hasAnyAssignment = Object.values(employeesByDay).some(dayEmps => dayEmps.length > 0);
    if (!hasAnyAssignment && employees.length > 0) {
        // Répartir les employés sur la semaine pour la démo
        employees.forEach((emp, index) => {
            const dayIndex = index % days.length;
            employeesByDay[days[dayIndex]].push(emp);
        });
    }

    // Trier les employés dans chaque jour
    Object.keys(employeesByDay).forEach(day => {
        employeesByDay[day].sort((a, b) => {
            const posteOrder = { 'manager': 0, 'cuisinier': 1, 'serveur': 2, 'barman': 3, 'aide': 4, 'commis': 5 };
            const aOrder = posteOrder[a.poste] ?? 99;
            const bOrder = posteOrder[b.poste] ?? 99;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
        });
    });

    return employeesByDay;
}

/**
 * Génère l'en-tête semaine avec jours et employés
 */
generateWeekHeader(container, employeesByDay) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    let html = '<div class="week-header-container">';

    // En-tête des jours
    html += '<div class="week-days-header">';
    html += '<div class="corner-header">Heures</div>';

    days.forEach((day, index) => {
        const date = this.getCurrentWeekDates()[index];
        const dateStr = date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

        html += `
            <div class="day-header">
                <div class="day-name">${day}</div>
                <div class="day-date">${dateStr}</div>
            </div>
        `;
    });
    html += '</div>';

    // En-tête des employés par jour
    html += '<div class="employees-header-container">';
    html += '<div class="employees-header-spacer"></div>';

    days.forEach(day => {
        const dayEmployees = employeesByDay[day] || [];

        html += '<div class="day-employees-header">';

        if (dayEmployees.length === 0) {
            html += `
                <div class="employee-column-header">
                    <div class="employee-avatar" style="background: #e9ecef; color: #6c757d;">--</div>
                    <div class="employee-name">Libre</div>
                </div>
            `;
        } else {
            dayEmployees.forEach(employee => {
                const color = this.getEmployeeColor(employee.poste);
                const initials = this.getEmployeeInitials(employee);

                html += `
                    <div class="employee-column-header" data-employee-id="${employee.id}">
                        <div class="employee-avatar" style="background: ${color};">${initials}</div>
                        <div class="employee-name">${employee.prenom} ${employee.nom}</div>
                    </div>
                `;
            });
        }

        html += '</div>';
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Génère le corps de la grille avec les créneaux horaires
 */
generateWeekBody(container, employeesByDay) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const hours = this.getHoursRange();

    let html = '<div class="week-planning-grid">';

    hours.forEach(hour => {
        // Cellule heure
        const hourDisplay = typeof hour === 'number' ?
            (hour === 0 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`) :
            hour;

        html += `<div class="time-cell">${hourDisplay}</div>`;

        // Colonnes jours
        days.forEach(day => {
            const dayEmployees = employeesByDay[day] || [];

            html += '<div class="day-column">';

            if (dayEmployees.length === 0) {
                html += `
                    <div class="employee-cell"
                         data-day="${day}"
                         data-hour="${hour}"
                         data-employee-id="none">
                    </div>
                `;
            } else {
                dayEmployees.forEach(employee => {
                    html += `
                        <div class="employee-cell"
                             data-day="${day}"
                             data-hour="${hour}"
                             data-employee-id="${employee.id}">
                        </div>
                    `;
                });
            }

            html += '</div>';
        });
    });

    html += '</div>';
    container.innerHTML = html;

    // Appliquer les styles CSS Grid dynamiques
    this.applyWeekViewStyles(employeesByDay);
}

/**
 * Applique les styles CSS Grid pour la vue semaine
 */
applyWeekViewStyles(employeesByDay) {
    // Supprimer anciens styles
    document.querySelectorAll('#week-view-styles').forEach(s => s.remove());

    const style = document.createElement('style');
    style.id = 'week-view-styles';

    // Calculer le nombre total de colonnes
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    let totalColumns = 1; // Colonne heures

    days.forEach(day => {
        const empCount = employeesByDay[day]?.length || 1;
        totalColumns += empCount;
    });

    // Construire la définition des colonnes
    let gridColumns = '80px'; // Colonne heures
    days.forEach(day => {
        const empCount = employeesByDay[day]?.length || 1;
        gridColumns += ` repeat(${empCount}, 1fr)`;
    });

    style.textContent = `
        /* Styles pour la vue semaine */
        .week-header-container {
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .week-days-header {
            display: grid;
            grid-template-columns: ${gridColumns};
            background: #f8f9fa;
        }

        .employees-header-container {
            display: grid;
            grid-template-columns: ${gridColumns};
            background: #f1f3f4;
        }

        .week-planning-grid {
            display: grid;
            grid-template-columns: ${gridColumns};
            min-height: 100%;
        }

        .corner-header {
            background: #e9ecef;
            padding: 1rem;
            font-weight: 600;
            color: #495057;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #dee2e6;
        }

        .day-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            text-align: center;
            font-weight: 600;
            border-right: 1px solid #dee2e6;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .day-name {
            font-size: 1rem;
            margin-bottom: 0.25rem;
        }

        .day-date {
            font-size: 0.8rem;
            opacity: 0.9;
        }

        .employees-header-spacer {
            background: #e9ecef;
            border-right: 1px solid #dee2e6;
        }

        .day-employees-header {
            display: flex;
            border-right: 1px solid #dee2e6;
            min-height: 60px;
            background: #f8f9fa;
        }

        .employee-column-header {
            flex: 1;
            background: white;
            border-right: 1px solid #e9ecef;
            padding: 0.5rem 0.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 0.75rem;
            min-width: 100px;
        }

        .employee-column-header:last-child {
            border-right: none;
        }

        .employee-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            margin-bottom: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.7rem;
        }

        .employee-name {
            font-weight: 500;
            color: #495057;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        .time-cell {
            background: #f8f9fa;
            padding: 0.75rem 0.5rem;
            text-align: center;
            font-weight: 500;
            color: #6c757d;
            border-right: 1px solid #dee2e6;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60px;
            position: sticky;
            left: 0;
            z-index: 10;
        }

        .day-column {
            border-right: 1px solid #dee2e6;
            display: flex;
            min-height: 60px;
        }

        .employee-cell {
            flex: 1;
            background: white;
            border-right: 1px solid #e9ecef;
            border-bottom: 1px solid #e9ecef;
            position: relative;
            cursor: pointer;
            transition: background-color 0.2s ease;
            min-width: 100px;
        }

        .employee-cell:last-child {
            border-right: none;
        }

        .employee-cell:hover {
            background-color: rgba(102, 126, 234, 0.05);
        }

        .employee-cell[data-drop-zone="true"] {
            background-color: #e3f2fd;
            border: 2px dashed #2196f3;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .employee-name {
                display: none;
            }

            .employee-avatar {
                width: 24px;
                height: 24px;
                font-size: 0.65rem;
            }

            .employee-column-header {
                min-width: 60px;
            }
        }
    `;

    document.head.appendChild(style);
    console.log('✅ Styles vue semaine appliqués');
}

/**
 * Méthodes utilitaires pour la vue semaine
 */
getCurrentWeekDates() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

getEmployeeColor(poste) {
    const colors = {
        'cuisinier': '#74b9ff',
        'serveur': '#00b894',
        'barman': '#fdcb6e',
        'manager': '#a29bfe',
        'aide': '#fd79a8',
        'commis': '#e17055'
    };
    return colors[poste] || '#6c5ce7';
}

getEmployeeInitials(employee) {
    if (!employee) return 'XX';
    const firstName = employee.prenom || '';
    const lastName = employee.nom || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

getHoursRange() {
    // Utiliser la plage d'heures de votre configuration existante
    if (window.Config && window.Config.get_hours_range) {
        return window.Config.get_hours_range();
    }
    // Fallback
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
}

/**
 * Active la vue semaine
 * Ajouter cette méthode et l'appeler pour activer la nouvelle vue
 */
enableWeekView() {
    console.log('🔄 Activation de la vue semaine...');

    // Sauvegarder l'ancienne méthode generateGrid
    if (!this.originalGenerateGrid) {
        this.originalGenerateGrid = this.generateGrid;
    }

    // Remplacer par la nouvelle méthode
    this.generateGrid = this.generateWeekViewGrid;

    // Régénérer immédiatement
    this.generateGrid();
    this.renderShifts();

    console.log('✅ Vue semaine activée');
}

/**
 * Désactive la vue semaine (retour à la vue normale)
 */
disableWeekView() {
    console.log('🔄 Retour à la vue normale...');

    if (this.originalGenerateGrid) {
        this.generateGrid = this.originalGenerateGrid;
    }

    // Supprimer les styles spécifiques
    document.querySelectorAll('#week-view-styles').forEach(s => s.remove());

    // Régénérer
    this.generateGrid();
    this.renderShifts();

    console.log('✅ Vue normale restaurée');
}

// ==================== INSTRUCTIONS D'INTÉGRATION ====================

/*
POUR ACTIVER LA VUE SEMAINE DANS VOTRE APPLICATION :

1. Ajoutez ces méthodes à votre classe PlanningManager existante dans planning.js

2. Pour activer la vue semaine, dans la console ou votre code :
   window.PlanningManager.enableWeekView();

3. Pour revenir à la vue normale :
   window.PlanningManager.disableWeekView();

4. Pour tester immédiatement dans la console :
   window.PlanningManager.enableWeekView();

Le système détectera automatiquement quels employés travaillent quels jours
et créera les colonnes appropriées.
*/