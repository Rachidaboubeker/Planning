/**
 * Planning Restaurant - Gestionnaire des avatars
 * Gestion des photos et avatars des employés
 */

class AvatarManager {
    constructor() {
        this.photoCache = new Map();
        this.defaultPhotos = new Map();
        this.isInitialized = false;

        this.init();
    }

    /**
     * Initialise le gestionnaire
     */
    init() {
        try {
            this.loadStoredPhotos();
            this.isInitialized = true;
            Logger.info('AvatarManager initialisé avec succès');
            EventBus.emit(PlanningEvents.PHOTO_UPDATED);
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation d\'AvatarManager:', error);
        }
    }

    /**
     * Charge les photos stockées localement
     */
    loadStoredPhotos() {
        try {
            const stored = localStorage.getItem('planning_employee_photos');
            if (stored) {
                const photos = JSON.parse(stored);
                this.photoCache.clear();

                Object.entries(photos).forEach(([employeeId, photoData]) => {
                    // Valider les données
                    if (this.isValidPhotoData(photoData)) {
                        this.photoCache.set(employeeId, photoData);
                    }
                });

                Logger.info(`Photos chargées: ${this.photoCache.size} photos trouvées`);
            }
        } catch (error) {
            Logger.warn('Erreur lors du chargement des photos:', error);
            // Nettoyer les données corrompues
            localStorage.removeItem('planning_employee_photos');
        }
    }

    /**
     * Valide les données d'une photo
     */
    isValidPhotoData(photoData) {
        return photoData &&
               typeof photoData === 'string' &&
               photoData.startsWith('data:image/') &&
               photoData.length > 100; // Taille minimale raisonnable
    }

    /**
     * Sauvegarde les photos localement
     */
    savePhotos() {
        try {
            const photos = Object.fromEntries(this.photoCache);
            localStorage.setItem('planning_employee_photos', JSON.stringify(photos));
            Logger.debug(`Photos sauvegardées: ${this.photoCache.size} photos`);
        } catch (error) {
            Logger.error('Erreur lors de la sauvegarde des photos:', error);

            // Si l'erreur est due à un manque d'espace, essayer de nettoyer
            if (error.name === 'QuotaExceededError') {
                this.cleanupOldPhotos();
                try {
                    const photos = Object.fromEntries(this.photoCache);
                    localStorage.setItem('planning_employee_photos', JSON.stringify(photos));
                } catch (retryError) {
                    Logger.error('Impossible de sauvegarder même après nettoyage:', retryError);
                }
            }
        }
    }

    /**
     * Nettoie les anciennes photos pour libérer de l'espace
     */
    cleanupOldPhotos() {
        const activeEmployeeIds = new Set(AppState.employees.keys());
        const photosToRemove = [];

        this.photoCache.forEach((photo, employeeId) => {
            if (!activeEmployeeIds.has(employeeId)) {
                photosToRemove.push(employeeId);
            }
        });

        photosToRemove.forEach(employeeId => {
            this.photoCache.delete(employeeId);
        });

        Logger.info(`Nettoyage: ${photosToRemove.length} photos supprimées`);
    }

    /**
     * Définit la photo d'un employé
     */
    async setEmployeePhoto(employeeId, photoFile) {
        if (!photoFile) {
            return this.removePhoto(employeeId);
        }

        // Validations
        if (!this.validatePhotoFile(photoFile)) {
            throw new Error('Fichier photo invalide');
        }

        try {
            const resizedImage = await this.processPhotoFile(photoFile);
            this.photoCache.set(employeeId, resizedImage);
            this.savePhotos();

            EventBus.emit(PlanningEvents.PHOTO_UPDATED, { employeeId });
            Logger.info(`Photo mise à jour pour l'employé ${employeeId}`);

            return resizedImage;
        } catch (error) {
            Logger.error('Erreur lors du traitement de la photo:', error);
            throw error;
        }
    }

    /**
     * Valide un fichier photo
     */
    validatePhotoFile(file) {
        // Vérifier la taille
        if (file.size > PlanningConfig.MAX_PHOTO_SIZE) {
            throw new Error(`Fichier trop volumineux (max ${PlanningConfig.MAX_PHOTO_SIZE / 1024 / 1024}MB)`);
        }

        // Vérifier le type
        if (!PlanningConfig.PHOTO_FORMATS.includes(file.type)) {
            throw new Error(`Format non supporté. Formats acceptés: ${PlanningConfig.PHOTO_FORMATS.join(', ')}`);
        }

        return true;
    }

    /**
     * Traite un fichier photo (redimensionnement, compression)
     */
    async processPhotoFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const resizedImage = await this.resizeImage(
                        e.target.result,
                        PlanningConfig.AVATAR_SIZE.large,
                        PlanningConfig.AVATAR_SIZE.large
                    );
                    resolve(resizedImage);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Redimensionne une image
     */
    async resizeImage(dataUrl, maxWidth, maxHeight, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // Calculer les nouvelles dimensions en gardant le ratio
                    let { width, height } = img;

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

                    // Ajouter une bordure circulaire subtile
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(maxWidth / 2, maxHeight / 2, (Math.min(maxWidth, maxHeight) / 2) - 1, 0, 2 * Math.PI);
                    ctx.stroke();

                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
            img.src = dataUrl;
        });
    }

    /**
     * Génère un avatar par défaut avec les initiales
     */
    generateDefaultAvatar(employee) {
        const cacheKey = `${employee.id}-${employee.prenom}-${employee.nom}-${employee.poste}`;

        if (this.defaultPhotos.has(cacheKey)) {
            return this.defaultPhotos.get(cacheKey);
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = PlanningConfig.AVATAR_SIZE.large;

            canvas.width = size;
            canvas.height = size;

            // Couleur de fond basée sur le type d'employé
            const bgColor = this.getEmployeeTypeColor(employee.poste);

            // Dessiner le cercle de fond
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Dégradé subtil pour donner du relief
            const gradient = ctx.createRadialGradient(
                size / 2, size / 2, 0,
                size / 2, size / 2, size / 2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Dessiner les initiales
            const initials = this.getInitials(employee);
            ctx.fillStyle = 'white';
            ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetY = 1;
            ctx.fillText(initials, size / 2, size / 2);

            const dataUrl = canvas.toDataURL('image/png');
            this.defaultPhotos.set(cacheKey, dataUrl);
            return dataUrl;
        } catch (error) {
            Logger.error('Erreur lors de la génération d\'avatar:', error);
            return this.generateQuestionMarkAvatar();
        }
    }

    /**
     * Obtient la couleur associée à un type d'employé
     */
    getEmployeeTypeColor(poste) {
        const colors = {
            'cuisinier': '#74b9ff',
            'serveur': '#00b894',
            'barman': '#fdcb6e',
            'manager': '#a29bfe',
            'aide': '#6c5ce7',
            'commis': '#fd79a8'
        };
        return colors[poste] || '#74b9ff';
    }

    /**
     * Génère un avatar avec point d'interrogation
     */
    generateQuestionMarkAvatar() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = PlanningConfig.AVATAR_SIZE.large;

        canvas.width = size;
        canvas.height = size;

        // Cercle gris
        ctx.fillStyle = '#6c757d';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Point d'interrogation
        ctx.fillStyle = 'white';
        ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText('?', size / 2, size / 2);

        return canvas.toDataURL('image/png');
    }

    /**
     * Récupère les initiales d'un employé
     */
    getInitials(employee) {
        if (!employee || !employee.prenom || !employee.nom) {
            return '?';
        }

        const first = employee.prenom.charAt(0).toUpperCase();
        const last = employee.nom.charAt(0).toUpperCase();
        return first + last;
    }

    /**
     * Obtient l'avatar d'un employé (photo ou généré)
     */
    getEmployeeAvatar(employee) {
        if (!employee) {
            return this.generateQuestionMarkAvatar();
        }

        // Photo personnalisée
        if (this.photoCache.has(employee.id)) {
            const photo = this.photoCache.get(employee.id);
            if (this.isValidPhotoData(photo)) {
                return photo;
            } else {
                // Supprimer la photo corrompue
                this.photoCache.delete(employee.id);
                this.savePhotos();
            }
        }

        // Avatar généré avec initiales
        return this.generateDefaultAvatar(employee);
    }

    /**
     * Crée l'élément HTML de l'avatar
     */
    createAvatarElement(employee, size = 'normal') {
        const avatarContainer = document.createElement('div');
        avatarContainer.className = `shift-avatar-container size-${size}`;

        const avatarImg = document.createElement('img');
        avatarImg.className = 'shift-avatar-img';
        avatarImg.src = this.getEmployeeAvatar(employee);
        avatarImg.alt = employee ? employee.nom_complet : 'Équipier inconnu';
        avatarImg.loading = 'lazy';

        // Gestion d'erreur de chargement
        avatarImg.onerror = () => {
            Logger.warn(`Erreur de chargement d'avatar pour ${employee?.id}`);
            avatarImg.src = this.generateQuestionMarkAvatar();
        };

        // Tooltip informatif
        if (employee) {
            const tooltip = this.createTooltip(employee);
            avatarImg.title = tooltip;
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

        // Ajouter les événements
        this.setupAvatarEvents(avatarContainer, employee);

        return avatarContainer;
    }

    /**
     * Crée le tooltip pour un avatar
     */
    createTooltip(employee) {
        const hasCustomPhoto = this.photoCache.has(employee.id);
        const photoType = hasCustomPhoto ? 'Photo personnalisée' : 'Avatar généré';

        return `${employee.nom_complet}\n${employee.type_info?.name || employee.poste}\n${photoType}\n\n📸 Clic pour changer la photo`;
    }

    /**
     * Configure les événements d'un avatar
     */
    setupAvatarEvents(avatarContainer, employee) {
        if (!employee) return;

        const avatarImg = avatarContainer.querySelector('.shift-avatar-img');

        if (avatarImg) {
            // Clic pour ouvrir la gestion de photo
            avatarImg.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPhotoModal(employee);
            });

            // Hover effects
            avatarImg.addEventListener('mouseenter', () => {
                avatarImg.style.transform = 'scale(1.05)';
                avatarImg.style.transition = 'transform 0.2s ease';
            });

            avatarImg.addEventListener('mouseleave', () => {
                avatarImg.style.transform = '';
            });
        }
    }

    /**
     * Affiche le modal de gestion des photos
     */
    showPhotoModal(employee) {
        const hasCustomPhoto = this.photoCache.has(employee.id);
        const currentAvatar = this.getEmployeeAvatar(employee);

        const content = `
            <div class="photo-manager">
                <div class="current-avatar">
                    <h3><i class="fas fa-user-circle"></i> Avatar actuel</h3>
                    <div class="avatar-preview">
                        <img src="${currentAvatar}" alt="Avatar actuel" class="current-avatar-img">
                    </div>
                    <p class="avatar-info">
                        <i class="fas fa-${hasCustomPhoto ? 'camera' : 'palette'}"></i>
                        ${hasCustomPhoto ? 'Photo personnalisée' : 'Avatar généré automatiquement'}
                    </p>
                </div>

                <div class="photo-upload">
                    <h3><i class="fas fa-upload"></i> Nouvelle photo</h3>
                    <div class="upload-area" onclick="document.getElementById('photoInput').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Cliquer pour sélectionner une photo</p>
                        <small>JPG, PNG - Max ${PlanningConfig.MAX_PHOTO_SIZE / 1024 / 1024}MB</small>
                        <small>Sera redimensionnée automatiquement en ${PlanningConfig.AVATAR_SIZE.large}×${PlanningConfig.AVATAR_SIZE.large}px</small>
                    </div>
                    <input type="file" id="photoInput" accept="${PlanningConfig.PHOTO_FORMATS.join(',')}" style="display: none;">

                    <div class="photo-preview" style="display: none;">
                        <h4><i class="fas fa-eye"></i> Aperçu</h4>
                        <img id="previewImg" class="preview-img">
                        <p class="preview-info">La photo sera automatiquement recadrée en cercle</p>
                    </div>
                </div>

                <div class="photo-actions">
                    ${hasCustomPhoto ? `
                        <button type="button" class="btn btn-outline btn-danger" onclick="window.avatarManager.removePhoto('${employee.id}')">
                            <i class="fas fa-trash"></i> Supprimer la photo
                        </button>
                    ` : ''}
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

        if (typeof openModal === 'function') {
            openModal(`📸 Photo de ${employee.nom_complet}`, content, buttons);
            this.setupPhotoModalEvents(employee);
        } else {
            Logger.error('Fonction openModal non disponible');
        }
    }

    /**
     * Configure les événements du modal photo
     */
    setupPhotoModalEvents(employee) {
        const photoInput = document.getElementById('photoInput');
        const previewContainer = document.querySelector('.photo-preview');
        const previewImg = document.getElementById('previewImg');

        if (photoInput) {
            photoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // Valider le fichier
                    this.validatePhotoFile(file);

                    // Afficher l'aperçu
                    const dataUrl = await PlanningUtils.fileToBase64(file);
                    if (previewImg) previewImg.src = dataUrl;
                    if (previewContainer) previewContainer.style.display = 'block';

                } catch (error) {
                    if (typeof NotificationManager !== 'undefined') {
                        NotificationManager.show(`❌ ${error.message}`, 'error');
                    } else {
                        alert(`Erreur: ${error.message}`);
                    }

                    // Reset l'input
                    photoInput.value = '';
                    if (previewContainer) previewContainer.style.display = 'none';
                }
            });
        }
    }

    /**
     * Sauvegarde la photo depuis le modal
     */
    async savePhotoFromModal(employeeId) {
        const photoInput = document.getElementById('photoInput');
        const file = photoInput ? photoInput.files[0] : null;

        if (file) {
            try {
                // Afficher le loading
                const saveButton = document.querySelector('.btn-primary');
                if (saveButton) {
                    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';
                    saveButton.disabled = true;
                }

                await this.setEmployeePhoto(employeeId, file);

                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show('✅ Photo mise à jour avec succès', 'success');
                }

                // Mettre à jour l'affichage
                EventBus.emit(PlanningEvents.PHOTO_UPDATED, { employeeId });

                if (typeof closeModal === 'function') {
                    closeModal('globalModal');
                }

            } catch (error) {
                Logger.error('Erreur sauvegarde photo:', error);

                if (typeof NotificationManager !== 'undefined') {
                    NotificationManager.show(`❌ ${error.message}`, 'error');
                } else {
                    alert(`Erreur: ${error.message}`);
                }

                // Restaurer le bouton
                const saveButton = document.querySelector('.btn-primary');
                if (saveButton) {
                    saveButton.innerHTML = 'Sauvegarder';
                    saveButton.disabled = false;
                }
            }
        } else {
            if (typeof closeModal === 'function') {
                closeModal('globalModal');
            }
        }
    }

    /**
     * Supprime la photo d'un employé
     */
    removePhoto(employeeId) {
        this.photoCache.delete(employeeId);
        this.savePhotos();

        // Mettre à jour l'aperçu dans le modal s'il est ouvert
        const currentImg = document.querySelector('.current-avatar-img');
        if (currentImg) {
            const employee = AppState.employees.get(employeeId);
            currentImg.src = this.getEmployeeAvatar(employee);
        }

        const avatarInfo = document.querySelector('.avatar-info');
        if (avatarInfo) {
            avatarInfo.innerHTML = '<i class="fas fa-palette"></i> Avatar généré automatiquement';
        }

        // Masquer le bouton de suppression
        const deleteButton = document.querySelector('.btn-danger');
        if (deleteButton) {
            deleteButton.style.display = 'none';
        }

        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show('✅ Photo supprimée', 'success');
        }

        EventBus.emit(PlanningEvents.PHOTO_UPDATED, { employeeId });
        Logger.info(`Photo supprimée pour l'employé ${employeeId}`);
    }

    /**
     * Génère un nouvel avatar aléatoire
     */
    generateRandomAvatar(employeeId) {
        const employee = AppState.employees.get(employeeId);
        if (!employee) return;

        // Supprimer l'ancien avatar du cache
        const oldCacheKey = `${employee.id}-${employee.prenom}-${employee.nom}-${employee.poste}`;
        this.defaultPhotos.delete(oldCacheKey);

        // Générer un nouveau cache key avec un élément aléatoire
        const randomSuffix = Math.random().toString(36).substr(2, 5);
        const newCacheKey = `${employee.id}-${employee.prenom}-${employee.nom}-${employee.poste}-${randomSuffix}`;

        // Forcer la génération d'un nouvel avatar
        const tempEmployee = { ...employee, id: newCacheKey };
        const newAvatar = this.generateDefaultAvatar(tempEmployee);

        // Mettre en cache avec la vraie clé
        this.defaultPhotos.set(oldCacheKey, newAvatar);

        // Mettre à jour l'aperçu dans le modal
        const currentImg = document.querySelector('.current-avatar-img');
        if (currentImg) {
            currentImg.src = newAvatar;
        }

        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show('🎨 Nouvel avatar généré', 'success');
        }

        EventBus.emit(PlanningEvents.PHOTO_UPDATED, { employeeId });
        Logger.info(`Nouvel avatar généré pour l'employé ${employeeId}`);
    }

    /**
     * Obtient les statistiques des photos
     */
    getPhotoStats() {
        const totalEmployees = AppState.employees.size;
        const customPhotos = this.photoCache.size;
        const generatedAvatars = totalEmployees - customPhotos;

        return {
            totalEmployees,
            customPhotos,
            generatedAvatars,
            photosPercentage: totalEmployees > 0 ? Math.round((customPhotos / totalEmployees) * 100) : 0
        };
    }

    /**
     * Exporte toutes les photos
     */
    exportPhotos() {
        try {
            const photos = Object.fromEntries(this.photoCache);
            const dataStr = JSON.stringify(photos, null, 2);

            PlanningUtils.downloadFile(
                dataStr,
                `planning-photos-${new Date().toISOString().split('T')[0]}.json`,
                'application/json'
            );

            Logger.info('Photos exportées avec succès');

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('✅ Photos exportées', 'success');
            }
        } catch (error) {
            Logger.error('Erreur lors de l\'export des photos:', error);

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors de l\'export', 'error');
            }
        }
    }

    /**
     * Importe des photos
     */
    async importPhotos(file) {
        try {
            const text = await file.text();
            const photos = JSON.parse(text);

            let imported = 0;
            Object.entries(photos).forEach(([employeeId, photoData]) => {
                if (this.isValidPhotoData(photoData) && AppState.employees.has(employeeId)) {
                    this.photoCache.set(employeeId, photoData);
                    imported++;
                }
            });

            this.savePhotos();

            Logger.info(`Import terminé: ${imported} photos importées`);

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show(`✅ ${imported} photos importées`, 'success');
            }

            EventBus.emit(PlanningEvents.PHOTO_UPDATED);

        } catch (error) {
            Logger.error('Erreur lors de l\'import des photos:', error);

            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.show('❌ Erreur lors de l\'import', 'error');
            }
        }
    }

    /**
     * Nettoie le cache
     */
    clearCache() {
        this.photoCache.clear();
        this.defaultPhotos.clear();
        this.savePhotos();

        Logger.info('Cache des avatars nettoyé');
        EventBus.emit(PlanningEvents.PHOTO_UPDATED);
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.savePhotos();
        this.photoCache.clear();
        this.defaultPhotos.clear();
        this.isInitialized = false;

        Logger.info('AvatarManager détruit');
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.AvatarManager = AvatarManager;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarManager;
}

Logger.info('AvatarManager chargé avec succès');