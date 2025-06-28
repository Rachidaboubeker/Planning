/**
 * CORRECTIF LAYOUT SIMPLE - CSS GRID FONCTIONNEL
 * Version simplifiée qui fonctionne avec le StateManager optimisé
 */

// Attendre que PlanningManager soit disponible
setTimeout(() => {
    if (!window.PlanningManager) {
        console.error('❌ PlanningManager non disponible');
        return;
    }

    console.log('🎨 Application du correctif layout simple...');

    // ==================== GÉNÉRATION GRILLE OPTIMISÉE ====================

    window.PlanningManager.generateGrid = function() {
        console.log('🏗️ Génération grille CSS Grid...');

        const headerContainer = document.getElementById('planningHeader');
        const gridContainer = document.getElementById('planningGrid');

        if (!headerContainer || !gridContainer) {
            console.error('❌ Conteneurs manquants');
            return;
        }

        // Récupérer les employés actifs
        const employees = this.getActiveEmployees();
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

        console.log(`📊 Grille: ${employees.length} employés, ${days.length} jours, ${hours.length} heures`);

        if (employees.length === 0) {
            headerContainer.innerHTML = '<div class="no-data">Aucun employé</div>';
            gridContainer.innerHTML = '<div class="no-data">Ajoutez des employés</div>';
            return;
        }

        // Générer l'en-tête
        this.generateHeader(headerContainer, employees, days);

        // Générer la grille
        this.generateBody(gridContainer, employees, days, hours);

        // Appliquer les styles
        this.applyGridStyles(employees.length, days.length);

        console.log('✅ Grille générée');
    };

    // ==================== EN-TÊTE ====================

    window.PlanningManager.generateHeader = function(container, employees, days) {
        let html = '<div class="grid-header">';
        html += '<div class="corner-cell">Heures</div>';

        days.forEach(day => {
            html += `<div class="day-section">`;
            html += `<div class="day-name">${day}</div>`;
            html += '<div class="employees-header">';

            employees.forEach(emp => {
                const initials = (emp.prenom.charAt(0) + emp.nom.charAt(0)).toUpperCase();
                const color = this.getEmployeeColor(emp.poste);
                html += `
                    <div class="emp-header" title="${emp.prenom} ${emp.nom}">
                        <div class="emp-avatar" style="background-color: ${color}">${initials}</div>
                        <span>${emp.prenom}</span>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;
    };

    // ==================== CORPS ====================

    window.PlanningManager.generateBody = function(container, employees, days, hours) {
        let html = '<div class="grid-body">';

        hours.forEach(hour => {
            const displayHour = hour === 0 ? '00:00' : (hour < 10 ? `0${hour}:00` : `${hour}:00`);
            html += '<div class="time-row">';
            html += `<div class="time-cell">${displayHour}</div>`;

            days.forEach(day => {
                html += '<div class="day-slots">';
                employees.forEach(emp => {
                    html += `
                        <div class="emp-slot"
                             data-day="${day}"
                             data-hour="${hour}"
                             data-employee-id="${emp.id}">
                        </div>
                    `;
                });
                html += '</div>';
            });

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
    };

    // ==================== STYLES CSS ====================

    window.PlanningManager.applyGridStyles = function(empCount, dayCount) {
        // Supprimer anciens styles
        document.querySelectorAll('#planning-grid-styles').forEach(s => s.remove());

        const style = document.createElement('style');
        style.id = 'planning-grid-styles';
        style.textContent = `
            .grid-header {
                display: grid;
                grid-template-columns: 80px repeat(${dayCount}, 1fr);
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .corner-cell {
                background: #e9ecef;
                padding: 1rem;
                font-weight: 600;
                text-align: center;
                border-right: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .day-section {
                border-right: 1px solid #dee2e6;
            }

            .day-name {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.75rem;
                text-align: center;
                font-weight: 600;
            }

            .employees-header {
                display: grid;
                grid-template-columns: repeat(${empCount}, 1fr);
                background: #f1f3f4;
                padding: 0.5rem 0;
                gap: 1px;
            }

            .emp-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.7rem;
                text-align: center;
                padding: 0.25rem;
            }

            .emp-avatar {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                color: white;
                font-size: 0.65rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .grid-body {
                background: white;
            }

            .time-row {
                display: grid;
                grid-template-columns: 80px repeat(${dayCount}, 1fr);
                border-bottom: 1px solid #e9ecef;
                min-height: 60px;
            }

            .time-cell {
                background: #f8f9fa;
                padding: 1rem 0.5rem;
                text-align: center;
                font-weight: 500;
                color: #6c757d;
                border-right: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .day-slots {
                display: grid;
                grid-template-columns: repeat(${empCount}, 1fr);
                border-right: 1px solid #dee2e6;
                gap: 1px;
                background: #f8f9fa;
                min-height: 60px;
            }

            .emp-slot {
                background: white;
                position: relative;
                transition: all 0.2s ease;
                padding: 2px;
                box-sizing: border-box;
            }

            .emp-slot:hover {
                background-color: rgba(0, 123, 255, 0.05);
            }

            .shift-block {
                position: absolute;
                top: 2px;
                left: 2px;
                right: 2px;
                bottom: 2px;
                border-radius: 4px;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                text-align: center;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 10;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 2px;
                transition: all 0.2s ease;
            }

            .shift-block:hover {
                transform: scale(1.05);
                z-index: 50;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }

            .shift-avatar {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                font-size: 0.6rem;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 2px;
            }

            .shift-time {
                font-size: 0.65rem;
                opacity: 0.9;
            }

            .no-data {
                padding: 2rem;
                text-align: center;
                color: #6c757d;
                font-style: italic;
            }
        `;

        document.head.appendChild(style);
        console.log('✅ Styles CSS Grid appliqués');
    };

    // ==================== RENDU CRÉNEAUX ====================

    window.PlanningManager.renderShifts = function() {
        console.log('🎨 Rendu créneaux...');

        // Nettoyer les créneaux existants
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        if (!window.StateManager) {
            console.error('❌ StateManager manquant');
            return;
        }

        const data = window.StateManager.getState();
        const shifts = data.shifts || [];
        const employees = data.employees || [];

        console.log(`📊 Rendu: ${shifts.length} créneaux, ${employees.length} employés`);

        if (shifts.length === 0) {
            console.log('ℹ️ Aucun créneau à rendre');
            return;
        }

        // Index des employés
        const empMap = new Map();
        employees.forEach(emp => empMap.set(emp.id, emp));

        let rendered = 0;

        shifts.forEach(shift => {
            const employee = empMap.get(shift.employee_id);
            if (!employee) {
                console.warn(`⚠️ Employé manquant: ${shift.employee_id}`);
                return;
            }

            if (this.renderSingleShift(shift, employee)) {
                rendered++;
            }
        });

        console.log(`✅ ${rendered} créneaux rendus`);

        // Actualiser le drag & drop
        setTimeout(() => {
            if (window.DragDropManager && window.DragDropManager.refresh) {
                window.DragDropManager.refresh();
            }
        }, 100);
    };

    window.PlanningManager.renderSingleShift = function(shift, employee) {
        try {
            const slot = document.querySelector(
                `.emp-slot[data-day="${shift.day}"][data-hour="${shift.start_hour}"][data-employee-id="${employee.id}"]`
            );

            if (!slot) {
                console.warn(`⚠️ Slot manquant: ${shift.day} ${shift.start_hour}h ${employee.prenom}`);
                return false;
            }

            // Créer le bloc
            const block = document.createElement('div');
            block.className = 'shift-block';
            block.dataset.shiftId = shift.id;
            block.dataset.employeeId = employee.id;
            block.dataset.day = shift.day;
            block.dataset.hour = shift.start_hour;
            block.draggable = true;

            const color = this.getEmployeeColor(employee.poste);
            const endHour = shift.start_hour + (shift.duration || 1);
            const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();

            block.innerHTML = `
                <div class="shift-avatar">${initials}</div>
                <div class="shift-time">${shift.start_hour}h-${endHour}h</div>
            `;

            block.style.background = `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 15)} 100%)`;

            slot.appendChild(block);

            console.log(`📍 ${employee.prenom} -> ${shift.day} ${shift.start_hour}h`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur rendu ${shift.id}:`, error);
            return false;
        }
    };

    // ==================== UTILITAIRES ====================

    window.PlanningManager.getActiveEmployees = function() {
        if (!window.StateManager) return [];

        const data = window.StateManager.getState();
        return (data.employees || [])
            .filter(emp => emp && emp.id && emp.nom && emp.prenom)
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    };

    window.PlanningManager.getEmployeeColor = function(poste) {
        const colors = {
            'serveur': '#00b894',
            'cuisinier': '#74b9ff',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide_cuisine': '#6c5ce7',
            'aide': '#6c5ce7',
            'commis': '#fd79a8',
            'plongeur': '#636e72'
        };
        return colors[poste] || '#6c757d';
    };

    window.PlanningManager.darkenColor = function(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    };

    // ==================== EXÉCUTION ====================

    // Régénérer immédiatement
    setTimeout(() => {
        console.log('🔄 Régénération avec nouveau layout...');

        if (window.PlanningManager.generateGrid) {
            window.PlanningManager.generateGrid();

            setTimeout(() => {
                if (window.PlanningManager.renderShifts) {
                    window.PlanningManager.renderShifts();

                    // Vérification finale
                    setTimeout(() => {
                        const employees = window.StateManager?.getState()?.employees?.length || 0;
                        const slots = document.querySelectorAll('.emp-slot').length;
                        const shifts = document.querySelectorAll('.shift-block').length;

                        console.log('📊 RÉSULTAT LAYOUT:');
                        console.log(`   - ${employees} employés`);
                        console.log(`   - ${slots} slots`);
                        console.log(`   - ${shifts} créneaux visibles`);

                        if (slots > 0 && shifts > 0) {
                            console.log('🎉 LAYOUT FONCTIONNEL !');
                        }
                    }, 200);
                }
            }, 100);
        }
    }, 100);

    console.log('✅ Correctif layout simple appliqué');

}, 600); // Attendre que StateManager soit prêt

// ==================== EXPOSITION POUR DEBUG ====================

if (window.location.hostname === 'localhost') {
    window.debugLayoutSimple = {
        regenerate: () => {
            if (window.PlanningManager) {
                window.PlanningManager.generateGrid();
                setTimeout(() => window.PlanningManager.renderShifts(), 100);
            }
        },
        checkData: () => {
            const data = window.StateManager?.getState();
            console.log('Données:', {
                employees: data?.employees?.length || 0,
                shifts: data?.shifts?.length || 0
            });
        }
    };

    console.log('🛠️ Debug layout: window.debugLayoutSimple');
}

console.log('🔧 Correctif layout simple chargé');