/**
 * CORRECTIF URGENT API.JS
 * Version minimale pour résoudre l'erreur de syntaxe immédiatement
 * Remplace temporairement votre api.js actuel
 */

class APIManager {
    constructor() {
        this.baseURL = '/api';
        this.timeout = 10000;
        this.retryAttempts = 3;
        this.retryDelay = 1000;

        console.log('🌐 APIManager initialisé');
    }

    /**
     * Requête HTTP de base
     */
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`❌ Erreur API ${config.method} ${url}:`, error);
            throw error;
        }
    }

    /**
     * Récupère tous les employés
     */
    async getEmployees() {
        try {
            const response = await this.request('/employees');

            if (response.employees && window.State) {
                // Synchronisation avec le state
                response.employees.forEach(emp => {
                    if (window.State.setEmployee) {
                        window.State.setEmployee(emp);
                    }
                });
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur getEmployees:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les créneaux
     */
    async getShifts() {
        try {
            const response = await this.request('/shifts');

            if (response.shifts && window.State) {
                // Synchronisation avec le state
                response.shifts.forEach(shift => {
                    if (window.State.setShift) {
                        window.State.setShift(shift);
                    }
                });
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur getShifts:', error);
            throw error;
        }
    }

    /**
     * Crée un employé
     */
    async createEmployee(employeeData) {
        try {
            const response = await this.request('/employees', {
                method: 'POST',
                body: JSON.stringify(employeeData)
            });

            if (response.employee && window.State && window.State.setEmployee) {
                window.State.setEmployee(response.employee);
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur createEmployee:', error);
            throw error;
        }
    }

    /**
     * Crée un créneau
     */
    async createShift(shiftData) {
        try {
            const response = await this.request('/shifts', {
                method: 'POST',
                body: JSON.stringify(shiftData)
            });

            if (response.shift && window.State && window.State.setShift) {
                window.State.setShift(response.shift);
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur createShift:', error);
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

            if (response.shift && window.State && window.State.setShift) {
                window.State.setShift(response.shift);
            }

            return response;
        } catch (error) {
            console.error('❌ Erreur moveShift:', error);
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

            return response;
        } catch (error) {
            console.error('❌ Erreur deleteShift:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde automatique basique
     */
    async autoSave() {
        try {
            if (!window.State || !window.State.isDirty) {
                return { success: true, message: 'Aucune modification' };
            }

            // Export simple des données
            const data = {
                employees: [],
                shifts: [],
                meta: { exportDate: new Date().toISOString() }
            };

            // Récupération via getState si disponible
            if (window.State.getState) {
                const state = window.State.getState();
                if (state.employees) data.employees = Array.isArray(state.employees) ? state.employees : [];
                if (state.shifts) data.shifts = Array.isArray(state.shifts) ? state.shifts : [];
            }

            const response = await this.request('/sync', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success && window.State.markClean) {
                window.State.markClean();
            }

            console.log('💾 Sauvegarde automatique réussie');
            return response;

        } catch (error) {
            console.error('💾 Erreur sauvegarde automatique:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Charge les données initiales
     */
    async loadInitialData() {
        try {
            console.log('📥 Chargement des données initiales...');

            const [employeesResponse, shiftsResponse] = await Promise.all([
                this.getEmployees().catch(() => ({ employees: [] })),
                this.getShifts().catch(() => ({ shifts: [] }))
            ]);

            console.log(`📊 Données chargées: ${employeesResponse.employees?.length || 0} employés, ${shiftsResponse.shifts?.length || 0} créneaux`);

            return {
                success: true,
                totalEmployees: employeesResponse.employees?.length || 0,
                totalShifts: shiftsResponse.shifts?.length || 0
            };

        } catch (error) {
            console.error('❌ Erreur chargement initial:', error);
            throw error;
        }
    }
}

// Instance globale
if (!window.APIManager) {
    window.APIManager = new APIManager();
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}

console.log('✅ APIManager correctif chargé');