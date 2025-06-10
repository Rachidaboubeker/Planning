/**
 * Planning Restaurant - JavaScript complet avec système d'avatars
 * Version complète et optimisée
 */

// Configuration globale
const PlanningConfig = {
    API_BASE: '/api',
    CELL_HEIGHT: 60,
    MIN_SHIFT_DURATION: 1,
    MAX_SHIFT_DURATION: 12,
    HOURS_RANGE: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    DAYS_OF_WEEK: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
};

// État global de l'application
const AppState = {
    employees: new Map(),
    shifts: new Map(),
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    isResizing: false,
    resizeDirection: null,
    currentWeekOffset: 0,
    isDirty: false
};

// ==================== GESTIONNAIRE D'AVATARS ====================

class AvatarManager {
    constructor() {
        this.photoCache = new Map();
        this.defaultPhotos = new Map();
        this.loadStoredPhotos();
    }

    loadStoredPhotos() {
        try {
            const stored = localStorage.getItem('employee_photos');
            if (stored) {
                const photos = JSON.parse(stored);
                Object.entries(photos).forEach(([employeeId, photoData]) => {
                    this.photoCache.set(employeeId, photoData);
                });
                console.log(`📸 ${this.photoCache.size} photos chargées depuis le stockage local`);
            }
        } catch (error) {
            console.warn('Erreur lors du chargement des photos:', error);
        }
    }

    savePhotos() {
        try {
            const photos = Object.fromEntries(this.photoCache);
            localStorage.setItem('employee_photos', JSON.stringify(photos));
            console.log(`💾 ${this.photoCache.size} photos sauvegardées`);
        } catch (error) {
            console.warn('Erreur lors de la sauvegarde des photos:', error);
        }
    }

