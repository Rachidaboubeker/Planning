/**
 * Planning Restaurant - Gestionnaire principal du planning
 * Logique centrale pour l'affichage et la gestion des créneaux
 */

class PlanningManager {
    constructor() {
        this.isInitialized = false;
        this.renderingInProgress = false;
    }

    /**
     * Initialise le gestionnaire de planning
     */
    async initialize() {
        try {
            Logger.info('Initialisation du PlanningManager...');
            AppState.isLoading = true;

            // Initialiser le gestionnaire d'avatars si pas déjà fait
            if (!window.avatarManager) {
                window.avatarManager = new AvatarManager();
            }

            // Charger les données
            await this.loadData();

            // Configurer les événements
            this.setupEventListeners();

            // Générer l'interface
            this.generatePlanningGrid();
            this.updateQuickStats();
            this.updateLegend();

            // Marquer comme initialisé
            this.isInitialized = true;
            AppState.isLoading = false;

            EventBus.emit(PlanningEvents.DATA_LOADED);
            Logger.info('PlanningManager initialisé avec succès');

        } catch (error) {
            AppState.isLoading = false;
            Logger.error('Erreur lors de l\'initialisation du PlanningManager:', error);
            EventBus.emit(PlanningEvents.ERROR_OCCURRED, { error, context: 'initialization' });

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('Erreur lors du chargement du planning', 'error');
            }
        }
    }

    /**
     * Charge les données depuis l'API
     */
    async loadData() {
        try {
            Logger.info('Chargement des données...');

            // Charger les employés
            if (typeof APIManager !== 'undefined') {
                const employeesResponse = await APIManager.get('/employees');
                if (employeesResponse.success) {
                    AppState.employees.clear();
                    employeesResponse.employees.forEach(emp => {
                        AppState.employees.set(emp.id, emp);
                    });
                    Logger.info(`${employeesResponse.employees.length} employés chargés`);
                } else {
                    throw new Error('Erreur lors du chargement des employés');
                }

                // Charger les créneaux
                const shiftsResponse = await APIManager.get('/shifts');
                if (shiftsResponse.success) {
                    AppState.shifts.clear();
                    shiftsResponse.shifts.forEach(shift => {
                        AppState.shifts.set(shift.id, shift);
                    });
                    Logger.info(`${shiftsResponse.shifts.length} créneaux chargés`);
                } else {
                    throw new Error('Erreur lors du chargement des créneaux');
                }
            } else {
                Logger.warn('APIManager non disponible, utilisation des données existantes');
            }

            // Initialiser les structures de données
            initializeDataStructures();

        } catch (error) {
            Logger.error('Erreur lors du chargement des données:', error);
            throw error;
        }
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Navigation par clavier
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));

        // Événements personnalisés
        EventBus.on(PlanningEvents.SHIFT_ADDED, this.handleShiftAdded.bind(this));
        EventBus.on(PlanningEvents.SHIFT_UPDATED, this.handleShiftUpdated.bind(this));
        EventBus.on(PlanningEvents.SHIFT_DELETED, this.handleShiftDeleted.bind(this));
        EventBus.on(PlanningEvents.EMPLOYEE_ADDED, this.handleEmployeeAdded.bind(this));
        EventBus.on(PlanningEvents.PHOTO_UPDATED, this.handlePhotoUpdated.bind(this));

        // Événements de fenêtre
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', PlanningUtils.debounce(this.handleWindowResize.bind(this), 250));

        Logger.debug('Écouteurs d\'événements configurés');
    }

    /**
     * Gère la navigation par clavier
     */
    handleKeyboardNavigation(e) {
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
                case 'z':
                    e.preventDefault();
                    // TODO: Implémenter l'annulation
                    if (typeof NotificationManager !== 'undefined') {
                        NotificationManager.show('💡 Fonction d\'annulation à venir', 'info');
                    }
                    break;
            }
        }

        if (e.key === 'Escape') {
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.closeAllModals();
            }
        }
    }

    /**
     * Gère l'ajout d'un créneau
     */
    handleShiftAdded(data) {
        Logger.debug('Créneau ajouté:', data);
        this.refreshPlanningDisplay();
    }

    /**
     * Gère la mise à jour d'un créneau
     */
    handleShiftUpdated(data) {
        Logger.debug('Créneau mis à jour:', data);
        this.refreshPlanningDisplay();
    }

    /**
     * Gère la suppression d'un créneau
     */
    handleShiftDeleted(data) {
        Logger.debug('Créneau supprimé:', data);
        this.refreshPlanningDisplay();
    }

    /**
     * Gère l'ajout d'un employé
     */
    handleEmployeeAdded(data) {
        Logger.debug('Employé ajouté:', data);
        this.updateLegend();
    }

    /**
     * Gère la mise à jour d'une photo
     */
    handlePhotoUpdated(data) {
        Logger.debug('Photo mise à jour:', data);
        // Seulement régénérer si nécessaire
        this.renderShifts();
        this.updateLegend();
    }

    /**
     * Gère l'événement avant fermeture
     */
    handleBeforeUnload(e) {
        if (AppState.isDirty) {
            e.preventDefault();
            e.returnValue = 'Vous avez des modifications non sauvegardées.';
        }

        // Sauvegarder les photos
        if (window.avatarManager) {
            window.avatarManager.savePhotos();
        }
    }

    /**
     * Gère le redimensionnement de la fenêtre
     */
    handleWindowResize() {
        Logger.debug('Redimensionnement de la fenêtre');
        // Recalculer les positions si nécessaire
        this.renderShifts();
    }

    /**
     * Génère la grille de planning
     */
    generatePlanningGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) {
            Logger.warn('Élément planningGrid non trouvé');
            return;
        }

        Logger.info('Génération de la grille de planning...');

        // Vider la grille
        grid.innerHTML = '';

        // Créer les cellules en ordre séquentiel
        PlanningConfig.HOURS_RANGE.forEach(hour => {
            // Colonne heure
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = PlanningUtils.formatHour(hour);
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

        Logger.info(`Grille créée: ${PlanningConfig.HOURS_RANGE.length} × ${PlanningConfig.DAYS_OF_WEEK.length} cellules`);

        // Rendre les créneaux
        this.renderShifts();
    }

    /**
     * Configure les événements d'une cellule
     */
    setupCellEvents(cell, day, hour) {
        // Double-clic pour créer un créneau
        cell.addEventListener('dblclick', () => {
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.showAddShiftModal(day, hour);
            }
        });

        // Setup drop zone pour le drag & drop
        if (typeof DragDropManager !== 'undefined') {
            DragDropManager.setupDropZone(cell);
        }

        // Hover effects
        cell.addEventListener('mouseenter', () => {
            cell.classList.add('cell-hover');
            cell.title = `${day} ${PlanningUtils.formatHour(hour)}\nDouble-clic pour ajouter un créneau`;
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('cell-hover');
        });
    }

    /**
     * Rend tous les créneaux
     */
    renderShifts() {
        if (this.renderingInProgress) {
            Logger.debug('Rendu déjà en cours, ignoré');
            return;
        }

        this.renderingInProgress = true;

        try {
            Logger.info('Rendu des créneaux...');
            const grid = document.getElementById('planningGrid');
            if (!grid) return;

            // Supprimer tous les anciens blocs
            grid.querySelectorAll('.shift-block').forEach(block => block.remove());

            // Organiser les créneaux par cellule pour détecter les chevauchements
            const shiftsByCell = this.organizeShiftsForRendering();

            let rendered = 0;

            // Rendre les créneaux organisés
            shiftsByCell.forEach((shifts, cellKey) => {
                const [day, hourStr] = cellKey.split('-');
                const hour = parseInt(hourStr);

                if (shifts.length === 1) {
                    // Créneau unique
                    const shiftData = shifts[0];
                    this.renderSingleShift(shiftData.shift, shiftData.employee, shiftData.isMultiHour);
                    rendered++;
                } else if (shifts.length > 1) {
                    // Créneaux multiples - gestion des chevauchements
                    this.renderOverlappingShifts(shifts, day, hour);
                    rendered += shifts.length;
                }
            });

            Logger.info(`${rendered} créneaux rendus`);

        } catch (error) {
            Logger.error('Erreur lors du rendu des créneaux:', error);
        } finally {
            this.renderingInProgress = false;
        }
    }

    /**
     * Organise les créneaux pour le rendu en gérant les chevauchements
     */
    organizeShiftsForRendering() {
        const shiftsByCell = new Map();

        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (!employee) {
                Logger.warn(`Employé ${shift.employee_id} introuvable pour le créneau ${shift.id}`);
                return;
            }

            const isMultiHour = shift.duration > 1;

            if (isMultiHour) {
                // Pour les créneaux multi-heures, on ne les ajoute qu'à la première heure
                const cellKey = PlanningUtils.getCellKey(shift.day, shift.start_hour);
                if (!shiftsByCell.has(cellKey)) {
                    shiftsByCell.set(cellKey, []);
                }
                shiftsByCell.get(cellKey).push({
                    shift,
                    employee,
                    isMultiHour: true
                });
            } else {
                // Pour les créneaux d'une heure
                const cellKey = PlanningUtils.getCellKey(shift.day, shift.start_hour);
                if (!shiftsByCell.has(cellKey)) {
                    shiftsByCell.set(cellKey, []);
                }
                shiftsByCell.get(cellKey).push({
                    shift,
                    employee,
                    isMultiHour: false
                });
            }
        });

        return shiftsByCell;
    }

    /**
     * Rend un créneau unique
     */
    renderSingleShift(shift, employee, isMultiHour) {
        if (isMultiHour) {
            this.renderMultiHourShift(shift, employee);
        } else {
            this.renderSingleHourShift(shift, employee);
        }
    }

    /**
     * Rend des créneaux qui se chevauchent
     */
    renderOverlappingShifts(shifts, day, hour) {
        const cell = document.querySelector(`[data-day="${day}"][data-hour="${hour}"]`);
        if (!cell) {
            Logger.warn(`Cellule introuvable: ${day} ${hour}h`);
            return;
        }

        Logger.debug(`Rendu de ${shifts.length} créneaux qui se chevauchent sur ${day} ${hour}h`);

        // Séparer les créneaux multi-heures et d'une heure
        const multiHourShifts = shifts.filter(s => s.isMultiHour);
        const singleHourShifts = shifts.filter(s => !s.isMultiHour);

        // Rendre d'abord les créneaux multi-heures (ils ont leur propre positionnement)
        multiHourShifts.forEach(shiftData => {
            this.renderMultiHourShift(shiftData.shift, shiftData.employee);
        });

        // Rendre les créneaux d'une heure avec gestion des chevauchements
        if (singleHourShifts.length > 0) {
            this.renderSingleHourShiftsWithOverlap(singleHourShifts, cell);
        }
    }

    /**
     * Rend des créneaux d'une heure avec gestion des chevauchements
     */
    renderSingleHourShiftsWithOverlap(shifts, cell) {
        const totalShifts = shifts.length;

        shifts.forEach((shiftData, index) => {
            const block = this.createShiftBlock(shiftData.shift, shiftData.employee, false);

            if (totalShifts > 1) {
                // Appliquer le style de chevauchement
                this.applyOverlapStyle(block, index, totalShifts);
            }

            cell.appendChild(block);
        });
    }

    /**
     * Rend un créneau d'une heure
     */
    renderSingleHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const cell = grid.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);

        if (!cell) {
            Logger.warn(`Cellule introuvable: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        const block = this.createShiftBlock(shift, employee, false);
        cell.appendChild(block);
    }

    /**
     * Rend un créneau multi-heures
     */
    renderMultiHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const position = PlanningUtils.calculateGridPosition(shift.day, shift.start_hour, shift.duration);

        if (position.dayIndex === -1 || position.hourIndex === -1) {
            Logger.warn(`Position invalide pour le créneau: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        const block = this.createShiftBlock(shift, employee, true);

        // Position CSS Grid
        block.style.gridRow = `${position.rowStart} / ${position.rowEnd}`;
        block.style.gridColumn = position.column;
        block.style.position = 'relative';
        block.style.margin = '2px';
        block.style.zIndex = '5';

        grid.appendChild(block);
    }

    /**
     * Crée un bloc de créneau
     */
    createShiftBlock(shift, employee, isMultiHour) {
        const color = this.getShiftColor(shift.employee_id);

        const block = document.createElement('div');
        block.className = `shift-block ${isMultiHour ? 'multi-hour-block' : 'single-hour-block'}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;

        // Styles de couleur
        block.style.background = `linear-gradient(135deg, ${color.bg}, ${color.border})`;
        block.style.borderColor = color.border;
        block.style.color = color.text;

        // Contenu selon le type
        if (isMultiHour) {
            this.createMultiHourContent(block, shift, employee);
        } else {
            this.createSingleHourContent(block, shift, employee);
        }

        // Tooltip
        block.title = this.createShiftTooltip(shift, employee);

        // Événements
        this.setupShiftEvents(block, shift, employee);

        return block;
    }

    /**
     * Crée le contenu d'un créneau multi-heures
     */
    createMultiHourContent(block, shift, employee) {
        const startTime = PlanningUtils.formatHour(shift.start_hour);
        const endHour = (shift.start_hour + shift.duration) % 24;
        const endTime = PlanningUtils.formatHour(endHour);

        // Créer l'avatar
        const avatarElement = window.avatarManager ?
            window.avatarManager.createAvatarElement(employee, 'normal') : null;

        block.innerHTML = `
            <div class="shift-header">
                <div class="shift-info">
                    <div class="shift-employee-name">${PlanningUtils.sanitizeString(employee.prenom)}</div>
                    <div class="shift-duration">${shift.duration}h</div>
                </div>
            </div>
            <div class="shift-time">${startTime} - ${endTime}</div>
            ${shift.notes ? `<div class="shift-notes">${PlanningUtils.sanitizeString(shift.notes)}</div>` : ''}
        `;

        // Insérer l'avatar au début du header
        if (avatarElement) {
            const shiftHeader = block.querySelector('.shift-header');
            shiftHeader.insertBefore(avatarElement, shiftHeader.firstChild);
        }
    }

    /**
     * Crée le contenu d'un créneau d'une heure
     */
    createSingleHourContent(block, shift, employee) {
        // Créer l'avatar
        const avatarElement = window.avatarManager ?
            window.avatarManager.createAvatarElement(employee, 'small') : null;

        if (avatarElement) {
            block.appendChild(avatarElement);
        }

        // Nom de l'employé
        const nameDiv = document.createElement('div');
        nameDiv.className = 'shift-name';
        nameDiv.textContent = PlanningUtils.sanitizeString(employee.prenom);
        block.appendChild(nameDiv);
    }

    /**
     * Applique le style de chevauchement
     */
    applyOverlapStyle(block, index, total) {
        const widthPercent = Math.floor(100 / total);
        const leftPercent = widthPercent * index;

        block.style.position = 'absolute';
        block.style.left = `${leftPercent}%`;
        block.style.width = `${Math.max(widthPercent - 1, 25)}%`; // Largeur minimum de 25%
        block.style.top = '2px';
        block.style.bottom = '2px';
        block.style.zIndex = `${10 + index}`;

        // Réduire la taille des éléments pour les petits créneaux
        if (total > 2) {
            this.adjustElementsForSmallSpace(block);
        }

        // Ajouter une classe pour le style CSS
        block.classList.add('overlapped-shift', `overlap-${index + 1}-of-${total}`);
    }

    /**
     * Ajuste les éléments pour les petits espaces
     */
    adjustElementsForSmallSpace(block) {
        const avatarContainer = block.querySelector('.shift-avatar-container');
        if (avatarContainer) {
            avatarContainer.classList.add('small');
        }

        const shiftName = block.querySelector('.shift-name');
        if (shiftName) {
            shiftName.style.fontSize = '0.7rem';

            // Tronquer le nom si nécessaire
            const originalText = shiftName.textContent;
            if (originalText.length > 6) {
                shiftName.textContent = originalText.substring(0, 5) + '…';
                shiftName.title = originalText;
            }
        }
    }

    /**
     * Crée un tooltip pour un créneau
     */
    createShiftTooltip(shift, employee) {
        const timeRange = `${PlanningUtils.formatHour(shift.start_hour)} (${shift.duration}h)`;
        const hasPhoto = window.avatarManager && window.avatarManager.photoCache.has(employee.id);

        let tooltip = `${employee.nom_complet}\n${employee.type_info?.name || employee.poste}\n${shift.day} ${timeRange}`;

        if (shift.notes) {
            tooltip += `\n📝 ${shift.notes}`;
        }

        tooltip += '\n\n🖱️ Glisser pour déplacer';
        tooltip += '\n📸 Clic sur l\'avatar pour la photo';
        tooltip += '\n✏️ Double-clic pour modifier';

        return tooltip;
    }

    /**
     * Configure les événements d'un créneau
     */
    setupShiftEvents(block, shift, employee) {
        // Double-clic pour éditer
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.showEditShiftModal(shift);
            }
        });

        // Événements sur l'avatar
        const avatarImg = block.querySelector('.shift-avatar-img');
        if (avatarImg) {
            avatarImg.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.avatarManager) {
                    window.avatarManager.showPhotoModal(employee);
                }
            });
        }

        // Drag & drop
        if (typeof DragDropManager !== 'undefined') {
            DragDropManager.setupDragAndDrop(block, shift);
        }

        // Hover effects pour mise en évidence
        block.addEventListener('mouseenter', () => {
            block.style.transform = 'scale(1.02)';
            block.style.zIndex = '20';
        });

        block.addEventListener('mouseleave', () => {
            if (!block.classList.contains('dragging')) {
                block.style.transform = '';
                block.style.zIndex = block.dataset.originalZIndex || '';
            }
        });
    }

    /**
     * Obtient la couleur d'un créneau
     */
    getShiftColor(employeeId) {
        if (typeof ColorManager !== 'undefined') {
            return ColorManager.getEmployeeColor(employeeId);
        }

        // Couleur par défaut si ColorManager n'est pas disponible
        return {
            bg: '#74b9ff',
            border: '#0984e3',
            text: 'white'
        };
    }

    /**
     * Met à jour les statistiques rapides
     */
    async updateQuickStats() {
        try {
            const stats = typeof APIManager !== 'undefined' ?
                await APIManager.get('/stats/weekly') :
                this.calculateLocalStats();

            if (stats.success || stats) {
                const data = stats.stats || stats;

                const elements = {
                    totalHours: document.getElementById('totalHoursDisplay'),
                    activeEmployees: document.getElementById('activeEmployeesDisplay'),
                    averageHours: document.getElementById('averageHoursDisplay')
                };

                if (elements.totalHours) elements.totalHours.textContent = data.total_hours || 0;
                if (elements.activeEmployees) elements.activeEmployees.textContent = data.active_employees || 0;
                if (elements.averageHours) elements.averageHours.textContent = `${data.average_hours || 0}h`;

                Logger.debug('Statistiques mises à jour:', data);
            }
        } catch (error) {
            Logger.error('Erreur mise à jour des statistiques:', error);
        }
    }

    /**
     * Calcule les statistiques localement
     */
    calculateLocalStats() {
        let totalHours = 0;
        const employeeHours = new Map();

        AppState.shifts.forEach(shift => {
            totalHours += shift.duration;

            const currentHours = employeeHours.get(shift.employee_id) || 0;
            employeeHours.set(shift.employee_id, currentHours + shift.duration);
        });

        const activeEmployees = employeeHours.size;
        const averageHours = activeEmployees > 0 ? totalHours / activeEmployees : 0;

        return {
            total_hours: totalHours,
            active_employees: activeEmployees,
            average_hours: Math.round(averageHours * 10) / 10
        };
    }

    /**
     * Met à jour la légende
     */
    updateLegend() {
        const container = document.getElementById('legendContainer');
        if (!container) return;

        Logger.debug('Mise à jour de la légende...');

        const activeEmployees = Array.from(AppState.employees.values())
            .filter(emp => emp.actif)
            .sort((a, b) => a.nom.localeCompare(b.nom));

        if (activeEmployees.length === 0) {
            container.innerHTML = '<div class="legend-empty">Aucun employé actif</div>';
            return;
        }

        const photoStats = window.avatarManager ? window.avatarManager.getPhotoStats() : null;

        container.innerHTML = `
            <div class="legend-title">
                <div class="legend-main-title">
                    <i class="fas fa-users"></i> Équipe (${activeEmployees.length} personnes)
                </div>
                <div class="legend-actions">
                    ${photoStats ? `<span class="photo-stats">${photoStats.customPhotos} photos</span>` : ''}
                    <button class="btn btn-sm btn-outline" onclick="showBulkPhotoModal()">
                        <i class="fas fa-images"></i> Gérer les photos
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="generateRandomAvatars()">
                        <i class="fas fa-dice"></i> Nouveaux avatars
                    </button>
                </div>
            </div>
            <div class="legend-grid" id="legendGrid"></div>
        `;

        const legendGrid = document.getElementById('legendGrid');
        if (!legendGrid) return;

        activeEmployees.forEach(employee => {
            const legendItem = this.createLegendItem(employee);
            legendGrid.appendChild(legendItem);
        });

        Logger.debug(`Légende mise à jour avec ${activeEmployees.length} employés`);
    }

    /**
     * Crée un élément de légende pour un employé
     */
    createLegendItem(employee) {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.dataset.employeeId = employee.id;

        // Créer l'avatar
        const avatarElement = window.avatarManager ?
            window.avatarManager.createAvatarElement(employee, 'normal') : null;

        // Informations de l'employé
        legendItem.innerHTML = `
            <div class="legend-info">
                <div class="legend-name">${PlanningUtils.sanitizeString(employee.nom_complet)}</div>
                <div class="legend-role">${PlanningUtils.sanitizeString(employee.type_info?.name || employee.poste)}</div>
            </div>
        `;

        // Insérer l'avatar au début
        if (avatarElement) {
            legendItem.insertBefore(avatarElement, legendItem.firstChild);
        }

        // Événements
        this.setupLegendItemEvents(legendItem, employee);

        return legendItem;
    }

    /**
     * Configure les événements d'un élément de légende
     */
    setupLegendItemEvents(legendItem, employee) {
        // Clic pour ouvrir la gestion de photo
        legendItem.addEventListener('click', () => {
            if (window.avatarManager) {
                window.avatarManager.showPhotoModal(employee);
            }
        });

        // Survol pour mettre en évidence les créneaux
        legendItem.addEventListener('mouseenter', () => {
            this.highlightEmployeeShifts(employee.id, true);
        });

        legendItem.addEventListener('mouseleave', () => {
            this.highlightEmployeeShifts(employee.id, false);
        });
    }

    /**
     * Met en évidence les créneaux d'un employé
     */
    highlightEmployeeShifts(employeeId, highlight) {
        const shifts = document.querySelectorAll(`[data-employee-id="${employeeId}"]`);
        shifts.forEach(shift => {
            if (highlight) {
                shift.style.transform = 'scale(1.05)';
                shift.style.zIndex = '25';
                shift.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            } else {
                shift.style.transform = '';
                shift.style.zIndex = '';
                shift.style.boxShadow = '';
            }
        });
    }

    /**
     * Navigation vers la semaine précédente
     */
    previousWeek() {
        AppState.currentWeekOffset--;
        this.updateWeekDisplay();
        EventBus.emit(PlanningEvents.WEEK_CHANGED, { offset: AppState.currentWeekOffset });
        Logger.debug(`Navigation: semaine ${AppState.currentWeekOffset}`);
    }

    /**
     * Navigation vers la semaine suivante
     */
    nextWeek() {
        AppState.currentWeekOffset++;
        this.updateWeekDisplay();
        EventBus.emit(PlanningEvents.WEEK_CHANGED, { offset: AppState.currentWeekOffset });
        Logger.debug(`Navigation: semaine ${AppState.currentWeekOffset}`);
    }

    /**
     * Met à jour l'affichage de la semaine
     */
    updateWeekDisplay() {
        const weekTitle = document.getElementById('weekTitle');
        if (!weekTitle) return;

        const { monday, sunday } = this.calculateWeekDates();

        const mondayStr = PlanningUtils.formatDate(monday);
        const sundayStr = PlanningUtils.formatDate(sunday);

        weekTitle.textContent = `Semaine du ${mondayStr} au ${sundayStr}`;
    }

    /**
     * Calcule les dates de la semaine courante
     */
    calculateWeekDates() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (AppState.currentWeekOffset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return { monday, sunday };
    }

    /**
     * Marque les données comme modifiées
     */
    markDirty() {
        AppState.isDirty = true;
        document.title = '• Planning Restaurant (non sauvegardé)';
        Logger.debug('Données marquées comme modifiées');
    }

    /**
     * Marque les données comme sauvegardées
     */
    markClean() {
        AppState.isDirty = false;
        document.title = 'Planning Restaurant';
        Logger.debug('Données marquées comme sauvegardées');
    }

    /**
     * Sauvegarde les changements
     */
    async saveChanges() {
        if (!AppState.isDirty) {
            Logger.debug('Aucune modification à sauvegarder');
            return;
        }

        try {
            Logger.info('Sauvegarde des modifications...');

            // Sauvegarder les photos
            if (window.avatarManager) {
                window.avatarManager.savePhotos();
            }

            this.markClean();

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('✅ Modifications sauvegardées', 'success');
            }

        } catch (error) {
            Logger.error('Erreur lors de la sauvegarde:', error);

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors de la sauvegarde', 'error');
            }
        }
    }

    /**
     * Actualise l'affichage du planning
     */
    refreshPlanningDisplay() {
        Logger.debug('Actualisation de l\'affichage du planning');

        // Réorganiser les données
        initializeDataStructures();

        // Rerendre les créneaux
        this.renderShifts();

        // Mettre à jour les statistiques
        this.updateQuickStats();
    }

    /**
     * Destruction propre du gestionnaire
     */
    destroy() {
        Logger.info('Destruction du PlanningManager');

        // Supprimer les écouteurs d'événements
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('resize', this.handleWindowResize);

        // Nettoyer l'état
        this.isInitialized = false;
        this.renderingInProgress = false;

        // Sauvegarder une dernière fois
        if (window.avatarManager) {
            window.avatarManager.savePhotos();
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.PlanningManager = PlanningManager;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningManager;
}

Logger.info('PlanningManager chargé avec succès');