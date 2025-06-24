// ===== SYSTÈME DE COLONNES FIXES PAR EMPLOYÉ =====
// Fichier: app/static/js/employee-columns.js

/**
 * Gestionnaire des colonnes d'employés
 */
class EmployeeColumnManager {
    constructor() {
        this.employeeColumns = new Map(); // Map employee_id -> column_index
        this.maxColumns = 5; // Configurable selon vos besoins
        this.initialized = false;
    }

    /**
     * Initialise l'attribution des colonnes pour tous les employés
     */
    initializeEmployeeColumns() {
        if (this.initialized) return;

        console.log('🏗️ Initialisation des colonnes d\'employés...');

        // Récupérer tous les employés actifs
        let employees = [];

        // Essayer AppState d'abord
        if (typeof AppState !== 'undefined' && AppState.employees) {
            employees = Array.from(AppState.employees.values());
        }
        // Fallback vers window.employees
        else if (typeof window.employees !== 'undefined') {
            employees = Array.from(window.employees.values());
        }

        const activeEmployees = employees
            .filter(emp => emp.active !== false && emp.actif !== false)
            .sort((a, b) => a.nom.localeCompare(b.nom)); // Tri alphabétique

        // Assigner une colonne à chaque employé
        activeEmployees.forEach((employee, index) => {
            if (index < this.maxColumns) {
                this.employeeColumns.set(employee.id, index);
                console.log(`👤 ${employee.nom_complet || employee.prenom + ' ' + employee.nom} → Colonne ${index + 1}`);
            }
        });

        this.initialized = true;
        console.log(`✅ ${this.employeeColumns.size} employés assignés sur ${this.maxColumns} colonnes`);
    }

    /**
     * Obtient l'index de colonne pour un employé
     */
    getEmployeeColumn(employeeId) {
        if (!this.initialized) {
            this.initializeEmployeeColumns();
        }
        return this.employeeColumns.get(employeeId) || 0;
    }

    /**
     * Ajoute un nouvel employé avec attribution automatique de colonne
     */
    addEmployee(employee) {
        if (this.employeeColumns.size < this.maxColumns) {
            const newColumnIndex = this.employeeColumns.size;
            this.employeeColumns.set(employee.id, newColumnIndex);
            console.log(`➕ Nouvel employé ${employee.nom_complet} → Colonne ${newColumnIndex + 1}`);
            return newColumnIndex;
        }
        return null; // Plus de colonnes disponibles
    }

    /**
     * Supprime un employé et réorganise les colonnes
     */
    removeEmployee(employeeId) {
        if (this.employeeColumns.has(employeeId)) {
            this.employeeColumns.delete(employeeId);
            this.reorganizeColumns();
        }
    }

    /**
     * Réorganise les colonnes après suppression
     */
    reorganizeColumns() {
        const entries = Array.from(this.employeeColumns.entries());
        this.employeeColumns.clear();

        entries.forEach(([employeeId], index) => {
            this.employeeColumns.set(employeeId, index);
        });

        console.log('🔄 Colonnes réorganisées');
    }

    /**
     * Obtient la largeur d'une colonne en pourcentage
     */
    getColumnWidth() {
        return Math.floor(100 / this.maxColumns);
    }

    /**
     * Calcule la position left pour une colonne
     */
    getColumnLeft(columnIndex) {
        return columnIndex * this.getColumnWidth();
    }

    /**
     * Réinitialise le système (utile lors de changements d'employés)
     */
    reset() {
        this.employeeColumns.clear();
        this.initialized = false;
        console.log('🔄 Système de colonnes réinitialisé');
    }
}

// Instance globale
const employeeColumnManager = new EmployeeColumnManager();

/**
 * Extensions pour PlanningRenderer avec colonnes
 */
class PlanningRendererColumnExtensions {

    /**
     * Ajoute les guides visuels pour les colonnes d'employés
     */
    static addColumnGuides(cell) {
        // Supprimer les anciens guides
        cell.querySelectorAll('.employee-column-guide').forEach(guide => guide.remove());

        const columnWidth = employeeColumnManager.getColumnWidth();

        for (let i = 0; i < employeeColumnManager.maxColumns; i++) {
            const guide = document.createElement('div');
            guide.className = 'employee-column-guide';
            guide.style.cssText = `
                position: absolute;
                left: ${i * columnWidth}%;
                width: ${columnWidth}%;
                height: 100%;
                border-right: 1px solid rgba(0,0,0,0.05);
                pointer-events: none;
                z-index: 1;
                transition: background-color 0.2s ease;
            `;

            cell.appendChild(guide);
        }
    }

