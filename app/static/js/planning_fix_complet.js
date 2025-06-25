/* ===============================================
   CORRECTION COMPLÈTE PLANNING RESTAURANT
   - Drag & Drop fonctionnel
   - Avatars avec noms verticaux
   - Erreurs SyntaxError corrigées
   =============================================== */

// ===== 1. CORRECTION DU GESTIONNAIRE D'AVATARS =====

/**
 * Gestionnaire d'avatars corrigé (sans erreurs de syntaxe)
 */
class FixedAvatarManager {
    constructor() {
        this.avatarCache = new Map();
        this.defaultAvatars = new Map();
        this.employeeColors = {
            'cuisinier': '#74b9ff',
            'serveur': '#00b894',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'commis': '#fd79a8'
        };
        this.init();
    }

    init() {
        console.log('🎨 Initialisation gestionnaire d\'avatars corrigé');
        setTimeout(() => {
            this.generateDefaultAvatars();
            this.enhanceInterface();
        }, 500);
    }

    generateDefaultAvatars() {
        if (!window.AppState?.employees) return;

        Array.from(window.AppState.employees.values()).forEach(employee => {
            const avatarUrl = this.createEmployeeAvatar(employee);
            this.defaultAvatars.set(employee.id, avatarUrl);
        });

        console.log(`✅ ${this.defaultAvatars.size} avatars générés`);
    }

    createEmployeeAvatar(employee) {
        const initials = this.getInitials(employee);
        const color = this.employeeColors[employee.poste] || '#6c757d';
        const bgColor = color.replace('#', '');

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=64&background=${bgColor}&color=fff&font-size=0.5&bold=true`;
    }

    getInitials(employee) {
        if (!employee.prenom || !employee.nom) return 'XX';
        return (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
    }

    getEmployeeAvatar(employee) {
        return this.avatarCache.get(employee.id) || this.defaultAvatars.get(employee.id) || this.createEmployeeAvatar(employee);
    }

    enhanceInterface() {
        // Améliorer les colonnes d'employés
        this.enhanceEmployeeColumns();

        // Mettre à jour les avatars existants
        this.updateExistingAvatars();
    }

    enhanceEmployeeColumns() {
        const columns = document.querySelectorAll('.employee-column[data-employee-id]');
        columns.forEach(column => {
            const employeeId = parseInt(column.dataset.employeeId);
            const employee = window.AppState?.employees?.get(employeeId);

            if (employee) {
                const avatar = column.querySelector('.employee-avatar');
                if (avatar) {
                    avatar.src = this.getEmployeeAvatar(employee);
                    avatar.onerror = () => {
                        avatar.src = this.createEmployeeAvatar(employee);
                    };
                }
            }
        });
    }

    updateExistingAvatars() {
        // Mettre à jour tous les avatars sur la page
        const avatars = document.querySelectorAll('.employee-avatar, .shift-avatar, .shift-avatar-img');
        avatars.forEach(avatar => {
            const employeeId = this.extractEmployeeId(avatar);
            if (employeeId) {
                const employee = window.AppState?.employees?.get(employeeId);
                if (employee) {
                    avatar.src = this.getEmployeeAvatar(employee);
                }
            }
        });
    }

    extractEmployeeId(avatarElement) {
        // Chercher l'ID dans l'élément parent
        let parent = avatarElement.closest('[data-employee-id]');
        return parent ? parseInt(parent.dataset.employeeId) : null;
    }

    generateRandomAvatars() {
        const colors = ['74b9ff', '00b894', 'fdcb6e', 'a29bfe', 'fd79a8', '6c5ce7'];

        if (window.AppState?.employees) {
            Array.from(window.AppState.employees.values()).forEach(employee => {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                const initials = this.getInitials(employee);
                const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=64&background=${randomColor}&color=fff&font-size=0.5&bold=true&t=${Date.now()}`;

                this.avatarCache.set(employee.id, newAvatar);
                this.updateEmployeeAvatars(employee.id);
            });
        }

        this.showNotification('🎨 Nouveaux avatars générés', 'success');
    }

    updateEmployeeAvatars(employeeId) {
        const avatars = document.querySelectorAll(`[data-employee-id="${employeeId}"] .employee-avatar, [data-employee-id="${employeeId}"] .shift-avatar, [data-employee-id="${employeeId}"] .shift-avatar-img`);
        const employee = window.AppState?.employees?.get(employeeId);

        if (employee) {
            const newSrc = this.getEmployeeAvatar(employee);
            avatars.forEach(avatar => {
                avatar.src = newSrc;
            });
        }
    }

    showNotification(message, type) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(message, type);
        } else {
            console.log(message);
        }
    }
}

// ===== 2. RENDERER AVEC AVATARS ET NOMS VERTICAUX =====

/**
 * Renderer corrigé pour créneaux avec avatars verticaux
 */
