/**
 * WEEK VIEW MANAGER - Gestionnaire de la vue semaine
 * Gère l'affichage par colonnes jour/employé selon votre screenshot
 */

(function() {
    'use strict';

    console.log('📅 Chargement WeekViewManager...');

    // ==================== CONFIGURATION ====================

    const WEEK_CONFIG = {
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
        hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
                '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'],
        cellHeight: 60,
        currentWeekOffset: 0
    };

    // ==================== GESTION DES DONNÉES ====================

    /**
     * Récupère les employés actifs
     */
    function getActiveEmployees() {
        if (!window.StateManager || !window.StateManager.getState) {
            console.warn('⚠️ StateManager non disponible');
            return [];
        }

        const state = window.StateManager.getState();
        return (state.employees || [])
            .filter(emp => emp && emp.actif === true && emp.nom !== 'Supprimé')
            .sort((a, b) => {
                const posteOrder = { 'manager': 0, 'cuisinier': 1, 'serveur': 2, 'barman': 3, 'aide': 4, 'commis': 5 };
                const aOrder = posteOrder[a.poste] ?? 99;
                const bOrder = posteOrder[b.poste] ?? 99;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
            });
    }

    /**
     * Récupère les créneaux actifs
     */
    function getActiveShifts() {
        if (!window.StateManager || !window.StateManager.getState) {
            return [];
        }

        const state = window.StateManager.getState();
        return state.shifts || [];
    }

    /**
     * Calcule les employés assignés par jour
     */
    function getEmployeesByDay() {
        const employees = getActiveEmployees();
        const shifts = getActiveShifts();
        const employeesByDay = {};

        // Initialiser chaque jour
        WEEK_CONFIG.days.forEach(day => {
            employeesByDay[day] = [];
        });

        // Grouper les employés par jour selon leurs créneaux
        shifts.forEach(shift => {
            if (shift.day && shift.employee_id) {
                const employee = employees.find(emp => emp.id === shift.employee_id);
                if (employee && !employeesByDay[shift.day].find(emp => emp.id === employee.id)) {
                    employeesByDay[shift.day].push(employee);
                }
            }
        });

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

    // ==================== GÉNÉRATION DE L'INTERFACE ====================

    /**
     * Génère l'en-tête des jours
     */
    function generateDaysHeader() {
        const container = document.getElementById('weekDaysHeader');
        if (!container) return;

        const dates = getCurrentWeekDates();
        let html = '<div class="corner-header">Heures</div>';

        WEEK_CONFIG.days.forEach((day, index) => {
            const date = dates[index];
            const dateStr = date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

            html += `
                <div class="day-header">
                    <div class="day-name">${day}</div>
                    <div class="day-date">${dateStr}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Génère l'en-tête des employés par jour
     */
    function generateEmployeesHeader() {
        const container = document.getElementById('employeesHeaderContainer');
        if (!container) return;

        const employeesByDay = getEmployeesByDay();
        let html = '<div class="employees-header-spacer"></div>';

        WEEK_CONFIG.days.forEach(day => {
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
                    const color = getEmployeeColor(employee.poste);
                    const initials = getEmployeeInitials(employee);

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

        container.innerHTML = html;
    }

    /**
     * Génère la grille principale avec les créneaux horaires
     */
    function generatePlanningGrid() {
        const container = document.getElementById('planningGrid');
        if (!container) return;

        const employeesByDay = getEmployeesByDay();
        let html = '';

        WEEK_CONFIG.hours.forEach(hour => {
            // Cellule heure
            html += `<div class="time-cell">${hour}</div>`;

            // Colonnes jours
            WEEK_CONFIG.days.forEach(day => {
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

        container.innerHTML = html;
    }

    /**
     * Rend les créneaux de travail
     */
    function renderShifts() {
        // Nettoyer les créneaux existants
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        const shifts = getActiveShifts();
        const employees = getActiveEmployees();
        const employeesByDay = getEmployeesByDay();

        shifts.forEach(shift => {
            const employee = employees.find(emp => emp.id === shift.employee_id);
            if (!employee || !shift.day) return;

            // Trouver la position de l'employé dans le jour
            const dayEmployees = employeesByDay[shift.day] || [];
            const employeeIndex = dayEmployees.findIndex(emp => emp.id === shift.employee_id);
            if (employeeIndex === -1) return;

            // Trouver l'heure de début
            const startHour = shift.start_time || shift.startTime;
            const endHour = shift.end_time || shift.endTime;
            if (!startHour || !endHour) return;

            const hourIndex = WEEK_CONFIG.hours.findIndex(h => h === startHour.substring(0, 5));
            if (hourIndex === -1) return;

            // Calculer la position dans la grille
            const dayIndex = WEEK_CONFIG.days.indexOf(shift.day);
            if (dayIndex === -1) return;

            // Trouver la cellule cible
            const rowIndex = hourIndex;
            const cellIndex = calculateCellIndex(dayIndex, employeeIndex, employeesByDay);

            const targetCell = findTargetCell(rowIndex, cellIndex);
            if (!targetCell) return;

            // Créer le bloc créneau
            const shiftBlock = createShiftBlock(shift, employee, startHour, endHour);
            targetCell.appendChild(shiftBlock);
        });

        console.log(`🎨 ${shifts.length} créneaux rendus`);
    }

    /**
     * Calcule l'index de cellule dans la grille
     */
    function calculateCellIndex(dayIndex, employeeIndex, employeesByDay) {
        let cellIndex = 1; // Commencer après la colonne temps

        // Compter les cellules des jours précédents
        for (let i = 0; i < dayIndex; i++) {
            const dayName = WEEK_CONFIG.days[i];
            const empCount = employeesByDay[dayName]?.length || 1;
            cellIndex += empCount;
        }

        // Ajouter l'index de l'employé dans le jour courant
        cellIndex += employeeIndex;

        return cellIndex;
    }

    /**
     * Trouve la cellule cible dans la grille
     */
    function findTargetCell(rowIndex, cellIndex) {
        const allCells = document.querySelectorAll('.time-cell, .employee-cell');
        const cellsPerRow = getCellsPerRow();
        const targetIndex = (rowIndex * cellsPerRow) + cellIndex;
        return allCells[targetIndex] || null;
    }

    /**
     * Calcule le nombre de cellules par ligne
     */
    function getCellsPerRow() {
        const employeesByDay = getEmployeesByDay();
        let cellsPerRow = 1; // Colonne temps

        WEEK_CONFIG.days.forEach(day => {
            const empCount = employeesByDay[day]?.length || 1;
            cellsPerRow += empCount;
        });

        return cellsPerRow;
    }

    /**
     * Crée un bloc créneau
     */
    function createShiftBlock(shift, employee, startTime, endTime) {
        const height = calculateShiftHeight(startTime, endTime);
        const duration = calculateDuration(startTime, endTime);

        const shiftBlock = document.createElement('div');
        shiftBlock.className = `shift-block shift-${shift.poste || employee.poste}`;
        shiftBlock.style.height = `${height}px`;
        shiftBlock.innerHTML = `
            <div class="shift-time">${startTime.substring(0, 5)}-${endTime.substring(0, 5)}</div>
            <div class="shift-employee">${employee.prenom}</div>
            <div class="shift-duration">${duration}</div>
        `;

        // Événements
        shiftBlock.draggable = true;
        shiftBlock.addEventListener('dragstart', (e) => handleShiftDragStart(e, shift));
        shiftBlock.addEventListener('click', (e) => handleShiftClick(e, shift));

        return shiftBlock;
    }

    // ==================== UTILITAIRES ====================

    /**
     * Calcule les dates de la semaine courante
     */
    function getCurrentWeekDates() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (WEEK_CONFIG.currentWeekOffset * 7));

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        return dates;
    }

    /**
     * Met à jour l'affichage de la semaine courante
     */
    function updateCurrentWeekDisplay() {
        const dates = getCurrentWeekDates();
        const startDate = dates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const endDate = dates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        const display = document.getElementById('currentWeekDisplay');
        if (display) {
            display.textContent = `Semaine du ${startDate} au ${endDate}`;
        }
    }

    /**
     * Obtient la couleur d'un type de poste
     */
    function getEmployeeColor(poste) {
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
    function getEmployeeInitials(employee) {
        if (!employee) return 'XX';
        const firstName = employee.prenom || '';
        const lastName = employee.nom || '';
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    /**
     * Calcule la hauteur d'un créneau en pixels
     */
    function calculateShiftHeight(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const durationMinutes = endMinutes - startMinutes;

        // 60px par heure = 1px par minute
        return Math.max(durationMinutes, 56); // Minimum 56px
    }

    /**
     * Calcule la durée formatée d'un créneau
     */
    function calculateDuration(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const durationMinutes = endMinutes - startMinutes;

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h${minutes.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Met à jour les statistiques de la semaine
     */
    function updateWeekStats() {
        const employees = getActiveEmployees();
        const shifts = getActiveShifts();

        let totalHours = 0;
        shifts.forEach(shift => {
            const duration = calculateShiftDuration(shift.start_time || shift.startTime, shift.end_time || shift.endTime);
            totalHours += duration;
        });

        // Mettre à jour l'affichage
        const totalEmployeesEl = document.getElementById('totalEmployees');
        const totalHoursEl = document.getElementById('totalHours');
        const totalShiftsEl = document.getElementById('totalShifts');

        if (totalEmployeesEl) totalEmployeesEl.textContent = employees.length;
        if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
        if (totalShiftsEl) totalShiftsEl.textContent = shifts.length;
    }

    /**
     * Calcule la durée en heures d'un créneau
     */
    function calculateShiftDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        return (endMinutes - startMinutes) / 60;
    }

    // ==================== ÉVÉNEMENTS ====================

    /**
     * Gère le début du drag d'un créneau
     */
    function handleShiftDragStart(e, shift) {
        e.dataTransfer.setData('application/json', JSON.stringify(shift));
        e.target.classList.add('dragging');

        // Marquer les zones de drop valides
        setupDropZones();
    }

    /**
     * Gère le clic sur un créneau
     */
    function handleShiftClick(e, shift) {
        e.stopPropagation();
        console.log('Créneau cliqué:', shift);

        // Ouvrir modal de modification si disponible
        if (window.ModalManager && window.ModalManager.showShiftModal) {
            window.ModalManager.showShiftModal(shift);
        }
    }

    /**
     * Configure les zones de drop pour le drag & drop
     */
    function setupDropZones() {
        document.querySelectorAll('.employee-cell').forEach(cell => {
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
            cell.addEventListener('dragenter', handleDragEnter);
            cell.addEventListener('dragleave', handleDragLeave);
        });
    }

    /**
     * Gère le survol pendant le drag
     */
    function handleDragOver(e) {
        e.preventDefault();
    }

    /**
     * Gère l'entrée dans une zone de drop
     */
    function handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('cell-hover');
        e.target.setAttribute('data-drop-zone', 'true');
    }

    /**
     * Gère la sortie d'une zone de drop
     */
    function handleDragLeave(e) {
        e.target.classList.remove('cell-hover');
        e.target.removeAttribute('data-drop-zone');
    }

    /**
     * Gère le drop d'un créneau
     */
    function handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('cell-hover');
        e.target.removeAttribute('data-drop-zone');

        try {
            const shiftData = JSON.parse(e.dataTransfer.getData('application/json'));
            const newDay = e.target.getAttribute('data-day');
            const newHour = e.target.getAttribute('data-hour');
            const newEmployeeId = e.target.getAttribute('data-employee-id');

            console.log('Créneau déplacé:', {
                shift: shiftData,
                newDay,
                newHour,
                newEmployeeId
            });

            // Mettre à jour le créneau si les APIs sont disponibles
            if (window.PlanningManager && window.PlanningManager.updateShift) {
                const updates = {
                    day: newDay,
                    start_time: newHour,
                    employee_id: parseInt(newEmployeeId) || shiftData.employee_id
                };

                window.PlanningManager.updateShift(shiftData.id, updates);
            }

        } catch (error) {
            console.error('Erreur lors du drop:', error);
        }

        // Nettoyer les états de drag
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
    }

    // ==================== API PRINCIPALE ====================

    /**
     * Initialise complètement la vue semaine
     */
    function initialize() {
        console.log('🚀 Initialisation de la vue semaine...');

        // Générer tous les éléments
        generateDaysHeader();
        generateEmployeesHeader();
        generatePlanningGrid();

        // Configurer les interactions
        setupDropZones();

        // Rendre les données
        setTimeout(() => {
            renderShifts();
            updateCurrentWeekDisplay();
            updateWeekStats();
        }, 50);

        console.log('✅ Vue semaine initialisée');
    }

    /**
     * Rafraîchit complètement la vue
     */
    function refresh() {
        console.log('🔄 Rafraîchissement de la vue semaine...');
        initialize();
    }

    /**
     * Change la semaine affichée
     */
    function changeWeek(offset) {
        WEEK_CONFIG.currentWeekOffset += offset;

        console.log(`📅 Changement de semaine: offset ${WEEK_CONFIG.currentWeekOffset}`);

        // Régénérer l'affichage
        generateDaysHeader();
        updateCurrentWeekDisplay();

        // Si vous avez une API pour charger les données de la semaine
        if (window.PlanningManager && window.PlanningManager.loadWeekData) {
            window.PlanningManager.loadWeekData(WEEK_CONFIG.currentWeekOffset)
                .then(() => {
                    refresh();
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des données:', error);
                    refresh(); // Afficher avec les données actuelles
                });
        } else {
            refresh();
        }
    }

    /**
     * Met à jour seulement les créneaux
     */
    function updateShifts() {
        renderShifts();
        updateWeekStats();
    }

    // ==================== INTÉGRATION AVEC L'APPLICATION ====================

    /**
     * S'intègre avec les managers existants
     */
    function integrateWithExistingManagers() {
        // Remplacer les méthodes du PlanningManager si disponible
        if (window.PlanningManager) {
            window.PlanningManager.generateGrid = initialize;
            window.PlanningManager.renderShifts = updateShifts;
            window.PlanningManager.refresh = refresh;
            window.PlanningManager.changeWeek = changeWeek;

            console.log('🔗 Intégration avec PlanningManager terminée');
        }

        // Écouter les événements si EventsManager est disponible
        if (window.EventsManager) {
            window.EventsManager.addListener('planning:shift:added', updateShifts);
            window.EventsManager.addListener('planning:shift:updated', updateShifts);
            window.EventsManager.addListener('planning:shift:deleted', updateShifts);
            window.EventsManager.addListener('planning:employee:added', refresh);
            window.EventsManager.addListener('planning:employee:updated', refresh);
            window.EventsManager.addListener('planning:employee:deleted', refresh);

            console.log('👂 Écouteurs d'événements configurés');
        }
    }

    // ==================== INITIALISATION ====================

    // Attendre que l'application soit prête
    setTimeout(() => {
        integrateWithExistingManagers();

        // Auto-initialiser si les éléments sont présents
        if (document.getElementById('weekDaysHeader') &&
            document.getElementById('employeesHeaderContainer') &&
            document.getElementById('planningGrid')) {

            initialize();
        }

        console.log('🎉 WeekViewManager prêt !');
    }, 500);

    // ==================== EXPOSITION PUBLIQUE ====================

    // Exposer l'API pour utilisation externe
    window.WeekViewManager = {
        initialize,
        refresh,
        changeWeek,
        updateShifts,
        getEmployeesByDay,
        getCurrentWeekDates,

        // Méthodes utilitaires
        calculateShiftHeight,
        calculateDuration,
        getEmployeeColor,
        getEmployeeInitials,

        // Configuration
        config: WEEK_CONFIG
    };

    console.log('📅 WeekViewManager chargé');
    console.log('🛠️ API disponible: window.WeekViewManager');

})();