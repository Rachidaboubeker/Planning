/**
 * Planning Restaurant - Script de test des corrections
 * Pour vérifier que les problèmes sont résolus
 */

// Fonction de test à exécuter dans la console
window.testCorrections = function() {
    console.log('🧪 DÉBUT DES TESTS DE CORRECTION\n');

    const results = {
        errorsFixed: false,
        gridAlignment: false,
        noOverlapping: false,
        modulesLoaded: false
    };

    // TEST 1: Vérifier que les erreurs JavaScript sont corrigées
    console.log('Test 1: Erreurs JavaScript...');
    try {
        const requiredObjects = ['Logger', 'PlanningConfig', 'AppState', 'EventBus', 'PlanningUtils'];
        const missing = requiredObjects.filter(obj => typeof window[obj] === 'undefined');

        if (missing.length === 0) {
            console.log('✅ Tous les objets globaux sont définis');
            results.errorsFixed = true;
        } else {
            console.log('❌ Objets manquants:', missing);
        }
    } catch (error) {
        console.log('❌ Erreur lors du test des objets:', error);
    }

    // TEST 2: Vérifier l'alignement de la grille
    console.log('\nTest 2: Alignement de la grille...');
    const grid = document.getElementById('planningGrid');
    if (grid) {
        const timeSlots = grid.querySelectorAll('.time-slot');
        const scheduleCells = grid.querySelectorAll('.schedule-cell');

        if (timeSlots.length > 0 && scheduleCells.length > 0) {
            // Vérifier que les heures sont dans la première colonne
            const firstTimeSlot = timeSlots[0];
            const gridColumn = window.getComputedStyle(firstTimeSlot).gridColumn;

            if (gridColumn === '1') {
                console.log('✅ Heures correctement alignées en première colonne');
                results.gridAlignment = true;
            } else {
                console.log('❌ Problème d\'alignement des heures, colonne:', gridColumn);
            }
        } else {
            console.log('❌ Grille non trouvée ou vide');
        }
    } else {
        console.log('❌ Élément planningGrid non trouvé');
    }

    // TEST 3: Vérifier l'absence de superposition
    console.log('\nTest 3: Superposition des créneaux...');
    const shiftBlocks = document.querySelectorAll('.shift-block');
    if (shiftBlocks.length > 0) {
        console.log(`Trouvé ${shiftBlocks.length} créneaux`);

        // Grouper par position pour détecter les superpositions
        const positionGroups = new Map();
        let overlappingFound = false;

        shiftBlocks.forEach(block => {
            const rect = block.getBoundingClientRect();
            const key = `${Math.round(rect.top)}-${Math.round(rect.left)}`;

            if (!positionGroups.has(key)) {
                positionGroups.set(key, []);
            }
            positionGroups.get(key).push(block);
        });

        // Vérifier si des créneaux multiples sont côte à côte (pas superposés)
        positionGroups.forEach((blocks, position) => {
            if (blocks.length > 1) {
                // Vérifier qu'ils sont côte à côte, pas superposés
                const rects = blocks.map(b => b.getBoundingClientRect());
                const widths = rects.map(r => r.width);
                const expectedWidth = rects[0].width;

                // Si tous ont la même largeur ET sont plus petits que la cellule, c'est bon
                const aresSideBySide = widths.every(w => Math.abs(w - expectedWidth) < 5);

                if (aresSideBySide && expectedWidth < 150) {
                    console.log(`✅ ${blocks.length} créneaux côte à côte à la position ${position}`);
                } else {
                    console.log(`⚠️ Possible superposition à la position ${position}`);
                    overlappingFound = true;
                }
            }
        });

        if (!overlappingFound) {
            console.log('✅ Aucune superposition détectée');
            results.noOverlapping = true;
        }
    } else {
        console.log('⚠️ Aucun créneau trouvé (normal si pas de données)');
        results.noOverlapping = true; // Pas de créneaux = pas de superposition
    }

    // TEST 4: Vérifier le chargement des modules
    console.log('\nTest 4: Modules chargés...');
    const expectedModules = [
        'APIManager', 'NotificationManager', 'ColorManager',
        'AvatarManager', 'PlanningManager', 'PlanningRenderer', 'PlanningUI'
    ];

    const loadedModules = expectedModules.filter(mod => typeof window[mod] !== 'undefined');
    const missingModules = expectedModules.filter(mod => typeof window[mod] === 'undefined');

    console.log(`✅ Modules chargés (${loadedModules.length}/${expectedModules.length}):`, loadedModules);
    if (missingModules.length > 0) {
        console.log('❌ Modules manquants:', missingModules);
    }

    results.modulesLoaded = missingModules.length === 0;

    // RÉSUMÉ
    console.log('\n📊 RÉSUMÉ DES TESTS:');
    console.log('='.repeat(50));
    console.log(`Erreurs JS corrigées: ${results.errorsFixed ? '✅' : '❌'}`);
    console.log(`Grille alignée: ${results.gridAlignment ? '✅' : '❌'}`);
    console.log(`Pas de superposition: ${results.noOverlapping ? '✅' : '❌'}`);
    console.log(`Modules chargés: ${results.modulesLoaded ? '✅' : '❌'}`);

    const allGood = Object.values(results).every(r => r);
    console.log(`\n🎯 ÉTAT GLOBAL: ${allGood ? '✅ TOUT FONCTIONNE' : '❌ PROBLÈMES DÉTECTÉS'}`);

    return results;
};

