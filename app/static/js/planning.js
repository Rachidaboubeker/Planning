/**
 * Planning Restaurant - JavaScript principal
 * Gestion du drag & drop, interactions UI, appels API
 */

// Configuration globale
const PlanningConfig = {
    API_BASE: '/api',
    CELL_HEIGHT: 60,
    MIN_SHIFT_DURATION: 1,
    MAX_SHIFT_DURATION: 12,
    HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
};

// État global de l'application
const AppState = {
    employees: new Map(),
    shifts: new Map(),
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    isResizing: false,
    resizeDirection: null,
    currentWeekOffset: 0,
    isDirty: false // Indique si des changements non sauvegardés existent
};

// Classes utilitaires
class ShiftElement {
    constructor(shift, employee) {
        this.shift = shift;
        this.employee = employee;
        this.element = null;
        this.isMultiHour = shift.duration > 1;
    }

    createElement() {
        const block = document.createElement('div');
        block.className = `shift-block ${this.isMultiHour ? 'multi-hour-block' : 'single-hour-block'} employee-${this.employee.poste}`;
        block.dataset.shiftId = this.shift.id;
        block.dataset.employeeId = this.shift.employee_id;
        block.dataset.duration = this.shift.duration;

        if (this.isMultiHour) {
            this.createMultiHourContent(block);
        } else {
            this.createSingleHourContent(block);
        }

        this.setupEvents(block);
        this.element = block;
        return block;
    }

    createMultiHourContent(block) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'shift-name';
        nameDiv.textContent = this.employee.prenom;

        const durationDiv = document.createElement('div');
        durationDiv.className = 'shift-duration';
        durationDiv.textContent = `${this.shift.duration}h`;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'shift-time';
        timeDiv.textContent = this.shift.formatted_hours;

        // Poignées de redimensionnement
        const topHandle = document.createElement('div');
        topHandle.className = 'resize-handle top';
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'resize-handle bottom';

        block.appendChild(nameDiv);
        block.appendChild(durationDiv);
        block.appendChild(timeDiv);
        block.appendChild(topHandle);
        block.appendChild(bottomHandle);

        // Position CSS Grid
        this.positionMultiHourBlock(block);
    }

    createSingleHourContent(block) {
        block.textContent = this.employee.prenom;
        block.style.height = 'calc(100% - 4px)';
        block.style.margin = '2px';
    }

    // Méthode supprimée - le positionnement est maintenant géré par renderMultiHourShift

    setupEvents(block) {
        // Tooltip
        block.title = this.createTooltip();

        // Double-clic pour éditer
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            PlanningUI.showEditShiftModal(this.shift);
        });

        // Drag and drop
        DragDropManager.setupDragAndDrop(block, this.shift);

        // Redimensionnement pour les créneaux multi-heures
        if (this.isMultiHour) {
            const topHandle = block.querySelector('.resize-handle.top');
            const bottomHandle = block.querySelector('.resize-handle.bottom');

            if (topHandle) ResizeManager.setupResize(topHandle, 'top', block, this.shift);
            if (bottomHandle) ResizeManager.setupResize(bottomHandle, 'bottom', block, this.shift);
        }
    }

    createTooltip() {
        return `${this.employee.nom_complet}\n${this.shift.formatted_hours}\n${this.shift.duration}h\n\n🖱️ Double-clic pour modifier\n✋ Glisser pour déplacer${this.isMultiHour ? '\n↕️ Bordures pour redimensionner' : ''}`;
    }

    updatePosition() {
        if (this.isMultiHour && this.element) {
            this.positionMultiHourBlock(this.element);
        }
    }
}

