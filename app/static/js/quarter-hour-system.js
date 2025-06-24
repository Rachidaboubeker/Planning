// ===== SYSTÈME DE CRÉNEAUX PAR QUART D'HEURE =====
// Modifications pour planning-core.js et employee-columns.js

/**
 * Nouvelle configuration pour créneaux de 15 minutes
 */
const QuarterHourConfig = {
    // Hauteur d'un quart d'heure en pixels
    QUARTER_HEIGHT: 15,

    // Hauteur d'une heure complète (4 x 15min)
    HOUR_HEIGHT: 60,

    // Générer les créneaux de 15 minutes
    generateQuarterHours() {
        const quarters = [];
        for (let hour = 8; hour <= 23; hour++) {
            quarters.push(
                { hour, minute: 0, display: `${hour.toString().padStart(2, '0')}:00` },
                { hour, minute: 15, display: `${hour.toString().padStart(2, '0')}:15` },
                { hour, minute: 30, display: `${hour.toString().padStart(2, '0')}:30` },
                { hour, minute: 45, display: `${hour.toString().padStart(2, '0')}:45` }
            );
        }
        return quarters;
    },

    // Convertir un temps en minutes depuis 8h00
    timeToMinutes(hour, minute = 0) {
        return (hour - 8) * 60 + minute;
    },

    // Convertir des minutes en temps
    minutesToTime(minutes) {
        const hour = Math.floor(minutes / 60) + 8;
        const minute = minutes % 60;
        return { hour, minute };
    },

    // Formater l'affichage du temps
    formatTime(hour, minute = 0) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
};

/**
 * Extension du PlanningRenderer pour les quarts d'heure
 */
class QuarterHourPlanningRenderer {

