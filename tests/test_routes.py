"""
Tests unitaires pour les routes et API
"""

import unittest
import json
import tempfile
import os
from unittest.mock import patch, MagicMock

# Import de l'application
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from config import Config

class TestAPI(unittest.TestCase):
    """Tests pour l'API REST"""

    def setUp(self):
        """Configuration avant chaque test"""
        # Créer des fichiers temporaires pour les tests
        self.temp_employees_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        self.temp_shifts_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')

        # Fermer les fichiers pour permettre l'écriture
        self.temp_employees_file.close()
        self.temp_shifts_file.close()

        # Configurer l'application de test
        self.app = create_app('default')
        self.app.config['TESTING'] = True
        self.app.config['EMPLOYEES_FILE'] = self.temp_employees_file.name
        self.app.config['SHIFTS_FILE'] = self.temp_shifts_file.name

        # Créer le client de test
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        # Données de test
        self.test_employee = {
            'nom': 'Test',
            'prenom': 'User',
            'poste': 'serveur',
            'taux_horaire': 15.0,
            'email': 'test@example.com',
            'telephone': '06.12.34.56.78'
        }

        self.test_shift = {
            'employee_id': '',  # Sera rempli dynamiquement
            'day': 'Lundi',
            'start_hour': 11,
            'duration': 4,
            'notes': 'Test shift'
        }

    def tearDown(self):
        """Nettoyage après chaque test"""
        self.app_context.pop()

        # Supprimer les fichiers temporaires
        if os.path.exists(self.temp_employees_file.name):
            os.unlink(self.temp_employees_file.name)
        if os.path.exists(self.temp_shifts_file.name):
            os.unlink(self.temp_shifts_file.name)

    def test_get_employees_empty(self):
        """Test de récupération d'employés (liste vide)"""
        response = self.client.get('/api/employees')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIsInstance(data['employees'], list)
        self.assertEqual(data['count'], len(data['employees']))

    def test_create_employee_success(self):
        """Test de création d'employé réussie"""
        response = self.client.post('/api/employees',
                                  data=json.dumps(self.test_employee),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(data['success'])
        self.assertIn('employee', data)
        self.assertEqual(data['employee']['nom'], 'Test')
        self.assertEqual(data['employee']['prenom'], 'User')
        self.assertIn('message', data)

    def test_create_employee_missing_fields(self):
        """Test de création d'employé avec champs manquants"""
        incomplete_employee = {'nom': 'Test'}

        response = self.client.post('/api/employees',
                                  data=json.dumps(incomplete_employee),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['success'])
        self.assertIn('error', data)
        self.assertIn('requis', data['error'])

    def test_create_employee_invalid_poste(self):
        """Test de création d'employé avec poste invalide"""
        invalid_employee = self.test_employee.copy()
        invalid_employee['poste'] = 'poste_inexistant'

        response = self.client.post('/api/employees',
                                  data=json.dumps(invalid_employee),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['success'])
        self.assertIn('invalide', data['error'])

    def test_get_employee_by_id(self):
        """Test de récupération d'employé par ID"""
        # Créer d'abord un employé
        create_response = self.client.post('/api/employees',
                                         data=json.dumps(self.test_employee),
                                         content_type='application/json')
        create_data = json.loads(create_response.data)
        employee_id = create_data['employee']['id']

        # Récupérer l'employé
        response = self.client.get(f'/api/employees/{employee_id}')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('employee', data)
        self.assertEqual(data['employee']['id'], employee_id)

    def test_get_employee_not_found(self):
        """Test de récupération d'employé inexistant"""
        response = self.client.get('/api/employees/inexistant')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(data['success'])
        self.assertIn('introuvable', data['error'])

    def test_update_employee(self):
        """Test de mise à jour d'employé"""
        # Créer d'abord un employé
        create_response = self.client.post('/api/employees',
                                         data=json.dumps(self.test_employee),
                                         content_type='application/json')
        create_data = json.loads(create_response.data)
        employee_id = create_data['employee']['id']

        # Mettre à jour l'employé
        update_data = {'taux_horaire': 20.0, 'email': 'updated@example.com'}
        response = self.client.put(f'/api/employees/{employee_id}',
                                 data=json.dumps(update_data),
                                 content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertEqual(data['employee']['taux_horaire'], 20.0)
        self.assertEqual(data['employee']['email'], 'updated@example.com')

    def test_delete_employee(self):
        """Test de suppression d'employé"""
        # Créer d'abord un employé
        create_response = self.client.post('/api/employees',
                                         data=json.dumps(self.test_employee),
                                         content_type='application/json')
        create_data = json.loads(create_response.data)
        employee_id = create_data['employee']['id']

        # Supprimer l'employé
        response = self.client.delete(f'/api/employees/{employee_id}')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('supprimé', data['message'])

    def test_create_shift_success(self):
        """Test de création de créneau réussie"""
        # Créer d'abord un employé
        create_emp_response = self.client.post('/api/employees',
                                             data=json.dumps(self.test_employee),
                                             content_type='application/json')
        emp_data = json.loads(create_emp_response.data)
        employee_id = emp_data['employee']['id']

        # Créer le créneau
        shift_data = self.test_shift.copy()
        shift_data['employee_id'] = employee_id

        response = self.client.post('/api/shifts',
                                  data=json.dumps(shift_data),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(data['success'])
        self.assertIn('shift', data)
        self.assertEqual(data['shift']['employee_id'], employee_id)
        self.assertEqual(data['shift']['day'], 'Lundi')

    def test_create_shift_invalid_employee(self):
        """Test de création de créneau avec employé inexistant"""
        shift_data = self.test_shift.copy()
        shift_data['employee_id'] = 'emp_inexistant'

        response = self.client.post('/api/shifts',
                                  data=json.dumps(shift_data),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['success'])
        self.assertIn('introuvable', data['error'])

    def test_create_shift_invalid_day(self):
        """Test de création de créneau avec jour invalide"""
        # Créer d'abord un employé
        create_emp_response = self.client.post('/api/employees',
                                             data=json.dumps(self.test_employee),
                                             content_type='application/json')
        emp_data = json.loads(create_emp_response.data)
        employee_id = emp_data['employee']['id']

        # Créer le créneau avec jour invalide
        shift_data = self.test_shift.copy()
        shift_data['employee_id'] = employee_id
        shift_data['day'] = 'JourInvalide'

        response = self.client.post('/api/shifts',
                                  data=json.dumps(shift_data),
                                  content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['success'])
        self.assertIn('invalide', data['error'])

    def test_get_shifts(self):
        """Test de récupération des créneaux"""
        response = self.client.get('/api/shifts')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIsInstance(data['shifts'], list)
        self.assertEqual(data['count'], len(data['shifts']))

    def test_get_shifts_by_day(self):
        """Test de récupération des créneaux par jour"""
        response = self.client.get('/api/shifts?day=Lundi')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIsInstance(data['shifts'], list)

    def test_update_shift(self):
        """Test de mise à jour de créneau"""
        # Créer d'abord un employé et un créneau
        create_emp_response = self.client.post('/api/employees',
                                             data=json.dumps(self.test_employee),
                                             content_type='application/json')
        emp_data = json.loads(create_emp_response.data)
        employee_id = emp_data['employee']['id']

        shift_data = self.test_shift.copy()
        shift_data['employee_id'] = employee_id

        create_shift_response = self.client.post('/api/shifts',
                                               data=json.dumps(shift_data),
                                               content_type='application/json')
        shift_data_created = json.loads(create_shift_response.data)
        shift_id = shift_data_created['shift']['id']

        # Mettre à jour le créneau
        update_data = {'duration': 6, 'notes': 'Updated shift'}
        response = self.client.put(f'/api/shifts/{shift_id}',
                                 data=json.dumps(update_data),
                                 content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertEqual(data['shift']['duration'], 6)
        self.assertEqual(data['shift']['notes'], 'Updated shift')

    def test_delete_shift(self):
        """Test de suppression de créneau"""
        # Créer d'abord un employé et un créneau
        create_emp_response = self.client.post('/api/employees',
                                             data=json.dumps(self.test_employee),
                                             content_type='application/json')
        emp_data = json.loads(create_emp_response.data)
        employee_id = emp_data['employee']['id']

        shift_data = self.test_shift.copy()
        shift_data['employee_id'] = employee_id

        create_shift_response = self.client.post('/api/shifts',
                                               data=json.dumps(shift_data),
                                               content_type='application/json')
        shift_data_created = json.loads(create_shift_response.data)
        shift_id = shift_data_created['shift']['id']

        # Supprimer le créneau
        response = self.client.delete(f'/api/shifts/{shift_id}')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('supprimé', data['message'])

    def test_get_weekly_stats(self):
        """Test de récupération des statistiques hebdomadaires"""
        response = self.client.get('/api/stats/weekly')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('stats', data)

        stats = data['stats']
        self.assertIn('total_hours', stats)
        self.assertIn('active_employees', stats)
        self.assertIn('average_hours', stats)
        self.assertIn('total_cost', stats)

class TestMainRoutes(unittest.TestCase):
    """Tests pour les routes principales"""

    def setUp(self):
        """Configuration avant chaque test"""
        self.app = create_app('default')
        self.app.config['TESTING'] = True

        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Nettoyage après chaque test"""
        self.app_context.pop()

    def test_index_route(self):
        """Test de la route d'accueil"""
        response = self.client.get('/')

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Planning Restaurant', response.data)
        self.assertIn(b'planning-container', response.data)

    def test_planning_route(self):
        """Test de la route du planning détaillé"""
        response = self.client.get('/planning')

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Planning', response.data)

    def test_planning_route_with_week(self):
        """Test de la route du planning avec paramètre semaine"""
        response = self.client.get('/planning?week=2024-25')

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Planning', response.data)

class TestErrorHandling(unittest.TestCase):
    """Tests pour la gestion des erreurs"""

    def setUp(self):
        """Configuration avant chaque test"""
        self.app = create_app('default')
        self.app.config['TESTING'] = True

        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Nettoyage après chaque test"""
        self.app_context.pop()

    def test_404_error(self):
        """Test d'erreur 404"""
        response = self.client.get('/route-inexistante')
        self.assertEqual(response.status_code, 404)

    def test_invalid_json(self):
        """Test avec JSON invalide"""
        response = self.client.post('/api/employees',
                                  data='invalid json',
                                  content_type='application/json')

        # Le statut peut varier selon l'implémentation
        self.assertIn(response.status_code, [400, 500])

    def test_missing_content_type(self):
        """Test sans Content-Type"""
        response = self.client.post('/api/employees',
                                  data='{"nom": "Test"}')

        # Devrait soit rejeter soit traiter différemment
        self.assertNotEqual(response.status_code, 201)

class TestIntegration(unittest.TestCase):
    """Tests d'intégration"""

    def setUp(self):
        """Configuration avant chaque test"""
        # Créer des fichiers temporaires
        self.temp_employees_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        self.temp_shifts_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')

        self.temp_employees_file.close()
        self.temp_shifts_file.close()

        self.app = create_app('default')
        self.app.config['TESTING'] = True
        self.app.config['EMPLOYEES_FILE'] = self.temp_employees_file.name
        self.app.config['SHIFTS_FILE'] = self.temp_shifts_file.name

        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Nettoyage après chaque test"""
        self.app_context.pop()

        if os.path.exists(self.temp_employees_file.name):
            os.unlink(self.temp_employees_file.name)
        if os.path.exists(self.temp_shifts_file.name):
            os.unlink(self.temp_shifts_file.name)

    def test_complete_workflow(self):
        """Test d'un workflow complet"""
        # 1. Créer un employé
        employee_data = {
            'nom': 'Workflow',
            'prenom': 'Test',
            'poste': 'serveur',
            'taux_horaire': 16.0
        }

        emp_response = self.client.post('/api/employees',
                                      data=json.dumps(employee_data),
                                      content_type='application/json')
        emp_data = json.loads(emp_response.data)
        employee_id = emp_data['employee']['id']

        self.assertEqual(emp_response.status_code, 201)

        # 2. Créer des créneaux pour cet employé
        shifts_data = [
            {'employee_id': employee_id, 'day': 'Lundi', 'start_hour': 11, 'duration': 4},
            {'employee_id': employee_id, 'day': 'Mardi', 'start_hour': 12, 'duration': 3},
            {'employee_id': employee_id, 'day': 'Mercredi', 'start_hour': 19, 'duration': 5}
        ]

        shift_ids = []
        for shift_data in shifts_data:
            shift_response = self.client.post('/api/shifts',
                                            data=json.dumps(shift_data),
                                            content_type='application/json')
            shift_result = json.loads(shift_response.data)
            shift_ids.append(shift_result['shift']['id'])
            self.assertEqual(shift_response.status_code, 201)

        # 3. Vérifier les statistiques
        stats_response = self.client.get('/api/stats/weekly')
        stats_data = json.loads(stats_response.data)

        self.assertEqual(stats_response.status_code, 200)
        self.assertEqual(stats_data['stats']['total_hours'], 12)  # 4+3+5
        self.assertEqual(stats_data['stats']['active_employees'], 1)

        # 4. Modifier un créneau
        update_data = {'duration': 6}
        update_response = self.client.put(f'/api/shifts/{shift_ids[0]}',
                                        data=json.dumps(update_data),
                                        content_type='application/json')
        self.assertEqual(update_response.status_code, 200)

        # 5. Vérifier que les stats ont été mises à jour
        stats_response2 = self.client.get('/api/stats/weekly')
        stats_data2 = json.loads(stats_response2.data)
        self.assertEqual(stats_data2['stats']['total_hours'], 14)  # 6+3+5

        # 6. Supprimer un créneau
        delete_response = self.client.delete(f'/api/shifts/{shift_ids[1]}')
        self.assertEqual(delete_response.status_code, 200)

        # 7. Vérifier les stats finales
        stats_response3 = self.client.get('/api/stats/weekly')
        stats_data3 = json.loads(stats_response3.data)
        self.assertEqual(stats_data3['stats']['total_hours'], 11)  # 6+5

if __name__ == '__main__':
    # Créer une suite de tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Ajouter tous les tests
    suite.addTests(loader.loadTestsFromTestCase(TestAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestMainRoutes))
    suite.addTests(loader.loadTestsFromTestCase(TestErrorHandling))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    # Exécuter les tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Afficher le résumé
    print(f"\n{'='*60}")
    print(f"RÉSULTATS DES TESTS API ET ROUTES")
    print(f"{'='*60}")
    print(f"Tests exécutés: {result.testsRun}")
    print(f"Échecs: {len(result.failures)}")
    print(f"Erreurs: {len(result.errors)}")
    print(f"Succès: {result.testsRun - len(result.failures) - len(result.errors)}")

    if result.failures:
        print(f"\n❌ ÉCHECS ({len(result.failures)}):")
        for test, traceback in result.failures:
            print(f"- {test}")
            # Correction pour Python 3.11+
            error_msg = traceback.split('AssertionError: ')[-1].split('\n')[0]
            print(f"  {error_msg}")

    if result.errors:
        print(f"\n⚠️ ERREURS ({len(result.errors)}):")
        for test, traceback in result.errors:
            print(f"- {test}")
            # Correction pour Python 3.11+
            lines = traceback.split('\n')
            error_msg = lines[-2] if len(lines) > 1 else "Erreur inconnue"
            print(f"  {error_msg}")

    if not result.failures and not result.errors:
        print("\n✅ Tous les tests sont passés avec succès!")

    print(f"{'='*60}")

    # Code de sortie
    exit(0 if not result.failures and not result.errors else 1)