// Gestionnaire principal du planning
class PlanningManager {
    static async initialize() {
        try {
            // Réinitialiser les couleurs pour assurer la cohérence
            ColorManager.resetColors();

            await this.loadData();
            this.setupEventListeners();
            this.generatePlanningGrid();
            this.updateQuickStats();
            this.updateLegend();

            console.log('Planning initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            NotificationManager.show('Erreur lors du chargement', 'error');
        }
    }

    static async loadData() {
        try {
            console.log('📥 Chargement des données...');

            // Charger les employés
            const employeesResponse = await APIManager.get('/employees');
            console.log('👥 Réponse employés:', employeesResponse);

            if (employeesResponse.success) {
                AppState.employees.clear();
                employeesResponse.employees.forEach(emp => {
                    AppState.employees.set(emp.id, emp);
                });
                console.log(`✅ ${employeesResponse.employees.length} employés chargés`);
            } else {
                console.error('❌ Erreur chargement employés:', employeesResponse.error);
            }

            // Charger les créneaux
            const shiftsResponse = await APIManager.get('/shifts');
            console.log('📅 Réponse créneaux:', shiftsResponse);

            if (shiftsResponse.success) {
                AppState.shifts.clear();
                shiftsResponse.shifts.forEach(shift => {
                    AppState.shifts.set(shift.id, shift);
                });
                console.log(`✅ ${shiftsResponse.shifts.length} créneaux chargés`);
            } else {
                console.error('❌ Erreur chargement créneaux:', shiftsResponse.error);
            }

            console.log('📊 État final:', {
                employees: AppState.employees.size,
                shifts: AppState.shifts.size
            });
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error);
            throw error;
        }
    }