    /**
     * Crée un bloc de créneau optimisé pour les colonnes
     */
    static createShiftBlockForColumn(shift, employee, isMultiHour) {
    const block = document.createElement('div');
    block.className = `shift-block ${isMultiHour ? 'multi-hour' : 'single-hour'} column-positioned`;
    block.dataset.shiftId = shift.id;
    block.dataset.employeeId = employee.id;

    // Couleurs sécurisées avec gestion d'erreur
    let employeeColor = '#74b9ff'; // Couleur par défaut

    try {
        // Source 1: Directement depuis employee.type_info (si disponible)
        if (employee.type_info && employee.type_info.color) {
            employeeColor = employee.type_info.color;
        } else {
            // Source 2: Couleurs hardcodées basées sur le poste
            const employeeColors = {
                'cuisinier': '#74b9ff',
                'serveur': '#00b894',
                'barman': '#fdcb6e',
                'manager': '#a29bfe',
                'aide': '#6c5ce7',
                'commis': '#fd79a8'
            };

            if (employeeColors[employee.poste]) {
                employeeColor = employeeColors[employee.poste];
            }
        }
    } catch (error) {
        console.warn('Erreur couleur employé, utilisation couleur par défaut:', error);
        employeeColor = '#74b9ff';
    }

    block.style.cssText = `
        background: linear-gradient(135deg, ${employeeColor} 0%, ${this.darkenColor(employeeColor, 10)} 100%);
        position: absolute;
        z-index: 10;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.2s ease;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `;

    // ===== NOUVEAU CONTENU AVEC AVATAR HORIZONTAL + TEXTE VERTICAL =====
    const content = document.createElement('div');
    content.className = 'shift-content-vertical';
    content.style.cssText = `
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    `;

    // ===== SECTION AVATAR (horizontale en haut) =====
    const avatarSection = document.createElement('div');
    avatarSection.className = 'shift-avatar-section';
    avatarSection.style.cssText = `
        width: 100%;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(4px);
        border-bottom: 1px solid rgba(255,255,255,0.2);
        flex-shrink: 0;
        padding: 2px;
    `;

    // Avatar image
    const avatar = document.createElement('img');
    avatar.className = 'shift-avatar-horizontal';
    avatar.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.5);
        object-fit: cover;
        background: rgba(255,255,255,0.2);
    `;

    // Source de l'avatar
    if (typeof window.avatarManager !== 'undefined') {
        avatar.src = window.avatarManager.getEmployeeAvatar(employee);
    } else {
        const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=20&background=${employeeColor.replace('#', '')}&color=fff&font-size=0.6`;
    }

    avatar.alt = employee.nom_complet || employee.prenom + ' ' + employee.nom;

    // Gestion d'erreur avatar
    avatar.onerror = () => {
        const initials = (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=20&background=${employeeColor.replace('#', '')}&color=fff&font-size=0.6`;
    };

    avatarSection.appendChild(avatar);

    // ===== SECTION TEXTE (verticale) =====
    const textSection = document.createElement('div');
    textSection.className = 'shift-text-section';
    textSection.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        writing-mode: vertical-lr;
        text-orientation: mixed;
        gap: 4px;
        padding: 4px 0;
        min-height: 0;
    `;

    // Nom en vertical
    const nameDiv = document.createElement('div');
    nameDiv.className = 'shift-name-vertical';
    nameDiv.style.cssText = `
        font-size: ${isMultiHour ? '0.75rem' : '0.7rem'};
        font-weight: 700;
        letter-spacing: 1px;
        line-height: 1;
        white-space: nowrap;
        writing-mode: vertical-lr;
        text-orientation: mixed;
    `;

    const displayName = employee.prenom || employee.nom.split(' ')[0];
    nameDiv.textContent = displayName.toUpperCase();

    // Durée en horizontal (à côté du nom)
    const durationDiv = document.createElement('div');
    durationDiv.className = 'shift-duration-corner';
    durationDiv.style.cssText = `
        position: absolute;
        bottom: 3px;
        right: 3px;
        font-size: ${isMultiHour ? '0.6rem' : '0.55rem'};
        font-weight: 700;
        color: white;
        background: rgba(0,0,0,0.5);
        padding: 1px 4px;
        border-radius: 8px;
        text-align: center;
        writing-mode: horizontal-tb;
        border: 1px solid rgba(255,255,255,0.4);
        box-shadow: 0 1px 2px rgba(0,0,0,0.4);
        min-width: 16px;
        z-index: 10;
        backdrop-filter: blur(2px);
    `;

    durationDiv.textContent = shift.duration > 1 ? `${shift.duration}h` : '1h';

    // Ajouter directement au block (pas au textSection)
    block.appendChild(durationDiv);

    textSection.appendChild(nameDiv);
    textSection.appendChild(durationDiv);

    // ===== ASSEMBLAGE FINAL =====
    content.appendChild(avatarSection);
    content.appendChild(textSection);
    block.appendChild(content);

    // Événements
    this.setupShiftEvents(block, shift, employee);

    return block;
}

    /**
     * Positionne un créneau dans sa colonne
     */
    static positionShiftInColumn(block, columnIndex, duration) {
        const columnWidth = employeeColumnManager.getColumnWidth();
        const left = employeeColumnManager.getColumnLeft(columnIndex);

        // Hauteur de cellule par défaut si PlanningConfig pas disponible
        const cellHeight = (typeof PlanningConfig !== 'undefined' && PlanningConfig.CELL_HEIGHT) ?
            PlanningConfig.CELL_HEIGHT : 60;

        block.style.cssText += `
            left: ${left}% !important;
            width: ${columnWidth - 1}% !important;
            top: 2px !important;
            height: ${(cellHeight * duration) - 4}px !important;
        `;
    }

    /**
     * Configure les événements d'un créneau
     */
    static setupShiftEvents(block, shift, employee) {
    // Effet hover
    block.addEventListener('mouseenter', () => {
        block.style.transform = 'scale(1.02)';
        block.style.zIndex = '50';
        block.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });

    block.addEventListener('mouseleave', () => {
        if (!block.classList.contains('dragging')) {
            block.style.transform = 'scale(1)';
            block.style.zIndex = '10';
            block.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
    });

    // Clic pour éditer
    block.addEventListener('click', (e) => {
        e.stopPropagation();

        // Essayer différentes méthodes pour ouvrir l'édition
        if (typeof window.showEditShiftModal === 'function') {
            window.showEditShiftModal(shift);
        } else if (typeof PlanningUI !== 'undefined' && PlanningUI.showEditShiftModal) {
            PlanningUI.showEditShiftModal(shift);
        } else if (typeof modalManager !== 'undefined' && modalManager.showEditShift) {
            modalManager.showEditShift(shift.id);
        } else {
            console.log('Édition de créneau:', shift);
        }
    });

    // Tooltip détaillé
    const endHour = (shift.start_hour + shift.duration) % 24;
    const formatHour = (hour) => hour.toString().padStart(2, '0') + ':00';

    block.title = [
        `👤 ${employee.nom_complet || employee.prenom + ' ' + employee.nom}`,
        `📅 ${shift.day}`,
        `🕐 ${formatHour(shift.start_hour)} - ${formatHour(endHour)} (${shift.duration}h)`,
        `💼 ${employee.poste}`,
        shift.notes ? `📝 ${shift.notes}` : '',
        '🖱️ Cliquez pour éditer, glissez pour déplacer',
        '📏 Glissez les bords pour redimensionner'
    ].filter(Boolean).join('\n');

    // Configuration du drag & drop avec colonnes
    this.setupColumnDragDrop(block, shift);

    // ✨ NOUVEAU : Configuration du redimensionnement
    if (typeof PlanningRendererColumnExtensions.setupShiftResize === 'function') {
        PlanningRendererColumnExtensions.setupShiftResize(block, shift);
    }
}

    /**
     * Assombrit une couleur
     */
    static darkenColor(color, percent) {
        try {
            // Convertir hex en RGB
            const hex = color.replace('#', '');
            if (hex.length !== 6) return color; // Sécurité

            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            // Assombrir
            const factor = (100 - percent) / 100;
            const newR = Math.round(r * factor);
            const newG = Math.round(g * factor);
            const newB = Math.round(b * factor);

            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        } catch (error) {
            console.warn('Erreur assombrissement couleur:', error);
            return color; // Retourner la couleur originale en cas d'erreur
        }
    }

    // ===== AJOUTER CES MÉTHODES À LA FIN DE PlanningRendererColumnExtensions =====
    // Dans app/static/js/employee-columns.js

    /**
     * Configure le drag & drop adapté aux colonnes (SOLUTION QUI FONCTIONNE)
     */
    static setupColumnDragDrop(shiftElement, shift) {
        if (!shiftElement || !shift) return false;

        const shiftId = shift.id;

        // Configuration du draggable
        shiftElement.draggable = true;
        shiftElement.style.cursor = 'move';

        // Supprimer anciens listeners pour éviter les doublons
        if (shiftElement._dragStartHandler) {
            shiftElement.removeEventListener('dragstart', shiftElement._dragStartHandler);
            shiftElement.removeEventListener('dragend', shiftElement._dragEndHandler);
        }

        // Handler dragstart
        shiftElement._dragStartHandler = function(e) {
            console.log('🚀 DRAG START:', shiftId);
            e.dataTransfer.setData('text/plain', shiftId);
            shiftElement.classList.add('dragging');
            shiftElement.style.opacity = '0.5';

            // Mettre en évidence la colonne de l'employé
            if (typeof employeeColumnManager !== 'undefined') {
                const columnIndex = employeeColumnManager.getEmployeeColumn(shift.employee_id);
                PlanningRendererColumnExtensions.highlightEmployeeColumn(columnIndex);

                const employee = AppState.employees.get(shift.employee_id);
                console.log(`👤 ${employee?.prenom} peut être déplacé dans colonne ${columnIndex + 1}`);

                // Notification visuelle
                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show(
                        `🎯 ${employee?.prenom} peut être déplacé dans la colonne ${columnIndex + 1}`,
                        'info',
                        2000
                    );
                }
            }
        };

        // Handler dragend
        shiftElement._dragEndHandler = function(e) {
            console.log('🏁 DRAG END:', shiftId);
            shiftElement.classList.remove('dragging');
            shiftElement.style.opacity = '1';
            PlanningRendererColumnExtensions.removeColumnHighlights();
        };

        // Attacher les handlers
        shiftElement.addEventListener('dragstart', shiftElement._dragStartHandler);
        shiftElement.addEventListener('dragend', shiftElement._dragEndHandler);

        return true;
    }

    /**
     * Configure une zone de drop avec vérification de colonne
     */
    static setupColumnDropZone(cell) {
        if (!cell) return;

        cell.classList.add('drop-zone');

        // Supprimer anciens handlers
        if (cell._dropHandler) {
            cell.removeEventListener('dragover', cell._dragOverHandler);
            cell.removeEventListener('dragleave', cell._dragLeaveHandler);
            cell.removeEventListener('drop', cell._dropHandler);
        }

        // Handler dragover
        cell._dragOverHandler = function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            cell.classList.add('drag-over');
        };

        // Handler dragleave
        cell._dragLeaveHandler = function(e) {
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over');
            }
        };

        // Handler drop avec vérification de colonne
        cell._dropHandler = async function(e) {
            e.preventDefault();
            cell.classList.remove('drag-over');

            const shiftId = e.dataTransfer.getData('text/plain');
            const newDay = cell.dataset.day;
            const newHour = parseInt(cell.dataset.hour);

            console.log(`🎯 DROP: ${shiftId} → ${newDay} ${newHour}h`);

            const shift = AppState.shifts.get(shiftId);
            if (!shift) {
                console.error('Shift non trouvé:', shiftId);
                return;
            }

            // Vérifier la colonne si le système de colonnes est actif
            if (typeof employeeColumnManager !== 'undefined') {
                const expectedColumn = employeeColumnManager.getEmployeeColumn(shift.employee_id);

                // Calculer dans quelle colonne on a droppé
                const cellRect = cell.getBoundingClientRect();
                const mouseX = e.clientX - cellRect.left;
                const columnWidth = cellRect.width / employeeColumnManager.maxColumns;
                const droppedColumn = Math.floor(mouseX / columnWidth);

                if (droppedColumn !== expectedColumn) {
                    console.warn(`❌ Drop refusé: colonne ${droppedColumn + 1} != ${expectedColumn + 1}`);

                    const employee = AppState.employees.get(shift.employee_id);
                    if (typeof NotificationManager !== 'undefined') {
                        NotificationManager.show(
                            `❌ ${employee?.prenom || 'Cet employé'} ne peut être déplacé que dans la colonne ${expectedColumn + 1}`,
                            'warning'
                        );
                    }
                    return;
                }
            }

            // Effectuer le déplacement
            await PlanningRendererColumnExtensions.moveShift(shiftId, newDay, newHour);
        };

        // Attacher les handlers
        cell.addEventListener('dragover', cell._dragOverHandler);
        cell.addEventListener('dragleave', cell._dragLeaveHandler);
        cell.addEventListener('drop', cell._dropHandler);
    }

    /**
     * Déplace un créneau avec sauvegarde
     */
    static async moveShift(shiftId, newDay, newHour) {
        try {
            const shift = AppState.shifts.get(shiftId);
            if (!shift) {
                console.error('Shift non trouvé:', shiftId);
                return false;
            }

            const oldDay = shift.day;
            const oldHour = shift.start_hour;

            // Vérifier si position différente
            if (oldDay === newDay && oldHour === newHour) {
                console.log('⚠️ Position inchangée');
                return true;
            }

            console.log(`💾 Déplacement: ${oldDay} ${oldHour}h → ${newDay} ${newHour}h`);

            // Mise à jour locale
            shift.day = newDay;
            shift.start_hour = newHour;
            AppState.shifts.set(shiftId, shift);

            // Sauvegarde API
            if (typeof APIManager !== 'undefined') {
                const response = await APIManager.put(`/shifts/${shiftId}`, {
                    day: newDay,
                    start_hour: newHour,
                    duration: shift.duration,
                    employee_id: shift.employee_id,
                    notes: shift.notes
                });

                if (response.success) {
                    console.log('✅ Sauvegardé avec succès');

                    // Notification de succès
                    if (typeof NotificationManager !== 'undefined') {
                        const employee = AppState.employees.get(shift.employee_id);
                        NotificationManager.show(
                            `✅ ${employee?.prenom || 'Employé'} déplacé: ${oldDay} ${oldHour}h → ${newDay} ${newHour}h`,
                            'success'
                        );
                    }
                } else {
                    throw new Error(response.error || 'Erreur API');
                }
            }

            // Rafraîchir l'affichage
            if (typeof PlanningRenderer !== 'undefined') {
                PlanningRenderer.generatePlanningGrid();
            }

            // Émettre événement
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(PlanningEvents.SHIFT_UPDATED, shift);
            }

            return true;

        } catch (error) {
            console.error('❌ Erreur déplacement:', error);

            // Restaurer position originale
            const shift = AppState.shifts.get(shiftId);
            if (shift) {
                // On ne peut pas facilement restaurer, alors on rafraîchit
                if (typeof PlanningRenderer !== 'undefined') {
                    PlanningRenderer.generatePlanningGrid();
                }
            }

            // Notification d'erreur
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors du déplacement', 'error');
            }

            return false;
        }
    }

    /**
     * Met en évidence la colonne d'un employé
     */
    static highlightEmployeeColumn(columnIndex) {
        const cells = document.querySelectorAll('.schedule-cell-with-columns, .schedule-cell');
        cells.forEach(cell => {
            const guides = cell.querySelectorAll('.employee-column-guide');
            if (guides[columnIndex]) {
                guides[columnIndex].style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                guides[columnIndex].style.borderRight = '2px solid #28a745';
            }
        });
    }

    /**
     * Supprime tous les highlights de colonnes
     */
    static removeColumnHighlights() {
        document.querySelectorAll('.employee-column-guide').forEach(guide => {
            guide.style.backgroundColor = '';
            guide.style.borderRight = '1px solid rgba(0,0,0,0.05)';
        });
    }

    /**
     * Initialise le drag & drop pour tous les créneaux et cellules
     */
    static initializeAllDragDrop() {
        console.log('🔧 Initialisation drag & drop avec colonnes...');

        // Configurer tous les créneaux existants
        let configuredShifts = 0;
        document.querySelectorAll('.shift-block[data-shift-id]').forEach(shiftElement => {
            const shiftId = shiftElement.dataset.shiftId;
            const shift = AppState.shifts.get(shiftId);

            if (shift && this.setupColumnDragDrop(shiftElement, shift)) {
                configuredShifts++;
            }
        });

        // Configurer toutes les zones de drop
        const cells = document.querySelectorAll('.schedule-cell-with-columns, .schedule-cell');
        cells.forEach(cell => {
            this.setupColumnDropZone(cell);
        });

        console.log(`✅ ${configuredShifts} créneaux configurés pour le drag & drop`);
        console.log(`✅ ${cells.length} zones de drop configurées`);
    }
}