    setEmployeePhoto(employeeId, photoFile) {
        return new Promise((resolve, reject) => {
            if (!photoFile) {
                this.photoCache.delete(employeeId);
                this.savePhotos();
                resolve(null);
                return;
            }

            // Vérifier la taille du fichier (5MB max)
            if (photoFile.size > 5 * 1024 * 1024) {
                reject(new Error('Fichier trop volumineux (max 5MB)'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.resizeImage(e.target.result, 64, 64).then(resizedImage => {
                        this.photoCache.set(employeeId, resizedImage);
                        this.savePhotos();
                        resolve(resizedImage);
                    }).catch(reject);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(photoFile);
        });
    }

    resizeImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;

                // Calculer les nouvelles dimensions en gardant le ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = height * (maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = width * (maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width = maxWidth;
                canvas.height = maxHeight;

                // Fond transparent
                ctx.clearRect(0, 0, maxWidth, maxHeight);

                // Centrer l'image
                const x = (maxWidth - width) / 2;
                const y = (maxHeight - height) / 2;

                // Créer un masque circulaire
                ctx.save();
                ctx.beginPath();
                ctx.arc(maxWidth / 2, maxHeight / 2, Math.min(maxWidth, maxHeight) / 2, 0, 2 * Math.PI);
                ctx.clip();

                // Dessiner l'image
                ctx.drawImage(img, x, y, width, height);
                ctx.restore();

                // Bordure circulaire
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(maxWidth / 2, maxHeight / 2, (Math.min(maxWidth, maxHeight) / 2) - 1, 0, 2 * Math.PI);
                ctx.stroke();

                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };

            img.src = dataUrl;
        });
    }

    generateDefaultAvatar(employee) {
        const key = `${employee.id}-${employee.prenom}-${employee.nom}-${employee.poste}`;

        if (this.defaultPhotos.has(key)) {
            return this.defaultPhotos.get(key);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;

        canvas.width = size;
        canvas.height = size;

        // Couleur de fond basée sur le type d'employé
        const colors = {
            'cuisinier': '#74b9ff',
            'serveur': '#00b894',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide': '#6c5ce7',
            'commis': '#fd79a8'
        };
        const bgColor = colors[employee.poste] || '#74b9ff';

        // Dessiner le cercle de fond
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Dégradé subtil
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Dessiner les initiales
        const initials = this.getInitials(employee);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText(initials, size / 2, size / 2);

        const dataUrl = canvas.toDataURL('image/png');
        this.defaultPhotos.set(key, dataUrl);
        return dataUrl;
    }

    generateQuestionMarkAvatar() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;

        canvas.width = size;
        canvas.height = size;

        // Cercle gris
        ctx.fillStyle = '#6c757d';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Point d'interrogation
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText('?', size / 2, size / 2);

        return canvas.toDataURL('image/png');
    }

    getInitials(employee) {
        if (!employee || !employee.prenom || !employee.nom) {
            return '?';
        }
        return (employee.prenom.charAt(0) + employee.nom.charAt(0)).toUpperCase();
    }

    getEmployeeAvatar(employee) {
        if (!employee) {
            return this.generateQuestionMarkAvatar();
        }

        // Photo personnalisée
        if (this.photoCache.has(employee.id)) {
            return this.photoCache.get(employee.id);
        }

        // Avatar généré avec initiales
        return this.generateDefaultAvatar(employee);
    }

    createAvatarElement(employee, size = 'normal') {
        const avatarContainer = document.createElement('div');
        avatarContainer.className = `shift-avatar-container ${size}`;

        const avatarImg = document.createElement('img');
        avatarImg.className = 'shift-avatar-img';
        avatarImg.src = this.getEmployeeAvatar(employee);
        avatarImg.alt = employee ? employee.nom_complet : 'Équipier inconnu';

        // Gestion d'erreur de chargement
        avatarImg.onerror = () => {
            avatarImg.src = this.generateQuestionMarkAvatar();
        };

        // Tooltip
        if (employee) {
            avatarImg.title = `${employee.nom_complet}\n${employee.type_info?.name || 'Poste inconnu'}\n📸 Clic pour changer la photo`;
        }

        avatarContainer.appendChild(avatarImg);

        // Indicateur de photo personnalisée
        if (employee && this.photoCache.has(employee.id)) {
            const indicator = document.createElement('div');
            indicator.className = 'avatar-photo-indicator';
            indicator.innerHTML = '<i class="fas fa-camera"></i>';
            indicator.title = 'Photo personnalisée';
            avatarContainer.appendChild(indicator);
        }

        return avatarContainer;
    }

    showPhotoModal(employee) {
        const content = `
            <div class="photo-manager">
                <div class="current-avatar">
                    <h3><i class="fas fa-user-circle"></i> Avatar actuel</h3>
                    <div class="avatar-preview">
                        <img src="${this.getEmployeeAvatar(employee)}" alt="Avatar actuel" class="current-avatar-img">
                    </div>
                    <p class="avatar-info">${this.photoCache.has(employee.id) ? 'Photo personnalisée' : 'Avatar généré automatiquement'}</p>
                </div>

                <div class="photo-upload">
                    <h3><i class="fas fa-upload"></i> Changer la photo</h3>
                    <div class="upload-area" onclick="document.getElementById('photoInput').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Cliquer pour sélectionner une photo</p>
                        <small>JPG, PNG - Max 5MB - Sera redimensionnée automatiquement</small>
                    </div>
                    <input type="file" id="photoInput" accept="image/jpeg,image/jpg,image/png" style="display: none;">

                    <div class="photo-preview" style="display: none;">
                        <h4>Aperçu</h4>
                        <img id="previewImg" class="preview-img">
                    </div>
                </div>

                <div class="photo-actions">
                    <button type="button" class="btn btn-outline" onclick="window.avatarManager.removePhoto('${employee.id}')">
                        <i class="fas fa-trash"></i> Supprimer la photo
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.avatarManager.generateRandomAvatar('${employee.id}')">
                        <i class="fas fa-dice"></i> Nouvel avatar
                    </button>
                </div>
            </div>
        `;

        const buttons = [
            {
                text: 'Fermer',
                class: 'btn-secondary',
                onclick: () => closeModal('globalModal')
            },
            {
                text: 'Sauvegarder',
                class: 'btn-primary',
                onclick: () => this.savePhotoFromModal(employee.id)
            }
        ];

        openModal(`📸 Photo de ${employee.nom_complet}`, content, buttons);
        this.setupPhotoModalEvents(employee);
    }

    setupPhotoModalEvents(employee) {
        const photoInput = document.getElementById('photoInput');
        const previewContainer = document.querySelector('.photo-preview');
        const previewImg = document.getElementById('previewImg');

        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        NotificationManager.show('❌ Fichier trop volumineux (max 5MB)', 'error');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (previewImg) previewImg.src = e.target.result;
                        if (previewContainer) previewContainer.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    async savePhotoFromModal(employeeId) {
        const photoInput = document.getElementById('photoInput');
        const file = photoInput ? photoInput.files[0] : null;

        if (file) {
            try {
                await this.setEmployeePhoto(employeeId, file);
                NotificationManager.show('✅ Photo mise à jour avec succès', 'success');

                // Mettre à jour l'affichage
                if (window.PlanningManager) {
                    PlanningManager.generatePlanningGrid();
                    PlanningManager.updateLegend();
                }

                closeModal('globalModal');
            } catch (error) {
                console.error('Erreur sauvegarde photo:', error);
                NotificationManager.show(`❌ ${error.message}`, 'error');
            }
        } else {
            closeModal('globalModal');
        }
    }

    removePhoto(employeeId) {
        this.photoCache.delete(employeeId);
        this.savePhotos();

        // Mettre à jour l'aperçu dans le modal
        const currentImg = document.querySelector('.current-avatar-img');
        if (currentImg) {
            const employee = AppState.employees.get(employeeId);
            currentImg.src = this.getEmployeeAvatar(employee);
        }

        const avatarInfo = document.querySelector('.avatar-info');
        if (avatarInfo) {
            avatarInfo.textContent = 'Avatar généré automatiquement';
        }

        NotificationManager.show('✅ Photo supprimée', 'success');

        // Mettre à jour le planning
        if (window.PlanningManager) {
            PlanningManager.generatePlanningGrid();
            PlanningManager.updateLegend();
        }
    }

    generateRandomAvatar(employeeId) {
        const employee = AppState.employees.get(employeeId);
        if (!employee) return;

        // Supprimer l'ancien avatar du cache
        const key = `${employee.id}-${employee.prenom}-${employee.nom}-${employee.poste}`;
        this.defaultPhotos.delete(key);

        // Créer un avatar avec une couleur légèrement différente
        const colors = ['#74b9ff', '#00b894', '#fdcb6e', '#a29bfe', '#6c5ce7', '#fd79a8', '#ff6b6b', '#4ecdc4'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        // Temporairement changer la couleur
        const originalType = employee.poste;
        const colorKey = Object.keys({
            'cuisinier': '#74b9ff',
            'serveur': '#00b894',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide': '#6c5ce7',
            'commis': '#fd79a8'
        }).find(k => k !== originalType) || 'serveur';

        employee.poste = colorKey;
        const newAvatar = this.generateDefaultAvatar(employee);
        employee.poste = originalType;

        // Mettre à jour l'aperçu
        const currentImg = document.querySelector('.current-avatar-img');
        if (currentImg) {
            currentImg.src = newAvatar;
        }

        NotificationManager.show('🎨 Nouvel avatar généré', 'success');

        // Mettre à jour le planning
        if (window.PlanningManager) {
            PlanningManager.generatePlanningGrid();
            PlanningManager.updateLegend();
        }
    }
}

// ==================== GESTIONNAIRE PRINCIPAL DU PLANNING ====================

class PlanningManager {
    static async initialize() {
        try {
            // Initialiser le gestionnaire d'avatars
            if (!window.avatarManager) {
                window.avatarManager = new AvatarManager();
            }

            // Réinitialiser les couleurs
            ColorManager.resetColors();

            await this.loadData();
            this.setupEventListeners();
            this.generatePlanningGrid();
            this.updateQuickStats();

            console.log('✅ Planning initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            NotificationManager.show('Erreur lors du chargement', 'error');
        }
    }

    static async loadData() {
        try {
            console.log('📥 Chargement des données...');

            // Charger les employés
            const employeesResponse = await APIManager.get('/employees');
            if (employeesResponse.success) {
                AppState.employees.clear();
                employeesResponse.employees.forEach(emp => {
                    AppState.employees.set(emp.id, emp);
                });
                console.log(`👥 ${employeesResponse.employees.length} employés chargés`);
            }

            // Charger les créneaux
            const shiftsResponse = await APIManager.get('/shifts');
            if (shiftsResponse.success) {
                AppState.shifts.clear();
                shiftsResponse.shifts.forEach(shift => {
                    AppState.shifts.set(shift.id, shift);
                });
                console.log(`📅 ${shiftsResponse.shifts.length} créneaux chargés`);
            }

        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error);
            throw error;
        }
    }

    static setupEventListeners() {
        // Navigation semaine
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousWeek();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextWeek();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveChanges();
                        break;
                }
            }
        });

        // Fermeture des modals avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                PlanningUI.closeAllModals();
            }
        });

        // Confirmation avant fermeture
        window.addEventListener('beforeunload', (e) => {
            if (AppState.isDirty) {
                e.preventDefault();
                e.returnValue = 'Vous avez des modifications non sauvegardées.';
            }
        });
    }

    static generatePlanningGrid() {
        const grid = document.getElementById('planningGrid');
        if (!grid) return;

        console.log('🏗️ Régénération de la grille...');

        // Vider la grille
        grid.innerHTML = '';

        // Créer les cellules
        PlanningConfig.HOURS_RANGE.forEach(hour => {
            // Colonne heure
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);

            // Colonnes jours
            PlanningConfig.DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                cell.dataset.hour = hour;
                cell.dataset.day = day;
                cell.dataset.dayIndex = dayIndex;

                this.setupCellEvents(cell, day, hour);
                grid.appendChild(cell);
            });
        });

        // Rendre les créneaux
        this.renderShifts();

        // Mettre à jour la légende
        this.updateLegend();
    }

    static setupCellEvents(cell, day, hour) {
        cell.dataset.hour = hour;
        cell.dataset.day = day;
        cell.dataset.dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(day);

        // Double-clic pour créer un créneau
        cell.addEventListener('dblclick', () => {
            PlanningUI.showAddShiftModal(day, hour);
        });

        // Setup drop zone
        DragDropManager.setupDropZone(cell);

        // Hover effects
        cell.addEventListener('mouseenter', () => {
            cell.classList.add('cell-hover');
            cell.title = `${day} ${hour.toString().padStart(2, '0')}:00\nDouble-clic pour ajouter un créneau`;
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('cell-hover');
        });
    }

    static renderShifts() {
        console.log('🎨 Rendu des créneaux...');
        const grid = document.getElementById('planningGrid');

        // Supprimer les anciens blocs
        grid.querySelectorAll('.shift-block').forEach(block => block.remove());

        let rendered = 0;
        AppState.shifts.forEach(shift => {
            const employee = AppState.employees.get(shift.employee_id);
            if (employee) {
                if (shift.duration === 1) {
                    this.renderSingleHourShift(shift, employee);
                } else {
                    this.renderMultiHourShift(shift, employee);
                }
                rendered++;
            } else {
                console.warn(`⚠️ Employé ${shift.employee_id} introuvable`);
            }
        });

        console.log(`✅ ${rendered} créneaux rendus`);
    }

    static renderSingleHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const cell = grid.querySelector(`[data-day="${shift.day}"][data-hour="${shift.start_hour}"]`);

        if (!cell) {
            console.warn(`❌ Cellule introuvable: ${shift.day} ${shift.start_hour}h`);
            return;
        }

        const existingBlocks = cell.querySelectorAll('.shift-block');
        const totalBlocks = existingBlocks.length + 1;

        const block = this.createShiftBlock(shift, employee, false);

        if (totalBlocks > 1) {
            existingBlocks.forEach((existingBlock, index) => {
                this.applyOverlapStyle(existingBlock, index, totalBlocks);
            });
            this.applyOverlapStyle(block, existingBlocks.length, totalBlocks);
        }

        cell.appendChild(block);
    }

    static renderMultiHourShift(shift, employee) {
        const grid = document.getElementById('planningGrid');
        const dayIndex = PlanningConfig.DAYS_OF_WEEK.indexOf(shift.day);
        const startHourIndex = PlanningConfig.HOURS_RANGE.indexOf(shift.start_hour);

        if (dayIndex === -1 || startHourIndex === -1) {
            console.warn(`❌ Index invalide: ${shift.day}=${dayIndex}, ${shift.start_hour}h=${startHourIndex}`);
            return;
        }

        const block = this.createShiftBlock(shift, employee, true);

        const rowStart = startHourIndex + 1;
        const rowEnd = rowStart + shift.duration;
        const column = dayIndex + 2;

        block.style.gridRow = `${rowStart} / ${rowEnd}`;
        block.style.gridColumn = column;
        block.style.position = 'relative';
        block.style.margin = '2px';
        block.style.zIndex = '5';

        grid.appendChild(block);
    }

    static createShiftBlock(shift, employee, isMultiHour) {
        const color = ColorManager.getEmployeeColor(shift.employee_id);

        const block = document.createElement('div');
        block.className = `shift-block ${isMultiHour ? 'multi-hour-block' : 'single-hour-block'}`;
        block.dataset.shiftId = shift.id;
        block.dataset.employeeId = shift.employee_id;

        // Styles de couleur
        block.style.background = `linear-gradient(135deg, ${color.bg}, ${color.border})`;
        block.style.borderColor = color.border;
        block.style.color = color.text;

        if (isMultiHour) {
            const startTime = shift.start_hour.toString().padStart(2, '0') + ':00';
            const endHour = (shift.start_hour + shift.duration) % 24;
            const endTime = endHour.toString().padStart(2, '0') + ':00';

            const avatarElement = window.avatarManager ?
                window.avatarManager.createAvatarElement(employee, 'normal') : null;

            block.innerHTML = `
                <div class="shift-header">
                    <div class="shift-info">
                        <div class="shift-employee-name">${employee.prenom}</div>
                        <div class="shift-duration">${shift.duration}h</div>
                    </div>
                </div>
                <div class="shift-time">${startTime} - ${endTime}</div>
                ${shift.notes ? `<div class="shift-notes">${shift.notes}</div>` : ''}
            `;

            if (avatarElement) {
                const shiftHeader = block.querySelector('.shift-header');
                shiftHeader.insertBefore(avatarElement, shiftHeader.firstChild);
            }
        } else {
            const avatarElement = window.avatarManager ?
                window.avatarManager.createAvatarElement(employee, 'small') : null;

            if (avatarElement) {
                block.appendChild(avatarElement);
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'shift-name';
            nameDiv.textContent = employee.prenom;
            block.appendChild(nameDiv);
        }

        // Tooltip
        const tooltip = `${employee.nom_complet}\n${employee.type_info?.name || employee.poste}\n${shift.day} ${shift.start_hour.toString().padStart(2, '0')}:00 (${shift.duration}h)\n\n🖱️ Glisser pour déplacer\n📸 Clic sur l'avatar pour la photo\n✏️ Double-clic pour modifier`;
        block.title = tooltip;

        // Événements
        this.setupShiftEvents(block, shift, employee);

        return block;
    }

    static setupShiftEvents(block, shift, employee) {
        // Double-clic pour éditer
        block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            PlanningUI.showEditShiftModal(shift);
        });

        // Clic sur l'avatar pour photo
        const avatarImg = block.querySelector('.shift-avatar-img');
        if (avatarImg) {
            avatarImg.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openPhotoModal(employee.id);
            });
        }

        // Drag & drop
        DragDropManager.setupDragAndDrop(block, shift);
    }

    static applyOverlapStyle(block, index, total) {
        const widthPercent = Math.floor(100 / total);
        const leftPercent = widthPercent * index;

        block.style.position = 'absolute';
        block.style.left = `${leftPercent}%`;
        block.style.width = `${widthPercent - 1}%`;
        block.style.top = '2px';
        block.style.bottom = '2px';
        block.style.zIndex = `${10 + index}`;

        // Réduire la taille de l'avatar si nécessaire
        const avatarContainer = block.querySelector('.shift-avatar-container');
        if (avatarContainer && total > 2) {
            avatarContainer.classList.add('small');

            const avatarImg = avatarContainer.querySelector('.shift-avatar-img');
            if (avatarImg) {
                avatarImg.style.width = '20px';
                avatarImg.style.height = '20px';
            }
        }

        // Ajuster la taille du texte pour les petits créneaux
        if (total > 2) {
            const shiftName = block.querySelector('.shift-name');
            if (shiftName) {
                shiftName.style.fontSize = '0.7rem';
            }
        }
    }

    static async updateQuickStats() {
        try {
            const stats = await APIManager.get('/stats/weekly');
            if (stats.success) {
                const data = stats.stats;

                const elements = {
                    totalHours: document.getElementById('totalHoursDisplay'),
                    activeEmployees: document.getElementById('activeEmployeesDisplay'),
                    averageHours: document.getElementById('averageHoursDisplay')
                };

                if (elements.totalHours) elements.totalHours.textContent = data.total_hours;
                if (elements.activeEmployees) elements.activeEmployees.textContent = data.active_employees;
                if (elements.averageHours) elements.averageHours.textContent = `${data.average_hours}h`;
            }
        } catch (error) {
            console.error('Erreur mise à jour stats:', error);
        }
    }

    static updateLegend() {
        const container = document.getElementById('legendContainer');
        if (!container) return;

        console.log('📋 Mise à jour de la légende...');

        const activeEmployees = Array.from(AppState.employees.values())
            .filter(emp => emp.actif)
            .sort((a, b) => a.nom.localeCompare(b.nom));

        if (activeEmployees.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="legend-title">
                <i class="fas fa-users"></i> Équipe (${activeEmployees.length} personnes)
                <div class="legend-actions">
                    <button class="btn btn-sm btn-outline" onclick="showBulkPhotoModal()">
                        <i class="fas fa-images"></i> Gérer les photos
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="generateRandomAvatars()">
                        <i class="fas fa-dice"></i> Nouveaux avatars
                    </button>
                </div>
            </div>
            <div class="legend-grid" id="legendGrid"></div>
        `;

        const legendGrid = document.getElementById('legendGrid');

        activeEmployees.forEach(employee => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.dataset.employeeId = employee.id;

            const avatarElement = window.avatarManager ?
                window.avatarManager.createAvatarElement(employee, 'normal') : null;

            legendItem.innerHTML = `
                <div class="legend-info">
                    <div class="legend-name">${employee.nom_complet}</div>
                    <div class="legend-role">${employee.type_info?.name || employee.poste}</div>
                </div>
            `;

            if (avatarElement) {
                legendItem.insertBefore(avatarElement, legendItem.firstChild);
            }

            // Événements
            legendItem.addEventListener('click', () => {
                window.openPhotoModal(employee.id);
            });

            legendItem.addEventListener('mouseenter', () => {
                document.querySelectorAll(`[data-employee-id="${employee.id}"]`).forEach(block => {
                    block.style.transform = 'scale(1.02)';
                    block.style.zIndex = '20';
                });
            });

            legendItem.addEventListener('mouseleave', () => {
                document.querySelectorAll(`[data-employee-id="${employee.id}"]`).forEach(block => {
                    block.style.transform = '';
                    block.style.zIndex = '';
                });
            });

            legendGrid.appendChild(legendItem);
        });

        console.log(`✅ Légende mise à jour avec ${activeEmployees.length} employés`);
    }

    static previousWeek() {
        AppState.currentWeekOffset--;
        this.updateWeekDisplay();
        this.generatePlanningGrid();
    }

    static nextWeek() {
        AppState.currentWeekOffset++;
        this.updateWeekDisplay();
        this.generatePlanningGrid();
    }

    static updateWeekDisplay() {
        const weekTitle = document.getElementById('weekTitle');
        if (!weekTitle) return;

        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (AppState.currentWeekOffset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const options = { day: 'numeric', month: 'long' };
        const mondayStr = monday.toLocaleDateString('fr-FR', options);
        const sundayStr = sunday.toLocaleDateString('fr-FR', options);

        weekTitle.textContent = `Semaine du ${mondayStr} au ${sundayStr}`;
    }

    static markDirty() {
        AppState.isDirty = true;
        document.title = '• Planning Restaurant (non sauvegardé)';
    }

    static markClean() {
        AppState.isDirty = false;
        document.title = 'Planning Restaurant';
    }

    static async saveChanges() {
        if (!AppState.isDirty) return;

        try {
            NotificationManager.show('Modifications sauvegardées', 'success');
            this.markClean();
        } catch (error) {
            NotificationManager.show('Erreur lors de la sauvegarde', 'error');
        }
    }
}

// ==================== GESTIONNAIRE DES APPELS API ====================

class APIManager {
    static async request(method, endpoint, data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${PlanningConfig.API_BASE}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur réseau');
            }

            return result;
        } catch (error) {
            console.error(`Erreur API ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request('GET', endpoint);
    }

    static async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    static async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    static async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
}