    static setupEventListeners() {
        // Navigation semaine
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousWeek();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextWeek();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveChanges();
                        break;
                }
            }
        });

        // Fermeture des modals avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                PlanningUI.closeAllModals();
            }
        });

        // Confirmation avant fermeture si changements non sauvegardés
        window.addEventListener('beforeunload', (e) => {
            if (AppState.isDirty) {
                e.preventDefault();
                e.returnValue = 'Vous avez des modifications non sauvegardées.';
            }
        });
    }

    static generatePlanningGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) return;

        console.log('🏗️ Régénération complète de la grille...');

        // Vider complètement
        grid.innerHTML = '';

        // Créer toutes les cellules en ordre séquentiel
        PlanningConfig.HOURS_RANGE.forEach(hour => {
            // Colonne heure
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);

            // Colonnes jours
            PlanningConfig.DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                cell.dataset.hour = hour;
                cell.dataset.day = day;
                cell.dataset.dayIndex = dayIndex;

                this.setupCellEvents(cell, day, hour);
                grid.appendChild(cell);
            });
        });

        console.log(`📋 Grille créée: ${PlanningConfig.HOURS_RANGE.length} × ${PlanningConfig.DAYS_OF_WEEK.length} cellules`);

        // Rendre les créneaux
        this.renderShifts();
    }

    static setupCellEvents(cell, day, hour) {
        // S'assurer que les datasets sont bien définis
        cell.dataset.hour = hour;
        cell.dataset.day = day;
        cell.dataset.dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(day);

        // Double-clic pour créer un créneau
        cell.addEventListener('dblclick', () => {
            PlanningUI.showAddShiftModal(day, hour);
        });

        // Setup drop zone
        DragDropManager.setupDropZone(cell);

        // Hover effect avec debug
        cell.addEventListener('mouseenter', () => {
            cell.classList.add('cell-hover');
            // Debug: afficher les informations de la cellule
            cell.title = `${day} ${hour.toString().padStart(2, '0')}:00`;
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('cell-hover');
        });
    }

    static renderShifts() {
        console.log('🎨 Rendu des créneaux...');
        const grid = document.getElementById('planningGrid');

        // Supprimer tous les anciens blocs
        grid.querySelectorAll('.shift-block').forEach(block => block.remove());

        let rendered = 0;
        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (employee) {
                console.log(`📅 Rendu: ${employee.prenom} ${shift.day} ${shift.start_hour}h (${shift.duration}h)`);

                if (shift.duration === 1) {
                    this.renderSingleHourShift(shift, employee);
                } else {
                    this.renderMultiHourShift(shift, employee);
                }
                rendered++;
            } else {
                console.warn(`⚠️ Employé ${shift.employee_id} introuvable pour créneau ${shift.id}`);
            }
        });

        console.log(`✅ ${rendered} créneaux rendus`);
    }

    static renderSingleHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const cell = grid.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);

        if (!cell) {
            console.warn(`❌ Cellule introuvable: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        // Vérifier les chevauchements existants dans cette cellule
        const existingBlocks = cell.querySelectorAll('.shift-block');
        const totalBlocks = existingBlocks.length + 1;

        // Créer le nouveau bloc
        const block = this.createShiftBlock(shift, employee, false);

        // Appliquer le positionnement pour chevauchement
        if (totalBlocks > 1) {
            console.log(`🔀 Chevauchement détecté: ${totalBlocks} créneaux`);

            // Redimensionner tous les blocs existants
            existingBlocks.forEach((existingBlock, index) => {
                this.applyOverlapStyle(existingBlock, index, totalBlocks);
            });

            // Appliquer le style au nouveau bloc
            this.applyOverlapStyle(block, existingBlocks.length, totalBlocks);
        }

        cell.appendChild(block);
    }

    static renderMultiHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(shift.day);
        const startHourIndex = PlanningConfig.HOURS_RANGE.indexOf(shift.start_hour);

        if (dayIndex === -1 || startHourIndex === -1) {
            console.warn(`❌ Index invalide: ${shift.day}=${dayIndex}, ${shift.start_hour}h=${startHourIndex}`);
            return;
        }

        const block = this.createShiftBlock(shift, employee, true);

        // Position CSS Grid simple
        const rowStart = startHourIndex + 1;
        const rowEnd = rowStart + shift.duration;
        const column = dayIndex + 2;

        block.style.gridRow = `${rowStart} / ${rowEnd}`;
        block.style.gridColumn = column;
        block.style.position = 'relative';
        block.style.margin = '2px';
        block.style.zIndex = '5';

        console.log(`📐 Multi-heure: grid-row ${rowStart}/${rowEnd}, grid-column ${column}`);

        grid.appendChild(block);
    }

    static createShiftBlock(shift, employee, isMultiHour) {
        const color = ColorManager.getEmployeeColor(shift.employee_id);
        const initials = ColorManager.getEmployeeInitials(employee);

        console.log(`🎨 Création bloc: ${employee.prenom} -> initiales: "${initials}", couleur: ${color.bg}`);

        const block = document.createElement('div');
        block.className = `shift-block ${isMultiHour ? 'multi-hour-block' : 'single-hour-block'}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;

        // Styles de couleur
        block.style.background = `linear-gradient(135deg, ${color.bg}, ${color.border})`;
        block.style.borderColor = color.border;
        block.style.color = color.text;

        // Contenu avec UNIQUEMENT les initiales
        if (isMultiHour) {
            const startTime = shift.start_hour.toString().padStart(2, '0') + ':00';
            const endHour = (shift.start_hour + shift.duration) % 24;
            const endTime = endHour.toString().padStart(2, '0') + ':00';

            block.innerHTML = `
                <div class="shift-header">
                    <div class="shift-avatar">
                        <div class="avatar-circle">
                            <span class="avatar-initials">${initials}</span>
                        </div>
                    </div>
                    <div class="shift-info">
                        <div class="shift-duration">${shift.duration}h</div>
                    </div>
                </div>
                <div class="shift-time">${startTime} - ${endTime}</div>
            `;
        } else {
            block.innerHTML = `
                <div class="shift-avatar">
                    <div class="avatar-circle">
                        <span class="avatar-initials">${initials}</span>
                    </div>
                </div>
            `;
        }

        // Tooltip
        const tooltip = `${employee.prenom} ${employee.nom}\n${employee.poste}\n${shift.day} ${shift.start_hour.toString().padStart(2, '0')}:00 (${shift.duration}h)\n\n🖱️ Glisser pour déplacer`;
        block.title = tooltip;

        // Drag & drop
        DragDropManager.setupDragAndDrop(block, shift);

        return block;
    }

    static applyOverlapStyle(block, index, total) {
        const widthPercent = Math.floor(100 / total);
        const leftPercent = widthPercent * index;

        block.style.position = 'absolute';
        block.style.left = `${leftPercent}%`;
        block.style.width = `${widthPercent - 1}%`;
        block.style.top = '2px';
        block.style.bottom = '2px';
        block.style.zIndex = `${10 + index}`;

        // Réduire la taille de l'avatar si nécessaire
        const avatar = block.querySelector('.avatar-circle');
        if (avatar && total > 2) {
            avatar.style.width = '20px';
            avatar.style.height = '20px';
            const initials = avatar.querySelector('.avatar-initials');
            if (initials) {
                initials.style.fontSize = '0.6rem';
            }
        }
    }

    static organizeShiftsByDayAndHour() {
        const organized = {};

        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (!employee) return;

            // Pour chaque heure du créneau
            for (let i = 0; i < shift.duration; i++) {
                const hour = (shift.start_hour + i) % 24;
                const key = `${shift.day}-${hour}`;

                if (!organized[key]) {
                    organized[key] = [];
                }

                // Ajouter seulement à la première heure pour éviter les doublons
                if (i === 0) {
                    organized[key].push({
                        shift,
                        employee,
                        isStart: true
                    });
                } else {
                    // Marquer les heures continues
                    organized[key].push({
                        shift,
                        employee,
                        isStart: false
                    });
                }
            }
        });

        return organized;
    }

    // Anciennes méthodes supprimées pour éviter les conflits
    // renderSingleHourShift, renderMultiHourShift, etc. sont maintenant dans PlanningManager

    static calculateMultiHourOverlaps(shift, shiftsByDayAndHour) {
        const overlappingShifts = new Set();

        // Vérifier chaque heure du créneau
        for (let i = 0; i < shift.duration; i++) {
            const hour = (shift.start_hour + i) % 24;
            const key = `${shift.day}-${hour}`;
            const hourShifts = shiftsByDayAndHour[key] || [];

            hourShifts.forEach(s => {
                if (s.shift.id !== shift.id && s.shift.duration > 1) {
                    overlappingShifts.add(s.shift.id);
                }
            });
        }

        // Créer une liste ordonnée des créneaux qui se chevauchent
        const allOverlappingShifts = Array.from(overlappingShifts)
            .map(id => AppState.shifts.get(id))
            .filter(s => s)
            .concat([shift])
            .sort((a, b) => a.start_hour - b.start_hour || a.id.localeCompare(b.id));

        return {
            total: allOverlappingShifts.length,
            index: allOverlappingShifts.findIndex(s => s.id === shift.id)
        };
    }

    static async updateQuickStats() {
        try {
            const stats = await APIManager.get('/stats/weekly');
            if (stats.success) {
                const data = stats.stats;

                const elements = {
                    totalHours: document.getElementById('totalHoursDisplay'),
                    activeEmployees: document.getElementById('activeEmployeesDisplay'),
                    averageHours: document.getElementById('averageHoursDisplay')
                };

                if (elements.totalHours) elements.totalHours.textContent = data.total_hours;
                if (elements.activeEmployees) elements.activeEmployees.textContent = data.active_employees;
                if (elements.averageHours) elements.averageHours.textContent = `${data.average_hours}h`;
            }
        } catch (error) {
            console.error('Erreur mise à jour stats:', error);
        }
    }

    static previousWeek() {
        AppState.currentWeekOffset--;
        this.updateWeekDisplay();
        this.generatePlanningGrid();
    }

    static nextWeek() {
        AppState.currentWeekOffset++;
        this.updateWeekDisplay();
        this.generatePlanningGrid();
    }

    static updateWeekDisplay() {
        const weekTitle = document.getElementById('weekTitle');
        if (!weekTitle) return;

        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (AppState.currentWeekOffset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const options = { day: 'numeric', month: 'long' };
        const mondayStr = monday.toLocaleDateString('fr-FR', options);
        const sundayStr = sunday.toLocaleDateString('fr-FR', options);

        weekTitle.textContent = `Semaine du ${mondayStr} au ${sundayStr}`;
    }

    static markDirty() {
        AppState.isDirty = true;
        // Optionnel: ajouter un indicateur visuel
        document.title = '• Planning Restaurant (non sauvegardé)';
    }

    static markClean() {
        AppState.isDirty = false;
        document.title = 'Planning Restaurant';
    }

    static async saveChanges() {
        if (!AppState.isDirty) return;

        try {
            // Ici on pourrait implémenter une sauvegarde batch
            NotificationManager.show('Modifications sauvegardées', 'success');
            this.markClean();
        } catch (error) {
            NotificationManager.show('Erreur lors de la sauvegarde', 'error');
        }
    }
}

