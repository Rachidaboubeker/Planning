"""
Tests unitaires pour les modèles
"""

import unittest
import tempfile
import os
from datetime import datetime

from app.models.employee import Employee, EmployeeManager
from app.models.shift import Shift, ShiftManager
from app.models.planning import PlanningManager


class TestEmployee(unittest.TestCase):
    """Tests pour le modèle Employee"""

    def setUp(self):
        self.employee = Employee(
            nom="Dupont",
            prenom="Marie",
            poste="serveur",
            taux_horaire=16.0
        )

    def test_employee_creation(self):
        """Test de création d'un employé"""
        self.assertEqual(self.employee.nom, "Dupont")
        self.assertEqual(self.employee.prenom, "Marie")
        self.assertEqual(self.employee.poste, "serveur")
        self.assertEqual(self.employee.taux_horaire, 16.0)
        self.assertTrue(self.employee.actif)
        self.assertIsNotNone(self.employee.id)

    def test_nom_complet(self):
        """Test de la propriété nom_complet"""
        self.assertEqual(self.employee.nom_complet, "Marie Dupont")

    def test_to_dict(self):
        """Test de conversion en dictionnaire"""
        data = self.employee.to_dict()
        self.assertIsInstance(data, dict)
        self.assertEqual(data['nom'], "Dupont")
        self.assertEqual(data['prenom'], "Marie")
        self.assertEqual(data['nom_complet'], "Marie Dupont")
        self.assertIn('type_info', data)

    def test_from_dict(self):
        """Test de création depuis un dictionnaire"""
        data = {
            'id': 'test_id',
            'nom': 'Martin',
            'prenom': 'Pierre',
            'poste': 'cuisinier',
            'taux_horaire': 18.0
        }
        employee = Employee.from_dict(data)
        self.assertEqual(employee.id, 'test_id')
        self.assertEqual(employee.nom, 'Martin')
        self.assertEqual(employee.prenom, 'Pierre')
        self.assertEqual(employee.poste, 'cuisinier')
        self.assertEqual(employee.taux_horaire, 18.0)


class TestEmployeeManager(unittest.TestCase):
    """Tests pour EmployeeManager"""

    def setUp(self):
        # Créer un fichier temporaire pour les tests
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        self.temp_file.close()

        # Créer le manager avec le fichier temporaire
        self.manager = EmployeeManager()
        self.manager.file_path = self.temp_file.name
        self.manager._employees = {}

    def tearDown(self):
        # Nettoyer le fichier temporaire
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_add_employee(self):
        """Test d'ajout d'employé"""
        employee = Employee(nom="Test", prenom="User", poste="serveur")
        result = self.manager.add_employee(employee)

        self.assertTrue(result)
        self.assertIn(employee.id, self.manager._employees)
        self.assertEqual(len(self.manager._employees), 1)

    def test_get_employee(self):
        """Test de récupération d'employé"""
        employee = Employee(nom="Test", prenom="User", poste="serveur")
        self.manager._employees[employee.id] = employee

        retrieved = self.manager.get_employee(employee.id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.nom, "Test")

        # Test avec ID inexistant
        not_found = self.manager.get_employee("inexistant")
        self.assertIsNone(not_found)

    def test_get_all_employees(self):
        """Test de récupération de tous les employés"""
        emp1 = Employee(nom="Dupont", prenom="Marie", poste="serveur")
        emp2 = Employee(nom="Martin", prenom="Pierre", poste="cuisinier")
        emp3 = Employee(nom="Lemaire", prenom="Julie", poste="barman", actif=False)

        self.manager._employees[emp1.id] = emp1
        self.manager._employees[emp2.id] = emp2
        self.manager._employees[emp3.id] = emp3

        # Test avec actifs seulement
        active_employees = self.manager.get_all_employees(actif_only=True)
        self.assertEqual(len(active_employees), 2)

        # Test avec tous
        all_employees = self.manager.get_all_employees(actif_only=False)
        self.assertEqual(len(all_employees), 3)

    def test_update_employee(self):
        """Test de mise à jour d'employé"""
        employee = Employee(nom="Test", prenom="User", poste="serveur")
        self.manager._employees[employee.id] = employee

        update_data = {"taux_horaire": 20.0, "email": "test@example.com"}
        result = self.manager.update_employee(employee.id, update_data)

        self.assertTrue(result)
        self.assertEqual(employee.taux_horaire, 20.0)
        self.assertEqual(employee.email, "test@example.com")