// ==================== GESTIONNAIRE DU DRAG & DROP ====================

class DragDropManager {
    static setupDragAndDrop(element, shift) {
        element.draggable = true;

        element.addEventListener('dragstart', (e) => {
            AppState.draggedElement = element;
            e.dataTransfer.setData('text/plain', shift.id);
            element.classList.add('dragging');

            // Aperçu personnalisé
            const dragImage = element.cloneNode(true);
            dragImage.style.transform = 'rotate(5deg)';
            dragImage.style.opacity = '0.8';
            dragImage.style.position = 'fixed';
            dragImage.style.top = '-1000px';
            dragImage.style.pointerEvents = 'none';
            document.body.appendChild(dragImage);

            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);

            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 0);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.cleanupDragState();
        });
    }

    static setupDropZone(cell) {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(cell);
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over', 'invalid-drop');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e, cell);
        });
    }

    static handleDragOver(cell) {
        if (!AppState.draggedElement) return;

        const shiftId = AppState.draggedElement.dataset.shiftId;
        const shift = AppState.shifts.get(shiftId);

        if (this.validateDrop(cell, shift)) {
            cell.classList.add('drag-over');
            cell.classList.remove('invalid-drop');
        } else {
            cell.classList.add('invalid-drop');
            cell.classList.remove('drag-over');
        }
    }

    static validateDrop(cell, shift) {
        const targetHour = parseInt(cell.dataset.hour);
        const targetDay = cell.dataset.day;

        // Même position
        if (shift.day === targetDay && shift.start_hour === targetHour) {
            return false;
        }

        // Heure dans la plage
        if (!PlanningConfig.HOURS_RANGE.includes(targetHour)) {
            return false;
        }

        // Vérifier si le créneau peut tenir
        const targetIndex = PlanningConfig.HOURS_RANGE.indexOf(targetHour);
        if (targetIndex + shift.duration > PlanningConfig.HOURS_RANGE.length) {
            return false;
        }

        // Vérifier les conflits
        for (const [otherShiftId, otherShift] of AppState.shifts) {
            if (otherShiftId === shift.id) continue;
            if (otherShift.employee_id !== shift.employee_id) continue;
            if (otherShift.day !== targetDay) continue;

            const otherStart = otherShift.start_hour;
            const otherEnd = (otherShift.start_hour + otherShift.duration) % 24;
            const newStart = targetHour;
            const newEnd = (targetHour + shift.duration) % 24;

            // Détection simple des chevauchements
            if (otherStart <= otherEnd && newStart <= newEnd) {
                if (!(newEnd <= otherStart || newStart >= otherEnd)) {
                    return false;
                }
            }
        }

        return true;
    }

    static async handleDrop(e, cell) {
        const shiftId = e.dataTransfer.getData('text/plain');
        const shift = AppState.shifts.get(shiftId);

        if (!shift || !this.validateDrop(cell, shift)) {
            NotificationManager.show('❌ Déplacement impossible à cet endroit', 'error');
            this.cleanupDragState();
            return;
        }

        const newDay = cell.dataset.day;
        const newHour = parseInt(cell.dataset.hour);

        try {
            const result = await APIManager.put(`/shifts/${shiftId}`, {
                day: newDay,
                start_hour: newHour
            });

            if (result.success) {
                AppState.shifts.set(shiftId, result.shift);
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                NotificationManager.show('✅ Créneau déplacé avec succès', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur lors du déplacement:', error);
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }

        this.cleanupDragState();
    }

    static cleanupDragState() {
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.classList.remove('drag-over', 'invalid-drop');
        });

        document.querySelectorAll('.shift-block').forEach(block => {
            block.classList.remove('dragging');
        });

        AppState.draggedElement = null;
    }
}