    /**
     * Génère la grille avec créneaux de 15 minutes
     */
    static generateQuarterHourGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) {
            console.warn('❌ Élément planningGrid non trouvé');
            return;
        }

        console.log('🏗️ Génération grille quarts d\'heure...');

        // Initialiser les colonnes d'employés
        if (typeof employeeColumnManager !== 'undefined') {
            employeeColumnManager.initializeEmployeeColumns();
        }

        // Vider la grille
        grid.innerHTML = '';

        // Générer tous les créneaux de 15 minutes
        const quarters = QuarterHourConfig.generateQuarterHours();

        // Configuration CSS Grid - Une ligne par quart d'heure
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '80px repeat(7, 1fr)';
        grid.style.gridTemplateRows = `repeat(${quarters.length}, ${QuarterHourConfig.QUARTER_HEIGHT}px)`;
        grid.style.gap = '0';

        // Créer les cellules
        quarters.forEach((quarter, quarterIndex) => {
            const { hour, minute, display } = quarter;

            // Cellule d'heure (seulement aux heures pleines)
            if (minute === 0) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot-quarter';
                timeSlot.textContent = display;
                timeSlot.style.cssText = `
                    grid-column: 1;
                    grid-row: ${quarterIndex + 1} / ${quarterIndex + 5};
                    background: #f7fafc;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.8rem;
                    color: #4a5568;
                    border-bottom: 2px solid #cbd5e0;
                `;
                grid.appendChild(timeSlot);
            }

            // Cellules de jours pour chaque quart d'heure
            PlanningConfig.DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = `schedule-cell-quarter ${minute === 0 ? 'hour-start' : ''}`;
                cell.dataset.hour = hour;
                cell.dataset.minute = minute;
                cell.dataset.day = day;
                cell.dataset.dayIndex = dayIndex;
                cell.dataset.quarterIndex = quarterIndex;

                cell.style.cssText = `
                    grid-column: ${dayIndex + 2};
                    grid-row: ${quarterIndex + 1};
                    background: white;
                    border-right: 1px solid #e9ecef;
                    border-bottom: ${minute === 45 ? '2px solid #cbd5e0' : '1px solid #f1f3f4'};
                    position: relative;
                    min-height: ${QuarterHourConfig.QUARTER_HEIGHT}px;
                `;

                // Ajouter les guides de colonnes seulement aux heures pleines
                if (minute === 0 && typeof PlanningRendererColumnExtensions !== 'undefined') {
                    PlanningRendererColumnExtensions.addColumnGuides(cell);
                }

                this.setupQuarterCellEvents(cell, day, hour, minute);
                grid.appendChild(cell);
            });
        });

        // Rendre les créneaux avec le nouveau système
        this.renderShiftsQuarterHour();

        console.log('✅ Grille quarts d\'heure générée');

        // Initialiser le drag & drop après génération
        setTimeout(() => {
            if (typeof PlanningRendererColumnExtensions !== 'undefined') {
                PlanningRendererColumnExtensions.initializeAllDragDrop();
            }
        }, 100);
    }

    /**
     * Configure les événements pour une cellule de quart d'heure
     */
    static setupQuarterCellEvents(cell, day, hour, minute) {
        // Double-clic pour ajouter (seulement sur les heures pleines pour simplifier)
        if (minute === 0) {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                if (typeof PlanningUI !== 'undefined') {
                    PlanningUI.showAddShiftModal(day, hour);
                }
            });
        }

        // Hover
        cell.addEventListener('mouseenter', () => {
            cell.style.backgroundColor = '#ebf8ff';
        });

        cell.addEventListener('mouseleave', () => {
            cell.style.backgroundColor = 'white';
        });

        // Configuration drop zone pour drag & drop
        if (typeof PlanningRendererColumnExtensions !== 'undefined') {
            this.setupQuarterDropZone(cell, day, hour, minute);
        }
    }

    /**
     * Configure une zone de drop pour les quarts d'heure
     */
    static setupQuarterDropZone(cell, day, hour, minute) {
        cell.classList.add('drop-zone-quarter');

        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            cell.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', (e) => {
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over');
            }
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');

            const shiftId = e.dataTransfer.getData('text/plain');
            const newDay = day;
            const newStartTime = QuarterHourConfig.timeToMinutes(hour, minute);

            console.log(`🎯 DROP quart d'heure: ${shiftId} → ${day} ${hour}:${minute.toString().padStart(2, '0')}`);

            await this.saveShiftMoveQuarter(shiftId, newDay, newStartTime);
        });
    }

    /**
     * Sauvegarde un déplacement avec précision au quart d'heure
     */
    static async saveShiftMoveQuarter(shiftId, newDay, newStartTimeMinutes) {
        try {
            const shift = AppState.shifts.get(shiftId);
            if (!shift) {
                console.error('Shift non trouvé:', shiftId);
                return false;
            }

            const newTime = QuarterHourConfig.minutesToTime(newStartTimeMinutes);
            const newStartHour = newTime.hour;
            const newStartMinute = newTime.minute;

            console.log(`💾 Sauvegarde quart d'heure: ${newStartHour}:${newStartMinute.toString().padStart(2, '0')}`);

            // Mise à jour locale avec minutes
            shift.day = newDay;
            shift.start_hour = newStartHour;
            shift.start_minute = newStartMinute || 0; // Nouveau champ
            AppState.shifts.set(shiftId, shift);

            // Sauvegarde API
            if (typeof APIManager !== 'undefined') {
                const response = await APIManager.put(`/shifts/${shiftId}`, {
                    day: newDay,
                    start_hour: newStartHour,
                    start_minute: newStartMinute || 0,
                    duration: shift.duration,
                    employee_id: shift.employee_id,
                    notes: shift.notes
                });

                if (response.success) {
                    console.log('✅ Déplacement quart d\'heure sauvegardé');

                    // Notification
                    if (typeof NotificationManager !== 'undefined') {
                        const employee = AppState.employees.get(shift.employee_id);
                        NotificationManager.show(
                            `✅ ${employee?.prenom} déplacé: ${QuarterHourConfig.formatTime(newStartHour, newStartMinute)}`,
                            'success'
                        );
                    }
                } else {
                    throw new Error(response.error || 'Erreur API');
                }
            }

            // Rafraîchir l'affichage
            setTimeout(() => {
                this.generateQuarterHourGrid();
            }, 100);

            return true;

        } catch (error) {
            console.error('❌ Erreur sauvegarde quart d\'heure:', error);

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors du déplacement', 'error');
            }

            return false;
        }
    }

    /**
     * Rend les créneaux avec positionnement au quart d'heure
     */
    static renderShiftsQuarterHour() {
        const grid = document.getElementById('planningGrid');

        // Supprimer les anciens créneaux
        grid.querySelectorAll('.shift-block').forEach(block => block.remove());

        // Grouper les créneaux par cellule
        const shiftsByCell = new Map();

        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (!employee) return;

            const startMinute = shift.start_minute || 0;
            const cellKey = `${shift.day}-${shift.start_hour}-${startMinute}`;

            if (!shiftsByCell.has(cellKey)) {
                shiftsByCell.set(cellKey, []);
            }

            shiftsByCell.get(cellKey).push({ shift, employee });
        });

        // Rendre chaque groupe de créneaux
        shiftsByCell.forEach((shiftsInCell, cellKey) => {
            const [day, startHour, startMinute] = cellKey.split('-');
            const hour = parseInt(startHour);
            const minute = parseInt(startMinute);

            shiftsInCell.forEach(({ shift, employee }) => {
                this.renderShiftQuarterHour(shift, employee, hour, minute);
            });
        });

        console.log('✅ Créneaux quarts d\'heure rendus');
    }

    /**
     * Rend un créneau avec positionnement au quart d'heure
     */
    static renderShiftQuarterHour(shift, employee, startHour, startMinute) {
        const startCell = document.querySelector(
            `[data-day="${shift.day}"][data-hour="${startHour}"][data-minute="${startMinute || 0}"]`
        );

        if (!startCell) {
            console.warn(`Cellule quart d'heure introuvable: ${shift.day} ${startHour}:${(startMinute || 0).toString().padStart(2, '0')}`);
            return;
        }

        const columnIndex = employeeColumnManager.getEmployeeColumn(employee.id);
        const block = PlanningRendererColumnExtensions.createShiftBlockForColumn(shift, employee, shift.duration > 1);

        // Calculer la hauteur en fonction de la durée (en heures) et des quarts d'heure
        const durationInMinutes = shift.duration * 60; // Convertir heures en minutes
        const heightInPixels = (durationInMinutes / 15) * QuarterHourConfig.QUARTER_HEIGHT;

        // Position dans la colonne avec nouvelle hauteur
        const columnWidth = employeeColumnManager.getColumnWidth();
        const left = employeeColumnManager.getColumnLeft(columnIndex);

        block.style.cssText += `
            left: ${left}% !important;
            width: ${columnWidth - 1}% !important;
            top: 1px !important;
            height: ${heightInPixels - 2}px !important;
            z-index: 10 !important;
        `;

        console.log(`🎨 Créneau quart d'heure: ${employee.prenom} ${startHour}:${(startMinute || 0).toString().padStart(2, '0')} (${heightInPixels}px)`);

        startCell.appendChild(block);
    }
}

// Fonction d'activation du système quart d'heure
function activateQuarterHourSystem() {
    console.log('🕐 Activation du système quart d\'heure...');

    // Remplacer la méthode de génération de grille
    if (typeof PlanningRenderer !== 'undefined') {
        PlanningRenderer.generatePlanningGrid = QuarterHourPlanningRenderer.generateQuarterHourGrid;
        PlanningRenderer.renderShifts = QuarterHourPlanningRenderer.renderShiftsQuarterHour;
    }

    // Mettre à jour la configuration globale
    if (typeof PlanningConfig !== 'undefined') {
        PlanningConfig.CELL_HEIGHT = QuarterHourConfig.QUARTER_HEIGHT;
        PlanningConfig.QUARTER_MODE = true;
    }

    console.log('✅ Système quart d\'heure activé');
}

// Export global
if (typeof window !== 'undefined') {
    window.QuarterHourConfig = QuarterHourConfig;
    window.QuarterHourPlanningRenderer = QuarterHourPlanningRenderer;
    window.activateQuarterHourSystem = activateQuarterHourSystem;
}

console.log('🕐 Système de quarts d\'heure chargé');