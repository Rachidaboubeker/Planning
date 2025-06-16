/**
 * Planning Restaurant - Fonctions Globales
 * Fonctions window CRUD et interactions extraites de planning.js
 */

// ==================== FONCTIONS CRUD SHIFTS ====================

/**
 * Ajoute un nouveau créneau
 */
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
        notes: document.getElementById('shiftNotes').value.trim() || null
    };

    try {
        const response = await APIManager.post('/shifts', shiftData);

        if (response.success) {
            // Ajouter à l'état local
            const newShift = response.shift;
            AppState.shifts.set(newShift.id, newShift);

            // Réorganiser les données
            initializeDataStructures();

            // Mettre à jour l'affichage
            PlanningManager.renderShifts();
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            const employee = AppState.employees.get(newShift.employee_id);
            NotificationManager.show(
                `✅ Créneau ajouté pour ${employee?.nom_complet || 'Équipier'} - ${newShift.day} ${PlanningUtils.formatHour(newShift.start_hour)}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.SHIFT_ADDED, newShift);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de l\'ajout'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de l\'ajout du créneau:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

/**
 * Modifie un créneau existant
 */
window.editShift = async function() {
    const form = document.getElementById('editShiftForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const shiftId = document.getElementById('editShiftId').value;
    const shiftData = {
        employee_id: document.getElementById('editShiftEmployee').value,
        day: document.getElementById('editShiftDay').value,
        start_hour: parseInt(document.getElementById('editShiftStartHour').value),
        duration: parseInt(document.getElementById('editShiftDuration').value),
        notes: document.getElementById('editShiftNotes').value.trim() || null
    };

    try {
        const response = await APIManager.put(`/shifts/${shiftId}`, shiftData);

        if (response.success) {
            // Mettre à jour l'état local
            const updatedShift = response.shift;
            AppState.shifts.set(shiftId, updatedShift);

            // Réorganiser les données
            initializeDataStructures();

            // Mettre à jour l'affichage
            PlanningManager.renderShifts();
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            const employee = AppState.employees.get(updatedShift.employee_id);
            NotificationManager.show(
                `✅ Créneau modifié pour ${employee?.nom_complet || 'Équipier'}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.SHIFT_UPDATED, updatedShift);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de la modification'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de la modification du créneau:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

/**
 * Supprime un créneau
 */
window.deleteShift = async function(shiftId) {
    try {
        const shift = AppState.shifts.get(shiftId);
        const employee = shift ? AppState.employees.get(shift.employee_id) : null;

        const response = await APIManager.delete(`/shifts/${shiftId}`);

        if (response.success) {
            // Supprimer de l'état local
            AppState.shifts.delete(shiftId);

            // Réorganiser les données
            initializeDataStructures();

            // Mettre à jour l'affichage
            PlanningManager.renderShifts();
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            NotificationManager.show(
                `✅ Créneau supprimé${employee ? ` - ${employee.nom_complet}` : ''}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.SHIFT_DELETED, { id: shiftId, shift, employee });

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de la suppression'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de la suppression du créneau:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

/**
 * Duplique un créneau
 */
window.duplicateShift = async function(shiftId) {
    const shift = AppState.shifts.get(shiftId);
    if (!shift) {
        NotificationManager.show('❌ Créneau introuvable', 'error');
        return;
    }

    const newShiftData = {
        employee_id: shift.employee_id,
        day: shift.day,
        start_hour: shift.start_hour,
        duration: shift.duration,
        notes: shift.notes ? `${shift.notes} (copie)` : 'Copie'
    };

    try {
        const response = await APIManager.post('/shifts', newShiftData);

        if (response.success) {
            // Ajouter à l'état local
            const newShift = response.shift;
            AppState.shifts.set(newShift.id, newShift);

            // Réorganiser les données
            initializeDataStructures();

            // Mettre à jour l'affichage
            PlanningManager.renderShifts();
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Notification
            const employee = AppState.employees.get(newShift.employee_id);
            NotificationManager.show(
                `✅ Créneau dupliqué pour ${employee?.nom_complet || 'Équipier'}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.SHIFT_ADDED, newShift);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de la duplication'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de la duplication du créneau:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

// ==================== FONCTIONS CRUD EMPLOYEES ====================

/**
 * Ajoute un nouvel employé
 */
window.addEmployee = async function() {
    const form = document.getElementById('addEmployeeForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const employeeData = {
        prenom: document.getElementById('employeePrenom').value.trim(),
        nom: document.getElementById('employeeNom').value.trim(),
        poste: document.getElementById('employeePoste').value,
        taux_horaire: parseFloat(document.getElementById('employeeTauxHoraire').value) || null,
        heures_contrat: parseInt(document.getElementById('employeeHeuresContrat').value) || null,
        email: document.getElementById('employeeEmail').value.trim() || null,
        telephone: document.getElementById('employeeTelephone').value.trim() || null,
        actif: true
    };

    try {
        const response = await APIManager.post('/employees', employeeData);

        if (response.success) {
            // Ajouter à l'état local
            const newEmployee = response.employee;
            AppState.employees.set(newEmployee.id, newEmployee);

            // Mettre à jour l'affichage
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            NotificationManager.show(
                `✅ Équipier ajouté : ${newEmployee.nom_complet}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.EMPLOYEE_ADDED, newEmployee);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de l\'ajout'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de l\'ajout de l\'employé:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

/**
 * Modifie un employé existant
 */
window.editEmployee = async function() {
    const form = document.getElementById('editEmployeeForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const employeeId = document.getElementById('editEmployeeId').value;
    const employeeData = {
        prenom: document.getElementById('editEmployeePrenom').value.trim(),
        nom: document.getElementById('editEmployeeNom').value.trim(),
        poste: document.getElementById('editEmployeePoste').value,
        taux_horaire: parseFloat(document.getElementById('editEmployeeTauxHoraire').value) || null,
        heures_contrat: parseInt(document.getElementById('editEmployeeHeuresContrat').value) || null,
        email: document.getElementById('editEmployeeEmail').value.trim() || null,
        telephone: document.getElementById('editEmployeeTelephone').value.trim() || null,
        actif: document.getElementById('editEmployeeActif').checked
    };

    try {
        const response = await APIManager.put(`/employees/${employeeId}`, employeeData);

        if (response.success) {
            // Mettre à jour l'état local
            const updatedEmployee = response.employee;
            AppState.employees.set(employeeId, updatedEmployee);

            // Mettre à jour l'affichage
            PlanningManager.renderShifts(); // Pour mettre à jour les noms
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            NotificationManager.show(
                `✅ Équipier modifié : ${updatedEmployee.nom_complet}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.EMPLOYEE_UPDATED, updatedEmployee);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de la modification'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de la modification de l\'employé:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

/**
 * Supprime (désactive) un employé
 */
window.deleteEmployee = async function(employeeId) {
    try {
        const employee = AppState.employees.get(employeeId);

        const response = await APIManager.delete(`/employees/${employeeId}`);

        if (response.success) {
            // Marquer comme inactif dans l'état local
            if (employee) {
                employee.actif = false;
                AppState.employees.set(employeeId, employee);
            }

            // Mettre à jour l'affichage
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();

            // Fermer le modal
            PlanningUI.closeModal('globalModal');

            // Notification
            NotificationManager.show(
                `✅ Équipier supprimé${employee ? ` : ${employee.nom_complet}` : ''}`,
                'success'
            );

            // Émettre l'événement
            EventBus.emit(PlanningEvents.EMPLOYEE_UPDATED, employee);

        } else {
            NotificationManager.show(`❌ ${response.error || 'Erreur lors de la suppression'}`, 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors de la suppression de l\'employé:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

// ==================== FONCTIONS NAVIGATION ====================

/**
 * Navigation entre les semaines
 */
window.navigateWeek = function(direction) {
    AppState.currentWeekOffset += direction;
    updateWeekDisplay();

    // Émettre l'événement
    EventBus.emit(PlanningEvents.WEEK_CHANGED, {
        offset: AppState.currentWeekOffset,
        direction
    });

    Logger.info(`Navigation semaine: ${direction > 0 ? 'suivante' : 'précédente'} (offset: ${AppState.currentWeekOffset})`);
};

/**
 * Retourne à la semaine actuelle
 */
window.goToToday = function() {
    AppState.currentWeekOffset = 0;
    updateWeekDisplay();

    // Émettre l'événement
    EventBus.emit(PlanningEvents.WEEK_CHANGED, {
        offset: 0,
        direction: 0,
        reset: true
    });

    Logger.info('Retour à la semaine actuelle');
};

/**
 * Met à jour l'affichage de la semaine
 */
function updateWeekDisplay() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + (AppState.currentWeekOffset * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options = { day: 'numeric', month: 'long' };
    const mondayStr = monday.toLocaleDateString('fr-FR', options);
    const sundayStr = sunday.toLocaleDateString('fr-FR', options);

    const weekTitle = document.getElementById('weekTitle');
    if (weekTitle) {
        weekTitle.textContent = `Semaine du ${mondayStr} au ${sundayStr}`;
    }
}

// ==================== FONCTIONS STATISTIQUES ====================

/**
 * Affiche les statistiques détaillées
 */
window.showStats = async function() {
    try {
        const response = await APIManager.get('/stats/weekly');

        if (response.success) {
            const stats = response.stats;

            const content = `
                <div class="stats-overview">
                    <div class="stats-cards">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-clock"></i></div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.total_hours}h</div>
                                <div class="stat-label">Heures totales</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-users"></i></div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.active_employees}</div>
                                <div class="stat-label">Équipiers actifs</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-euro-sign"></i></div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.estimated_cost?.toFixed(2) || '0.00'}€</div>
                                <div class="stat-label">Coût estimé</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.shifts_count || 0}</div>
                                <div class="stat-label">Créneaux programmés</div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-details">
                        <h4><i class="fas fa-chart-bar"></i> Répartition par équipier</h4>
                        <div class="stats-employees">
                            ${stats.employees?.map(emp => `
                                <div class="stat-employee">
                                    <div class="stat-employee-info">
                                        <strong>${emp.name}</strong>
                                        <span class="employee-type">${emp.type}</span>
                                    </div>
                                    <div class="stat-employee-hours">
                                        <span>${emp.hours}h</span>
                                        <span class="stat-employee-cost">€${emp.cost?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            `).join('') || '<p>Aucune donnée disponible</p>'}
                        </div>
                    </div>
                </div>
            `;

            const buttons = [
                {
                    text: 'Fermer',
                    class: 'btn-secondary',
                    onclick: () => PlanningUI.closeModal('globalModal')
                }
            ];

            if (typeof openModal === 'function') {
                openModal('📊 Statistiques de la semaine', content, buttons);
            }
        } else {
            NotificationManager.show('❌ Erreur lors du chargement des statistiques', 'error');
        }
    } catch (error) {
        Logger.error('Erreur lors du chargement des statistiques:', error);
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

// ==================== FONCTIONS PHOTOS ====================

/**
 * Affiche le gestionnaire de photos en masse
 */
window.showBulkPhotoManager = function() {
    const employees = Array.from(AppState.employees.values())
        .filter(emp => emp.actif !== false)
        .sort((a, b) => a.nom_complet.localeCompare(b.nom_complet));

    if (employees.length === 0) {
        NotificationManager.show('❌ Aucun équipier actif', 'error');
        return;
    }

    const content = `
        <div class="bulk-photo-manager">
            <div class="bulk-actions">
                <button type="button" class="btn btn-outline" onclick="selectAllPhotos()">
                    <i class="fas fa-check-square"></i> Tout sélectionner
                </button>
                <button type="button" class="btn btn-outline" onclick="unselectAllPhotos()">
                    <i class="fas fa-square"></i> Tout désélectionner
                </button>
                <button type="button" class="btn btn-primary" onclick="exportSelectedPhotos()">
                    <i class="fas fa-download"></i> Exporter sélection
                </button>
                <input type="file" id="bulkPhotoImport" accept=".json" style="display: none;" onchange="importBulkPhotos(this)">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('bulkPhotoImport').click()">
                    <i class="fas fa-upload"></i> Importer
                </button>
            </div>

            <div class="employees-photo-grid">
                ${employees.map(employee => {
                    const hasPhoto = window.avatarManager?.photoCache.has(employee.id) || false;
                    const avatarSrc = window.avatarManager?.getEmployeeAvatar(employee) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&background=74b9ff&color=fff`;

                    return `
                        <div class="employee-photo-item">
                            <div class="employee-photo-actions">
                                <input type="checkbox" class="photo-select" data-employee-id="${employee.id}">
                            </div>
                            <div class="employee-photo-card" onclick="window.avatarManager?.showPhotoModal(AppState.employees.get('${employee.id}'))">
                                <img src="${avatarSrc}"
                                     alt="${employee.nom_complet}"
                                     class="employee-photo-img"
                                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nom_complet)}&background=74b9ff&color=fff'">
                                <div class="employee-photo-name">${employee.nom_complet}</div>
                                <div class="employee-photo-role">${employee.poste}</div>
                                <div class="employee-photo-status">
                                    ${hasPhoto ?
                                        '<i class="fas fa-camera text-success"></i> Photo ajoutée' :
                                        '<i class="fas fa-user text-muted"></i> Avatar généré'
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const buttons = [
        {
            text: 'Fermer',
            class: 'btn-secondary',
            onclick: () => PlanningUI.closeModal('globalModal')
        }
    ];

    if (typeof openModal === 'function') {
        openModal('📸 Gestionnaire de photos', content, buttons);
    }
};

/**
 * Sélectionne toutes les photos
 */
window.selectAllPhotos = function() {
    const checkboxes = document.querySelectorAll('.photo-select');
    checkboxes.forEach(cb => cb.checked = true);
};

/**
 * Désélectionne toutes les photos
 */
window.unselectAllPhotos = function() {
    const checkboxes = document.querySelectorAll('.photo-select');
    checkboxes.forEach(cb => cb.checked = false);
};

/**
 * Exporte les photos sélectionnées
 */
window.exportSelectedPhotos = function() {
    const checkboxes = document.querySelectorAll('.photo-select:checked');

    if (checkboxes.length === 0) {
        NotificationManager.show('❌ Aucune photo sélectionnée', 'warning');
        return;
    }

    if (window.avatarManager) {
        window.avatarManager.exportPhotos();
        NotificationManager.show(`✅ ${checkboxes.length} photos exportées`, 'success');
    } else {
        NotificationManager.show('❌ Gestionnaire d\'avatars non disponible', 'error');
    }
};

/**
 * Importe des photos en masse
 */
window.importBulkPhotos = function(input) {
    const file = input.files[0];
    if (!file) return;

    if (window.avatarManager) {
        window.avatarManager.importPhotos(file);
    } else {
        NotificationManager.show('❌ Gestionnaire d\'avatars non disponible', 'error');
    }

    // Reset l'input
    input.value = '';
};

// ==================== GESTIONNAIRES D'ÉVÉNEMENTS GLOBAUX ====================

/**
 * Initialisation au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    Logger.info('🚀 Initialisation de l\'application Planning Restaurant');

    // Initialiser la semaine actuelle
    updateWeekDisplay();

    // Configurer les gestionnaires d'erreur globaux
    setupGlobalErrorHandlers();

    Logger.info('✅ Application initialisée avec succès');
});

/**
 * Gestionnaires d'erreurs globales
 */
function setupGlobalErrorHandlers() {
    // Erreurs JavaScript
    window.addEventListener('error', function(e) {
        Logger.error('❌ Erreur JavaScript:', e.error);
        NotificationManager.show('Une erreur inattendue s\'est produite', 'error');
    });

    // Raccourcis clavier
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            PlanningUI.closeAllModals();
        }

        // Ctrl+N pour nouveau créneau
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            PlanningUI.showAddShiftModal();
        }

        // Ctrl+E pour nouvel employé
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            PlanningUI.showAddEmployeeModal();
        }
    });

    // Gestion réseau
    window.addEventListener('online', function() {
        NotificationManager.show('🌐 Connexion rétablie', 'success');
    });

    window.addEventListener('offline', function() {
        NotificationManager.show('⚠️ Connexion perdue - Mode hors ligne', 'warning', 5000);
    });
}

// ==================== UTILITAIRES ====================

/**
 * Valide les données avant envoi API
 */
function validateShiftData(data) {
    const errors = [];

    if (!data.employee_id) errors.push('Équipier requis');
    if (!data.day) errors.push('Jour requis');
    if (data.start_hour === undefined || data.start_hour === null) errors.push('Heure de début requise');
    if (!data.duration || data.duration < 1) errors.push('Durée invalide');

    return errors;
}

/**
 * Valide les données employé
 */
function validateEmployeeData(data) {
    const errors = [];

    if (!data.prenom?.trim()) errors.push('Prénom requis');
    if (!data.nom?.trim()) errors.push('Nom requis');
    if (!data.poste) errors.push('Poste requis');
    if (data.email && !isValidEmail(data.email)) errors.push('Email invalide');

    return errors;
}

/**
 * Valide un email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Export pour les modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateShiftData,
        validateEmployeeData,
        isValidEmail,
        updateWeekDisplay,
        setupGlobalErrorHandlers
    };
}

Logger.info('🔧 Fonctions globales chargées avec succès');