/**
 * Légende avec colonnes d'employés
 */
class EmployeeLegendWithColumns {

    /**
     * Met à jour la légende avec les colonnes d'employés
     */
    static updateLegendWithColumns() {
        const legend = document.getElementById('employeeLegend') || document.getElementById('legendContainer');
        if (!legend) return;

        // Initialiser les colonnes si nécessaire
        employeeColumnManager.initializeEmployeeColumns();

        legend.innerHTML = '';

        // Titre de la légende
        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #495057;
            font-size: 0.9rem;
        `;
        title.textContent = 'Colonnes d\'employés';
        legend.appendChild(title);

        // Créer un indicateur pour chaque colonne
        for (let i = 0; i < employeeColumnManager.maxColumns; i++) {
            const employee = this.getEmployeeByColumn(i);
            const columnDiv = document.createElement('div');
            columnDiv.className = 'employee-column-legend';
            columnDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px 12px;
                margin: 3px 0;
                border-radius: 8px;
                background: ${employee ? this.getEmployeeColor(employee) : '#f8f9fa'};
                color: ${employee ? 'white' : '#666'};
                font-weight: 600;
                font-size: 0.8rem;
                border: 2px solid ${employee ? 'rgba(255,255,255,0.3)' : '#ddd'};
                transition: all 0.2s ease;
                cursor: ${employee ? 'pointer' : 'default'};
            `;

            if (employee) {
                columnDiv.innerHTML = `
                    <span style="margin-right: 8px; font-size: 0.7rem; opacity: 0.8;">Col. ${i + 1}</span>
                    <span style="flex: 1;">${employee.nom_complet || employee.prenom + ' ' + employee.nom}</span>
                    <span style="margin-left: 8px; opacity: 0.8; font-size: 0.7rem;">${employee.poste}</span>
                `;

                // Effet hover
                columnDiv.addEventListener('mouseenter', () => {
                    columnDiv.style.transform = 'scale(1.02)';
                    columnDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                });

                columnDiv.addEventListener('mouseleave', () => {
                    columnDiv.style.transform = 'scale(1)';
                    columnDiv.style.boxShadow = 'none';
                });

                // Clic pour éditer l'employé
                columnDiv.addEventListener('click', () => {
                    if (typeof window.showEditEmployeeModal === 'function') {
                        window.showEditEmployeeModal(employee.id);
                    } else if (typeof modalManager !== 'undefined' && modalManager.showEditEmployee) {
                        modalManager.showEditEmployee(employee.id);
                    }
                });
            } else {
                columnDiv.innerHTML = `
                    <span style="opacity: 0.6;">Col. ${i + 1} - Libre</span>
                `;
            }

            legend.appendChild(columnDiv);
        }
    }

    /**
     * Obtient l'employé assigné à une colonne
     */
    static getEmployeeByColumn(columnIndex) {
        for (const [employeeId, column] of employeeColumnManager.employeeColumns) {
            if (column === columnIndex) {
                // Essayer AppState d'abord
                if (typeof AppState !== 'undefined' && AppState.employees) {
                    return AppState.employees.get(employeeId);
                }
                // Fallback vers window.employees
                if (typeof window.employees !== 'undefined') {
                    return window.employees.get(employeeId);
                }
            }
        }
        return null;
    }

    /**
     * Obtient la couleur d'un employé
     */
    static getEmployeeColor(employee) {
        // Essayer d'abord type_info
        if (employee.type_info && employee.type_info.color) {
            return employee.type_info.color;
        }

        // Couleurs hardcodées par défaut
        const colors = {
            'cuisinier': '#74b9ff',
            'serveur': '#00b894',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide': '#6c5ce7',
            'commis': '#fd79a8'
        };

        return colors[employee.poste] || '#74b9ff';
    }
}

