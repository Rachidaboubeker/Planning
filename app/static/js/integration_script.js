/* ===============================================
   SCRIPT D'INTÉGRATION - PLANNING RESTAURANT
   Charge toutes les corrections en une seule fois
   =============================================== */

(function() {
    'use strict';

    console.log('🚀 Démarrage intégration corrections Planning Restaurant...');

    // ===== 1. INJECTION CSS VERTICAUX =====
    function loadVerticalCSS() {
        const cssContent = `
/* CSS CRÉNEAUX VERTICAUX INTÉGRÉ */
.shift-block.shift-vertical {
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    position: absolute !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.shift-avatar-section {
    width: 100%;
    height: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(4px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
    padding: 2px;
    transition: all 0.2s ease;
}

.shift-avatar-horizontal {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    object-fit: cover;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
}

.shift-text-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 2px;
    min-height: 0;
    overflow: hidden;
}

.shift-name-vertical {
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 1.2px;
    line-height: 1;
    white-space: nowrap;
    writing-mode: vertical-lr;
    text-orientation: mixed;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
}

.shift-duration-horizontal {
    font-weight: 600;
    font-size: 0.7rem;
    opacity: 0.95;
    background: rgba(255, 255, 255, 0.2);
    padding: 3px 8px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    white-space: nowrap;
}

.shift-block.cuisinier { background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%) !important; }
.shift-block.serveur { background: linear-gradient(135deg, #00b894 0%, #00a085 100%) !important; }
.shift-block.barman { background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%) !important; }
.shift-block.manager { background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%) !important; }
.shift-block.commis { background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%) !important; }

.shift-block.dragging {
    opacity: 0.8 !important;
    transform: rotate(5deg) scale(0.95) !important;
    z-index: 1000 !important;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4) !important;
    cursor: grabbing !important;
}

.schedule-cell.drag-over {
    background-color: rgba(0, 123, 255, 0.15) !important;
    border: 2px dashed #007bff !important;
    border-radius: 6px !important;
}

@media (max-width: 768px) {
    .shift-avatar-section { height: 24px !important; }
    .shift-avatar-horizontal { width: 18px !important; height: 18px !important; }
    .shift-name-vertical { font-size: 0.7rem !important; }
    .shift-duration-horizontal { font-size: 0.6rem !important; }
}
        `;

        const style = document.createElement('style');
        style.id = 'integrated-vertical-styles';
        style.textContent = cssContent;
        document.head.appendChild(style);

        console.log('✅ CSS verticaux chargés');
    }

    // ===== 2. GESTIONNAIRE D'AVATARS SIMPLE =====
    class SimpleAvatarManager {
        constructor() {
            this.colors = {
                'cuisinier': '74b9ff',
                'serveur': '00b894',
                'barman': 'fdcb6e',
                'manager': 'a29bfe',
                'commis': 'fd79a8'
            };
        }

        getEmployeeAvatar(employee) {
            const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
            const color = this.colors[employee.poste] || '6c757d';
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=64&background=${color}&color=fff&font-size=0.5&bold=true`;
        }

        generateRandomAvatars() {
            const colors = ['74b9ff', '00b894', 'fdcb6e', 'a29bfe', 'fd79a8', '6c5ce7'];

            if (window.AppState?.employees) {
                Array.from(window.AppState.employees.values()).forEach(employee => {
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();

                    // Mettre à jour tous les avatars de cet employé
                    const avatars = document.querySelectorAll(`[data-employee-id="${employee.id}"] img`);
                    avatars.forEach(img => {
                        img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=64&background=${randomColor}&color=fff&font-size=0.5&bold=true&t=${Date.now()}`;
                    });
                });
            }

            this.showNotification('🎨 Nouveaux avatars générés', 'success');
        }

        showNotification(message, type) {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(message, type);
            } else {
                console.log(message);
            }
        }
    }

    // ===== 3. RENDERER PLANNING INTÉGRÉ =====
    class IntegratedPlanningRenderer {
        static generatePlanningGrid() {
            console.log('🎨 Génération grille intégrée...');

            const grid = document.getElementById('planningGrid');
            if (!grid) return;

            // Nettoyer
            grid.innerHTML = '';

            // Configuration
            const hours = window.FLASK_CONFIG?.HOURS_RANGE || Array.from({length: 16}, (_, i) => i + 8);
            const days = window.FLASK_CONFIG?.DAYS_OF_WEEK || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

            // Créer cellules
            hours.forEach(hour => {
                days.forEach((day, dayIndex) => {
                    const cell = document.createElement('div');
                    cell.className = 'schedule-cell';
                    cell.dataset.day = day.toLowerCase();
                    cell.dataset.hour = hour;
                    cell.style.gridColumn = `${dayIndex + 2}`;
                    cell.style.gridRow = `${hour - 7}`;

                    this.setupCellEvents(cell, day.toLowerCase(), hour);
                    grid.appendChild(cell);
                });
            });

            // Rendre créneaux
            setTimeout(() => this.renderShifts(), 100);
        }

        static setupCellEvents(cell, day, hour) {
            // Double-clic
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

            // Drop
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');

                const shiftId = e.dataTransfer.getData('text/plain');
                if (shiftId) {
                    this.handleDrop(shiftId, cell);
                }
            });
        }

        static async handleDrop(shiftId, targetCell) {
            console.log('📍 Drop:', shiftId, 'vers', targetCell.dataset);

            const shift = window.AppState?.shifts?.get(shiftId);
            if (!shift) return;

            const newDay = targetCell.dataset.day;
            const newHour = parseInt(targetCell.dataset.hour);

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
                    shift.day = newDay;
                    shift.start_hour = newHour;

                    // Regénérer
                    this.renderShifts();

                    if (typeof NotificationManager !== 'undefined') {
                        NotificationManager.show('✅ Créneau déplacé', 'success');
                    }
                } else {
                    this.renderShifts(); // Restaurer
                }
            } catch (error) {
                console.error('❌ Erreur:', error);
                this.renderShifts(); // Restaurer
            }
        }

        static renderShifts() {
            console.log('🎨 Rendu créneaux verticaux...');

            // Nettoyer
            document.querySelectorAll('.shift-block').forEach(el => el.remove());

            if (!window.AppState?.shifts) return;

            // Rendre chaque créneau
            Array.from(window.AppState.shifts.values()).forEach(shift => {
                this.renderShift(shift);
            });
        }

        static renderShift(shift) {
            const employee = window.AppState?.employees?.get(shift.employee_id);
            if (!employee) return;

            const cell = document.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);
            if (!cell) return;

            const block = document.createElement('div');
            block.className = `shift-block shift-vertical ${employee.poste}`;
            block.dataset.shiftId = shift.id;
            block.dataset.employeeId = employee.id;
            block.draggable = true;

            const height = (shift.duration || 1) * 50;
            block.style.cssText = `
                position: absolute;
                top: 2px;
                left: 2px;
                right: 2px;
                height: ${height - 4}px;
                z-index: 10;
            `;

            // Contenu
            const avatarUrl = window.simpleAvatarManager ?
                window.simpleAvatarManager.getEmployeeAvatar(employee) :
                `https://ui-avatars.com/api/?name=${employee.prenom.charAt(0)}${employee.nom.charAt(0)}&size=32&background=74b9ff&color=fff`;

            block.innerHTML = `
                <div class="shift-avatar-section">
                    <img class="shift-avatar-horizontal" src="${avatarUrl}" alt="${employee.nom_complet || `${employee.prenom} ${employee.nom}`}">
                </div>
                <div class="shift-text-section">
                    <div class="shift-name-vertical">${employee.prenom}</div>
                    <div class="shift-duration-horizontal">${shift.duration || 1}h</div>
                </div>
            `;

            // Événements
            this.setupShiftEvents(block, shift);

            cell.appendChild(block);
        }

        static setupShiftEvents(block, shift) {
            // Drag
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', shift.id);
                block.classList.add('dragging');
            });

            block.addEventListener('dragend', () => {
                block.classList.remove('dragging');
            });

            // Double-clic
            block.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (typeof showEditShiftModal === 'function') {
                    showEditShiftModal(shift.id);
                }
            });
        }
    }

    // ===== 4. INITIALISATION =====
    function initialize() {
        console.log('🔧 Initialisation intégrée...');

        // Charger CSS
        loadVerticalCSS();

        // Gestionnaire d'avatars
        window.simpleAvatarManager = new SimpleAvatarManager();

        // Remplacer renderer
        window.PlanningRenderer = IntegratedPlanningRenderer;

        // Fonction globale
        window.generateRandomAvatars = function() {
            if (window.simpleAvatarManager) {
                window.simpleAvatarManager.generateRandomAvatars();
            }
        };

        // Améliorer avatars existants
        setTimeout(() => {
            const avatars = document.querySelectorAll('.employee-avatar');
            avatars.forEach(img => {
                const column = img.closest('[data-employee-id]');
                if (column) {
                    const employeeId = parseInt(column.dataset.employeeId);
                    const employee = window.AppState?.employees?.get(employeeId);
                    if (employee) {
                        img.src = window.simpleAvatarManager.getEmployeeAvatar(employee);
                    }
                }
            });
        }, 500);

        // Test de régénération
        setTimeout(() => {
            if (window.AppState?.employees?.size > 0) {
                IntegratedPlanningRenderer.generatePlanningGrid();
                console.log('✅ Planning régénéré avec intégration complète');
            }
        }, 1000);

        console.log('✅ Intégration complète terminée');
    }

    // ===== 5. LANCEMENT =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 300);
    }

    console.log('🔧 Script d\'intégration chargé');

})();