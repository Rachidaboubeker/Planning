/**
 * Gestionnaire de rendu des créneaux
 * Fichier: app/static/js/shift-renderer.js
 */

class ShiftRenderer {
    constructor() {
        this.grid = null;
        this.isInitialized = false;
    }

    /**
     * Initialise le gestionnaire de rendu des shifts
     */
    initialize() {
        this.grid = document.getElementById('planningGrid');
        if (!this.grid) {
            console.error('❌ Grille de planning non trouvée');
            return false;
        }

        this.isInitialized = true;
        console.log('✅ ShiftRenderer initialisé');
        return true;
    }

    /**
     * Rend tous les créneaux
     */
    renderAllShifts() {
        if (!this.isInitialized) {
            console.warn('⚠️ ShiftRenderer non initialisé');
            return;
        }

        const shifts = window.AppConfig.shifts;
        const employees = window.AppConfig.employees;

        if (!shifts || !employees) {
            console.warn('⚠️ Données non disponibles pour le rendu des shifts');
            return;
        }

        console.log('🎨 Rendu de tous les créneaux...');

        // Supprimer les anciens créneaux
        this.clearAllShifts();

        // Organiser les shifts par cellule pour gérer les chevauchements
        const shiftsByCell = this.organizeShiftsByCell();

        // Rendre les shifts cellule par cellule
        shiftsByCell.forEach((cellShifts, cellKey) => {
            const [day, hour] = cellKey.split('-');
            this.renderShiftsInCell(cellShifts, day, parseInt(hour));
        });

        console.log(`✅ ${shifts.size} créneaux rendus`);
    }

    /**
     * Organise les shifts par cellule
     */
    organizeShiftsByCell() {
        const shiftsByCell = new Map();
        const shifts = window.AppConfig.shifts;
        const employees = window.AppConfig.employees;

        shifts.forEach(shift => {
            const employee = employees.get(shift.employee_id);
            if (!employee) return;

            if (shift.duration === 1) {
                // Créneau d'une heure
                const cellKey = window.Utils.getCellKey(shift.day, shift.start_hour);
                if (!shiftsByCell.has(cellKey)) {
                    shiftsByCell.set(cellKey, []);
                }
                shiftsByCell.get(cellKey).push({ shift, employee, isMultiHour: false });
            } else {
                // Créneau multi-heures - rendu direct
                this.renderMultiHourShift(shift, employee);
            }
        });

        return shiftsByCell;
    }

    /**
     * Rend les shifts dans une cellule spécifique
     */
    renderShiftsInCell(cellShifts, day, hour) {
        const gridRenderer = window.AppConfig.getManager('grid');
        if (!gridRenderer) return;

        const cell = gridRenderer.getCell(day, hour);
        if (!cell) {
            console.warn(`Cellule introuvable: ${day} ${hour}h`);
            return;
        }

        // Rendre chaque shift dans la cellule
        cellShifts.forEach((shiftData) => {
            const block = this.createShiftBlock(shiftData.shift, shiftData.employee, false);
            cell.appendChild(block);
        });
    }

