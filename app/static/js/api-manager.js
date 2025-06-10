/**
 * Planning Restaurant - Gestionnaire des appels API
 * Gestion des communications avec le serveur
 */

class APIManager {
    constructor() {
        this.baseURL = PlanningConfig.API_BASE;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        this.requestQueue = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 seconde
    }

    /**
     * Effectue une requête HTTP
     */
    async request(method, endpoint, data = null, options = {}) {
        const requestId = this.generateRequestId();
        const config = {
            method,
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // Ajouter le corps de la requête si nécessaire
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.body = JSON.stringify(data);
        }

        const url = `${this.baseURL}${endpoint}`;

        Logger.debug(`API Request [${requestId}]: ${method} ${url}`, data);

        try {
            // Ajouter à la queue des requêtes
            this.requestQueue.set(requestId, { method, endpoint, timestamp: Date.now() });

            const response = await this.executeRequest(url, config, requestId);
            const result = await this.parseResponse(response, requestId);

            // Supprimer de la queue
            this.requestQueue.delete(requestId);

            Logger.debug(`API Response [${requestId}]:`, result);
            return result;

        } catch (error) {
            this.requestQueue.delete(requestId);
            Logger.error(`API Error [${requestId}]:`, error);

            // Émission d'un événement d'erreur
            EventBus.emit(PlanningEvents.ERROR_OCCURRED, {
                type: 'api_error',
                method,
                endpoint,
                error: error.message,
                requestId
            });

            throw error;
        }
    }

    /**
     * Exécute une requête avec retry automatique
     */
    async executeRequest(url, config, requestId, attempt = 1) {
        try {
            const response = await fetch(url, config);

            // Vérifier si la réponse est OK
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new APIError(errorData.message || `HTTP ${response.status}`, response.status, errorData);
            }

            return response;

        } catch (error) {
            // Retry pour les erreurs réseau
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                Logger.warn(`Retry attempt ${attempt} for request [${requestId}]`);
                await this.delay(this.retryDelay * attempt);
                return this.executeRequest(url, config, requestId, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Parse la réponse HTTP
     */
    async parseResponse(response, requestId) {
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    }

    /**
     * Parse une réponse d'erreur
     */
    async parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return { message: await response.text() };
        } catch (error) {
            return { message: `HTTP ${response.status} ${response.statusText}` };
        }
    }

    /**
     * Détermine si une requête doit être retentée
     */
    shouldRetry(error) {
        // Retry pour les erreurs réseau et les erreurs serveur temporaires
        return error instanceof TypeError || // Erreur réseau
               (error instanceof APIError && error.status >= 500);
    }

    /**
     * Délai d'attente
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Génère un ID unique pour la requête
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    // ==================== MÉTHODES HTTP ====================

    /**
     * Requête GET
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    /**
     * Requête POST
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    /**
     * Requête PUT
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    /**
     * Requête PATCH
     */
    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    /**
     * Requête DELETE
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // ==================== MÉTHODES SPÉCIALISÉES ====================

    /**
     * Upload de fichier
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Ajouter des données supplémentaires
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const options = {
            headers: {}, // Laisser le navigateur définir le Content-Type pour FormData
            body: formData
        };

        return this.request('POST', endpoint, null, options);
    }

    /**
     * Téléchargement de fichier
     */
    async downloadFile(endpoint, filename) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: this.defaultHeaders
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();