// Gestionnaire des appels API
class APIManager {
    static async request(method, endpoint, data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${PlanningConfig.API_BASE}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur réseau');
            }

            return result;
        } catch (error) {
            console.error(`Erreur API ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request('GET', endpoint);
    }

    static async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    static async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    static async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
}

// Gestionnaire du drag & drop
class DragDropManager {
    static setupDragAndDrop(element, shift) {
        element.draggable = true;

        element.addEventListener('dragstart', (e) => {
            AppState.draggedElement = element;
            e.dataTransfer.setData('text/plain', shift.id);
            element.classList.add('dragging');

            // Créer un aperçu personnalisé
            const dragImage = element.cloneNode(true);
            dragImage.style.transform = 'rotate(5deg)';
            dragImage.style.opacity = '0.8';
            dragImage.style.position = 'fixed';
            dragImage.style.top = '-1000px';
            dragImage.style.pointerEvents = 'none';
            document.body.appendChild(dragImage);

            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);

            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 0);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.cleanupDragState();
        });
    }

    static setupDropZone(cell) {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(cell);
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over', 'invalid-drop');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e, cell);
        });
    }

    static handleDragOver(cell) {
        if (!AppState.draggedElement) return;

        const shiftId = AppState.draggedElement.dataset.shiftId;
        const shift = AppState.shifts.get(shiftId);

        if (this.validateDrop(cell, shift)) {
            cell.classList.add('drag-over');
            cell.classList.remove('invalid-drop');
        } else {
            cell.classList.add('invalid-drop');
            cell.classList.remove('drag-over');
        }
    }

    static validateDrop(cell, shift) {
        const targetHour = parseInt(cell.dataset.hour);
        const targetDay = cell.dataset.day;

        console.log('🔍 Validation du drop:', {
            targetDay,
            targetHour,
            shiftDay: shift.day,
            shiftStartHour: shift.start_hour,
            shiftDuration: shift.duration,
            employeeId: shift.employee_id
        });

        // Vérifier si c'est la même position
        if (shift.day === targetDay && shift.start_hour === targetHour) {
            console.log('❌ Même position - drop invalide');
            return false;
        }

        // Vérifier si l'heure cible existe dans notre plage
        if (!PlanningConfig.HOURS_RANGE.includes(targetHour)) {
            console.log('❌ Heure cible hors plage:', targetHour);
            return false;
        }

        // Vérifier si le créneau peut tenir dans la plage horaire
        const targetIndex = PlanningConfig.HOURS_RANGE.indexOf(targetHour);
        if (targetIndex + shift.duration > PlanningConfig.HOURS_RANGE.length) {
            console.log('❌ Créneau trop long pour la plage horaire');
            return false;
        }

        // Vérifier les conflits avec d'autres créneaux du même employé
        let hasConflict = false;
        for (const [otherShiftId, otherShift] of AppState.shifts) {
            if (otherShiftId === shift.id) continue;
            if (otherShift.employee_id !== shift.employee_id) continue;
            if (otherShift.day !== targetDay) continue;

            // Vérifier le chevauchement d'heures
            const otherStart = otherShift.start_hour;
            const otherEnd = (otherShift.start_hour + otherShift.duration) % 24;
            const newStart = targetHour;
            const newEnd = (targetHour + shift.duration) % 24;

            console.log('🔍 Vérification conflit avec:', {
                otherShiftId,
                otherStart,
                otherEnd,
                newStart,
                newEnd
            });

            // Gérer le cas où les heures traversent minuit
            let overlap = false;

            if (otherStart <= otherEnd && newStart <= newEnd) {
                // Cas normal (pas de traversée de minuit)
                overlap = !(newEnd <= otherStart || newStart >= otherEnd);
            } else {
                // Cas complexe avec traversée de minuit
                // Pour simplifier, on autorise pour l'instant
                overlap = false;
            }

            if (overlap) {
                console.log('❌ Conflit détecté avec le créneau:', otherShiftId);
                hasConflict = true;
                break;
            }
        }

        const isValid = !hasConflict;
        console.log('📋 Résultat validation:', isValid ? '✅ VALIDE' : '❌ INVALIDE');
        return isValid;
    }

    static async handleDrop(e, cell) {
        const shiftId = e.dataTransfer.getData('text/plain');
        const shift = AppState.shifts.get(shiftId);

        if (!shift || !this.validateDrop(cell, shift)) {
            NotificationManager.show('❌ Déplacement impossible à cet endroit', 'error');
            this.cleanupDragState();
            return;
        }

        const newDay = cell.dataset.day;
        const newHour = parseInt(cell.dataset.hour);

        try {
            const result = await APIManager.put(`/shifts/${shiftId}`, {
                day: newDay,
                start_hour: newHour
            });

            if (result.success) {
                // Mettre à jour les données locales
                const updatedShift = result.shift;
                AppState.shifts.set(shiftId, updatedShift);

                // Régénérer le planning
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                NotificationManager.show('✅ Créneau déplacé avec succès', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur lors du déplacement:', error);
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }

        this.cleanupDragState();
    }

    static cleanupDragState() {
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.classList.remove('drag-over', 'invalid-drop');
        });

        document.querySelectorAll('.shift-block').forEach(block => {
            block.classList.remove('dragging');
        });

        AppState.draggedElement = null;
    }
}

// Gestionnaire du redimensionnement
class ResizeManager {
    static setupResize(handle, direction, element, shift) {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();

            AppState.isResizing = true;
            AppState.resizeDirection = direction;
            AppState.draggedElement = element;

            const startY = e.clientY;
            const originalDuration = shift.duration;
            const originalStartHour = shift.start_hour;

            const handleMouseMove = (e) => {
                if (!AppState.isResizing) return;

                const deltaY = e.clientY - startY;
                const cellHeight = PlanningConfig.CELL_HEIGHT;
                const hourChange = Math.round(deltaY / cellHeight);

                let newDuration = originalDuration;
                let newStartHour = originalStartHour;

                if (direction === 'bottom') {
                    newDuration = Math.max(1, Math.min(12, originalDuration + hourChange));
                } else if (direction === 'top') {
                    const startChange = Math.max(-originalStartHour + 8, hourChange);
                    newStartHour = originalStartHour + startChange;
                    newDuration = originalDuration - startChange;
                    newDuration = Math.max(1, newDuration);
                }

                // Validation
                if (newDuration >= 1 && newDuration <= 12) {
                    this.updateElementSize(element, newStartHour, newDuration);
                }
            };

            const handleMouseUp = async () => {
                if (!AppState.isResizing) return;

                const newDuration = parseInt(element.dataset.duration);
                const newStartHour = shift.start_hour; // À ajuster selon la logique

                try {
                    const result = await APIManager.put(`/shifts/${shift.id}`, {
                        duration: newDuration,
                        start_hour: newStartHour
                    });

                    if (result.success) {
                        AppState.shifts.set(shift.id, result.shift);
                        PlanningManager.generatePlanningGrid();
                        PlanningManager.updateQuickStats();
                        PlanningManager.markDirty();
                        NotificationManager.show('✅ Durée modifiée', 'success');
                    } else {
                        NotificationManager.show(`❌ ${result.error}`, 'error');
                        PlanningManager.generatePlanningGrid(); // Reset visuel
                    }
                } catch (error) {
                    NotificationManager.show('❌ Erreur de connexion', 'error');
                    PlanningManager.generatePlanningGrid(); // Reset visuel
                }

                this.cleanupResize();
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
        });
    }

    static updateElementSize(element, startHour, duration) {
        element.dataset.duration = duration;

        const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(element.closest('[data-day]')?.dataset.day || '');
        const startRowIndex = PlanningConfig.HOURS_RANGE.indexOf(startHour);

        if (dayIndex !== -1 && startRowIndex !== -1) {
            const gridRowStart = startRowIndex + 2;
            const gridRowEnd = gridRowStart + duration;

            element.style.gridRow = `${gridRowStart} / ${gridRowEnd}`;

            // Mettre à jour le contenu
            const durationDiv = element.querySelector('.shift-duration');
            const timeDiv = element.querySelector('.shift-time');

            if (durationDiv) durationDiv.textContent = `${duration}h`;
            if (timeDiv) {
                const endHour = (startHour + duration) % 24;
                timeDiv.textContent = `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
            }
        }
    }

    static cleanupResize() {
        AppState.isResizing = false;
        AppState.resizeDirection = null;
        AppState.draggedElement = null;
    }
}

