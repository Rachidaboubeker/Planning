/**
 * SYSTÈME DE RÉPARATION AUTOMATIQUE - ADAPTÉ ARCHITECTURE MODULAIRE
 * Compatible avec la nouvelle structure core/managers/components/utils
 */

class AutoRepairSystem {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.initialized = false;
        this.modules = new Map();
    }

    /**
     * Lance le diagnostic complet adapté à la nouvelle architecture
     */
    async runFullDiagnostic() {
        console.log('🔍 === DIAGNOSTIC COMPLET ARCHITECTURE MODULAIRE ===');

        this.issues = [];
        this.fixes = [];

        // 1. Vérifier les modules core
        this.checkCoreModules();

        // 2. Vérifier les managers
        this.checkManagers();

        // 3. Vérifier les composants
        this.checkComponents();

        // 4. Vérifier les utilitaires
        this.checkUtils();

        // 5. Vérifier l'API
        await this.checkAPI();

        // 6. Vérifier l'affichage
        this.checkDisplay();

        // Résumé
        this.displayDiagnosticSummary();

        return {
            issues: this.issues,
            fixes: this.fixes,
            status: this.issues.length === 0 ? 'healthy' : 'needs_repair',
            architecture: 'modular'
        };
    }

    /**
     * Vérifie les modules core (config, state, events)
     */
    checkCoreModules() {
        console.log('🔍 Vérification modules core...');

        const coreModules = [
            { name: 'Config', ref: window.Config, critical: true },
            { name: 'State', ref: window.State, critical: true },
            { name: 'EventBus', ref: window.EventBus, critical: true }
        ];

        coreModules.forEach(({ name, ref, critical }) => {
            if (!ref) {
                this.addIssue(
                    `Module core manquant: ${name}`,
                    'core',
                    critical ? 'critical' : 'high'
                );
                this.addFix(`Vérifier le chargement de core/${name.toLowerCase()}.js`, () => {
                    console.log(`⚠️ Recharger le fichier core/${name.toLowerCase()}.js`);
                });
            } else {
                console.log(`✅ ${name} OK`);
                this.modules.set(name, ref);
            }
        });
    }

    /**
     * Vérifie les managers
     */
    checkManagers() {
        console.log('🔍 Vérification managers...');

        const managers = [
            { name: 'APIManager', ref: window.APIManager },
            { name: 'UIManager', ref: window.UIManager },
            { name: 'PlanningManager', ref: window.PlanningManager },
            { name: 'DragDropManager', ref: window.DragDropManager }
        ];

        managers.forEach(({ name, ref }) => {
            if (!ref) {
                this.addIssue(`Manager manquant: ${name}`, 'manager', 'high');
                this.addFix(`Vérifier managers/${name.toLowerCase().replace('manager', '')}.js`, () => {
                    console.log(`⚠️ Recharger le fichier managers/${name.toLowerCase().replace('manager', '')}.js`);
                });
            } else if (typeof ref.initialize === 'function' && !ref.isInitialized) {
                this.addIssue(`Manager non initialisé: ${name}`, 'manager', 'medium');
                this.addFix(`Initialiser ${name}`, async () => {
                    try {
                        await ref.initialize();
                        console.log(`✅ ${name} initialisé`);
                    } catch (error) {
                        console.error(`❌ Erreur initialisation ${name}:`, error);
                    }
                });
            } else {
                console.log(`✅ ${name} OK`);
                this.modules.set(name, ref);
            }
        });
    }

    /**
     * Vérifie les composants
     */
    checkComponents() {
        console.log('🔍 Vérification composants...');

        const components = [
            { name: 'ModalManager', ref: window.ModalManager },
            { name: 'NotificationManager', ref: window.NotificationManager },
            { name: 'LegendManager', ref: window.LegendManager }
        ];

        components.forEach(({ name, ref }) => {
            if (!ref) {
                this.addIssue(`Composant manquant: ${name}`, 'component', 'medium');
                this.addFix(`Vérifier components/${name.toLowerCase().replace('manager', '')}.js`, () => {
                    console.log(`⚠️ Recharger le fichier components/${name.toLowerCase().replace('manager', '')}.js`);
                });
            } else {
                console.log(`✅ ${name} OK`);
                this.modules.set(name, ref);
            }
        });
    }

    /**
     * Vérifie les utilitaires
     */
    checkUtils() {
        console.log('🔍 Vérification utilitaires...');

        const utils = [
            { name: 'TimeUtils', ref: window.TimeUtils },
            { name: 'ValidationUtils', ref: window.ValidationUtils },
            { name: 'AvatarUtils', ref: window.AvatarUtils }
        ];

        utils.forEach(({ name, ref }) => {
            if (!ref) {
                this.addIssue(`Utilitaire manquant: ${name}`, 'utils', 'low');
            } else {
                console.log(`✅ ${name} OK`);
                this.modules.set(name, ref);
            }
        });
    }

    /**
     * Vérifie l'API (compatible nouvelle architecture)
     */
    async checkAPI() {
        console.log('🔍 Vérification de l\'API...');

        const endpoints = [
            { url: '/api/employees', name: 'Employés' },
            { url: '/api/shifts', name: 'Créneaux' },
            { url: '/api/health', name: 'Santé' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url);

                if (!response.ok) {
                    this.addIssue(`API ${endpoint.name} erreur ${response.status}`, 'api', 'high');

                    if (endpoint.url.includes('shifts') && response.status === 500) {
                        this.addFix('Corriger API shifts (routes/api.py)', () => {
                            console.log('⚠️ Appliquer la correction API shifts dans app/routes/api.py');
                        });
                    }
                } else {
                    const result = await response.json();
                    console.log(`✅ API ${endpoint.name} OK`);
                }

            } catch (error) {
                this.addIssue(`API ${endpoint.name} inaccessible: ${error.message}`, 'api', 'critical');
            }
        }
    }

    /**
     * Vérifie l'affichage des données
     */
    checkDisplay() {
        console.log('🔍 Vérification de l\'affichage...');

        // Vérifier les conteneurs essentiels
        const containers = [
            { selector: '#app', name: 'Application principale' },
            { selector: '#planningGrid', name: 'Grille de planning' },
            { selector: '#modalContainer', name: 'Conteneur modals' },
            { selector: '#notificationContainer', name: 'Conteneur notifications' }
        ];

        containers.forEach(({ selector, name }) => {
            const element = document.querySelector(selector);
            if (!element) {
                this.addIssue(`Conteneur manquant: ${name}`, 'dom', 'medium');
            } else {
                console.log(`✅ ${name} présent`);
            }
        });

        // Vérifier l'affichage des données via State
        if (window.State) {
            const summary = window.State.getSummary();

            console.log(`📊 Données State: ${summary.employees} employés, ${summary.shifts} créneaux`);

            // Vérifier cohérence affichage
            const displayedEmployees = document.querySelectorAll('[data-employee-id]').length;
            const displayedShifts = document.querySelectorAll('.shift-block').length;

            if (summary.employees > 0 && displayedEmployees === 0) {
                this.addIssue('Employés en mémoire mais non affichés', 'display', 'medium');
                this.addFix('Rafraîchir affichage employés', () => {
                    if (window.UIManager && window.UIManager.refreshEmployeeDisplay) {
                        window.UIManager.refreshEmployeeDisplay();
                    }
                });
            }

            if (summary.shifts > 0 && displayedShifts === 0) {
                this.addIssue('Créneaux en mémoire mais non affichés', 'display', 'medium');
                this.addFix('Rafraîchir affichage planning', () => {
                    if (window.PlanningManager && window.PlanningManager.render) {
                        window.PlanningManager.render();
                    }
                });
            }
        }
    }

    /**
     * Applique toutes les corrections adaptées
     */
    async applyAllFixes() {
        console.log('🔧 === APPLICATION DES CORRECTIONS (ARCHITECTURE MODULAIRE) ===');

        for (const fix of this.fixes) {
            try {
                console.log(`🔄 Application: ${fix.description}`);
                await fix.action();
                fix.applied = true;
                console.log(`✅ Appliqué: ${fix.description}`);

                // Pause pour éviter la surcharge
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`❌ Échec: ${fix.description}`, error);
            }
        }

        // Re-diagnostiquer après les corrections
        setTimeout(() => {
            console.log('🔄 Re-diagnostic après corrections...');
            this.runFullDiagnostic();
        }, 1000);
    }

    /**
     * Réparation d'urgence adaptée à l'architecture modulaire
     */
    async emergencyRepair() {
        console.log('🚨 === RÉPARATION D\'URGENCE (MODULAIRE) ===');

        // 1. Réinitialiser les managers dans l'ordre
        const managerOrder = ['APIManager', 'UIManager', 'PlanningManager', 'DragDropManager'];

        for (const managerName of managerOrder) {
            const manager = window[managerName];
            if (manager && typeof manager.initialize === 'function') {
                try {
                    await manager.initialize();
                    console.log(`✅ ${managerName} réinitialisé`);
                } catch (error) {
                    console.error(`❌ Erreur réinit ${managerName}:`, error);
                }
            }
        }

        // 2. Réinitialiser les composants
        const componentOrder = ['ModalManager', 'NotificationManager', 'LegendManager'];

        for (const componentName of componentOrder) {
            const component = window[componentName];
            if (component && typeof component.initialize === 'function') {
                try {
                    await component.initialize();
                    console.log(`✅ ${componentName} réinitialisé`);
                } catch (error) {
                    console.error(`❌ Erreur réinit ${componentName}:`, error);
                }
            }
        }

        // 3. Recharger les données si State disponible
        if (window.State && window.APIManager) {
            try {
                console.log('🔄 Rechargement des données...');
                await window.APIManager.loadInitialData();
                console.log('✅ Données rechargées');
            } catch (error) {
                console.error('❌ Erreur rechargement données:', error);
            }
        }

        console.log('✅ Réparation d\'urgence terminée');
    }

    /**
     * Test de santé adapté
     */
    quickHealthCheck() {
        const checks = {
            'Core Config': !!window.Config,
            'Core State': !!window.State,
            'Core Events': !!window.EventBus,
            'API Manager': !!window.APIManager,
            'UI Manager': !!window.UIManager,
            'Planning Manager': !!window.PlanningManager,
            'Modal Manager': !!window.ModalManager,
            'Notification Manager': !!window.NotificationManager,
            'App Container': !!document.getElementById('app'),
            'Modal Container': !!document.getElementById('modalContainer'),
            'Notification Container': !!document.getElementById('notificationContainer')
        };

        // Test API async
        fetch('/api/employees')
            .then(r => r.ok)
            .then(ok => {
                checks['API Response'] = ok;
                this.displayQuickResults(checks);
            })
            .catch(() => {
                checks['API Response'] = false;
                this.displayQuickResults(checks);
            });

        return checks;
    }

    /**
     * Diagnostic spécialisé pour l'architecture modulaire
     */
    architectureDiagnostic() {
        console.log('🏗️ === DIAGNOSTIC ARCHITECTURE MODULAIRE ===');

        const architecture = {
            'Core Modules': ['Config', 'State', 'EventBus'].map(name => ({
                name,
                loaded: !!window[name],
                initialized: window[name]?.isInitialized || false
            })),
            'Managers': ['APIManager', 'UIManager', 'PlanningManager', 'DragDropManager'].map(name => ({
                name,
                loaded: !!window[name],
                initialized: window[name]?.isInitialized || false
            })),
            'Components': ['ModalManager', 'NotificationManager', 'LegendManager'].map(name => ({
                name,
                loaded: !!window[name],
                initialized: window[name]?.isInitialized || false
            })),
            'Utils': ['TimeUtils', 'ValidationUtils', 'AvatarUtils'].map(name => ({
                name,
                loaded: !!window[name]
            }))
        };

        console.table(architecture['Core Modules']);
        console.table(architecture['Managers']);
        console.table(architecture['Components']);
        console.table(architecture['Utils']);

        return architecture;
    }

    // Méthodes utilitaires inchangées
    addIssue(description, category, severity) {
        this.issues.push({
            description,
            category,
            severity,
            timestamp: new Date().toISOString()
        });

        const icon = severity === 'critical' ? '🚨' :
                    severity === 'high' ? '❌' :
                    severity === 'medium' ? '⚠️' : '🔸';

        console.log(`${icon} PROBLÈME (${severity}): ${description}`);
    }

    addFix(description, action) {
        this.fixes.push({
            description,
            action,
            applied: false
        });

        console.log(`🔧 SOLUTION: ${description}`);
    }

    displayDiagnosticSummary() {
        console.log('\n🔍 === RÉSUMÉ DIAGNOSTIC ARCHITECTURE MODULAIRE ===');

        const severityCounts = this.issues.reduce((acc, issue) => {
            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
            return acc;
        }, {});

        console.log(`📊 Problèmes détectés: ${this.issues.length}`);
        Object.entries(severityCounts).forEach(([severity, count]) => {
            const icon = severity === 'critical' ? '🚨' :
                        severity === 'high' ? '❌' :
                        severity === 'medium' ? '⚠️' : '🔸';
            console.log(`  ${icon} ${severity}: ${count}`);
        });

        console.log(`🔧 Solutions disponibles: ${this.fixes.length}`);
        console.log(`🏗️ Architecture: Modulaire (${this.modules.size} modules chargés)`);

        if (this.issues.length === 0) {
            console.log('🎉 ARCHITECTURE MODULAIRE EN BONNE SANTÉ !');
        } else {
            console.log('⚠️ Architecture nécessite des réparations');
            console.log('💡 Commandes disponibles:');
            console.log('  • diagnose() - Diagnostic complet');
            console.log('  • fix() - Appliquer corrections');
            console.log('  • emergency() - Réparation urgence');
            console.log('  • health() - Test santé rapide');
            console.log('  • architecture() - Diagnostic architecture');
        }
    }

    displayQuickResults(checks) {
        console.log('⚡ === TEST SANTÉ RAPIDE (MODULAIRE) ===');
        Object.entries(checks).forEach(([name, status]) => {
            console.log(`${status ? '✅' : '❌'} ${name}`);
        });
    }
}

