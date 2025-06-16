/**
 * Gestionnaire des appels API
 */
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

window.APIManager = APIManager;
console.log('🔌 APIManager chargé');