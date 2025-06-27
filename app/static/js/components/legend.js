/**
 * LEGEND MANAGER UNIFIÉ - Planning Restaurant
 * Gestion de la légende des employés avec statistiques et interactions
 * Remplace les systèmes de légende dispersés
 */

class LegendManager {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isVisible = true;
        this.updateInterval = null;
        this.sortBy = 'name'; // name, hours, type
        this.filterBy = 'all'; // all, active, inactive, type

        this.bindGlobalEvents();
        console.log('🏷️ Legend Manager unifié initialisé');
    }

    /**
     * Initialise le legend manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('🏷️ Legend Manager déjà initialisé');
            return;
        }

        try {
            // Trouver ou créer le conteneur
            this.ensureLegendContainer();

            // Configurer les événements
            this.setupEvents();

            // Générer la légende initiale
            this.refresh();

            // Configurer la mise à jour automatique
            this.setupAutoUpdate();

            this.isInitialized = true;
            console.log('✅ Legend Manager initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur initialisation Legend Manager:', error);
            throw error;
        }
    }

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Observer les changements d'état
        if (window.EventBus) {
            window.EventBus.on(window.Config?.EVENTS.EMPLOYEE_ADDED, () => {
                this.refresh();
            });

            window.EventBus.on(window.Config?.EVENTS.EMPLOYEE_UPDATED, () => {
                this.refresh();
            });

            window.EventBus.on(window.Config?.EVENTS.EMPLOYEE_DELETED, () => {
                this.refresh();
            });

            window.EventBus.on(window.Config?.EVENTS.SHIFT_ADDED, () => {
                this.refreshStats();
            });

            window.EventBus.on(window.Config?.EVENTS.SHIFT_UPDATED, () => {
                this.refreshStats();
            });

            window.EventBus.on(window.Config?.EVENTS.SHIFT_DELETED, () => {
                this.refreshStats();
            });
        }
    }

    /**
     * S'assure que le conteneur de légende existe
     */
    ensureLegendContainer() {
        this.container = document.getElementById('employeeLegend') ||
                        document.getElementById('legendContent');

        if (!this.container) {
            console.warn('⚠️ Conteneur de légende non trouvé, création automatique');
            this.createLegendContainer();
        }
    }

    /**
     * Crée le conteneur de légende
     */
    createLegendContainer() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        const legendSection = document.createElement('aside');
        legendSection.id = 'employeeLegend';
        legendSection.className = 'employee-legend';

        legendSection.innerHTML = `
            <div class="legend-header">
                <h3>Équipe</h3>
                <div class="legend-controls">
                    <button class="btn btn-sm btn-ghost" data-action="toggle-legend" title="Masquer/Afficher">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" data-action="refresh-legend" title="Actualiser">
                        <i class="fas fa-sync"></i>
                    </button>
                </div>
            </div>
            <div class="legend-filters">
                <select id="legendSort" class="select select-sm">
                    <option value="name">Trier par nom</option>
                    <option value="hours">Trier par heures</option>
                    <option value="type">Trier par poste</option>
                </select>
                <select id="legendFilter" class="select select-sm">
                    <option value="all">Tous</option>
                    <option value="active">Actifs seulement</option>
                    <option value="inactive">Inactifs</option>
                </select>
            </div>
            <div class="legend-content" id="legendContent">
                <!-- Contenu généré dynamiquement -->
            </div>
            <div class="legend-summary" id="legendSummary">
                <!-- Résumé généré dynamiquement -->
            </div>
        `;

        // Insérer au début du main-content
        mainContent.insertBefore(legendSection, mainContent.firstChild);
        this.container = legendSection.querySelector('#legendContent');
    }

    /**
     * Configure les événements de la légende
     */
    setupEvents() {
        // Boutons de contrôle
        const toggleBtn = document.querySelector('[data-action="toggle-legend"]');
        const refreshBtn = document.querySelector('[data-action="refresh-legend"]');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Sélecteurs de tri et filtre
        const sortSelect = document.getElementById('legendSort');
        const filterSelect = document.getElementById('legendFilter');

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.refresh();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterBy = e.target.value;
                this.refresh();
            });
        }
    }

    /**
     * Configure la mise à jour automatique
     */
    setupAutoUpdate() {
        // Mise à jour des statistiques toutes les 30 secondes
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.refreshStats();
            }
        }, 30000);
    }

    // ==================== GÉNÉRATION DE LA LÉGENDE ====================

    /**
     * Rafraîchit complètement la légende
     */
    refresh() {
        if (!this.container || !this.isInitialized) return;

        const employees = this.getFilteredEmployees();
        const sortedEmployees = this.sortEmployees(employees);

        this.renderEmployees(sortedEmployees);
        this.updateSummary(employees);

        console.log(`🏷️ Légende mise à jour: ${sortedEmployees.length} employés`);
    }

    /**
     * Rafraîchit seulement les statistiques
     */
    refreshStats() {
        if (!this.isVisible) return;

        const employeeCards = this.container.querySelectorAll('.employee-card');

        employeeCards.forEach(card => {
            const employeeId = card.dataset.employeeId;
            if (employeeId) {
                this.updateEmployeeStats(card, employeeId);
            }
        });

        const employees = this.getFilteredEmployees();
        this.updateSummary(employees);
    }

    /**
     * Obtient les employés filtrés
     */
    getFilteredEmployees() {
        if (!window.State?.state.employees) return [];

        const allEmployees = Array.from(window.State.state.employees.values());

        return allEmployees.filter(employee => {
            switch (this.filterBy) {
                case 'active':
                    return employee.actif !== false;
                case 'inactive':
                    return employee.actif === false;
                case 'all':
                default:
                    return true;
            }
        });
    }

    /**
     * Trie les employés selon le critère sélectionné
     */
    sortEmployees(employees) {
        return employees.sort((a, b) => {
            switch (this.sortBy) {
                case 'hours':
                    const hoursA = this.getEmployeeTotalHours(a.id);
                    const hoursB = this.getEmployeeTotalHours(b.id);
                    return hoursB - hoursA; // Décroissant

                case 'type':
                    const typeA = a.poste || '';
                    const typeB = b.poste || '';
                    if (typeA === typeB) {
                        return (a.nom || '').localeCompare(b.nom || '');
                    }
                    return typeA.localeCompare(typeB);

                case 'name':
                default:
                    const nameA = `${a.nom || ''} ${a.prenom || ''}`;
                    const nameB = `${b.nom || ''} ${b.prenom || ''}`;
                    return nameA.localeCompare(nameB);
            }
        });
    }

    /**
     * Rend la liste des employés
     */
    renderEmployees(employees) {
        if (!employees.length) {
            this.container.innerHTML = `
                <div class="legend-empty">
                    <i class="fas fa-users"></i>
                    <p>Aucun employé trouvé</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = employees.map(employee =>
            this.createEmployeeCard(employee)
        ).join('');

        // Ajouter les événements aux cartes
        this.setupEmployeeCardEvents();
    }

    /**
     * Crée une carte d'employé
     */
    createEmployeeCard(employee) {
        const employeeType = window.Config?.getEmployeeTypeConfig(employee.poste);
        const totalHours = this.getEmployeeTotalHours(employee.id);
        const shiftsCount = this.getEmployeeShiftsCount(employee.id);
        const initials = this.getInitials(employee);

        return `
            <div class="employee-card ${employee.actif === false ? 'inactive' : ''}"
                 data-employee-id="${employee.id}"
                 data-employee-type="${employee.poste}"
                 title="${this.sanitize(employee.prenom)} ${this.sanitize(employee.nom)} - ${this.sanitize(employeeType.name)}">

                <div class="employee-avatar-section">
                    <div class="employee-avatar" style="background: ${employeeType.color};">
                        ${employee.photo_url ?
                            `<img src="${employee.photo_url}" alt="${initials}" class="avatar-image">` :
                            `<span class="avatar-initials">${initials}</span>`
                        }
                    </div>
                    <div class="employee-status ${employee.actif !== false ? 'active' : 'inactive'}"></div>
                </div>

                <div class="employee-info">
                    <div class="employee-name">
                        ${this.sanitize(employee.prenom)} ${this.sanitize(employee.nom)}
                    </div>
                    <div class="employee-role" style="color: ${employeeType.color};">
                        ${this.sanitize(employeeType.name)}
                    </div>
                    <div class="employee-stats">
                        <span class="stat-hours" title="Heures cette semaine">
                            <i class="fas fa-clock"></i>
                            ${totalHours}h
                        </span>
                        <span class="stat-shifts" title="Nombre de créneaux">
                            <i class="fas fa-calendar"></i>
                            ${shiftsCount}
                        </span>
                    </div>
                </div>

                <div class="employee-actions">
                    <button class="btn btn-sm btn-ghost" data-action="edit-employee" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" data-action="view-schedule" title="Voir le planning">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Configure les événements des cartes d'employés
     */
    setupEmployeeCardEvents() {
        const cards = this.container.querySelectorAll('.employee-card');

        cards.forEach(card => {
            const employeeId = card.dataset.employeeId;

            // Clic sur la carte pour voir les détails
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.showEmployeeDetails(employeeId);
                }
            });

            // Boutons d'action
            const editBtn = card.querySelector('[data-action="edit-employee"]');
            const viewBtn = card.querySelector('[data-action="view-schedule"]');

            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editEmployee(employeeId);
                });
            }

            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewEmployeeSchedule(employeeId);
                });
            }
        });
    }

    /**
     * Met à jour les statistiques d'un employé
     */
    updateEmployeeStats(card, employeeId) {
        const totalHours = this.getEmployeeTotalHours(employeeId);
        const shiftsCount = this.getEmployeeShiftsCount(employeeId);

        const hoursElement = card.querySelector('.stat-hours');
        const shiftsElement = card.querySelector('.stat-shifts');

        if (hoursElement) {
            hoursElement.innerHTML = `<i class="fas fa-clock"></i> ${totalHours}h`;
        }

        if (shiftsElement) {
            shiftsElement.innerHTML = `<i class="fas fa-calendar"></i> ${shiftsCount}`;
        }
    }

    /**
     * Met à jour le résumé de la légende
     */
    updateSummary(employees) {
        const summaryContainer = document.getElementById('legendSummary');
        if (!summaryContainer) return;

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(emp => emp.actif !== false).length;
        const totalHours = employees.reduce((sum, emp) => sum + this.getEmployeeTotalHours(emp.id), 0);
        const totalShifts = employees.reduce((sum, emp) => sum + this.getEmployeeShiftsCount(emp.id), 0);

        // Répartition par type de poste
        const byType = {};
        employees.forEach(emp => {
            byType[emp.poste] = (byType[emp.poste] || 0) + 1;
        });

        summaryContainer.innerHTML = `
            <div class="summary-stats">
                <div class="summary-item">
                    <span class="summary-value">${totalEmployees}</span>
                    <span class="summary-label">Employés</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${activeEmployees}</span>
                    <span class="summary-label">Actifs</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${Math.round(totalHours * 10) / 10}h</span>
                    <span class="summary-label">Total</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${totalShifts}</span>
                    <span class="summary-label">Créneaux</span>
                </div>
            </div>

            ${Object.keys(byType).length > 0 ? `
                <div class="summary-types">
                    <div class="summary-types-title">Répartition par poste :</div>
                    <div class="summary-types-list">
                        ${Object.entries(byType).map(([type, count]) => {
                            const typeConfig = window.Config?.getEmployeeTypeConfig(type);
                            return `
                                <span class="type-badge" style="background: ${typeConfig.color};">
                                    ${typeConfig.name} (${count})
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    // ==================== ACTIONS SUR LES EMPLOYÉS ====================

    /**
     * Affiche les détails d'un employé
     */
    showEmployeeDetails(employeeId) {
        const employee = window.State?.state.employees.get(employeeId);
        if (!employee) return;

        const shifts = this.getEmployeeShifts(employeeId);
        const totalHours = this.getEmployeeTotalHours(employeeId);
        const employeeType = window.Config?.getEmployeeTypeConfig(employee.poste);

        const detailsContent = `
            <div class="employee-details">
                <div class="employee-header">
                    <div class="employee-avatar large" style="background: ${employeeType.color};">
                        ${employee.photo_url ?
                            `<img src="${employee.photo_url}" alt="Photo" class="avatar-image">` :
                            `<span class="avatar-initials">${this.getInitials(employee)}</span>`
                        }
                    </div>
                    <div class="employee-info">
                        <h3>${this.sanitize(employee.prenom)} ${this.sanitize(employee.nom)}</h3>
                        <p class="employee-role">${this.sanitize(employeeType.name)}</p>
                        <p class="employee-status ${employee.actif !== false ? 'active' : 'inactive'}">
                            ${employee.actif !== false ? 'Actif' : 'Inactif'}
                        </p>
                    </div>
                </div>

                <div class="employee-stats-detail">
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span>Total cette semaine : <strong>${totalHours}h</strong></span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <span>Nombre de créneaux : <strong>${shifts.length}</strong></span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-euro-sign"></i>
                        <span>Taux horaire : <strong>${employee.taux_horaire || 0}€</strong></span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calculator"></i>
                        <span>Salaire estimé : <strong>${Math.round((employee.taux_horaire || 0) * totalHours * 100) / 100}€</strong></span>
                    </div>
                </div>

                ${employee.email || employee.telephone ? `
                    <div class="employee-contact">
                        <h4>Contact</h4>
                        ${employee.email ? `<p><i class="fas fa-envelope"></i> ${this.sanitize(employee.email)}</p>` : ''}
                        ${employee.telephone ? `<p><i class="fas fa-phone"></i> ${this.sanitize(employee.telephone)}</p>` : ''}
                    </div>
                ` : ''}

                ${shifts.length > 0 ? `
                    <div class="employee-schedule">
                        <h4>Planning cette semaine</h4>
                        <div class="schedule-list">
                            ${shifts.map(shift => `
                                <div class="schedule-item">
                                    <span class="schedule-day">${shift.day}</span>
                                    <span class="schedule-time">
                                        ${shift.start_hour}:${(shift.start_minutes || 0).toString().padStart(2, '0')} -
                                        ${this.calculateEndTime(shift)}
                                    </span>
                                    <span class="schedule-duration">(${shift.duration}h)</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '<p>Aucun créneau programmé cette semaine.</p>'}
            </div>
        `;

        if (window.ModalManager && typeof window.ModalManager.show === 'function') {
            window.ModalManager.show(
                'employee-details',
                `Détails - ${employee.prenom} ${employee.nom}`,
                detailsContent,
                {
                    size: 'medium',
                    buttons: [
                        {
                            text: 'Modifier',
                            className: 'btn-primary',
                            action: 'edit',
                            icon: 'fas fa-edit'
                        }
                    ],
                    onClose: (action) => {
                        if (action === 'edit') {
                            this.editEmployee(employeeId);
                        }
                    }
                }
            );
        }
    }

    /**
     * Modifie un employé
     */
    editEmployee(employeeId) {
        if (window.UIManager && typeof window.UIManager.showEditEmployeeModal === 'function') {
            window.UIManager.showEditEmployeeModal(employeeId);
        } else {
            console.warn('UIManager.showEditEmployeeModal non disponible');
        }
    }

    /**
     * Affiche le planning d'un employé
     */
    viewEmployeeSchedule(employeeId) {
        const employee = window.State?.state.employees.get(employeeId);
        if (!employee) return;

        // Mettre en surbrillance les créneaux de cet employé dans le planning
        this.highlightEmployeeShifts(employeeId);

        // Optionnel : filtrer le planning pour ne montrer que cet employé
        if (window.PlanningManager && typeof window.PlanningManager.filterByEmployee === 'function') {
            window.PlanningManager.filterByEmployee(employeeId);
        }

        // Notification
        if (window.NotificationManager) {
            window.NotificationManager.info(
                'Planning filtré',
                `Affichage du planning de ${employee.prenom} ${employee.nom}`
            );
        }
    }

    /**
     * Met en surbrillance les créneaux d'un employé
     */
    highlightEmployeeShifts(employeeId) {
        // Supprimer les anciens highlights
        document.querySelectorAll('.shift-block.highlighted').forEach(block => {
            block.classList.remove('highlighted');
        });

        // Ajouter les nouveaux highlights
        const employeeShifts = document.querySelectorAll(`[data-employee-id="${employeeId}"]`);
        employeeShifts.forEach(shift => {
            shift.classList.add('highlighted');
        });

        // Supprimer le highlight après 5 secondes
        setTimeout(() => {
            employeeShifts.forEach(shift => {
                shift.classList.remove('highlighted');
            });
        }, 5000);
    }

    // ==================== UTILITAIRES ====================

    /**
     * Obtient le nombre total d'heures d'un employé
     */
    getEmployeeTotalHours(employeeId) {
        if (!window.State) return 0;

        const shifts = window.State.getEmployeeShifts(employeeId);
        return shifts.reduce((total, shift) => total + (shift.duration || 0), 0);
    }

    /**
     * Obtient le nombre de créneaux d'un employé
     */
    getEmployeeShiftsCount(employeeId) {
        if (!window.State) return 0;

        return window.State.getEmployeeShifts(employeeId).length;
    }

    /**
     * Obtient les créneaux d'un employé
     */
    getEmployeeShifts(employeeId) {
        if (!window.State) return [];

        return window.State.getEmployeeShifts(employeeId);
    }

    /**
     * Obtient les initiales d'un employé
     */
    getInitials(employee) {
        const prenom = (employee.prenom || '').trim();
        const nom = (employee.nom || '').trim();

        const prenomInitial = prenom ? prenom.charAt(0).toUpperCase() : '';
        const nomInitial = nom ? nom.charAt(0).toUpperCase() : '';

        return prenomInitial + nomInitial || '?';
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
     * Sanitise une chaîne pour l'affichage HTML
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

    // ==================== CONTRÔLES DE LA LÉGENDE ====================

    /**
     * Affiche/masque la légende
     */
    toggle() {
        this.isVisible = !this.isVisible;

        const legendElement = document.getElementById('employeeLegend');
        if (legendElement) {
            legendElement.style.display = this.isVisible ? 'block' : 'none';
        }

        // Mettre à jour l'icône du bouton
        const toggleBtn = document.querySelector('[data-action="toggle-legend"] i');
        if (toggleBtn) {
            toggleBtn.className = this.isVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
        }

        console.log(`🏷️ Légende ${this.isVisible ? 'affichée' : 'masquée'}`);
    }

    /**
     * Masque la légende
     */
    hide() {
        if (this.isVisible) {
            this.toggle();
        }
    }

    /**
     * Affiche la légende
     */
    show() {
        if (!this.isVisible) {
            this.toggle();
        }
    }

    /**
     * Change le mode de tri
     */
    setSortBy(sortBy) {
        this.sortBy = sortBy;

        const sortSelect = document.getElementById('legendSort');
        if (sortSelect) {
            sortSelect.value = sortBy;
        }

        this.refresh();
    }

    /**
     * Change le filtre
     */
    setFilterBy(filterBy) {
        this.filterBy = filterBy;

        const filterSelect = document.getElementById('legendFilter');
        if (filterSelect) {
            filterSelect.value = filterBy;
        }

        this.refresh();
    }

    // ==================== RECHERCHE ET FILTRAGE ====================

    /**
     * Recherche d'employés par nom
     */
    search(query) {
        if (!query.trim()) {
            this.refresh();
            return;
        }

        const searchLower = query.toLowerCase();
        const cards = this.container.querySelectorAll('.employee-card');

        cards.forEach(card => {
            const name = card.querySelector('.employee-name')?.textContent.toLowerCase() || '';
            const role = card.querySelector('.employee-role')?.textContent.toLowerCase() || '';

            const matches = name.includes(searchLower) || role.includes(searchLower);
            card.style.display = matches ? 'flex' : 'none';
        });
    }

    /**
     * Filtre par type de poste
     */
    filterByType(type) {
        const cards = this.container.querySelectorAll('.employee-card');

        cards.forEach(card => {
            const employeeType = card.dataset.employeeType;
            const matches = !type || employeeType === type;
            card.style.display = matches ? 'flex' : 'none';
        });
    }

    /**
     * Réinitialise tous les filtres
     */
    clearFilters() {
        this.setFilterBy('all');
        this.setSortBy('name');

        // Afficher toutes les cartes
        const cards = this.container.querySelectorAll('.employee-card');
        cards.forEach(card => {
            card.style.display = 'flex';
        });
    }

    // ==================== ÉTAT ET DEBUG ====================

    /**
     * Obtient l'état actuel de la légende
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.isVisible,
            sortBy: this.sortBy,
            filterBy: this.filterBy,
            hasContainer: !!this.container,
            employeeCount: this.container?.querySelectorAll('.employee-card').length || 0
        };
    }

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('🏷️ LegendManager Debug');
        console.table(this.getState());

        if (window.State) {
            const employees = Array.from(window.State.state.employees.values());
            console.log('Employés disponibles:', employees.length);
            console.log('Employés filtrés:', this.getFilteredEmployees().length);
        }

        console.groupEnd();
    }

    /**
     * Exporte les statistiques des employés
     */
    exportStats() {
        const employees = this.getFilteredEmployees();

        return employees.map(employee => ({
            id: employee.id,
            nom: employee.nom,
            prenom: employee.prenom,
            poste: employee.poste,
            actif: employee.actif,
            totalHours: this.getEmployeeTotalHours(employee.id),
            shiftsCount: this.getEmployeeShiftsCount(employee.id),
            tauxHoraire: employee.taux_horaire || 0,
            salaireEstime: Math.round((employee.taux_horaire || 0) * this.getEmployeeTotalHours(employee.id) * 100) / 100
        }));
    }

    // ==================== NETTOYAGE ====================

    /**
     * Nettoie les éléments orphelins
     */
    cleanup() {
        if (!this.container) return;

        const cards = this.container.querySelectorAll('.employee-card');

        cards.forEach(card => {
            const employeeId = card.dataset.employeeId;
            if (employeeId && !window.State?.state.employees.has(employeeId)) {
                card.remove();
                console.log(`🧹 Carte employé orpheline supprimée: ${employeeId}`);
            }
        });
    }

    /**
     * Détruit le legend manager
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.container = null;
        this.isInitialized = false;

        console.log('🗑️ Legend Manager détruit');
    }

    // ==================== HOOKS ET ÉVÉNEMENTS ====================

    /**
     * Hook lors du clic sur un employé
     */
    onEmployeeClick(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('legend:employee:clicked', callback);
        }
    }

    /**
     * Hook lors de la mise à jour de la légende
     */
    onLegendUpdated(callback) {
        if (typeof callback === 'function') {
            window.EventBus?.on('legend:updated', callback);
        }
    }
}

// Instance globale unique
if (!window.LegendManager) {
    window.LegendManager = new LegendManager();

    // Exposer pour debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugLegend = () => window.LegendManager.debug();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegendManager;
}