// Fonction pour forcer une re-génération de la grille
window.forceGridRegeneration = function() {
    console.log('🔄 Force la régénération de la grille...');

    if (typeof PlanningRenderer !== 'undefined') {
        PlanningRenderer.generatePlanningGrid();
        console.log('✅ Grille régénérée avec PlanningRenderer');
    } else {
        console.log('❌ PlanningRenderer non disponible');
    }
};

// Fonction pour débugger les positions des créneaux
window.debugShiftPositions = function() {
    console.log('🔍 DÉBOGAGE DES POSITIONS DES CRÉNEAUX');

    const shifts = document.querySelectorAll('.shift-block');
    if (shifts.length === 0) {
        console.log('❌ Aucun créneau trouvé');
        return;
    }

    console.log(`Trouvé ${shifts.length} créneaux:`);
    console.log('Index | Employee | Day | Hours | Position | Size');
    console.log('-'.repeat(60));

    shifts.forEach((shift, index) => {
        const rect = shift.getBoundingClientRect();
        const employeeId = shift.dataset.employeeId;
        const day = shift.dataset.day;
        const startHour = shift.dataset.startHour;
        const duration = shift.dataset.duration;

        const employee = AppState?.employees?.get(employeeId);
        const name = employee ? employee.nom_complet : 'Inconnu';

        console.log(
            `${index.toString().padStart(5)} | ` +
            `${name.padEnd(10)} | ` +
            `${day.padEnd(8)} | ` +
            `${startHour}h-${duration}h | ` +
            `${Math.round(rect.left)},${Math.round(rect.top)} | ` +
            `${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
    });
};

// Fonction pour corriger manuellement si besoin
window.manualFix = function() {
    console.log('🛠️ CORRECTION MANUELLE...');

    // 1. Nettoyer la grille
    const grid = document.getElementById('planningGrid');
    if (grid) {
        grid.innerHTML = '';
        console.log('✅ Grille nettoyée');
    }

    // 2. Créer les objets manquants
    if (typeof SystemRepair !== 'undefined' && SystemRepair.createMissingGlobals) {
        SystemRepair.createMissingGlobals();
        console.log('✅ Objets globaux créés');
    }

    // 3. Régénérer la grille
    setTimeout(() => {
        if (typeof PlanningRenderer !== 'undefined') {
            PlanningRenderer.generatePlanningGrid();
            console.log('✅ Grille régénérée');
        }
    }, 100);

    console.log('🎯 Correction manuelle terminée');
};

// Auto-test au chargement (optionnel)
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que tout soit chargé
    setTimeout(() => {
        console.log('🔍 Test automatique des corrections...');
        const results = window.testCorrections();

        if (!Object.values(results).every(r => r)) {
            console.log('\n⚠️ Des problèmes ont été détectés. Utilisez les fonctions suivantes pour débugger:');
            console.log('- testCorrections() : Re-tester tout');
            console.log('- forceGridRegeneration() : Forcer la régénération');
            console.log('- debugShiftPositions() : Voir les positions des créneaux');
            console.log('- manualFix() : Correction manuelle');
        }
    }, 2000);
});

console.log('🧪 Script de test des corrections chargé');
console.log('💡 Utilisez testCorrections() dans la console pour tester');