            // Créer un lien de téléchargement
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return true;

        } catch (error) {
            Logger.error('Erreur lors du téléchargement:', error);
            throw error;
        }
    }

    // ==================== MÉTHODES POUR LE PLANNING ====================

    /**
     * Récupère tous les employés
     */
    async getEmployees(activeOnly = true) {
        const params = activeOnly ? '?actif_only=true' : '';
        return this.get(`/employees${params}`);
    }

    /**
     * Crée un nouvel employé
     */
    async createEmployee(employeeData) {
        const result = await this.post('/employees', employeeData);

        if (result.success) {
            AppState.employees.set(result.employee.id, result.employee);
            EventBus.emit(PlanningEvents.EMPLOYEE_ADDED, result.employee);
        }

        return result;
    }

    /**
     * Met à jour un employé
     */
    async updateEmployee(employeeId, updateData) {
        const result = await this.put(`/employees/${employeeId}`, updateData);

        if (result.success) {
            AppState.employees.set(employeeId, result.employee);
            EventBus.emit(PlanningEvents.EMPLOYEE_UPDATED, result.employee);
        }

        return result;
    }

    /**
     * Supprime un employé
     */
    async deleteEmployee(employeeId) {
        const result = await this.delete(`/employees/${employeeId}`);

        if (result.success) {
            const employee = AppState.employees.get(employeeId);
            if (employee) {
                employee.actif = false;
                AppState.employees.set(employeeId, employee);
            }
        }

        return result;
    }

    /**
     * Récupère tous les créneaux
     */
    async getShifts(filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        const queryString = params.toString();
        return this.get(`/shifts${queryString ? '?' + queryString : ''}`);
    }

    /**
     * Crée un nouveau créneau
     */
    async createShift(shiftData) {
        const result = await this.post('/shifts', shiftData);

        if (result.success) {
            AppState.shifts.set(result.shift.id, result.shift);
            EventBus.emit(PlanningEvents.SHIFT_ADDED, result.shift);
            initializeDataStructures(); // Réorganiser les données
        }

        return result;
    }

    /**
     * Met à jour un créneau
     */
    async updateShift(shiftId, updateData) {
        const result = await this.put(`/shifts/${shiftId}`, updateData);

        if (result.success) {
            AppState.shifts.set(shiftId, result.shift);
            EventBus.emit(PlanningEvents.SHIFT_UPDATED, result.shift);
            initializeDataStructures(); // Réorganiser les données
        }

        return result;
    }

    /**
     * Supprime un créneau
     */
    async deleteShift(shiftId) {
        const result = await this.delete(`/shifts/${shiftId}`);

        if (result.success) {
            AppState.shifts.delete(shiftId);
            EventBus.emit(PlanningEvents.SHIFT_DELETED, { shiftId });
            initializeDataStructures(); // Réorganiser les données
        }

        return result;
    }

    /**
     * Récupère les statistiques hebdomadaires
     */
    async getWeeklyStats() {
        return this.get('/stats/weekly');
    }

    /**
     * Vérifie les conflits pour un créneau
     */
    async checkShiftConflicts(shiftId) {
        return this.get(`/conflicts/${shiftId}`);
    }

    // ==================== MÉTHODES DE BATCH ====================

    /**
     * Opérations en lot
     */
    async batchOperations(operations) {
        const results = [];

        for (const operation of operations) {
            try {
                const result = await this.request(
                    operation.method,
                    operation.endpoint,
                    operation.data
                );
                results.push({ success: true, result, operation });
            } catch (error) {
                results.push({ success: false, error, operation });
            }
        }

        return results;
    }

    /**
     * Sauvegarde multiple de créneaux
     */
    async saveMultipleShifts(shifts) {
        const operations = shifts.map(shift => ({
            method: shift.id ? 'PUT' : 'POST',
            endpoint: shift.id ? `/shifts/${shift.id}` : '/shifts',
            data: shift
        }));

        return this.batchOperations(operations);
    }

    // ==================== GESTION DE CACHE ====================

    /**
     * Cache simple pour les requêtes GET
     */
    setupCache() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Récupère depuis le cache
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            Logger.debug(`Cache hit: ${key}`);
            return cached.data;
        }
        return null;
    }

    /**
     * Met en cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Vide le cache
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
            Logger.debug('Cache vidé');
        }
    }

    // ==================== MÉTHODES D'ÉTAT ====================

    /**
     * Récupère les requêtes en cours
     */
    getPendingRequests() {
        return Array.from(this.requestQueue.values());
    }

    /**
     * Annule toutes les requêtes en cours
     */
    cancelAllRequests() {
        this.requestQueue.clear();
        Logger.info('Toutes les requêtes ont été annulées');
    }

    /**
     * Vérifie si l'API est accessible
     */
    async checkHealth() {
        try {
            await this.get('/health');
            return true;
        } catch (error) {
            Logger.warn('API non accessible:', error.message);
            return false;
        }
    }

    /**
     * Obtient les informations de version de l'API
     */
    async getVersion() {
        try {
            return await this.get('/version');
        } catch (error) {
            Logger.warn('Impossible de récupérer la version de l\'API');
            return null;
        }
    }
}

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
class APIError extends Error {
    constructor(message, status = null, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }

    /**
     * Retourne une représentation lisible de l'erreur
     */
    toString() {
        let str = `${this.name}: ${this.message}`;
        if (this.status) {
            str += ` (HTTP ${this.status})`;
        }
        return str;
    }

    /**
     * Retourne les détails complets de l'erreur
     */
    getDetails() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            data: this.data,
            stack: this.stack
        };
    }
}

// Instance globale
let apiManagerInstance = null;

/**
 * Factory pour créer/récupérer l'instance du gestionnaire API
 */
function getAPIManager() {
    if (!apiManagerInstance) {
        apiManagerInstance = new APIManager();

        // Configurer le cache si demandé
        if (PlanningConfig.API_CACHE_ENABLED) {
            apiManagerInstance.setupCache();
        }

        Logger.info('APIManager initialisé');
    }

    return apiManagerInstance;
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.APIManager = getAPIManager();
    window.APIError = APIError;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIManager, APIError, getAPIManager };
}

Logger.info('APIManager chargé avec succès');