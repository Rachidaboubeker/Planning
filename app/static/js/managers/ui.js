/**
 * UI MANAGER - VERSION CORRIGÉE SANS ERREURS SYNTAX
 * Gestion centralisée de l'interface utilisateur
 */

class UIManagerCore {
    constructor() {
        this.initialized = false;
        this.employees = new Map();
        this.shifts = new Map();
    }

    /**
     * Initialise le gestionnaire UI
     */
    init() {
        if (this.initialized) return;

        console.log('🔧 Initialisation UIManager Core...');

        this.setupEventListeners();
        this.fixExistingButtons();
        this.initialized = true;

        console.log('✅ UIManager Core initialisé');
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Délégation d'événements pour les boutons dynamiques
        document.addEventListener('click', (e) => {
            // Boutons d'ajout d'employé
            if (e.target.matches('[data-action="add-employee"]') ||
                e.target.closest('[data-action="add-employee"]')) {
                e.preventDefault();
                this.showAddEmployeeModal();
                return;
            }

            // Boutons d'édition d'employé
            if (e.target.matches('[data-action="edit-employee"]') ||
                e.target.closest('[data-action="edit-employee"]')) {
                e.preventDefault();
                const employeeId = e.target.dataset.employeeId ||
                                 e.target.closest('[data-employee-id]')?.dataset.employeeId;
                if (employeeId) {
                    this.showEditEmployeeModal(employeeId);
                }
                return;
            }

            // Boutons d'ajout de créneau
            if (e.target.matches('[data-action="add-shift"]') ||
                e.target.closest('[data-action="add-shift"]')) {
                e.preventDefault();
                this.showAddShiftModal();
                return;
            }
        });
    }

