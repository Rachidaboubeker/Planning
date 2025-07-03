/**
 * PLANNING MANAGER UNIFIÉ - Planning Restaurant
 * Version complète avec vue semaine intégrée
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

    // ==================== GÉNÉRATION GRILLE VUE SEMAINE ====================

    /**
     * Génère la grille de planning - Vue semaine avec colonnes employés
     */
    generateGrid() {
        console.log('🏗️ Génération grille vue semaine...');

        const headerContainer = document.getElementById('planningHeader');
        const gridContainer = document.getElementById('planningGrid');

        if (!headerContainer || !gridContainer) {
            console.error('❌ Conteneurs planningHeader ou planningGrid manquants');
            return;
        }

        // Récupérer données depuis StateManager
        const employees = this.getActiveEmployeesFromState();
        const shifts = this.getShiftsFromState();

        // Calculer répartition employés par jour
        const employeesByDay = this.calculateEmployeesByDay(employees, shifts);

        console.log(`📊 ${employees.length} employés répartis sur la semaine:`, employeesByDay);

        // Générer HTML
        this.generateWeekHeader(headerContainer, employeesByDay);
        this.generateWeekGrid(gridContainer, employeesByDay);

        console.log('✅ Grille vue semaine générée');
    }

    /**
     * Récupère employés actifs depuis StateManager
     */
    getActiveEmployeesFromState() {
        if (!window.StateManager?.getState) {
            console.warn('⚠️ StateManager non disponible');
            return [];
        }

        const state = window.StateManager.getState();
        return (state.employees || [])
            .filter(emp => emp && emp.actif !== false && emp.nom !== 'Supprimé')
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    }

    /**
     * Récupère créneaux depuis StateManager
     */
    getShiftsFromState() {
        if (!window.StateManager?.getState) return [];

        const state = window.StateManager.getState();
        return state.shifts || [];
    }

    /**
     * Calcule quels employés travaillent quels jours
     */
    calculateEmployeesByDay(employees, shifts) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const employeesByDay = {};

        // Initialiser chaque jour
        days.forEach(day => { employeesByDay[day] = []; });

        // Analyser créneaux existants
        shifts.forEach(shift => {
            if (shift.day && shift.employee_id) {
                const employee = employees.find(emp => emp.id === shift.employee_id);
                if (employee && !employeesByDay[shift.day].find(emp => emp.id === employee.id)) {
                    employeesByDay[shift.day].push(employee);
                }
            }
        });

        // Si aucun créneau, répartir employés pour démonstration
        const hasAssignments = Object.values(employeesByDay).some(dayEmps => dayEmps.length > 0);
        if (!hasAssignments && employees.length > 0) {
            employees.forEach((emp, index) => {
                const dayIndex = index % days.length;
                employeesByDay[days[dayIndex]].push(emp);
            });
        }

        return employeesByDay;
    }

    /**
     * Génère l'en-tête avec jours et employés
     */
    generateWeekHeader(container, employeesByDay) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        // Calculer dates de la semaine courante
        const weekDates = this.getCurrentWeekDates();

        let html = `
            <div class="week-header">
                <!-- En-tête jours -->
                <div class="days-header">
                    <div class="corner-cell">Heures</div>
        `;

        days.forEach((day, index) => {
            const date = weekDates[index];
            const dateStr = date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

            html += `
                <div class="day-cell">
                    <div class="day-name">${day}</div>
                    <div class="day-date">${dateStr}</div>
                </div>
            `;
        });

        html += '</div>'; // fin days-header

        // Sous-en-tête employés
        html += '<div class="employees-header"><div class="spacer-cell"></div>';

        days.forEach(day => {
            const dayEmployees = employeesByDay[day] || [];

            html += '<div class="day-employees">';

            if (dayEmployees.length === 0) {
                html += `
                    <div class="employee-cell">
                        <div class="employee-avatar" style="background: #e9ecef; color: #6c757d;">--</div>
                        <div class="employee-name">Libre</div>
                    </div>
                `;
            } else {
                dayEmployees.forEach(employee => {
                    const color = this.getEmployeeColor(employee.poste);
                    const initials = this.getEmployeeInitials(employee);

                    html += `
                        <div class="employee-cell" data-employee-id="${employee.id}">
                            <div class="employee-avatar" style="background: ${color};">${initials}</div>
                            <div class="employee-name">${employee.prenom} ${employee.nom}</div>
                        </div>
                    `;
                });
            }

            html += '</div>'; // fin day-employees
        });

        html += '</div>'; // fin employees-header
        html += '</div>'; // fin week-header

        container.innerHTML = html;
    }

    /**
     * Génère la grille corps avec heures
     */
    generateWeekGrid(container, employeesByDay) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const hours = this.getHoursRange();

        let html = '<div class="week-grid">';

        hours.forEach(hour => {
            // Cellule heure
            const hourStr = typeof hour === 'number' ?
                (hour === 0 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`) :
                hour;

            html += `<div class="hour-cell">${hourStr}</div>`;

            // Cellules employés pour ce créneau
            days.forEach(day => {
                const dayEmployees = employeesByDay[day] || [];

                html += '<div class="time-row">';

                if (dayEmployees.length === 0) {
                    html += `
                        <div class="schedule-cell"
                             data-day="${day}"
                             data-hour="${hour}"
                             data-employee-id="none">
                        </div>
                    `;
                } else {
                    dayEmployees.forEach(employee => {
                        html += `
                            <div class="schedule-cell"
                                 data-day="${day}"
                                 data-hour="${hour}"
                                 data-employee-id="${employee.id}">
                            </div>
                        `;
                    });
                }

                html += '</div>'; // fin time-row
            });
        });

        html += '</div>'; // fin week-grid
        container.innerHTML = html;

        // Appliquer styles CSS dynamiques
        this.applyWeekGridStyles(employeesByDay);
    }

    /**
     * Applique les styles CSS Grid dynamiques
     */
    applyWeekGridStyles(employeesByDay) {
        // Supprimer anciens styles
        document.querySelectorAll('#week-grid-styles').forEach(s => s.remove());

        const style = document.createElement('style');
        style.id = 'week-grid-styles';

        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        // Calculer colonnes CSS Grid
        let gridColumns = '80px'; // Colonne heures
        days.forEach(day => {
            const empCount = employeesByDay[day]?.length || 1;
            gridColumns += ` repeat(${empCount}, 1fr)`;
        });

        style.textContent = `
            .week-header {
                position: sticky;
                top: 0;
                z-index: 100;
                background: white;
                border-bottom: 2px solid #dee2e6;
            }

            .days-header {
                display: grid;
                grid-template-columns: ${gridColumns};
                background: #f8f9fa;
            }

            .employees-header {
                display: grid;
                grid-template-columns: ${gridColumns};
                background: #f1f3f4;
                border-bottom: 1px solid #dee2e6;
            }

            .week-grid {
                display: grid;
                grid-template-columns: ${gridColumns};
            }

            .corner-cell, .spacer-cell {
                background: #e9ecef;
                padding: 1rem;
                text-align: center;
                font-weight: 600;
                color: #495057;
                border-right: 1px solid #dee2e6;
            }

            .day-cell {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1rem;
                text-align: center;
                border-right: 1px solid #dee2e6;
            }

            .day-name {
                font-weight: 600;
                margin-bottom: 0.25rem;
            }

            .day-date {
                font-size: 0.875rem;
                opacity: 0.9;
            }

            .day-employees {
                display: flex;
                border-right: 1px solid #dee2e6;
                min-height: 60px;
                background: #f8f9fa;
            }

            .employee-cell {
                flex: 1;
                background: white;
                border-right: 1px solid #e9ecef;
                padding: 0.5rem;
                text-align: center;
                font-size: 0.75rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 100px;
            }

            .employee-cell:last-child {
                border-right: none;
            }

            .employee-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                color: white;
                font-weight: 600;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 0.25rem;
            }

            .employee-name {
                font-weight: 500;
                color: #495057;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }

            .hour-cell {
                background: #f8f9fa;
                padding: 0.75rem;
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

            .time-row {
                display: flex;
                border-right: 1px solid #dee2e6;
                min-height: 60px;
            }

            .schedule-cell {
                flex: 1;
                background: white;
                border-right: 1px solid #e9ecef;
                border-bottom: 1px solid #e9ecef;
                position: relative;
                cursor: pointer;
                transition: background-color 0.2s ease;
                min-width: 100px;
            }

            .schedule-cell:last-child {
                border-right: none;
            }

            .schedule-cell:hover {
                background-color: rgba(102, 126, 234, 0.05);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .employee-name { display: none; }
                .employee-avatar { width: 24px; height: 24px; font-size: 0.65rem; }
                .employee-cell { min-width: 60px; }
            }
        `;

        document.head.appendChild(style);
        console.log('✅ Styles CSS Grid appliqués dynamiquement');
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    /**
     * Calcule les dates de la semaine courante
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

    /**
     * Obtient la couleur d'un type de poste
     */
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

    /**
     * Génère les initiales d'un employé
     */
    getEmployeeInitials(employee) {
        if (!employee) return 'XX';
        const firstName = employee.prenom || '';
        const lastName = employee.nom || '';
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    /**
     * Obtient la plage d'heures
     */
    getHoursRange() {
        // Utiliser configuration existante ou fallback
        if (window.Config?.HOURS_RANGE) {
            return window.Config.HOURS_RANGE;
        }
        return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    }

    // ==================== RENDU DES CRÉNEAUX ====================

    /**
     * Rend tous les créneaux dans la grille
     */
    renderShifts() {
        console.log('🎨 Rendu des créneaux...');

        // Supprimer les anciens créneaux
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        const shifts = this.getShiftsFromState();
        const employees = this.getActiveEmployeesFromState();

        if (!shifts || shifts.length === 0) {
            console.log('Aucun créneau à rendre');
            return;
        }

        let renderedCount = 0;

        shifts.forEach(shift => {
            const employee = employees.find(emp => emp.id === shift.employee_id);
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
        // Trouver la cellule cible
        const targetCell = document.querySelector(
            `[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-employee-id="${shift.employee_id}"]`
        );

        if (!targetCell) {
            console.warn(`Cellule non trouvée pour le créneau:`, shift);
            return;
        }

        // Créer le bloc de créneau
        const shiftBlock = this.createShiftBlock(shift, employee);

        // Calculer la position et la taille
        this.positionShiftBlock(shiftBlock, shift, targetCell);

        // Configurer les événements
        this.setupShiftEvents(shiftBlock, shift, employee);

        targetCell.appendChild(shiftBlock);
    }

    /**
     * Crée un bloc de créneau
     */
    createShiftBlock(shift, employee) {
        const shiftBlock = document.createElement('div');
        shiftBlock.className = 'shift-block';
        shiftBlock.dataset.shiftId = shift.id;
        shiftBlock.dataset.employeeId = employee.id;

        const duration = shift.duration || 1;
        const endHour = (shift.start_hour + duration) % 24;
        const startTime = `${shift.start_hour.toString().padStart(2, '0')}:00`;
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;

        shiftBlock.innerHTML = `
            <div class="shift-time">${startTime}-${endTime}</div>
            <div class="shift-employee">${employee.prenom}</div>
            <div class="shift-duration">${duration}h</div>
        `;

        // Style de base
        const color = this.getEmployeeColor(employee.poste);
        shiftBlock.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            background: ${color};
            color: white;
            border-radius: 4px;
            padding: 0.5rem;
            font-size: 0.75rem;
            text-align: center;
            z-index: 20;
            cursor: move;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: center;
            transition: all 0.2s ease;
        `;

        return shiftBlock;
    }

    /**
     * Positionne un bloc de créneau
     */
    positionShiftBlock(shiftBlock, shift, targetCell) {
        const duration = shift.duration || 1;
        const height = duration * 60; // 60px par heure

        shiftBlock.style.height = `${Math.max(height, 56)}px`;
    }

    /**
     * Configure les événements d'un créneau
     */
    setupShiftEvents(shiftBlock, shift, employee) {
        // Drag & drop
        shiftBlock.draggable = true;

        shiftBlock.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify(shift));
            shiftBlock.classList.add('dragging');
        });

        shiftBlock.addEventListener('dragend', () => {
            shiftBlock.classList.remove('dragging');
        });

        // Clic pour modification
        shiftBlock.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.ModalManager?.showShiftModal) {
                window.ModalManager.showShiftModal(shift);
            }
        });

        // Hover effects
        shiftBlock.addEventListener('mouseenter', () => {
            shiftBlock.style.transform = 'scale(1.02)';
            shiftBlock.style.zIndex = '30';
        });

        shiftBlock.addEventListener('mouseleave', () => {
            shiftBlock.style.transform = 'scale(1)';
            shiftBlock.style.zIndex = '20';
        });
    }

    // ==================== GESTION DES ÉVÉNEMENTS ====================

    /**
     * Gère les changements de données
     */
    onDataChanged() {
        if (this.isInitialized) {
            this.refreshDisplay();
        }
    }

    /**
     * Gère les changements de semaine
     */
    onWeekChanged() {
        if (this.isInitialized) {
            this.generateGrid();
            this.renderShifts();
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
        // TODO: Implémenter la vue employé
        console.log('👤 Vue employé - À implémenter');
    }

    // ==================== STATISTIQUES ====================

    /**
     * Met à jour les statistiques
     */
    updateStatistics() {
        const employees = this.getActiveEmployeesFromState();
        const shifts = this.getShiftsFromState();

        // Calculer statistiques
        const stats = this.calculateStats(employees, shifts);

        // Mettre à jour l'affichage
        this.displayStats(stats);
    }

    /**
     * Calcule les statistiques
     */
    calculateStats(employees, shifts) {
        let totalHours = 0;
        const employeeHours = {};

        shifts.forEach(shift => {
            const duration = shift.duration || 1;
            totalHours += duration;

            if (!employeeHours[shift.employee_id]) {
                employeeHours[shift.employee_id] = 0;
            }
            employeeHours[shift.employee_id] += duration;
        });

        return {
            totalEmployees: employees.length,
            activeEmployees: employees.filter(emp => emp.actif !== false).length,
            totalShifts: shifts.length,
            totalHours: totalHours,
            averageHours: employees.length > 0 ? totalHours / employees.length : 0,
            employeeHours
        };
    }

    /**
     * Affiche les statistiques
     */
    displayStats(stats) {
        // Mettre à jour les éléments d'affichage
        const elements = {
            totalEmployees: document.getElementById('totalEmployees'),
            totalHours: document.getElementById('totalHours'),
            totalShifts: document.getElementById('totalShifts')
        };

        if (elements.totalEmployees) {
            elements.totalEmployees.textContent = stats.activeEmployees;
        }

        if (elements.totalHours) {
            elements.totalHours.textContent = stats.totalHours.toFixed(1);
        }

        if (elements.totalShifts) {
            elements.totalShifts.textContent = stats.totalShifts;
        }
    }

    // ==================== OBSERVATEURS ET RESPONSIVE ====================

    /**
     * Configure les observateurs
     */
    setupObservers() {
        // Observer l'état de chargement si disponible
        window.State?.observe('ui.isLoading', (isLoading) => {
            this.toggleLoadingState(isLoading);
        });
    }

    /**
     * Configure le responsive
     */
    setupResponsive() {
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });

            const gridContainer = document.getElementById('planningGrid');
            if (gridContainer) {
                this.resizeObserver.observe(gridContainer);
            }
        }
    }

    /**
     * Gère le redimensionnement
     */
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            if (this.isInitialized) {
                this.generateGrid();
                this.renderShifts();
            }
        }, 250);
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