// Export global - VÉRIFIER AVANT D'ASSIGNER
if (typeof window !== 'undefined') {
    if (typeof window.EmployeeColumnManager === 'undefined') {
        window.EmployeeColumnManager = EmployeeColumnManager;
    }
    if (typeof window.employeeColumnManager === 'undefined') {
        window.employeeColumnManager = employeeColumnManager;
    }
    if (typeof window.PlanningRendererColumnExtensions === 'undefined') {
        window.PlanningRendererColumnExtensions = PlanningRendererColumnExtensions;
    }
    if (typeof window.EmployeeLegendWithColumns === 'undefined') {
        window.EmployeeLegendWithColumns = EmployeeLegendWithColumns;
    }
}

// ===== SYSTÈME DE REDIMENSIONNEMENT DES CRÉNEAUX =====
// À ajouter dans employee-columns.js

/**
 * Gestionnaire du redimensionnement des créneaux
 */
class ShiftResizeManager {
    constructor() {
        this.isResizing = false;
        this.resizeType = null; // 'top' ou 'bottom'
        this.currentShift = null;
        this.startY = 0;
        this.originalDuration = 0;
        this.originalStartHour = 0;
        this.cellHeight = 60;

        this.setupGlobalListeners();
    }

    /**
     * Configure les événements globaux
     */
    setupGlobalListeners() {
        document.addEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
        document.addEventListener('selectstart', (e) => {
            if (this.isResizing) e.preventDefault();
        });
    }