    /**
     * Corrige les boutons existants dans le DOM
     */
    fixExistingButtons() {
        // Boutons "Nouvel employé"
        const employeeButtons = document.querySelectorAll('button[onclick*="showAddEmployeeModal"], .btn[onclick*="addEmployee"]');
        employeeButtons.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.setAttribute('data-action', 'add-employee');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAddEmployeeModal();
            });
        });

        // Boutons "Nouveau créneau"
        const shiftButtons = document.querySelectorAll('button[onclick*="showAddShiftModal"], .btn[onclick*="addShift"]');
        shiftButtons.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.setAttribute('data-action', 'add-shift');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAddShiftModal();
            });
        });

        console.log(`✅ ${employeeButtons.length + shiftButtons.length} boutons corrigés`);
    }

    /**
     * Affiche le modal d'ajout d'employé
     */
    showAddEmployeeModal() {
        console.log('🔄 Ouverture modal ajout employé');

        if (typeof modalManager !== 'undefined') {
            modalManager.showAddEmployeeModal();
        } else {
            console.error('❌ modalManager non disponible');
            this.fallbackAddEmployee();
        }
    }

    /**
     * Affiche le modal d'édition d'employé
     */
    showEditEmployeeModal(employeeId) {
        console.log('🔄 Ouverture modal édition employé:', employeeId);

        if (typeof modalManager !== 'undefined') {
            modalManager.showEditEmployeeModal(employeeId);
        } else {
            console.error('❌ modalManager non disponible');
            this.fallbackEditEmployee(employeeId);
        }
    }

    /**
     * Affiche le modal d'ajout de créneau
     */
    showAddShiftModal(day = '', hour = '') {
        console.log('🔄 Ouverture modal ajout créneau');

        if (typeof modalManager !== 'undefined') {
            modalManager.showAddShiftModal(day, hour);
        } else {
            console.error('❌ modalManager non disponible');
            this.fallbackAddShift();
        }
    }

    /**
     * Fallback pour l'ajout d'employé
     */
    fallbackAddEmployee() {
        const modal = document.getElementById('globalModal');
        if (!modal) {
            alert('Modal non disponible');
            return;
        }

        const title = modal.querySelector('.modal-title');
        const body = modal.querySelector('.modal-body');

        if (title) title.textContent = 'Ajouter un équipier';

        if (body) {
            body.innerHTML = `
                <form id="quickAddEmployeeForm">
                    <div class="form-group">
                        <label>Prénom *</label>
                        <input type="text" name="prenom" required>
                    </div>
                    <div class="form-group">
                        <label>Nom *</label>
                        <input type="text" name="nom" required>
                    </div>
                    <div class="form-group">
                        <label>Poste *</label>
                        <select name="poste" required>
                            <option value="">Sélectionner</option>
                            <option value="Serveur">Serveur</option>
                            <option value="Cuisinier">Cuisinier</option>
                            <option value="Barman">Barman</option>
                            <option value="Manager">Manager</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Taux horaire (€) *</label>
                        <input type="number" name="taux_horaire" min="10" max="50" step="0.5" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.modal').style.display='none'">Annuler</button>
                        <button type="submit">Ajouter</button>
                    </div>
                </form>
            `;

            // Attacher l'événement
            const form = document.getElementById('quickAddEmployeeForm');
            form.addEventListener('submit', this.handleQuickAddEmployee.bind(this));
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fallback pour l'édition d'employé
     */
    fallbackEditEmployee(employeeId) {
        alert(`Édition employé ${employeeId} - Modal non disponible`);
    }

    /**
     * Fallback pour l'ajout de créneau
     */
    fallbackAddShift() {
        alert('Ajout créneau - Modal non disponible');
    }

    /**
     * Gère l'ajout rapide d'employé
     */
    async handleQuickAddEmployee(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal();
                this.showSuccess('Employé ajouté avec succès');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                this.showError(result.error || 'Erreur lors de l\'ajout');
            }

        } catch (error) {
            console.error('❌ Erreur ajout employé:', error);
            this.showError('Erreur de connexion');
        }
    }

    /**
     * Ferme le modal actuel
     */
    closeModal() {
        const modal = document.getElementById('globalModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Affiche une notification de succès
     */
    showSuccess(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`✅ ${message}`, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * Affiche une notification d'erreur
     */
    showError(message) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`❌ ${message}`, 'error');
        } else {
            alert('Erreur: ' + message);
        }
    }

    /**
     * Met à jour l'affichage des employés
     */
    refreshEmployeeDisplay() {
        // Rechercher les conteneurs d'employés
        const employeeContainers = document.querySelectorAll('.employee-list, .employee-grid, [data-employee-container]');

        employeeContainers.forEach(container => {
            if (container.dataset.autoRefresh !== 'false') {
                this.loadEmployeesIntoContainer(container);
            }
        });
    }

    /**
     * Charge les employés dans un conteneur
     */
    async loadEmployeesIntoContainer(container) {
        try {
            const response = await fetch('/api/employees');
            const result = await response.json();

            if (result.success) {
                container.innerHTML = this.renderEmployeeList(result.employees);
            }

        } catch (error) {
            console.error('❌ Erreur chargement employés:', error);
            container.innerHTML = '<p class="error">Erreur de chargement</p>';
        }
    }

    /**
     * Rendu de la liste des employés
     */
    renderEmployeeList(employees) {
        if (!employees || employees.length === 0) {
            return '<p class="no-data">Aucun employé</p>';
        }

        return employees.map(emp => `
            <div class="employee-card" data-employee-id="${emp.id}">
                <div class="employee-avatar">
                    <img src="https://ui-avatars.com/api/?name=${emp.prenom}+${emp.nom}&size=40" alt="${emp.prenom} ${emp.nom}">
                </div>
                <div class="employee-info">
                    <div class="employee-name">${emp.prenom} ${emp.nom}</div>
                    <div class="employee-poste">${emp.poste}</div>
                </div>
                <div class="employee-actions">
                    <button data-action="edit-employee" data-employee-id="${emp.id}" class="btn-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Diagnostic et réparation
     */
    diagnose() {
        console.log('🔍 === DIAGNOSTIC UI MANAGER ===');

        const checks = {
            'modalManager disponible': typeof modalManager !== 'undefined',
            'NotificationManager disponible': typeof NotificationManager !== 'undefined',
            'Modal global présent': !!document.getElementById('globalModal'),
            'Boutons employé': document.querySelectorAll('[data-action="add-employee"]').length,
            'Boutons créneau': document.querySelectorAll('[data-action="add-shift"]').length
        };

        Object.entries(checks).forEach(([check, result]) => {
            console.log(`${result ? '✅' : '❌'} ${check}: ${result}`);
        });

        return checks;
    }

    /**
     * Réparation automatique
     */
    repair() {
        console.log('🔧 Réparation automatique...');

        this.fixExistingButtons();
        this.setupEventListeners();

        console.log('✅ Réparation terminée');
    }
}

// ==================== INITIALISATION GLOBALE ====================

// Instance unique
let uiManagerInstance = null;

function getUIManager() {
    if (!uiManagerInstance) {
        uiManagerInstance = new UIManagerCore();
    }
    return uiManagerInstance;
}

// Export global
window.UIManager = getUIManager();

// Fonctions de compatibilité globales
window.showAddEmployeeModal = function() {
    window.UIManager.showAddEmployeeModal();
};

window.showEditEmployeeModal = function(employeeId) {
    window.UIManager.showEditEmployeeModal(employeeId);
};

window.showAddShiftModal = function(day = '', hour = '') {
    window.UIManager.showAddShiftModal(day, hour);
};

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation UIManager...');
    window.UIManager.init();
});

// Initialisation différée pour les contenus dynamiques
setTimeout(() => {
    if (window.UIManager && !window.UIManager.initialized) {
        console.log('🔄 Initialisation différée UIManager...');
        window.UIManager.init();
    }
}, 1000);

// Diagnostic global
window.uiDiagnose = function() {
    return window.UIManager.diagnose();
};

window.uiRepair = function() {
    return window.UIManager.repair();
};

console.log('✅ UI Manager Core chargé sans erreurs');