// ==================== INITIALISATION ADAPTÉE ====================

const autoRepair = new AutoRepairSystem();

// Export global avec nouvelles commandes
window.autoRepair = autoRepair;
window.diagnose = () => autoRepair.runFullDiagnostic();
window.fix = () => autoRepair.applyAllFixes();
window.emergency = () => autoRepair.emergencyRepair();
window.health = () => autoRepair.quickHealthCheck();
window.architecture = () => autoRepair.architectureDiagnostic();

// Auto-diagnostic adapté à l'architecture modulaire
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que les modules core soient chargés
    setTimeout(() => {
        if (window.Config && window.State) {
            console.log('🚀 Auto-diagnostic modulaire...');
            autoRepair.runFullDiagnostic();
        } else {
            console.log('⏳ Attente des modules core...');
            setTimeout(() => {
                autoRepair.runFullDiagnostic();
            }, 2000);
        }
    }, 1000);
});

// Auto-fix en mode debug
window.addEventListener('load', () => {
    if (window.location.search.includes('autofix=true')) {
        setTimeout(() => {
            console.log('🔧 Mode auto-fix modulaire activé');
            autoRepair.applyAllFixes();
        }, 3000);
    }
});

console.log('✅ Auto-Repair System (Architecture Modulaire) chargé');
console.log('💡 Nouvelles commandes:');
console.log('  • architecture() - Diagnostic architecture modulaire');