class FixedPlanningRenderer {
    static generatePlanningGrid() {
        console.log('🎨 Génération grille avec avatars verticaux...');

        const grid = document.getElementById('planningGrid');
        if (!grid) return;

        // Nettoyer la grille
        grid.innerHTML = '';

        // Générer les créneaux horaires
        const hours = window.FLASK_CONFIG?.HOURS_RANGE || Array.from({length: 16}, (_, i) => i + 8);
        const days = window.FLASK_CONFIG?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        // Créer les cellules
        hours.forEach(hour => {
            days.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                cell.dataset.day = day.toLowerCase();
                cell.dataset.hour = hour;
                cell.style.gridColumn = `${dayIndex + 2}`;
                cell.style.gridRow = `${hour - 7}`;

                // Événements de base
                this.setupCellEvents(cell, day.toLowerCase(), hour);

                grid.appendChild(cell);
            });
        });

        // Rendre les créneaux après un délai
        setTimeout(() => {
            this.renderShiftsWithVerticalLayout();
        }, 100);
    }

    static setupCellEvents(cell, day, hour) {
        // Double-clic pour ajouter un créneau
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (typeof showAddShiftModal === 'function') {
                showAddShiftModal(day, hour);
            }
        });

        // Hover
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('drag-over')) {
                cell.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
            }
        });

        cell.addEventListener('mouseleave', () => {
            if (!cell.classList.contains('drag-over')) {
                cell.style.backgroundColor = '';
            }
        });

        // Drop zone
        this.setupDropZone(cell);
    }

    static setupDropZone(cell) {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
            cell.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
            cell.style.backgroundColor = '';
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            cell.style.backgroundColor = '';

            const shiftId = e.dataTransfer.getData('text/plain');
            if (shiftId) {
                this.handleDrop(shiftId, cell);
            }
        });
    }

    static handleDrop(shiftId, targetCell) {
        console.log('📍 Drop créneau:', shiftId, 'vers', targetCell.dataset);

        const shift = window.AppState?.shifts?.get(shiftId);
        if (!shift) {
            console.error('❌ Créneau introuvable:', shiftId);
            return;
        }

        // Mettre à jour le créneau
        const newDay = targetCell.dataset.day;
        const newHour = parseInt(targetCell.dataset.hour);

        // Sauvegarder via API
        this.saveShiftMove(shiftId, newDay, newHour);
    }

    static async saveShiftMove(shiftId, newDay, newHour) {
        try {
            const response = await fetch(`/api/shifts/${shiftId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day: newDay,
                    start_hour: newHour
                })
            });

            const result = await response.json();
            if (result.success) {
                // Mettre à jour AppState
                const shift = window.AppState.shifts.get(shiftId);
                if (shift) {
                    shift.day = newDay;
                    shift.start_hour = newHour;
                }

                // Regénérer l'affichage
                this.renderShiftsWithVerticalLayout();

                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show('✅ Créneau déplacé', 'success');
                }
            } else {
                console.error('❌ Erreur sauvegarde:', result.error);
                this.renderShiftsWithVerticalLayout(); // Restaurer l'affichage
            }
        } catch (error) {
            console.error('❌ Erreur réseau:', error);
            this.renderShiftsWithVerticalLayout(); // Restaurer l'affichage
        }
    }

    static renderShiftsWithVerticalLayout() {
        console.log('🎨 Rendu créneaux avec layout vertical...');

        // Supprimer les anciens créneaux
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        if (!window.AppState?.shifts || window.AppState.shifts.size === 0) {
            console.log('Aucun créneau à rendre');
            return;
        }

        // Rendre chaque créneau
        Array.from(window.AppState.shifts.values()).forEach(shift => {
            this.renderSingleShiftVertical(shift);
        });

        console.log(`✅ ${window.AppState.shifts.size} créneaux rendus avec layout vertical`);
    }

    static renderSingleShiftVertical(shift) {
        const employee = window.AppState?.employees?.get(shift.employee_id);
        if (!employee) return;

        // Trouver la cellule de départ
        const startCell = document.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);
        if (!startCell) return;

        // Créer le créneau
        const block = document.createElement('div');
        block.className = `shift-block shift-vertical ${employee.poste}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = employee.id;
        block.draggable = true;

        // Calculer la hauteur (50px par heure)
        const height = (shift.duration || 1) * 50;

        // Styles de base
        block.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            height: ${height - 4}px;
            background: ${this.getEmployeeGradient(employee.poste)};
            border-radius: 8px;
            color: white;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: grab;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10;
        `;

        // Contenu vertical
        block.innerHTML = this.createVerticalShiftContent(employee, shift);

        // Événements
        this.setupShiftEvents(block, shift);

        // Ajouter à la cellule
        startCell.appendChild(block);
    }

    static createVerticalShiftContent(employee, shift) {
        const avatarUrl = window.fixedAvatarManager ?
            window.fixedAvatarManager.getEmployeeAvatar(employee) :
            `https://ui-avatars.com/api/?name=${employee.prenom.charAt(0)}${employee.nom.charAt(0)}&size=32&background=${this.getEmployeeColor(employee.poste)}&color=fff`;

        return `
            <div class="shift-avatar-section">
                <img class="shift-avatar-horizontal" src="${avatarUrl}" alt="${employee.nom_complet || `${employee.prenom} ${employee.nom}`}">
            </div>
            <div class="shift-text-section">
                <div class="shift-name-vertical">${employee.prenom}</div>
                <div class="shift-duration-horizontal">${shift.duration || 1}h</div>
            </div>
        `;
    }

    static setupShiftEvents(block, shift) {
        // Drag
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', shift.id);
            block.classList.add('dragging');
            block.style.opacity = '0.7';
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
            block.style.opacity = '1';
        });

        // Double-clic pour modifier
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (typeof showEditShiftModal === 'function') {
                showEditShiftModal(shift.id);
            }
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
    }

    static getEmployeeColor(poste) {
        const colors = {
            'cuisinier': '74b9ff',
            'serveur': '00b894',
            'barman': 'fdcb6e',
            'manager': 'a29bfe',
            'commis': 'fd79a8'
        };
        return colors[poste] || '6c757d';
    }

    static getEmployeeGradient(poste) {
        const gradients = {
            'cuisinier': 'linear-gradient(135deg, #74b9ff, #0984e3)',
            'serveur': 'linear-gradient(135deg, #00b894, #00a085)',
            'barman': 'linear-gradient(135deg, #fdcb6e, #e17055)',
            'manager': 'linear-gradient(135deg, #a29bfe, #6c5ce7)',
            'commis': 'linear-gradient(135deg, #fd79a8, #e84393)'
        };
        return gradients[poste] || 'linear-gradient(135deg, #6c757d, #495057)';
    }
}