class TestShift(unittest.TestCase):
    """Tests pour le modèle Shift"""

    def setUp(self):
        self.shift = Shift(
            employee_id="emp_1",
            day="Lundi",
            start_hour=11,
            duration=4
        )

    def test_shift_creation(self):
        """Test de création d'un créneau"""
        self.assertEqual(self.shift.employee_id, "emp_1")
        self.assertEqual(self.shift.day, "Lundi")
        self.assertEqual(self.shift.start_hour, 11)
        self.assertEqual(self.shift.duration, 4)
        self.assertIsNotNone(self.shift.id)

    def test_end_hour(self):
        """Test du calcul de l'heure de fin"""
        self.assertEqual(self.shift.end_hour, 15)

        # Test avec passage à minuit
        night_shift = Shift(employee_id="emp_1", day="Vendredi", start_hour=22, duration=4)
        self.assertEqual(night_shift.end_hour, 2)

    def test_formatted_hours(self):
        """Test du formatage des heures"""
        self.assertEqual(self.shift.formatted_hours, "11:00 - 15:00")

    def test_crosses_midnight(self):
        """Test de détection du passage à minuit"""
        self.assertFalse(self.shift.crosses_midnight)

        night_shift = Shift(employee_id="emp_1", day="Vendredi", start_hour=22, duration=4)
        self.assertTrue(night_shift.crosses_midnight)

    def test_conflicts_with(self):
        """Test de détection des conflits"""
        shift1 = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        shift2 = Shift(employee_id="emp_1", day="Lundi", start_hour=13, duration=3)
        shift3 = Shift(employee_id="emp_1", day="Mardi", start_hour=11, duration=4)
        shift4 = Shift(employee_id="emp_2", day="Lundi", start_hour=11, duration=4)

        # Même employé, même jour, heures qui se chevauchent
        self.assertTrue(shift1.conflicts_with(shift2))

        # Même employé, jour différent
        self.assertFalse(shift1.conflicts_with(shift3))

        # Employé différent, même créneau
        self.assertFalse(shift1.conflicts_with(shift4))

    def test_get_occupied_hours(self):
        """Test de récupération des heures occupées"""
        hours = self.shift.get_occupied_hours()
        self.assertEqual(hours, [11, 12, 13, 14])

        # Test avec passage à minuit
        night_shift = Shift(employee_id="emp_1", day="Vendredi", start_hour=22, duration=4)
        night_hours = night_shift.get_occupied_hours()
        self.assertEqual(night_hours, [22, 23, 0, 1])


class TestShiftManager(unittest.TestCase):
    """Tests pour ShiftManager"""

    def setUp(self):
        # Créer un fichier temporaire pour les tests
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        self.temp_file.close()

        # Créer le manager avec le fichier temporaire
        self.manager = ShiftManager()
        self.manager.file_path = self.temp_file.name
        self.manager._shifts = {}

    def tearDown(self):
        # Nettoyer le fichier temporaire
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_add_shift_success(self):
        """Test d'ajout de créneau réussi"""
        shift = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        success, message = self.manager.add_shift(shift)

        self.assertTrue(success)
        self.assertIn("succès", message)
        self.assertIn(shift.id, self.manager._shifts)

    def test_add_shift_conflict(self):
        """Test d'ajout de créneau en conflit"""
        shift1 = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        shift2 = Shift(employee_id="emp_1", day="Lundi", start_hour=13, duration=3)

        # Ajouter le premier créneau
        self.manager._shifts[shift1.id] = shift1

        # Tenter d'ajouter le second (conflit)
        success, message = self.manager.add_shift(shift2)

        self.assertFalse(success)
        self.assertIn("Conflit", message)

    def test_get_shifts_by_day(self):
        """Test de récupération des créneaux par jour"""
        shift1 = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        shift2 = Shift(employee_id="emp_2", day="Lundi", start_hour=12, duration=3)
        shift3 = Shift(employee_id="emp_1", day="Mardi", start_hour=11, duration=4)

        self.manager._shifts[shift1.id] = shift1
        self.manager._shifts[shift2.id] = shift2
        self.manager._shifts[shift3.id] = shift3

        monday_shifts = self.manager.get_shifts_by_day("Lundi")
        self.assertEqual(len(monday_shifts), 2)

        tuesday_shifts = self.manager.get_shifts_by_day("Mardi")
        self.assertEqual(len(tuesday_shifts), 1)

    def test_get_shifts_by_employee(self):
        """Test de récupération des créneaux par employé"""
        shift1 = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        shift2 = Shift(employee_id="emp_1", day="Mardi", start_hour=12, duration=3)
        shift3 = Shift(employee_id="emp_2", day="Lundi", start_hour=11, duration=4)

        self.manager._shifts[shift1.id] = shift1
        self.manager._shifts[shift2.id] = shift2
        self.manager._shifts[shift3.id] = shift3

        emp1_shifts = self.manager.get_shifts_by_employee("emp_1")
        self.assertEqual(len(emp1_shifts), 2)

        emp2_shifts = self.manager.get_shifts_by_employee("emp_2")
        self.assertEqual(len(emp2_shifts), 1)

    def test_delete_shift(self):
        """Test de suppression de créneau"""
        shift = Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        self.manager._shifts[shift.id] = shift

        result = self.manager.delete_shift(shift.id)
        self.assertTrue(result)
        self.assertNotIn(shift.id, self.manager._shifts)

        # Test avec ID inexistant
        result = self.manager.delete_shift("inexistant")
        self.assertFalse(result)


