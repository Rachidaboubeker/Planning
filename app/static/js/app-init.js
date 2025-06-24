/**
 * Planning Restaurant - Initialisation de l'application (VERSION CORRIGÉE)
 * Point d'entrée principal pour démarrer l'application
 */

// Variable pour éviter la double initialisation
let isAppInitialized = false;

/**
 * Initialise l'application complète
 */
async function initializeApp() {
    if (isAppInitialized) {
        console.log('⚠️ Application déjà initialisée');
        return;
    }

    try {
        console.log('🚀 Initialisation de l\'application Planning Restaurant...');

        // Vérifier que les objets essentiels existent
        await waitForEssentialObjects();

        // Initialiser les gestionnaires
        await initializeManagers();

        // Charger les données
        await loadInitialData();

        // Initialiser l'interface
        await initializeInterface();

        // Finaliser
        finalizeInitialization();

        isAppInitialized = true;
        console.log('✅ Application initialisée avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showFallbackError(error);
    }
}

/**
 * Attend que les objets essentiels soient chargés
 */
async function waitForEssentialObjects() {
    const requiredObjects = [
        'PlanningConfig', 'AppState', 'PlanningUtils', 'EventBus'
    ];

    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max

    while (attempts < maxAttempts) {
        const missing = requiredObjects.filter(obj => typeof window[obj] === 'undefined');

        if (missing.length === 0) {
            console.log('✅ Tous les objets essentiels sont chargés');
            return;
        }

        if (attempts % 10 === 0) {
            console.log(`⏳ Attente des objets: ${missing.join(', ')}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    throw new Error('Timeout: objets essentiels non chargés');
}

/**
 * Initialise les gestionnaires
 */
async function initializeManagers() {
    console.log('🔧 Initialisation des gestionnaires...');

    // APIManager
    if (typeof APIManager !== 'undefined') {
        console.log('✅ APIManager prêt');
    }

    // NotificationManager
    if (typeof NotificationManager !== 'undefined') {
        console.log('✅ NotificationManager prêt');
    }

    // AvatarManager
    if (typeof window.avatarManager === 'undefined' && typeof AvatarManager !== 'undefined') {
        window.avatarManager = new AvatarManager();
        console.log('✅ AvatarManager initialisé');
    }

    // ColorManager
    if (typeof ColorManager !== 'undefined') {
        console.log('✅ ColorManager prêt');
    }

    // PlanningRenderer
    if (typeof PlanningRenderer !== 'undefined') {
        console.log('✅ PlanningRenderer prêt');
    }

    console.log('✅ Gestionnaires initialisés');
}

/**
 * Charge les données initiales
 */
async function loadInitialData() {
    console.log('📥 Chargement des données initiales...');

    try {
        // Récupérer les données depuis les templates ou l'API
        if (typeof window.FLASK_DATA !== 'undefined') {
            loadDataFromFlask();
        } else if (typeof APIManager !== 'undefined') {
            await loadDataFromAPI();
        } else {
            console.warn('⚠️ Aucune source de données disponible');
        }

        // Initialiser les structures de données
        if (typeof initializeDataStructures === 'function') {
            initializeDataStructures();
        }

        console.log('✅ Données chargées');

    } catch (error) {
        console.warn('⚠️ Erreur lors du chargement des données:', error);
        // Continuer avec des données vides
        AppState.employees = new Map();
        AppState.shifts = new Map();
    }
}

/**
 * Charge les données depuis Flask (templates)
 */
function loadDataFromFlask() {
    console.log('📊 Chargement depuis Flask...');

    const data = window.FLASK_DATA;

    // Charger les employés
    if (data.employees) {
        AppState.employees.clear();
        data.employees.forEach(emp => {
            AppState.employees.set(emp.id, emp);
        });
        console.log(`👥 ${data.employees.length} employés chargés`);
    }

    // Charger les créneaux
    if (data.shifts) {
        AppState.shifts.clear();
        data.shifts.forEach(shift => {
            AppState.shifts.set(shift.id, shift);
        });
        console.log(`📅 ${data.shifts.length} créneaux chargés`);
    }
}

/**
 * Charge les données depuis l'API
 */
async function loadDataFromAPI() {
    console.log('🌐 Chargement depuis l\'API...');

    try {
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
        console.warn('⚠️ Erreur API:', error);
        throw error;
    }
}

/**
 * Initialise l'interface utilisateur
 */
async function initializeInterfaceLegacy() {
    console.log('🎨 Initialisation de l\'interface...');

    // Générer la grille de planning
    if (typeof PlanningRenderer !== 'undefined') {
        // Attendre que le DOM soit prêt
        await waitForElement('#planningGrid');
        PlanningRenderer.generatePlanningGrid();
        console.log('✅ Grille de planning créée');
    }

    // Mettre à jour la légende
    if (typeof PlanningUI !== 'undefined') {
        PlanningUI.updateLegend();
        PlanningUI.updateQuickStats();
        console.log('✅ Interface mise à jour');
    }

    // Initialiser la navigation semaine
    if (typeof updateWeekDisplay === 'function') {
        updateWeekDisplay();
    }
}
async function initializeInterface() {
        console.log('🎨 Initialisation de l\'interface...');

        // Générer la grille de planning
        if (typeof PlanningRenderer !== 'undefined') {
            // Attendre que le DOM soit prêt
            await waitForElement('#planningGrid');
            PlanningRenderer.generatePlanningGrid(); // Utilise maintenant le système de colonnes
            console.log('✅ Grille de planning créée');
        }

        // 🆕 INITIALISER LE SYSTÈME DE COLONNES
        if (typeof employeeColumnManager !== 'undefined') {
            employeeColumnManager.initializeEmployeeColumns();
            console.log('✅ Système de colonnes initialisé');
        }

        // Mettre à jour la légende (utilise maintenant le système de colonnes)
        if (typeof PlanningUI !== 'undefined') {
            PlanningUI.updateLegend();
            PlanningUI.updateQuickStats();
            console.log('✅ Interface mise à jour');
        }

        console.log('🎉 Interface initialisée avec succès');
    }

/**
 * Attend qu'un élément existe dans le DOM
 */
function waitForElement(selector) {
    return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

/**
 * Finalise l'initialisation
 */
function finalizeInitialization() {
    // Émettre l'événement de fin d'initialisation
    if (typeof EventBus !== 'undefined') {
        EventBus.emit(PlanningEvents.DATA_LOADED, {
            employees: AppState.employees.size,
            shifts: AppState.shifts.size
        });
    }

    // Masquer les indicateurs de chargement
    const loadingElements = document.querySelectorAll('.loading, .spinner');
    loadingElements.forEach(el => {
        el.style.display = 'none';
    });

    // Afficher l'application
    const appElements = document.querySelectorAll('.app-content, .main-content');
    appElements.forEach(el => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
    });

    console.log('🎯 Initialisation finalisée');
}

// 🆕 AJOUTER CETTE FONCTION POUR RÉINITIALISER LES COLONNES LORS D'AJOUT/SUPPRESSION D'EMPLOYÉS :
function refreshEmployeeColumns() {
        if (typeof employeeColumnManager !== 'undefined') {
            employeeColumnManager.reset();
            employeeColumnManager.initializeEmployeeColumns();

            // Régénérer la grille et la légende
            if (typeof PlanningRenderer !== 'undefined') {
                PlanningRenderer.generatePlanningGrid();
            }

            if (typeof PlanningUI !== 'undefined') {
                PlanningUI.updateLegend();
            }

            console.log('🔄 Colonnes d\'employés actualisées');
        }
    }

/**
 * Affiche une erreur de fallback
 */
function showFallbackError(error) {
    console.error('💥 Erreur critique:', error);

    // Essayer d'afficher une notification
    if (typeof NotificationManager !== 'undefined') {
        NotificationManager.show('Erreur lors du chargement de l\'application', 'error');
    } else {
        // Fallback basique
        alert('Erreur lors du chargement de l\'application. Veuillez recharger la page.');
    }
}

/**
 * Point d'entrée principal
 */
document.addEventListener('DOMContentLoaded', () => {
    // Démarrer l'initialisation après un petit délai
    setTimeout(initializeApp, 100);
});

// Réinitialisation en cas de problème
window.reinitializeApp = function() {
    isAppInitialized = false;
    initializeApp();
};

// Export pour débogage
window.AppInitializer = {
    initialize: initializeApp,
    reinitialize: window.reinitializeApp,
    isInitialized: () => isAppInitialized
};

console.log('🔧 App-init chargé (version corrigée)');