// ===== 3. CSS POUR LAYOUT VERTICAL (injection directe) =====

function injectVerticalStyles() {
    const styleId = 'vertical-shift-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Styles pour créneaux verticaux */
        .shift-block.shift-vertical {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .shift-avatar-section {
            width: 100%;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.15);
            border-bottom: 1px solid rgba(255,255,255,0.2);
            flex-shrink: 0;
            padding: 2px;
        }

        .shift-avatar-horizontal {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.6);
            object-fit: cover;
            background: rgba(255,255,255,0.2);
            transition: all 0.2s ease;
        }

        .shift-avatar-horizontal:hover {
            transform: scale(1.1);
            border-color: rgba(255,255,255,0.9);
        }

        .shift-text-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 4px 2px;
            min-height: 0;
        }

        .shift-name-vertical {
            font-weight: 700;
            font-size: 0.8rem;
            letter-spacing: 1px;
            line-height: 1;
            white-space: nowrap;
            writing-mode: vertical-lr;
            text-orientation: mixed;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            flex: 1;
            display: flex;
            align-items: center;
        }

        .shift-duration-horizontal {
            font-weight: 600;
            font-size: 0.7rem;
            opacity: 0.9;
            background: rgba(255,255,255,0.2);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.2);
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }

        .shift-block.dragging {
            transform: rotate(5deg) scale(0.95) !important;
            z-index: 1000 !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
        }

        .schedule-cell.drag-over {
            background-color: rgba(0, 123, 255, 0.15) !important;
            border: 2px dashed #007bff !important;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .shift-avatar-section {
                height: 24px;
            }
            .shift-avatar-horizontal {
                width: 18px;
                height: 18px;
            }
            .shift-name-vertical {
                font-size: 0.7rem;
                letter-spacing: 0.8px;
            }
            .shift-duration-horizontal {
                font-size: 0.6rem;
                padding: 1px 4px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== 4. INITIALISATION GLOBALE =====

function initializeFixedPlanning() {
    console.log('🔧 Initialisation planning corrigé...');

    // Injecter les styles
    injectVerticalStyles();

    // Initialiser le gestionnaire d'avatars
    window.fixedAvatarManager = new FixedAvatarManager();

    // Remplacer le renderer
    window.PlanningRenderer = FixedPlanningRenderer;

    // Fonctions globales
    window.generateRandomAvatars = function() {
        if (window.fixedAvatarManager) {
            window.fixedAvatarManager.generateRandomAvatars();
        }
    };

    // Test de régénération
    setTimeout(() => {
        if (window.AppState?.employees?.size > 0) {
            FixedPlanningRenderer.generatePlanningGrid();
            console.log('✅ Planning régénéré avec corrections');
        }
    }, 1000);
}

// ===== 5. LANCEMENT AUTOMATIQUE =====

// Lancer dès que possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFixedPlanning);
} else {
    setTimeout(initializeFixedPlanning, 500);
}

console.log('🔧 Corrections chargées - Drag & Drop + Avatars verticaux');