class TestPlanningManager(unittest.TestCase):
    """Tests pour PlanningManager"""

    def setUp(self):
        self.planning_manager = PlanningManager()

        # Ajouter des données de test
        emp1 = Employee(employee_id="emp_1", nom="Dupont", prenom="Marie", poste="serveur", taux_horaire=16.0)
        emp2 = Employee(employee_id="emp_2", nom="Martin", prenom="Pierre", poste="cuisinier", taux_horaire=18.0)

        self.planning_manager.employee_manager._employees["emp_1"] = emp1
        self.planning_manager.employee_manager._employees["emp_2"] = emp2

        shift1 = Shift(shift_id="shift_1", employee_id="emp_1", day="Lundi", start_hour=11, duration=4)
        shift2 = Shift(shift_id="shift_2", employee_id="emp_2", day="Lundi", start_hour=12, duration=3)

        self.planning_manager.shift_manager._shifts["shift_1"] = shift1
        self.planning_manager.shift_manager._shifts["shift_2"] = shift2

    def test_get_week_planning(self):
        """Test de récupération du planning hebdomadaire"""
        planning = self.planning_manager.get_week_planning()

        self.assertIn('week_info', planning)
        self.assertIn('shifts_by_day', planning)
        self.assertIn('employees', planning)
        self.assertIn('stats', planning)

        # Vérifier les statistiques
        stats = planning['stats']
        self.assertIn('total_hours', stats)
        self.assertIn('total_cost', stats)
        self.assertIn('active_employees', stats)
        self.assertEqual(stats['total_hours'], 7)  # 4 + 3 heures

    def test_validate_shift_placement(self):
        """Test de validation de placement de créneau"""
        # Créneau valide
        valid_shift = {
            'employee_id': 'emp_1',
            'day': 'Mardi',
            'start_hour': 11,
            'duration': 4
        }

        is_valid, message = self.planning_manager.validate_shift_placement(valid_shift)
        self.assertTrue(is_valid)

        # Employé inexistant
        invalid_shift = {
            'employee_id': 'emp_inexistant',
            'day': 'Mardi',
            'start_hour': 11,
            'duration': 4
        }

        is_valid, message = self.planning_manager.validate_shift_placement(invalid_shift)
        self.assertFalse(is_valid)
        self.assertIn("introuvable", message)

        # Durée trop longue
        long_shift = {
            'employee_id': 'emp_1',
            'day': 'Mardi',
            'start_hour': 11,
            'duration': 15
        }

        is_valid, message = self.planning_manager.validate_shift_placement(long_shift)
        self.assertFalse(is_valid)
        self.assertIn("12 heures", message)

    def test_get_employee_planning(self):
        """Test de récupération du planning d'un employé"""
        planning = self.planning_manager.get_employee_planning("emp_1")

        self.assertIsNotNone(planning)
        self.assertIn('employee', planning)
        self.assertIn('week_info', planning)
        self.assertIn('shifts_by_day', planning)
        self.assertIn('stats', planning)

        # Vérifier les stats de l'employé
        stats = planning['stats']
        self.assertEqual(stats['total_hours'], 4)

        # Test avec employé inexistant
        planning = self.planning_manager.get_employee_planning("emp_inexistant")
        self.assertIsNone(planning)


if __name__ == '__main__':
    # Créer une suite de tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Ajouter tous les tests
    suite.addTests(loader.loadTestsFromTestCase(TestEmployee))
    suite.addTests(loader.loadTestsFromTestCase(TestEmployeeManager))
    suite.addTests(loader.loadTestsFromTestCase(TestShift))
    suite.addTests(loader.loadTestsFromTestCase(TestShiftManager))
    suite.addTests(loader.loadTestsFromTestCase(TestPlanningManager))

    # Exécuter les tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Afficher le résumé
    print(f"\n{'=' * 50}")
    print(f"Tests exécutés: {result.testsRun}")
    print(f"Échecs: {len(result.failures)}")
    print(f"Erreurs: {len(result.errors)}")
    print(f"Succès: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"{'=' * 50}")

    if result.failures:
        print("\nÉCHECS:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")

    if result.errors:
        print("\nERREURS:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")