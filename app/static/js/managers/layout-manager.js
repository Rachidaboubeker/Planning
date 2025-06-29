/**
 * LAYOUT CSS GRID COMPLET ET ROBUSTE
 * Système de grille moderne avec colonnes employés
 */

(function() {
    'use strict';

    console.log('🎨 Chargement du layout CSS Grid complet...');

    // ==================== CONFIGURATION ====================

    const LAYOUT_CONFIG = {
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
        hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
        cellHeight: 60,
        employeeColumnWidth: 120,
        hourColumnWidth: 60
    };

    // ==================== GESTION DES EMPLOYÉS ACTIFS ====================

    /**
     * Récupère les employés actifs triés
     */
    function getActiveEmployees() {
        if (!window.StateManager || !window.StateManager.getState) {
            console.warn('⚠️ StateManager non disponible');
            return [];
        }

        const state = window.StateManager.getState();
        const employees = state.employees || [];

        return employees
            .filter(emp => emp && emp.actif === true && emp.nom !== 'Supprimé')
            .sort((a, b) => {
                // Trier par poste puis par nom
                const posteOrder = { 'manager': 0, 'cuisinier': 1, 'serveur': 2, 'barman': 3, 'aide': 4, 'commis': 5 };
                const aOrder = posteOrder[a.poste] ?? 99;
                const bOrder = posteOrder[b.poste] ?? 99;

                if (aOrder !== bOrder) return aOrder - bOrder;
                return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
            });
    }

    // ==================== GÉNÉRATION CSS DYNAMIQUE ====================

    /**
     * Génère et applique les styles CSS Grid
     */
    function generateGridCSS(employeeCount) {
        const existingStyle = document.getElementById('dynamic-grid-css');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'dynamic-grid-css';

        // Calculer les colonnes: Heures + employés
        const totalColumns = 1 + employeeCount; // 1 colonne heures + N employés
        const gridTemplateColumns = `${LAYOUT_CONFIG.hourColumnWidth}px repeat(${employeeCount}, ${LAYOUT_CONFIG.employeeColumnWidth}px)`;

        style.textContent = `
            /* Conteneur principal */
            .planning-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }

            /* En-tête avec employés */
            .planning-header {
                display: grid;
                grid-template-columns: ${gridTemplateColumns};
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .header-cell {
                padding: 0.75rem 0.5rem;
                border-right: 1px solid #dee2e6;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                min-height: 80px;
                background: white;
                font-weight: 500;
            }

            .header-cell.corner {
                background: #e9ecef;
                font-weight: 600;
                color: #495057;
            }

            .employee-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .employee-header:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }

            .employee-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }

            .employee-header:hover::before {
                left: 100%;
            }

            .employee-name {
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 0.25rem;
            }

            .employee-role {
                font-size: 0.75rem;
                opacity: 0.9;
                padding: 0.125rem 0.5rem;
                background: rgba(255,255,255,0.2);
                border-radius: 10px;
            }

            /* Corps de la grille avec scroll */
            .planning-grid-container {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .planning-grid {
                display: grid;
                grid-template-columns: ${gridTemplateColumns};
                background: white;
                position: relative;
            }

            /* Cellules de temps */
            .time-cell {
                padding: 0.5rem;
                border-right: 1px solid #dee2e6;
                border-bottom: 1px solid #e9ecef;
                background: #f8f9fa;
                font-weight: 500;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                height: ${LAYOUT_CONFIG.cellHeight}px;
                font-size: 0.875rem;
                color: #495057;
                position: sticky;
                left: 0;
                z-index: 10;
            }

            /* Cellules d'employés */
            .employee-cell {
                border-right: 1px solid #dee2e6;
                border-bottom: 1px solid #e9ecef;
                height: ${LAYOUT_CONFIG.cellHeight}px;
                position: relative;
                background: white;
                transition: background-color 0.2s ease;
            }

            .employee-cell:hover {
                background-color: #f8f9fa;
            }

            .employee-cell[data-drop-zone="true"] {
                background-color: #e3f2fd;
                border: 2px dashed #2196f3;
            }

            .employee-cell[data-conflict="true"] {
                background-color: #ffebee;
            }

            /* Blocs de créneaux */
            .shift-block {
                position: absolute;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border-radius: 6px;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                font-weight: 500;
                cursor: grab;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transition: all 0.2s ease;
                z-index: 5;
                left: 2px;
                right: 2px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 30px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .shift-block:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                z-index: 6;
            }

            .shift-block:active {
                cursor: grabbing;
                transform: scale(1.02);
                z-index: 10;
            }

            .shift-block.dragging {
                opacity: 0.8;
                transform: rotate(3deg) scale(1.05);
                z-index: 20;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            }

            .shift-time {
                font-weight: 600;
                margin-bottom: 1px;
            }

            .shift-duration {
                font-size: 0.7rem;
                opacity: 0.9;
            }

            /* Couleurs par type d'employé */
            .employee-cell[data-employee-type="manager"] .shift-block {
                background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
            }

            .employee-cell[data-employee-type="cuisinier"] .shift-block {
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            }

            .employee-cell[data-employee-type="serveur"] .shift-block {
                background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            }

            .employee-cell[data-employee-type="barman"] .shift-block {
                background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
            }

            .employee-cell[data-employee-type="aide"] .shift-block {
                background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .planning-header,
                .planning-grid {
                    grid-template-columns: 50px repeat(${employeeCount}, 100px);
                }

                .employee-name {
                    font-size: 0.8rem;
                }

                .employee-role {
                    font-size: 0.7rem;
                }

                .shift-block {
                    font-size: 0.7rem;
                    padding: 0.125rem 0.25rem;
                }
            }

            /* Animation d'entrée */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .shift-block {
                animation: slideIn 0.3s ease-out;
            }

            /* États spéciaux */
            .employee-cell.highlight {
                background-color: #fff3cd;
                border-color: #ffc107;
            }

            .no-employees {
                grid-column: 1 / -1;
                padding: 2rem;
                text-align: center;
                color: #6c757d;
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
                margin: 1rem;
                border-radius: 8px;
            }
        `;

        document.head.appendChild(style);
        console.log(`🎨 CSS Grid généré pour ${employeeCount} employés`);
    }

    // ==================== GÉNÉRATION DE LA GRILLE ====================

    /**
     * Génère l'en-tête avec les employés
     */
    function generateHeader(employees) {
        const headerContainer = document.getElementById('planningHeader');
        if (!headerContainer) {
            console.error('❌ Container en-tête manquant');
            return;
        }

        let html = '';

        // Cellule coin
        html += `
            <div class="header-cell corner">
                <div>Heures</div>
            </div>
        `;

        // En-têtes employés
        employees.forEach(employee => {
            const typeInfo = window.CONFIG?.EMPLOYEE_TYPES?.[employee.poste] || { color: '#6c757d', name: employee.poste };

            html += `
                <div class="header-cell employee-header"
                     data-employee-id="${employee.id}"
                     data-employee-type="${employee.poste}"
                     style="background: linear-gradient(135deg, ${typeInfo.color} 0%, ${adjustColor(typeInfo.color, -20)} 100%)">
                    <div class="employee-name">${employee.prenom} ${employee.nom}</div>
                    <div class="employee-role">${typeInfo.name}</div>
                </div>
            `;
        });

        headerContainer.innerHTML = html;
        headerContainer.className = 'planning-header';
    }

    /**
     * Génère le corps de la grille
     */
    function generateGrid(employees) {
        const gridContainer = document.getElementById('planningGrid');
        if (!gridContainer) {
            console.error('❌ Container grille manquant');
            return;
        }

        if (employees.length === 0) {
            gridContainer.innerHTML = `
                <div class="no-employees">
                    <h3>Aucun employé actif</h3>
                    <p>Ajoutez des employés pour commencer à planifier</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Générer chaque ligne (heure)
        LAYOUT_CONFIG.hours.forEach(hour => {
            // Cellule heure
            const displayHour = hour === 0 ? '00:00' : (hour < 10 ? `0${hour}:00` : `${hour}:00`);
            html += `
                <div class="time-cell" data-hour="${hour}">
                    ${displayHour}
                </div>
            `;

            // Cellules employés pour cette heure
            employees.forEach(employee => {
                html += `
                    <div class="employee-cell"
                         data-employee-id="${employee.id}"
                         data-employee-type="${employee.poste}"
                         data-hour="${hour}"
                         data-drop-zone="false">
                    </div>
                `;
            });
        });

        gridContainer.innerHTML = html;
        gridContainer.className = 'planning-grid';

        console.log(`🏗️ Grille générée: ${LAYOUT_CONFIG.hours.length} heures × ${employees.length} employés`);
    }

    // ==================== RENDU DES CRÉNEAUX ====================

    /**
     * Rend les créneaux dans la grille
     */
    function renderShifts() {
        console.log('🎨 Rendu des créneaux...');

        // Nettoyer les créneaux existants
        document.querySelectorAll('.shift-block').forEach(block => block.remove());

        if (!window.StateManager) {
            console.warn('⚠️ StateManager non disponible');
            return;
        }

        const state = window.StateManager.getState();
        const shifts = state.shifts || [];
        const employees = state.employees || [];

        console.log(`📊 Données: ${employees.length} employés, ${shifts.length} créneaux`);

        if (shifts.length === 0) {
            console.log('ℹ️ Aucun créneau à rendre');
            return;
        }

        // Index des employés pour lookup rapide
        const employeeMap = new Map();
        employees.forEach(emp => employeeMap.set(emp.id, emp));

        let rendered = 0;

        shifts.forEach(shift => {
            const employee = employeeMap.get(shift.employee_id);
            if (!employee) {
                console.warn(`⚠️ Employé manquant pour créneau ${shift.id}: ${shift.employee_id}`);
                return;
            }

            // Calculer la position dans la grille
            const dayIndex = LAYOUT_CONFIG.days.indexOf(shift.day);
            const hourIndex = LAYOUT_CONFIG.hours.indexOf(shift.start_hour);

            if (dayIndex === -1 || hourIndex === -1) {
                console.warn(`⚠️ Position invalide pour créneau ${shift.id}: ${shift.day} ${shift.start_hour}h`);
                return;
            }

            // Trouver la cellule correspondante
            const cell = document.querySelector(
                `.employee-cell[data-employee-id="${employee.id}"][data-hour="${shift.start_hour}"]`
            );

            if (!cell) {
                console.warn(`⚠️ Cellule manquante pour ${employee.nom} ${employee.prenom} à ${shift.start_hour}h`);
                return;
            }

            // Créer le bloc créneau
            const shiftBlock = createShiftBlock(shift, employee);
            if (shiftBlock) {
                cell.appendChild(shiftBlock);
                rendered++;
            }
        });

        console.log(`✅ ${rendered} créneaux rendus`);

        // Réactiver le drag & drop
        setTimeout(() => {
            if (window.DragDropManager && window.DragDropManager.refresh) {
                window.DragDropManager.refresh();
            }
        }, 100);
    }

    /**
     * Crée un bloc de créneau
     */
    function createShiftBlock(shift, employee) {
        const duration = shift.duration || 1;
        const height = (duration * LAYOUT_CONFIG.cellHeight) - 4; // -4px pour les marges

        const block = document.createElement('div');
        block.className = 'shift-block';
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = employee.id;
        block.dataset.day = shift.day;
        block.dataset.hour = shift.start_hour;
        block.dataset.duration = duration;

        // Style et positionnement
        block.style.height = `${height}px`;
        block.style.top = '2px';

        // Contenu
        const endHour = (shift.start_hour + duration) % 24;
        const timeText = `${shift.start_hour}h - ${endHour}h`;
        const durationText = duration === 1 ? '1h' : `${duration}h`;

        block.innerHTML = `
            <div class="shift-time">${timeText}</div>
            <div class="shift-duration">${durationText}</div>
        `;

        // Couleur selon le type d'employé
        const typeInfo = window.CONFIG?.EMPLOYEE_TYPES?.[employee.poste];
        if (typeInfo) {
            block.style.background = `linear-gradient(135deg, ${typeInfo.color} 0%, ${adjustColor(typeInfo.color, -20)} 100%)`;
        }

        // Événements
        block.addEventListener('click', () => handleShiftClick(shift, employee));
        block.addEventListener('dblclick', () => handleShiftEdit(shift, employee));

        return block;
    }

    // ==================== GESTION DES ÉVÉNEMENTS ====================

    /**
     * Gère le clic sur un créneau
     */
    function handleShiftClick(shift, employee) {
        console.log(`👆 Clic sur créneau: ${employee.nom} ${employee.prenom} - ${shift.day} ${shift.start_hour}h`);

        // Sélectionner le créneau
        document.querySelectorAll('.shift-block').forEach(block => {
            block.classList.remove('selected');
        });

        const block = document.querySelector(`[data-shift-id="${shift.id}"]`);
        if (block) {
            block.classList.add('selected');
        }

        // Émettre un événement pour les autres composants
        if (window.EventsManager) {
            window.EventsManager.emit('shift:selected', { shift, employee });
        }
    }

    /**
     * Gère la modification d'un créneau
     */
    function handleShiftEdit(shift, employee) {
        console.log(`✏️ Édition créneau: ${employee.nom} ${employee.prenom} - ${shift.day} ${shift.start_hour}h`);

        if (window.ModalManager && window.ModalManager.showShiftModal) {
            window.ModalManager.showShiftModal(shift, employee);
        }
    }

    // ==================== UTILITAIRES ====================

    /**
     * Ajuste la luminosité d'une couleur
     */
    function adjustColor(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;

        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;

        return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    /**
     * Gère le redimensionnement de la fenêtre
     */
    function handleResize() {
        // Recalculer les dimensions si nécessaire
        const employees = getActiveEmployees();
        if (employees.length > 0) {
            generateGridCSS(employees.length);
        }
    }

    // ==================== API PRINCIPALE ====================

    /**
     * Initialise complètement le layout
     */
    function initializeLayout() {
        console.log('🚀 Initialisation du layout CSS Grid...');

        const employees = getActiveEmployees();
        console.log(`👥 ${employees.length} employés actifs trouvés`);

        if (employees.length === 0) {
            console.warn('⚠️ Aucun employé actif, affichage du message d\'aide');
            generateGridCSS(0);
            generateHeader([]);
            generateGrid([]);
            return;
        }

        // Générer le CSS
        generateGridCSS(employees.length);

        // Générer la structure
        generateHeader(employees);
        generateGrid(employees);

        // Rendre les créneaux
        setTimeout(() => {
            renderShifts();
        }, 50);

        console.log('✅ Layout CSS Grid initialisé');
    }

    /**
     * Rafraîchit complètement le layout
     */
    function refreshLayout() {
        console.log('🔄 Rafraîchissement du layout...');
        initializeLayout();
    }

    /**
     * Met à jour seulement les créneaux
     */
    function updateShifts() {
        console.log('🎨 Mise à jour des créneaux...');
        renderShifts();
    }

    // ==================== INTÉGRATION AVEC L'APPLICATION ====================

    /**
     * Remplace les méthodes du PlanningManager
     */
    function integratWithPlanningManager() {
        if (!window.PlanningManager) {
            console.warn('⚠️ PlanningManager non disponible');
            return;
        }

        // Remplacer les méthodes principales
        window.PlanningManager.generateGrid = initializeLayout;
        window.PlanningManager.renderShifts = updateShifts;
        window.PlanningManager.refresh = refreshLayout;

        // Ajouter de nouvelles méthodes
        window.PlanningManager.getActiveEmployees = getActiveEmployees;
        window.PlanningManager.updateLayout = refreshLayout;

        console.log('🔗 Intégration avec PlanningManager terminée');
    }

    /**
     * Écoute les changements de données
     */
    function setupDataListeners() {
        if (!window.EventsManager) {
            console.warn('⚠️ EventsManager non disponible');
            return;
        }

        // Écouter les changements d'employés
        window.EventsManager.addListener('planning:employee:added', refreshLayout);
        window.EventsManager.addListener('planning:employee:updated', refreshLayout);
        window.EventsManager.addListener('planning:employee:deleted', refreshLayout);

        // Écouter les changements de créneaux
        window.EventsManager.addListener('planning:shift:added', updateShifts);
        window.EventsManager.addListener('planning:shift:updated', updateShifts);
        window.EventsManager.addListener('planning:shift:deleted', updateShifts);

        // Écouter les changements de données globaux
        window.EventsManager.addListener('planning:data:loaded', refreshLayout);

        console.log('👂 Écouteurs de données configurés');
    }

    // ==================== INITIALISATION ET EXPOSITION ====================

    // Attendre que l'application soit prête
    setTimeout(() => {
        // Intégrer avec l'application existante
        integratWithPlanningManager();
        setupDataListeners();

        // Initialiser le layout
        initializeLayout();

        // Gérer le redimensionnement
        window.addEventListener('resize', handleResize);

        console.log('🎉 Layout CSS Grid complètement initialisé !');

    }, 1000);

    // Exposer l'API pour debug et contrôle manuel
    window.LayoutManager = {
        initialize: initializeLayout,
        refresh: refreshLayout,
        updateShifts: updateShifts,
        getActiveEmployees: getActiveEmployees,
        generateCSS: generateGridCSS,
        config: LAYOUT_CONFIG
    };

    console.log('🎨 Layout CSS Grid chargé');
    console.log('🛠️ API disponible: window.LayoutManager');

})();