    /**
     * Rend un créneau multi-heures
     */
    renderMultiHourShift(shift, employee) {
        const flaskData = window.AppConfig.flaskData;
        const position = window.Utils.calculateGridPosition(shift.day, shift.start_hour, shift.duration);

        if (position.dayIndex === -1 || position.hourIndex === -1) {
            console.warn(`❌ Position invalide pour le créneau: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        const block = this.createShiftBlock(shift, employee, true);

        // Position CSS Grid
        block.style.gridRow = `${position.rowStart} / ${position.rowEnd}`;
        block.style.gridColumn = position.column;
        block.style.position = 'relative';
        block.style.margin = '2px';
        block.style.zIndex = '5';

        this.grid.appendChild(block);
    }

    /**
     * Crée un bloc de créneau
     */
    createShiftBlock(shift, employee, isMultiHour) {
        const block = document.createElement('div');
        block.className = `shift-block ${isMultiHour ? 'multi-hour-block' : 'single-hour-block'}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;

        // Couleur selon le type d'employé
        this.applyEmployeeColor(block, employee);

        // Contenu selon le type
        if (isMultiHour) {
            this.createMultiHourContent(block, shift, employee);
        } else {
            this.createSingleHourContent(block, shift, employee);
        }

        // Événements
        this.setupShiftEvents(block, shift);

        return block;
    }

    /**
     * Applique la couleur d'un employé
     */
    applyEmployeeColor(block, employee) {
        const flaskData = window.AppConfig.flaskData;
        if (flaskData && flaskData.employeeTypes && employee.poste) {
            const typeInfo = flaskData.employeeTypes[employee.poste];
            if (typeInfo && typeInfo.color) {
                block.style.backgroundColor = typeInfo.color;
            }
        }
    }

    /**
     * Crée le contenu d'un créneau multi-heures
     */
    createMultiHourContent(block, shift, employee) {
        const startTime = window.Utils.formatHour(shift.start_hour);
        const endHour = (shift.start_hour + shift.duration) % 24;
        const endTime = window.Utils.formatHour(endHour);

        // Avatar
        const avatarHtml = this.createAvatarHtml(employee, 'normal');

        block.innerHTML = `
            <div class="shift-header">
                ${avatarHtml}
                <div class="shift-info">
                    <div class="shift-employee-name">${window.Utils.sanitizeString(employee.prenom)}</div>
                    <div class="shift-duration">${shift.duration}h</div>
                </div>
            </div>
            <div class="shift-time">${startTime} - ${endTime}</div>
            ${shift.notes ? `<div class="shift-notes">${window.Utils.sanitizeString(shift.notes)}</div>` : ''}
        `;
    }

    /**
     * Crée le contenu d'un créneau d'une heure
     */
    createSingleHourContent(block, shift, employee) {
        const avatarHtml = this.createAvatarHtml(employee, 'small');

        block.innerHTML = `
            ${avatarHtml}
            <div class="shift-name">${window.Utils.sanitizeString(employee.prenom)}</div>
        `;
    }

    /**
     * Crée le HTML d'un avatar
     */
    createAvatarHtml(employee, size = 'normal') {
        const photoManager = window.AppConfig.getManager('photo');
        const flaskData = window.AppConfig.flaskData;

        // Taille de l'avatar
        const sizeConfig = window.AppConfig.AVATAR_SIZE[size] || window.AppConfig.AVATAR_SIZE.normal;

        // Photo personnalisée si disponible
        if (photoManager && photoManager.hasPhoto && photoManager.hasPhoto(employee.id)) {
            const photoData = photoManager.getPhoto(employee.id);
            return `
                <div class="avatar-circle" style="
                    width: ${sizeConfig}px;
                    height: ${sizeConfig}px;
                    background-image: url(${photoData});
                    background-size: cover;
                    background-position: center;
                "></div>
            `;
        }

        // Avatar par défaut avec initiales
        const typeInfo = flaskData?.employeeTypes?.[employee.poste] || { color: '#6c757d' };
        return `
            <div class="avatar-circle" style="
                width: ${sizeConfig}px;
                height: ${sizeConfig}px;
                background-color: ${typeInfo.color}
            ">
                <span class="avatar-initials" style="font-size: ${Math.max(sizeConfig * 0.4, 10)}px">
                    ${employee.prenom[0]}${employee.nom[0]}
                </span>
            </div>
        `;
    }

    /**
     * Configure les événements d'un shift
     */
    setupShiftEvents(block, shift) {
        // Clic pour éditer
        block.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('👆 Clic sur créneau:', shift.id);
            // TODO: Implémenter l'édition de créneau
        });

        // Double-clic pour édition rapide
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            console.log('👆👆 Double-clic sur créneau:', shift.id);
            // TODO: Implémenter l'édition rapide
        });

        // Drag & drop
        block.draggable = true;
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', shift.id);
            block.classList.add('dragging');
            console.log('🔄 Début drag:', shift.id);
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
            console.log('🔄 Fin drag');
        });

        // Hover effects
        block.addEventListener('mouseenter', () => {
            block.classList.add('shift-hover');
        });

        block.addEventListener('mouseleave', () => {
            block.classList.remove('shift-hover');
        });
    }

    /**
     * Supprime tous les créneaux
     */
    clearAllShifts() {
        if (!this.grid) return;

        this.grid.querySelectorAll('.shift-block').forEach(block => {
            block.remove();
        });
    }

    /**
     * Ajoute un nouveau créneau
     */
    addShift(shift) {
        const employee = window.AppConfig.employees.get(shift.employee_id);
        if (!employee) {
            console.warn('❌ Employé introuvable pour le créneau:', shift.id);
            return;
        }

        console.log('➕ Ajout du créneau:', shift.id);

        if (shift.duration === 1) {
            // Créneau d'une heure
            const gridRenderer = window.AppConfig.getManager('grid');
            const cell = gridRenderer?.getCell(shift.day, shift.start_hour);
            if (cell) {
                const block = this.createShiftBlock(shift, employee, false);
                cell.appendChild(block);
            }
        } else {
            // Créneau multi-heures
            this.renderMultiHourShift(shift, employee);
        }

        // Déclencher la correction des chevauchements
        setTimeout(() => {
            const overlapManager = window.AppConfig.getManager('overlap');
            if (overlapManager) {
                overlapManager.fixOverlaps();
            }
        }, 50);
    }

    /**
     * Supprime un créneau
     */
    removeShift(shiftId) {
        console.log('➖ Suppression du créneau:', shiftId);

        const block = this.grid?.querySelector(`[data-shift-id="${shiftId}"]`);
        if (block) {
            block.remove();
        }
    }

    /**
     * Met à jour un créneau
     */
    updateShift(shift) {
        console.log('🔄 Mise à jour du créneau:', shift.id);

        // Supprimer l'ancien
        this.removeShift(shift.id);

        // Ajouter le nouveau
        this.addShift(shift);
    }
}

// Créer et enregistrer l'instance
const shiftRenderer = new ShiftRenderer();
window.AppConfig.setManager('shift', shiftRenderer);

console.log('📦 ShiftRenderer chargé');