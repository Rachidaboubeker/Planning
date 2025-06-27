/**
 * API MANAGER UNIFIÉ - Planning Restaurant
 * Remplace tous les gestionnaires API dispersés
 * Communication centralisée avec le serveur Flask
 */

class APIManager {
    constructor() {
        this.baseURL = window.Config?.API_BASE || '/api';
        this.timeout = window.Config?.API_TIMEOUT || 10000;
        this.retryAttempts = 3;
        this.retryDelay = 1000;

        this.setupInterceptors();
        console.log('🔌 API Manager unifié initialisé');
    }

    /**
     * Configuration des intercepteurs de requêtes
     */
    setupInterceptors() {
        // Intercepteur global pour les erreurs réseau
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.retryFailedRequests();
        });

        window.addEventListener('offline', () => {
            console.warn('📴 Connexion perdue');
        });
    }

    /**
     * Méthode générique pour les requêtes HTTP
     */
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: this.timeout,
            ...options
        };

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        // Ajouter un timestamp pour éviter le cache
        const separator = url.includes('?') ? '&' : '?';
        const finalUrl = config.method === 'GET' ? `${url}${separator}_t=${Date.now()}` : url;

        console.log(`🔄 ${config.method} ${finalUrl}`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(finalUrl, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success === false) {
                throw new Error(data.error || 'Erreur serveur');
            }

            console.log(`✅ ${config.method} ${finalUrl} - Succès`);
            return data;

        } catch (error) {
            console.error(`❌ ${config.method} ${finalUrl} - Erreur:`, error.message);

            // Retry automatique pour les erreurs réseau
            if (options._retryCount < this.retryAttempts && this.isRetriableError(error)) {
                console.log(`🔄 Tentative ${options._retryCount + 1}/${this.retryAttempts}`);

                await this.delay(this.retryDelay * (options._retryCount + 1));

                return this.request(endpoint, {
                    ...options,
                    _retryCount: (options._retryCount || 0) + 1
                });
            }

            throw error;
        }
    }

    /**
     * Détermine si une erreur justifie un retry
     */
    isRetriableError(error) {
        return error.name === 'AbortError' ||
               error.message.includes('NetworkError') ||
               error.message.includes('fetch');
    }

    /**
     * Délai pour les retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== MÉTHODES EMPLOYÉS ====================

    /**
     * Récupère tous les employés
     */
    async getEmployees() {
        try {
            window.State?.setState('ui.isLoading', true);

            const response = await this.request('/employees');

            if (response.employees) {
                // Synchroniser avec le state
                window.State?.state.employees.clear();
                response.employees.forEach(emp => {
                    window.State?.setEmployee(emp);
                });

                console.log(`👥 ${response.employees.length} employés chargés`);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors du chargement des employés', error);
            throw error;
        } finally {
            window.State?.setState('ui.isLoading', false);
        }
    }

    /**
     * Ajoute un nouvel employé
     */
    async addEmployee(employeeData) {
        try {
            const response = await this.request('/employees', {
                method: 'POST',
                body: JSON.stringify(employeeData)
            });

            if (response.employee) {
                window.State?.setEmployee(response.employee);
                this.showSuccess('Employé ajouté avec succès');

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.EMPLOYEE_ADDED, response.employee);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de l\'ajout de l\'employé', error);
            throw error;
        }
    }

    /**
     * Met à jour un employé
     */
    async updateEmployee(employeeId, employeeData) {
        try {
            const response = await this.request(`/employees/${employeeId}`, {
                method: 'PUT',
                body: JSON.stringify(employeeData)
            });

            if (response.employee) {
                window.State?.setEmployee(response.employee);
                this.showSuccess('Employé mis à jour');

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.EMPLOYEE_UPDATED, response.employee);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de la mise à jour de l\'employé', error);
            throw error;
        }
    }

    /**
     * Supprime un employé
     */
    async deleteEmployee(employeeId) {
        try {
            const response = await this.request(`/employees/${employeeId}`, {
                method: 'DELETE'
            });

            window.State?.removeEmployee(employeeId);
            this.showSuccess('Employé supprimé');

            // Émettre l'événement
            window.EventBus?.emit(window.Config?.EVENTS.EMPLOYEE_DELETED, { id: employeeId });

            return response;

        } catch (error) {
            this.handleError('Erreur lors de la suppression de l\'employé', error);
            throw error;
        }
    }

    /**
     * Upload d'une photo d'employé
     */
    async uploadEmployeePhoto(employeeId, photoFile) {
        try {
            // Validation du fichier
            if (!this.validatePhotoFile(photoFile)) {
                throw new Error('Format de fichier non supporté ou taille trop importante');
            }

            const formData = new FormData();
            formData.append('photo', photoFile);

            const response = await this.request(`/employees/${employeeId}/photo`, {
                method: 'POST',
                body: formData,
                headers: {} // Supprimer Content-Type pour FormData
            });

            if (response.photo_url) {
                // Mettre à jour l'employé avec la nouvelle photo
                const employee = window.State?.state.employees.get(employeeId);
                if (employee) {
                    employee.photo_url = response.photo_url;
                    window.State?.setEmployee(employee);
                }

                this.showSuccess('Photo mise à jour');

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.PHOTO_UPDATED, {
                    employeeId,
                    photoUrl: response.photo_url
                });
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de l\'upload de la photo', error);
            throw error;
        }
    }

    /**
     * Valide un fichier photo
     */
    validatePhotoFile(file) {
        const maxSize = window.Config?.LIMITS.MAX_PHOTO_SIZE || 5 * 1024 * 1024;
        const allowedFormats = window.Config?.LIMITS.PHOTO_FORMATS || ['image/jpeg', 'image/png'];

        if (file.size > maxSize) {
            return false;
        }

        if (!allowedFormats.includes(file.type)) {
            return false;
        }

        return true;
    }

    // ==================== MÉTHODES CRÉNEAUX ====================

    /**
     * Récupère tous les créneaux
     */
    async getShifts() {
        try {
            window.State?.setState('ui.isLoading', true);

            const response = await this.request('/shifts');

            if (response.shifts) {
                // Synchroniser avec le state
                window.State?.state.shifts.clear();
                response.shifts.forEach(shift => {
                    window.State?.setShift(shift);
                });

                console.log(`📅 ${response.shifts.length} créneaux chargés`);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors du chargement des créneaux', error);
            throw error;
        } finally {
            window.State?.setState('ui.isLoading', false);
        }
    }

    /**
     * Ajoute un nouveau créneau
     */
    async addShift(shiftData) {
        try {
            // Validation côté client
            this.validateShiftData(shiftData);

            const response = await this.request('/shifts', {
                method: 'POST',
                body: JSON.stringify(shiftData)
            });

            if (response.shift) {
                window.State?.setShift(response.shift);
                this.showSuccess('Créneau ajouté avec succès');

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.SHIFT_ADDED, response.shift);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de l\'ajout du créneau', error);
            throw error;
        }
    }

    /**
     * Met à jour un créneau
     */
    async updateShift(shiftId, shiftData) {
        try {
            this.validateShiftData(shiftData);

            const response = await this.request(`/shifts/${shiftId}`, {
                method: 'PUT',
                body: JSON.stringify(shiftData)
            });

            if (response.shift) {
                window.State?.setShift(response.shift);
                this.showSuccess('Créneau mis à jour');

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.SHIFT_UPDATED, response.shift);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de la mise à jour du créneau', error);
            throw error;
        }
    }

    /**
     * Supprime un créneau
     */
    async deleteShift(shiftId) {
        try {
            const response = await this.request(`/shifts/${shiftId}`, {
                method: 'DELETE'
            });

            window.State?.removeShift(shiftId);
            this.showSuccess('Créneau supprimé');

            // Émettre l'événement
            window.EventBus?.emit(window.Config?.EVENTS.SHIFT_DELETED, { id: shiftId });

            return response;

        } catch (error) {
            this.handleError('Erreur lors de la suppression du créneau', error);
            throw error;
        }
    }

    /**
     * Déplace un créneau (drag & drop)
     */
    async moveShift(shiftId, newDay, newHour, newMinutes = 0) {
        try {
            const shiftData = {
                day: newDay,
                start_hour: newHour,
                start_minutes: newMinutes
            };

            const response = await this.request(`/shifts/${shiftId}/move`, {
                method: 'PATCH',
                body: JSON.stringify(shiftData)
            });

            if (response.shift) {
                window.State?.setShift(response.shift);

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.SHIFT_MOVED, response.shift);
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors du déplacement du créneau', error);
            throw error;
        }
    }

    /**
     * Valide les données d'un créneau
     */
    validateShiftData(shiftData) {
        if (!shiftData.employee_id) {
            throw new Error('L\'employé est obligatoire');
        }

        if (!shiftData.day) {
            throw new Error('Le jour est obligatoire');
        }

        if (typeof shiftData.start_hour !== 'number') {
            throw new Error('L\'heure de début est invalide');
        }

        if (!window.Config?.isValidDuration(shiftData.duration)) {
            throw new Error('La durée est invalide');
        }

        if (!window.State?.state.employees.has(shiftData.employee_id)) {
            throw new Error('L\'employé spécifié n\'existe pas');
        }
    }

    // ==================== CONFIGURATION ====================

    /**
     * Met à jour la granularité
     */
    async updateGranularity(granularity) {
        try {
            const response = await this.request('/config/granularity', {
                method: 'POST',
                body: JSON.stringify({ granularity })
            });

            if (response.success) {
                window.Config?.setGranularity(granularity);
                window.State?.setState('temp.granularity', granularity);

                this.showSuccess(`Granularité mise à jour: ${granularity} minutes`);

                // Émettre l'événement
                window.EventBus?.emit(window.Config?.EVENTS.GRANULARITY_CHANGED, {
                    granularity
                });
            }

            return response;

        } catch (error) {
            this.handleError('Erreur lors de la mise à jour de la granularité', error);
            throw error;
        }
    }

    // ==================== STATISTIQUES ====================

    /**
     * Récupère les statistiques
     */
    async getStatistics() {
        try {
            const response = await this.request('/stats/weekly');
            return response;
        } catch (error) {
            this.handleError('Erreur lors du chargement des statistiques', error);
            throw error;
        }
    }

    /**
     * Vérifie les conflits
     */
    async checkConflicts(employeeId) {
        try {
            const response = await this.request(`/conflicts/${employeeId}`);
            return response;
        } catch (error) {
            console.warn('Erreur lors de la vérification des conflits:', error);
            return { conflicts: [] };
        }
    }

    // ==================== SAUVEGARDE AUTOMATIQUE ====================

    /**
     * Sauvegarde automatique
     */
    async autoSave() {
        if (!window.State?.state.temp.isDirty) {
            return;
        }

        try {
            const data = window.State.exportData();

            const response = await this.request('/sync', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                window.State?.markClean();
                console.log('💾 Sauvegarde automatique réussie');
            }

        } catch (error) {
            console.error('💾 Erreur sauvegarde automatique:', error);
        }
    }

    /**
     * Charge toutes les données initiales
     */
    async loadInitialData() {
        try {
            console.log('📥 Chargement des données initiales...');

            window.State?.setState('ui.isLoading', true);

            // Charger employés et créneaux en parallèle
            const [employeesResponse, shiftsResponse] = await Promise.all([
                this.getEmployees(),
                this.getShifts()
            ]);

            // Déclencher le calcul des statistiques
            window.State?.calculateStatistics();

            // Marquer les données comme chargées
            window.State?.setState('meta.lastDataLoad', new Date());

            // Émettre l'événement de chargement complet
            window.EventBus?.emit(window.Config?.EVENTS.DATA_LOADED, {
                employees: employeesResponse.employees?.length || 0,
                shifts: shiftsResponse.shifts?.length || 0
            });

            console.log('✅ Données initiales chargées avec succès');

        } catch (error) {
            this.handleError('Erreur lors du chargement initial', error);
            throw error;
        } finally {
            window.State?.setState('ui.isLoading', false);
        }
    }

    // ==================== GESTION D'ERREURS ====================

    /**
     * Gestion centralisée des erreurs
     */
    handleError(message, error) {
        console.error(`❌ ${message}:`, error);

        // Afficher une notification à l'utilisateur
        if (window.NotificationManager) {
            window.NotificationManager.error(message, error.message);
        }

        // Émettre l'événement d'erreur
        window.EventBus?.emit(window.Config?.EVENTS.ERROR_OCCURRED, {
            message,
            error: error.message,
            timestamp: new Date()
        });
    }

    /**
     * Affiche un message de succès
     */
    showSuccess(message) {
        if (window.NotificationManager) {
            window.NotificationManager.success(message);
        }

        window.EventBus?.emit(window.Config?.EVENTS.SUCCESS_MESSAGE, {
            message,
            timestamp: new Date()
        });
    }

    /**
     * Retry des requêtes échouées
     */
    retryFailedRequests() {
        // Implémenter si nécessaire une file d'attente de retry
        console.log('🔄 Tentative de retry des requêtes échouées');
    }

    /**
     * Test de connectivité
     */
    async healthCheck() {
        try {
            const response = await this.request('/health');
            console.log('💚 Serveur accessible:', response);
            return true;
        } catch (error) {
            console.error('💔 Serveur inaccessible:', error);
            return false;
        }
    }
}

// Instance globale unique
if (!window.APIManager) {
    window.APIManager = new APIManager();

    // Exposer pour le debugging
    window.APIManager.test = () => window.APIManager.healthCheck();
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}