    /**
     * Ajoute les poignées de redimensionnement à un créneau
     */
    addResizeHandles(shiftElement, shift) {
        // Poignée du haut
        const topHandle = document.createElement('div');
        topHandle.className = 'resize-handle resize-handle-top';
        topHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: rgba(255,255,255,0.2);
            cursor: ns-resize;
            z-index: 20;
            opacity: 0;
            transition: opacity 0.2s ease;
            border-top: 2px solid rgba(255,255,255,0.5);
        `;

        // Poignée du bas
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'resize-handle resize-handle-bottom';
        bottomHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: rgba(255,255,255,0.2);
            cursor: ns-resize;
            z-index: 20;
            opacity: 0;
            transition: opacity 0.2s ease;
            border-bottom: 2px solid rgba(255,255,255,0.5);
        `;

        // Événements pour la poignée du haut
        topHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.startResize(e, shift, 'top', shiftElement);
        });

        // Événements pour la poignée du bas
        bottomHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.startResize(e, shift, 'bottom', shiftElement);
        });

        // Afficher les poignées au survol
        shiftElement.addEventListener('mouseenter', () => {
            topHandle.style.opacity = '1';
            bottomHandle.style.opacity = '1';
        });

        shiftElement.addEventListener('mouseleave', () => {
            if (!this.isResizing) {
                topHandle.style.opacity = '0';
                bottomHandle.style.opacity = '0';
            }
        });

        // Ajouter les poignées au créneau
        shiftElement.appendChild(topHandle);
        shiftElement.appendChild(bottomHandle);

        // Marquer le créneau comme redimensionnable
        shiftElement.classList.add('resizable-shift');
    }

    /**
     * Démarre le redimensionnement
     */
    startResize(e, shift, type, shiftElement) {
        console.log(`🔧 Début redimensionnement ${type} pour shift ${shift.id}`);

        this.isResizing = true;
        this.resizeType = type;
        this.currentShift = shift;
        this.currentElement = shiftElement;
        this.startY = e.clientY;
        this.originalDuration = shift.duration;
        this.originalStartHour = shift.start_hour;

        // Style visuel pendant le resize
        shiftElement.style.outline = '2px solid #007bff';
        shiftElement.style.outlineOffset = '2px';
        document.body.style.cursor = 'ns-resize';

        // Désactiver le drag & drop pendant le resize
        shiftElement.draggable = false;

        // Notification
        if (typeof NotificationManager !== 'undefined') {
            const employee = AppState.employees.get(shift.employee_id);
            NotificationManager.show(
                `🔧 Redimensionnement ${employee?.prenom} (${type === 'top' ? 'début' : 'fin'})`,
                'info',
                1000
            );
        }
    }

    /**
     * Gère le mouvement de la souris pendant le redimensionnement
     */
    handleGlobalMouseMove(e) {
        if (!this.isResizing) return;

        const deltaY = e.clientY - this.startY;
        const deltaHours = Math.round(deltaY / this.cellHeight);

        let newStartHour, newDuration;

        if (this.resizeType === 'top') {
            // Redimensionnement par le haut : change l'heure de début et la durée
            newStartHour = Math.max(8, Math.min(23, this.originalStartHour + deltaHours));
            newDuration = Math.max(1, this.originalDuration - (newStartHour - this.originalStartHour));
        } else {
            // Redimensionnement par le bas : change seulement la durée
            newStartHour = this.originalStartHour;
            newDuration = Math.max(1, Math.min(12, this.originalDuration + deltaHours));
        }

        // Mise à jour visuelle temporaire
        this.updateShiftVisual(newStartHour, newDuration);

        // Afficher un feedback
        this.showResizeFeedback(newStartHour, newDuration);
    }

    /**
     * Met à jour l'affichage visuel pendant le redimensionnement
     */
    updateShiftVisual(newStartHour, newDuration) {
        if (!this.currentElement) return;

        // Calculer la nouvelle hauteur
        const newHeight = (this.cellHeight * newDuration) - 4;
        this.currentElement.style.height = `${newHeight}px`;

        // Si redimensionnement par le haut, repositionner aussi
        if (this.resizeType === 'top') {
            const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(this.currentShift.day);
            const newStartRowIndex = PlanningConfig.HOURS_RANGE.indexOf(newStartHour);

            if (newStartRowIndex !== -1) {
                // Repositionner la cellule de départ
                const newCell = document.querySelector(`[data-day="${this.currentShift.day}"][data-hour="${newStartHour}"]`);
                if (newCell && this.currentElement.parentNode !== newCell) {
                    newCell.appendChild(this.currentElement);
                }
            }
        }

        // Mettre à jour la durée affichée
        const durationElement = this.currentElement.querySelector('.shift-duration-corner');
        if (durationElement) {
            durationElement.textContent = newDuration > 1 ? `${newDuration}h` : '1h';
        }
    }

    /**
     * Affiche un feedback pendant le redimensionnement
     */
    showResizeFeedback(newStartHour, newDuration) {
        // Créer ou mettre à jour le tooltip de feedback
        let feedback = document.getElementById('resize-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'resize-feedback';
            feedback.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.9rem;
                z-index: 1000;
                pointer-events: none;
                backdrop-filter: blur(4px);
            `;
            document.body.appendChild(feedback);
        }

        const endHour = (newStartHour + newDuration) % 24;
        feedback.innerHTML = `
            🕐 ${newStartHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00<br>
            ⏱️ Durée: ${newDuration}h
        `;
    }

    /**
     * Termine le redimensionnement
     */
    handleGlobalMouseUp(e) {
        if (!this.isResizing) return;

        console.log('🏁 Fin redimensionnement');

        // Calculer les nouvelles valeurs finales
        const deltaY = e.clientY - this.startY;
        const deltaHours = Math.round(deltaY / this.cellHeight);

        let newStartHour, newDuration;

        if (this.resizeType === 'top') {
            newStartHour = Math.max(8, Math.min(23, this.originalStartHour + deltaHours));
            newDuration = Math.max(1, this.originalDuration - (newStartHour - this.originalStartHour));
        } else {
            newStartHour = this.originalStartHour;
            newDuration = Math.max(1, Math.min(12, this.originalDuration + deltaHours));
        }

        // Sauvegarder les changements
        this.saveResize(newStartHour, newDuration);

        // Nettoyage
        this.endResize();
    }

    /**
     * Sauvegarde le redimensionnement
     */
    async saveResize(newStartHour, newDuration) {
        try {
            const shift = this.currentShift;
            const oldStartHour = shift.start_hour;
            const oldDuration = shift.duration;

            // Vérifier si il y a un changement
            if (newStartHour === oldStartHour && newDuration === oldDuration) {
                console.log('⚠️ Aucun changement détecté');
                return;
            }

            console.log(`💾 Sauvegarde: ${oldStartHour}h (${oldDuration}h) → ${newStartHour}h (${newDuration}h)`);

            // Mise à jour locale
            shift.start_hour = newStartHour;
            shift.duration = newDuration;
            AppState.shifts.set(shift.id, shift);

            // Sauvegarde API
            if (typeof APIManager !== 'undefined') {
                const response = await APIManager.put(`/shifts/${shift.id}`, {
                    day: shift.day,
                    start_hour: newStartHour,
                    duration: newDuration,
                    employee_id: shift.employee_id,
                    notes: shift.notes
                });

                if (response.success) {
                    console.log('✅ Redimensionnement sauvegardé');

                    // Notification de succès
                    if (typeof NotificationManager !== 'undefined') {
                        const employee = AppState.employees.get(shift.employee_id);
                        const endHour = (newStartHour + newDuration) % 24;
                        NotificationManager.show(
                            `✅ ${employee?.prenom}: ${newStartHour}h-${endHour}h (${newDuration}h)`,
                            'success'
                        );
                    }
                } else {
                    throw new Error(response.error || 'Erreur API');
                }
            }

            // Rafraîchir l'affichage
            setTimeout(() => {
                if (typeof PlanningRenderer !== 'undefined') {
                    PlanningRenderer.generatePlanningGrid();
                }
            }, 100);

        } catch (error) {
            console.error('❌ Erreur sauvegarde redimensionnement:', error);

            // Restaurer les valeurs originales
            this.currentShift.start_hour = this.originalStartHour;
            this.currentShift.duration = this.originalDuration;
            AppState.shifts.set(this.currentShift.id, this.currentShift);

            // Notification d'erreur
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors du redimensionnement', 'error');
            }

            // Rafraîchir pour restaurer l'affichage
            if (typeof PlanningRenderer !== 'undefined') {
                PlanningRenderer.generatePlanningGrid();
            }
        }
    }

    /**
     * Nettoie après le redimensionnement
     */
    endResize() {
        // Restaurer les styles
        if (this.currentElement) {
            this.currentElement.style.outline = '';
            this.currentElement.style.outlineOffset = '';
            this.currentElement.draggable = true;

            // Masquer les poignées
            const handles = this.currentElement.querySelectorAll('.resize-handle');
            handles.forEach(handle => handle.style.opacity = '0');
        }

        document.body.style.cursor = '';

        // Supprimer le feedback
        const feedback = document.getElementById('resize-feedback');
        if (feedback) {
            feedback.remove();
        }

        // Reset des variables
        this.isResizing = false;
        this.resizeType = null;
        this.currentShift = null;
        this.currentElement = null;
    }
}

// Instance globale
const shiftResizeManager = new ShiftResizeManager();

// Ajouter aux extensions de PlanningRenderer
PlanningRendererColumnExtensions.setupShiftResize = function(shiftElement, shift) {
    // Ajouter les poignées de redimensionnement
    shiftResizeManager.addResizeHandles(shiftElement, shift);
};

console.log('🏛️ Système de colonnes d\'employés chargé (VERSION FINALE)');