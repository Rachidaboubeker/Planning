// ==================== CORRECTIONS POUR LES FORMULAIRES ====================

/**
 * Correction des problèmes de validation et de récupération de valeurs
 */
class UIManagerFix {

    /**
     * Fonction corrigée pour récupérer les valeurs des champs - version anti-doublon
     */
    static getFieldValue(selector) {
        // Pour éviter les doublons, on cherche spécifiquement dans le modal visible
        const visibleModal = document.querySelector('.modal[style*="display: block"], .modal.show, #globalModal');
        let element = null;

        if (visibleModal) {
            // Chercher d'abord dans le modal visible
            element = visibleModal.querySelector(selector);
            console.log(`🔍 Recherche dans modal visible: ${selector}`);
        }

        // Si pas trouvé dans le modal, chercher globalement mais prendre le dernier élément
        if (!element) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                // Prendre le dernier élément trouvé (probablement le bon)
                element = elements[elements.length - 1];
                console.log(`🔍 Trouvé ${elements.length} éléments pour ${selector}, utilisation du dernier`);
            }
        }

        // Si pas trouvé par sélecteur, essayer par ID sans #
        if (!element && selector.startsWith('#')) {
            const id = selector.substring(1);
            const elements = document.querySelectorAll(`#${id}`);
            if (elements.length > 0) {
                element = elements[elements.length - 1]; // Prendre le dernier
                console.log(`🔍 Trouvé par ID ${id}, ${elements.length} éléments, utilisation du dernier`);
            }
        }

        if (!element) {
            console.warn(`⚠️ Élément non trouvé: ${selector}`);
            return '';
        }

        // Gestion spécifique pour les différents types d'éléments
        if (element.tagName.toLowerCase() === 'select') {
            const value = element.value || '';
            console.log(`📋 Select ${selector}: value="${value}" (visible: ${element.offsetParent !== null})`);
            return value;
        } else if (element.type === 'checkbox') {
            return element.checked;
        } else if (element.type === 'number') {
            const value = parseFloat(element.value);
            return isNaN(value) ? 0 : value;
        } else {
            const value = element.value ? element.value.trim() : '';
            console.log(`📋 Input ${selector}: value="${value}" (visible: ${element.offsetParent !== null})`);
            return value;
        }
    }

    /**
     * Validation améliorée des formulaires
     */
    static validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`❌ Formulaire ${formId} non trouvé`);
            return false;
        }

        console.log(`🔍 Validation du formulaire: ${formId}`);

        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        let firstErrorField = null;

        // Nettoyer toutes les erreurs existantes
        form.querySelectorAll('.field-error-message').forEach(error => error.remove());
        form.querySelectorAll('.field-error').forEach(field => field.classList.remove('field-error'));

        requiredFields.forEach(field => {
            const fieldId = field.id || field.name || 'unknown';
            let value;
            let isEmpty = false;

            if (field.tagName.toLowerCase() === 'select') {
                value = field.value;
                isEmpty = !value || value === '' || value === 'undefined';
                console.log(`🔍 Validation Select ${fieldId}: value="${value}", isEmpty=${isEmpty}`);
            } else if (field.type === 'number') {
                value = parseFloat(field.value);
                isEmpty = isNaN(value) || value <= 0;
                console.log(`🔍 Validation Number ${fieldId}: value=${value}, isEmpty=${isEmpty}`);
            } else {
                value = field.value ? field.value.trim() : '';
                isEmpty = !value || value === '';
                console.log(`🔍 Validation Input ${fieldId}: value="${value}", isEmpty=${isEmpty}`);
            }

            if (isEmpty) {
                console.warn(`⚠️ Champ requis vide: ${fieldId}`);
                UIManagerFix.showFieldError(field, field.tagName.toLowerCase() === 'select' ?
                    'Veuillez sélectionner une option' : 'Ce champ est obligatoire');
                if (!firstErrorField) firstErrorField = field;
                isValid = false;
            }
        });

        // Validation email si présent
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            const value = field.value ? field.value.trim() : '';
            if (value && !UIManagerFix.isValidEmail(value)) {
                UIManagerFix.showFieldError(field, 'Format d\'email invalide');
                if (!firstErrorField) firstErrorField = field;
                isValid = false;
            }
        });

        if (!isValid && firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        console.log(`📋 Validation ${isValid ? '✅ RÉUSSIE' : '❌ ÉCHOUÉE'}`);
        return isValid;
    }

    /**
     * Affiche une erreur de champ
     */
    static showFieldError(field, message) {
        if (!field) return;

        // Supprimer toute erreur existante
        UIManagerFix.clearFieldError(field);

        // Ajouter la classe d'erreur
        field.classList.add('field-error');

        // Créer le message d'erreur
        const error = document.createElement('div');
        error.className = 'field-error-message';
        error.textContent = message;
        error.style.cssText = `
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
            font-weight: 500;
        `;

        // Insérer après le champ
        field.parentNode.appendChild(error);
    }

    /**
     * Efface une erreur de champ
     */
    static clearFieldError(field) {
        if (!field) return;

        field.classList.remove('field-error');
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Validation email améliorée
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Récupération corrigée des types d'employés
     */
    static getEmployeeTypes() {
        // Debug des différentes sources possibles
        console.log('🔍 Debug types d\'employés:');
        console.log('- PlanningConfig défini:', typeof PlanningConfig !== 'undefined');
        console.log('- PlanningConfig.EMPLOYEE_TYPES:', PlanningConfig?.EMPLOYEE_TYPES);
        console.log('- window.config:', window.config?.EMPLOYEE_TYPES);
        console.log('- Variable globale employee_types:', window.employee_types);

        // Essayer PlanningConfig
        if (typeof PlanningConfig !== 'undefined' && PlanningConfig.EMPLOYEE_TYPES && Object.keys(PlanningConfig.EMPLOYEE_TYPES).length > 0) {
            console.log('✅ Types d\'employés trouvés dans PlanningConfig');
            return PlanningConfig.EMPLOYEE_TYPES;
        }

        // Essayer window.config (souvent injecté par Flask)
        if (typeof window !== 'undefined' && window.config && window.config.EMPLOYEE_TYPES) {
            console.log('✅ Types d\'employés trouvés dans window.config');
            return window.config.EMPLOYEE_TYPES;
        }

        // Essayer variable globale
        if (typeof window !== 'undefined' && window.employee_types) {
            console.log('✅ Types d\'employés trouvés dans window.employee_types');
            return window.employee_types;
        }

        // Dernier recours : récupérer depuis le DOM
        const selectElement = document.querySelector('#employeePoste');
        if (selectElement) {
            const options = selectElement.querySelectorAll('option[value]:not([value=""])');
            if (options.length > 0) {
                console.log('✅ Types d\'employés récupérés depuis le DOM');
                const typesFromDOM = {};
                options.forEach(option => {
                    typesFromDOM[option.value] = {
                        name: option.textContent,
                        color: '#007bff' // Couleur par défaut
                    };
                });
                return typesFromDOM;
            }
        }

        // Fallback vers configuration connue du projet
        console.log('⚠️ Utilisation des types d\'employés du projet');
        const projectTypes = {
            'cuisinier': { name: 'Cuisinier', color: '#74b9ff' },
            'serveur': { name: 'Serveur/se', color: '#00b894' },
            'barman': { name: 'Barman', color: '#fdcb6e' },
            'manager': { name: 'Manager', color: '#a29bfe' },
            'aide': { name: 'Aide de cuisine', color: '#6c5ce7' },
            'commis': { name: 'Commis', color: '#fd79a8' }
        };

        return projectTypes;
    }

    /**
     * Génération corrigée du formulaire d'ajout d'employé
     */
    static generateAddEmployeeForm() {
        const employeeTypes = UIManagerFix.getEmployeeTypes();
        console.log('📋 Génération du formulaire avec types:', Object.keys(employeeTypes));

        return `
            <form id="addEmployeeForm" class="form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="employeePrenom">Prénom *</label>
                        <input type="text" id="employeePrenom" name="prenom" required autocomplete="given-name">
                    </div>
                    <div class="form-group">
                        <label for="employeeNom">Nom *</label>
                        <input type="text" id="employeeNom" name="nom" required autocomplete="family-name">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeePoste">Poste *</label>
                        <select id="employeePoste" name="poste" required>
                            <option value="">Sélectionner un poste</option>
                            ${Object.entries(employeeTypes).map(([key, info]) => `
                                <option value="${key}">${info.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="employeeTauxHoraire">Taux horaire (€) *</label>
                        <input type="number" id="employeeTauxHoraire" name="taux_horaire"
                               min="10" max="50" step="0.5" value="15" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeEmail">Email</label>
                        <input type="email" id="employeeEmail" name="email"
                               placeholder="prenom.nom@email.com" autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="employeeTelephone">Téléphone</label>
                        <input type="tel" id="employeeTelephone" name="telephone"
                               placeholder="06 12 34 56 78" autocomplete="tel">
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Gestionnaire corrigé pour la soumission du formulaire employé
     */
    static async handleAddEmployee() {
        console.log('🔄 Début handleAddEmployee');

        // Validation du formulaire
        if (!UIManagerFix.validateForm('addEmployeeForm')) {
            console.warn('⚠️ Validation échouée');
            return;
        }

        // Récupération des données avec la nouvelle méthode
        const employeeData = {
            prenom: UIManagerFix.getFieldValue('#employeePrenom'),
            nom: UIManagerFix.getFieldValue('#employeeNom'),
            poste: UIManagerFix.getFieldValue('#employeePoste'),
            taux_horaire: UIManagerFix.getFieldValue('#employeeTauxHoraire'),
            email: UIManagerFix.getFieldValue('#employeeEmail'),
            telephone: UIManagerFix.getFieldValue('#employeeTelephone')
        };

        console.log('📋 Données récupérées:', employeeData);

        // Validation finale des données
        const errors = [];
        if (!employeeData.prenom) errors.push('Prénom manquant');
        if (!employeeData.nom) errors.push('Nom manquant');
        if (!employeeData.poste) errors.push('Poste manquant');
        if (employeeData.taux_horaire < 10 || employeeData.taux_horaire > 50) {
            errors.push('Taux horaire invalide (10-50€)');
        }

        if (errors.length > 0) {
            console.error('❌ Erreurs de validation:', errors);
            alert('Erreurs de validation :\n' + errors.join('\n'));
            return;
        }

        try {
            // Simuler l'envoi API ou utiliser la vraie fonction
            console.log('📤 Envoi des données...');

            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(employeeData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Employé créé avec succès');
                // Fermer le modal
                if (window.UIManager && window.UIManager.closeModal) {
                    window.UIManager.closeModal('globalModal');
                }
                // Afficher notification de succès
                alert('Employé créé avec succès !');
                // Recharger les données si nécessaire
                if (typeof refreshEmployeeData === 'function') {
                    refreshEmployeeData();
                }
            } else {
                console.error('❌ Erreur API:', result.error);
                alert('Erreur lors de la création : ' + result.error);
            }
        } catch (error) {
            console.error('❌ Erreur de connexion:', error);
            alert('Erreur de connexion au serveur');
        }
    }

    /**
     * Test de diagnostic
     */
    static runDiagnostic() {
        console.log('🔍 === DIAGNOSTIC DES FORMULAIRES ===');

        // Vérifier les éléments du DOM
        const modal = document.getElementById('globalModal');
        console.log('Modal présent:', !!modal);

        const form = document.getElementById('addEmployeeForm');
        console.log('Formulaire présent:', !!form);

        if (form) {
            const inputs = form.querySelectorAll('input, select');
            console.log('Nombre de champs:', inputs.length);

            inputs.forEach(input => {
                console.log(`- ${input.id || input.name}: ${input.tagName.toLowerCase()}, value="${input.value}"`);
            });
        }

        // Vérifier les types d'employés
        const types = UIManagerFix.getEmployeeTypes();
        console.log('Types d\'employés disponibles:', Object.keys(types));

        // Vérifier les gestionnaires
        console.log('UIManager présent:', !!window.UIManager);
        console.log('PlanningConfig présent:', typeof PlanningConfig !== 'undefined');

        console.log('🔍 === FIN DIAGNOSTIC ===');
    }
}

// ==================== PATCH POUR RÉPARER IMMÉDIATEMENT ====================

/**
 * Application immédiate des corrections
 */
function applyUIFixes() {
    console.log('🔧 Application des corrections UI...');

    // Remplacer les fonctions défectueuses
    if (window.UIManager) {
        console.log('🔄 Remplacement des méthodes UIManager...');

        // Remplacer la validation
        window.UIManager.validateForm = UIManagerFix.validateForm;
        window.UIManager.showFieldError = UIManagerFix.showFieldError;
        window.UIManager.clearFieldError = UIManagerFix.clearFieldError;

        // Remplacer la récupération des types
        window.UIManager.getEmployeeTypes = UIManagerFix.getEmployeeTypes;

        // Remplacer la génération de formulaire
        window.UIManager.generateAddEmployeeForm = UIManagerFix.generateAddEmployeeForm;

        console.log('✅ Méthodes UIManager remplacées');
    }

    // Ajouter la gestion globale des boutons
    document.addEventListener('click', function(e) {
        // Gérer les boutons de création d'employé
        if (e.target.textContent.includes('Créer') && e.target.closest('.modal-footer')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Bouton Créer intercepté');
            UIManagerFix.handleAddEmployee();
        }
    });

    console.log('✅ Corrections UI appliquées');
}

// ==================== CSS POUR LES ERREURS ====================

function addErrorStyles() {
    if (document.getElementById('ui-fix-styles')) return;

    const style = document.createElement('style');
    style.id = 'ui-fix-styles';
    style.textContent = `
        .field-error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            background-color: #fff5f5 !important;
        }

        .field-error-message {
            color: #dc3545 !important;
            font-size: 0.875rem !important;
            margin-top: 0.25rem !important;
            display: block !important;
            font-weight: 500 !important;
            animation: errorFadeIn 0.3s ease-in;
        }

        @keyframes errorFadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Amélioration visuelle des selects */
        select:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        select.field-error:focus {
            border-color: #dc3545;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
        }
    `;
    document.head.appendChild(style);
}

// ==================== INITIALISATION ====================

// Appliquer les corrections immédiatement
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation des corrections UI...');
    addErrorStyles();
    applyUIFixes();

    // Diagnostic automatique en mode debug
    if (localStorage.getItem('ui-debug') === 'true') {
        setTimeout(() => UIManagerFix.runDiagnostic(), 1000);
    }
});

// Si le DOM est déjà chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyUIFixes);
} else {
    applyUIFixes();
    addErrorStyles();
}

// Export pour utilisation globale
window.UIManagerFix = UIManagerFix;

console.log('✅ Script de correction UI chargé');