// Gestionnaire de l'interface utilisateur
class PlanningUI {
    static showAddShiftModal(defaultDay = '', defaultHour = '') {
        const modal = document.getElementById('addShiftModal');
        if (!modal) return;

        // Préremplir les valeurs par défaut
        if (defaultDay) {
            const daySelect = document.getElementById('shiftDay');
            if (daySelect) daySelect.value = defaultDay;
        }

        if (defaultHour !== '') {
            const hourSelect = document.getElementById('shiftStartHour');
            if (hourSelect) hourSelect.value = defaultHour;
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    static showEditShiftModal(shift) {
        const employee = AppState.employees.get(shift.employee_id);
        if (!employee) return;

        const content = `
            <form id="editShiftForm" class="form">
                <div class="form-group">
                    <label>Équipier</label>
                    <input type="text" value="${employee.nom_complet}" readonly>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editShiftDay">Jour</label>
                        <select id="editShiftDay" required>
                            ${PlanningConfig.DAYS_OF_WEEK.map(day =>
                                `<option value="${day}" ${day === shift.day ? 'selected' : ''}>${day}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftStartHour">Heure de début</label>
                        <select id="editShiftStartHour" required>
                            ${PlanningConfig.HOURS_RANGE.map(hour =>
                                `<option value="${hour}" ${hour === shift.start_hour ? 'selected' : ''}>${hour.toString().padStart(2, '0')}:00</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftDuration">Durée (heures)</label>
                        <select id="editShiftDuration" required>
                            ${Array.from({length: 12}, (_, i) => i + 1).map(i =>
                                `<option value="${i}" ${i === shift.duration ? 'selected' : ''}>${i}h</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editShiftNotes">Notes</label>
                    <textarea id="editShiftNotes">${shift.notes || ''}</textarea>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Supprimer',
                class: 'btn-danger',
                onclick: () => this.deleteShift(shift.id)
            },
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => closeModal('globalModal')
            },
            {
                text: 'Sauvegarder',
                class: 'btn-primary',
                onclick: () => this.updateShift(shift.id)
            }
        ];

        openModal(`Modifier le créneau de ${employee.prenom}`, content, buttons);
    }

    static async updateShift(shiftId) {
        const form = document.getElementById('editShiftForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const data = {
            day: document.getElementById('editShiftDay').value,
            start_hour: parseInt(document.getElementById('editShiftStartHour').value),
            duration: parseInt(document.getElementById('editShiftDuration').value),
            notes: document.getElementById('editShiftNotes').value
        };

        try {
            const result = await APIManager.put(`/shifts/${shiftId}`, data);

            if (result.success) {
                AppState.shifts.set(shiftId, result.shift);
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                closeModal('globalModal');
                NotificationManager.show('✅ Créneau modifié', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }
    }

    static async deleteShift(shiftId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) return;

        try {
            const result = await APIManager.delete(`/shifts/${shiftId}`);

            if (result.success) {
                AppState.shifts.delete(shiftId);
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                closeModal('globalModal');
                NotificationManager.show('✅ Créneau supprimé', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }

    static showAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
}

// Gestionnaire des notifications
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notifications') || this.createContainer();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 10);

        // Suppression automatique
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }
}

// Fonctions globales pour la compatibilité avec les templates
window.addShift = async function() {
    const form = document.getElementById('addShiftForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const shiftData = {
        employee_id: document.getElementById('shiftEmployee').value,
        day: document.getElementById('shiftDay').value,
        start_hour: parseInt(document.getElementById('shiftStartHour').value),
        duration: parseInt(document.getElementById('shiftDuration').value),
        notes: document.getElementById('shiftNotes').value
    };

    try {
        const result = await APIManager.post('/shifts', shiftData);

        if (result.success) {
            AppState.shifts.set(result.shift.id, result.shift);
            PlanningManager.generatePlanningGrid();
            PlanningManager.updateQuickStats();
            PlanningManager.markDirty();

            closeModal('addShiftModal');
            form.reset();
            NotificationManager.show('✅ Créneau ajouté', 'success');
        } else {
            NotificationManager.show(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

window.addEmployee = async function() {
    const form = document.getElementById('addEmployeeForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const employeeData = {
        prenom: document.getElementById('employeePrenom').value,
        nom: document.getElementById('employeeNom').value,
        poste: document.getElementById('employeePoste').value,
        taux_horaire: parseFloat(document.getElementById('employeeTauxHoraire').value),
        email: document.getElementById('employeeEmail').value,
        telephone: document.getElementById('employeeTelephone').value
    };

    try {
        const result = await APIManager.post('/employees', employeeData);

        if (result.success) {
            AppState.employees.set(result.employee.id, result.employee);

            // Ajouter à la liste déroulante des créneaux
            const shiftEmployeeSelect = document.getElementById('shiftEmployee');
            if (shiftEmployeeSelect) {
                const option = document.createElement('option');
                option.value = result.employee.id;
                option.textContent = `${result.employee.nom_complet} (${result.employee.type_info.name})`;
                shiftEmployeeSelect.appendChild(option);
            }

            closeModal('addEmployeeModal');
            form.reset();
            NotificationManager.show('✅ Équipier ajouté', 'success');
        } else {
            NotificationManager.show(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

window.showAddShiftModal = function(day, hour) {
    PlanningUI.showAddShiftModal(day, hour);
};

window.showAddEmployeeModal = function() {
    PlanningUI.showAddEmployeeModal();
};

window.previousWeek = function() {
    PlanningManager.previousWeek();
};

window.nextWeek = function() {
    PlanningManager.nextWeek();
};

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    PlanningManager.initialize();
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanningManager,
        APIManager,
        DragDropManager,
        ResizeManager,
        PlanningUI,
        NotificationManager
    };
}