// ==================== GESTIONNAIRE DE L'INTERFACE UTILISATEUR ====================

class PlanningUI {
    static showAddShiftModal(defaultDay = '', defaultHour = '') {
        const modal = document.getElementById('addShiftModal');
        if (!modal) return;

        if (defaultDay) {
            const daySelect = document.getElementById('shiftDay');
            if (daySelect) daySelect.value = defaultDay;
        }

        if (defaultHour !== '') {
            const hourSelect = document.getElementById('shiftStartHour');
            if (hourSelect) hourSelect.value = defaultHour;
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    static showEditShiftModal(shift) {
        const employee = AppState.employees.get(shift.employee_id);
        if (!employee) return;

        const content = `
            <form id="editShiftForm" class="form">
                <div class="form-group">
                    <label>Équipier</label>
                    <input type="text" value="${employee.nom_complet}" readonly>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editShiftDay">Jour</label>
                        <select id="editShiftDay" required>
                            ${PlanningConfig.DAYS_OF_WEEK.map(day =>
                                `<option value="${day}" ${day === shift.day ? 'selected' : ''}>${day}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftStartHour">Heure de début</label>
                        <select id="editShiftStartHour" required>
                            ${PlanningConfig.HOURS_RANGE.map(hour =>
                                `<option value="${hour}" ${hour === shift.start_hour ? 'selected' : ''}>${hour.toString().padStart(2, '0')}:00</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editShiftDuration">Durée (heures)</label>
                        <select id="editShiftDuration" required>
                            ${Array.from({length: 12}, (_, i) => i + 1).map(i =>
                                `<option value="${i}" ${i === shift.duration ? 'selected' : ''}>${i}h</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editShiftNotes">Notes</label>
                    <textarea id="editShiftNotes" placeholder="Remarques, consignes spéciales...">${shift.notes || ''}</textarea>
                </div>
            </form>
        `;

        const buttons = [
            {
                text: 'Supprimer',
                class: 'btn-danger',
                onclick: () => this.deleteShift(shift.id)
            },
            {
                text: 'Annuler',
                class: 'btn-secondary',
                onclick: () => closeModal('globalModal')
            },
            {
                text: 'Sauvegarder',
                class: 'btn-primary',
                onclick: () => this.updateShift(shift.id)
            }
        ];

        openModal(`Modifier le créneau de ${employee.prenom}`, content, buttons);
    }

    static async updateShift(shiftId) {
        const form = document.getElementById('editShiftForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const data = {
            day: document.getElementById('editShiftDay').value,
            start_hour: parseInt(document.getElementById('editShiftStartHour').value),
            duration: parseInt(document.getElementById('editShiftDuration').value),
            notes: document.getElementById('editShiftNotes').value
        };

        try {
            const result = await APIManager.put(`/shifts/${shiftId}`, data);

            if (result.success) {
                AppState.shifts.set(shiftId, result.shift);
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                closeModal('globalModal');
                NotificationManager.show('✅ Créneau modifié', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }
    }

    static async deleteShift(shiftId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) return;

        try {
            const result = await APIManager.delete(`/shifts/${shiftId}`);

            if (result.success) {
                AppState.shifts.delete(shiftId);
                PlanningManager.generatePlanningGrid();
                PlanningManager.updateQuickStats();
                PlanningManager.markDirty();

                closeModal('globalModal');
                NotificationManager.show('✅ Créneau supprimé', 'success');
            } else {
                NotificationManager.show(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            NotificationManager.show('❌ Erreur de connexion', 'error');
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }

    static showAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
}

// ==================== GESTIONNAIRE DES NOTIFICATIONS ====================

class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notifications') || this.createContainer();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 10);

        // Suppression automatique
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }
}

// ==================== GESTIONNAIRE DE COULEURS ====================

class ColorManager {
    static colorPalette = [
        { bg: '#74b9ff', border: '#0984e3', text: 'white' },
        { bg: '#00b894', border: '#00a085', text: 'white' },
        { bg: '#fdcb6e', border: '#e17055', text: 'white' },
        { bg: '#a29bfe', border: '#6c5ce7', text: 'white' },
        { bg: '#fd79a8', border: '#e84393', text: 'white' },
        { bg: '#6c5ce7', border: '#5f3dc4', text: 'white' },
        { bg: '#ff6b6b', border: '#ee5a24', text: 'white' },
        { bg: '#4ecdc4', border: '#26d0ce', text: 'white' }
    ];

    static employeeColors = new Map();
    static colorIndex = 0;

    static getEmployeeColor(employeeId) {
        if (!this.employeeColors.has(employeeId)) {
            const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
            this.employeeColors.set(employeeId, color);
            this.colorIndex++;
        }
        return this.employeeColors.get(employeeId);
    }

    static resetColors() {
        this.employeeColors.clear();
        this.colorIndex = 0;
    }
}

// ==================== FONCTIONS GLOBALES ====================

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
        notes: document.getElementById('shiftNotes').value
    };

    try {
        const result = await APIManager.post('/shifts', shiftData);

        if (result.success) {
            AppState.shifts.set(result.shift.id, result.shift);
            PlanningManager.generatePlanningGrid();
            PlanningManager.updateQuickStats();
            PlanningManager.markDirty();

            closeModal('addShiftModal');
            form.reset();
            NotificationManager.show('✅ Créneau ajouté', 'success');
        } else {
            NotificationManager.show(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

window.addEmployee = async function() {
    const form = document.getElementById('addEmployeeForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const employeeData = {
        prenom: document.getElementById('employeePrenom').value,
        nom: document.getElementById('employeeNom').value,
        poste: document.getElementById('employeePoste').value,
        taux_horaire: parseFloat(document.getElementById('employeeTauxHoraire').value),
        email: document.getElementById('employeeEmail').value,
        telephone: document.getElementById('employeeTelephone').value
    };

    try {
        const result = await APIManager.post('/employees', employeeData);

        if (result.success) {
            AppState.employees.set(result.employee.id, result.employee);

            // Gérer la photo si elle existe
            const photoFile = document.getElementById('employeePhoto')?.files[0];
            if (photoFile && window.avatarManager) {
                try {
                    await window.avatarManager.setEmployeePhoto(result.employee.id, photoFile);
                } catch (photoError) {
                    console.warn('Erreur lors de la sauvegarde de la photo:', photoError);
                }
            }

            // Ajouter à la liste déroulante
            const shiftEmployeeSelect = document.getElementById('shiftEmployee');
            if (shiftEmployeeSelect) {
                const option = document.createElement('option');
                option.value = result.employee.id;
                option.textContent = `${result.employee.nom_complet} (${result.employee.type_info.name})`;
                shiftEmployeeSelect.appendChild(option);
            }

            PlanningManager.updateLegend();

            closeModal('addEmployeeModal');
            form.reset();
            NotificationManager.show('✅ Équipier ajouté avec succès', 'success');
        } else {
            NotificationManager.show(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        NotificationManager.show('❌ Erreur de connexion', 'error');
    }
};

window.showAddShiftModal = function(day, hour) {
    PlanningUI.showAddShiftModal(day, hour);
};

window.showAddEmployeeModal = function() {
    PlanningUI.showAddEmployeeModal();
};

window.previousWeek = function() {
    PlanningManager.previousWeek();
};

window.nextWeek = function() {
    PlanningManager.nextWeek();
};

window.openPhotoModal = function(employeeId) {
    const employee = AppState.employees.get(employeeId);
    if (employee && window.avatarManager) {
        window.avatarManager.showPhotoModal(employee);
    }
};

window.generateRandomAvatars = function() {
    if (!window.avatarManager) return;

    const employees = Array.from(AppState.employees.values()).filter(emp => emp.actif);

    employees.forEach(employee => {
        window.avatarManager.generateRandomAvatar(employee.id);
    });

    PlanningManager.generatePlanningGrid();
    NotificationManager.show('🎨 Nouveaux avatars générés', 'success');
};

window.showBulkPhotoModal = function() {
    const content = `
        <div class="bulk-photo-manager">
            <div class="bulk-header">
                <h3>Gestion des photos de l'équipe</h3>
                <div class="bulk-stats">
                    <span id="photoCountDisplay">${window.avatarManager ? window.avatarManager.photoCache.size : 0}</span> photos personnalisées
                </div>
            </div>

            <div class="bulk-actions">
                <button class="btn btn-outline" onclick="selectAllPhotos()">
                    <i class="fas fa-check-square"></i> Tout sélectionner
                </button>
                <button class="btn btn-warning" onclick="clearSelectedPhotos()">
                    <i class="fas fa-trash"></i> Supprimer sélectionnées
                </button>
                <button class="btn btn-secondary" onclick="generateRandomAvatars()">
                    <i class="fas fa-dice"></i> Nouveaux avatars
                </button>
            </div>

            <div class="employees-photo-grid" id="employeesPhotoGrid">
                <!-- Généré par JavaScript -->
            </div>
        </div>
    `;

    const buttons = [
        {
            text: 'Fermer',
            class: 'btn-secondary',
            onclick: () => closeModal('globalModal')
        }
    ];

    openModal('📸 Gestion des photos', content, buttons);
    generateEmployeesPhotoGrid();
};

function generateEmployeesPhotoGrid() {
    const grid = document.getElementById('employeesPhotoGrid');
    if (!grid || !window.avatarManager) return;

    const employees = Array.from(AppState.employees.values())
        .filter(emp => emp.actif)
        .sort((a, b) => a.nom.localeCompare(b.nom));

    grid.innerHTML = employees.map(employee => `
        <div class="employee-photo-item" data-employee-id="${employee.id}">
            <div class="employee-photo-card">
                <div class="photo-checkbox">
                    <input type="checkbox" class="photo-select" data-employee-id="${employee.id}">
                </div>
                <img src="${window.avatarManager.getEmployeeAvatar(employee)}"
                     alt="${employee.nom_complet}"
                     class="employee-photo-img"
                     onclick="window.openPhotoModal('${employee.id}')">
                <div class="employee-photo-info">
                    <div class="employee-photo-name">${employee.nom_complet}</div>
                    <div class="employee-photo-role">${employee.type_info?.name || employee.poste}</div>
                    <div class="photo-type">${window.avatarManager.photoCache.has(employee.id) ? 'Photo personnalisée' : 'Avatar généré'}</div>
                </div>
            </div>
        </div>
    `).join('');
}

window.selectAllPhotos = function() {
    document.querySelectorAll('.photo-select').forEach(checkbox => {
        checkbox.checked = true;
    });
};

window.clearSelectedPhotos = function() {
    const selectedCheckboxes = document.querySelectorAll('.photo-select:checked');

    if (selectedCheckboxes.length === 0) {
        NotificationManager.show('❌ Aucune photo sélectionnée', 'warning');
        return;
    }

    if (confirm(`Supprimer ${selectedCheckboxes.length} photo(s) ?`)) {
        selectedCheckboxes.forEach(checkbox => {
            const employeeId = checkbox.dataset.employeeId;
            if (window.avatarManager) {
                window.avatarManager.removePhoto(employeeId);
            }
        });

        generateEmployeesPhotoGrid();
        PlanningManager.generatePlanningGrid();
        PlanningManager.updateLegend();

        // Mettre à jour le compteur
        const photoCountDisplay = document.getElementById('photoCountDisplay');
        if (photoCountDisplay && window.avatarManager) {
            photoCountDisplay.textContent = window.avatarManager.photoCache.size;
        }

        NotificationManager.show('✅ Photos supprimées', 'success');
    }
};

// ==================== INITIALISATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation de l\'application Planning Restaurant...');

    // Initialiser le gestionnaire d'avatars
    try {
        if (!window.avatarManager) {
            window.avatarManager = new AvatarManager();
            console.log('✅ Gestionnaire d\'avatars initialisé');
        }
    } catch (error) {
        console.error('❌ Erreur initialisation avatars:', error);
    }

    // Initialiser le planning
    PlanningManager.initialize();
});

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('❌ Erreur JavaScript:', e.error);
    NotificationManager.show('Une erreur inattendue s\'est produite', 'error');
});

// Raccourcis clavier
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        PlanningUI.closeAllModals();
    }
});

// Gestion réseau
window.addEventListener('online', function() {
    NotificationManager.show('🌐 Connexion rétablie', 'success');
});

window.addEventListener('offline', function() {
    NotificationManager.show('⚠️ Connexion perdue - Mode hors ligne', 'warning', 5000);
});

// Export pour les modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanningManager,
        APIManager,
        DragDropManager,
        PlanningUI,
        NotificationManager,
        AvatarManager,
        ColorManager
    };
}

console.log('📋 Planning Restaurant JS chargé avec succès');
console.log('🎨 Système d\'avatars activé');
console.log('🚀 Application prête à l\'utilisation');