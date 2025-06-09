

"""
Modèle Employee
"""

import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from config import Config


class Employee:
    """Modèle pour représenter un employé"""

    def __init__(self, employee_id: str = None, nom: str = "", prenom: str = "",
                 poste: str = "serveur", email: str = "", telephone: str = "",
                 taux_horaire: float = 15.0, actif: bool = True):
        self.id = employee_id or self._generate_id()
        self.nom = nom
        self.prenom = prenom
        self.poste = poste
        self.email = email
        self.telephone = telephone
        self.taux_horaire = taux_horaire
        self.actif = actif
        self.date_creation = datetime.now().isoformat()

    def _generate_id(self) -> str:
        """Génère un ID unique basé sur le timestamp"""
        return f"emp_{int(datetime.now().timestamp() * 1000)}"

    @property
    def nom_complet(self) -> str:
        """Retourne le nom complet"""
        return f"{self.prenom} {self.nom}"

    @property
    def type_info(self) -> Dict:
        """Retourne les informations du type d'employé"""
        return Config.EMPLOYEE_TYPES.get(self.poste, Config.EMPLOYEE_TYPES['serveur'])

    def to_dict(self) -> Dict:
        """Convertit l'employé en dictionnaire"""
        return {
            'id': self.id,
            'nom': self.nom,
            'prenom': self.prenom,
            'poste': self.poste,
            'email': self.email,
            'telephone': self.telephone,
            'taux_horaire': self.taux_horaire,
            'actif': self.actif,
            'date_creation': self.date_creation,
            'nom_complet': self.nom_complet,
            'type_info': self.type_info
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Employee':
        """Crée un employé à partir d'un dictionnaire"""
        employee = cls()
        employee.id = data.get('id')
        employee.nom = data.get('nom', '')
        employee.prenom = data.get('prenom', '')
        employee.poste = data.get('poste', 'serveur')
        employee.email = data.get('email', '')
        employee.telephone = data.get('telephone', '')
        employee.taux_horaire = float(data.get('taux_horaire', 15.0))
        employee.actif = bool(data.get('actif', True))
        employee.date_creation = data.get('date_creation', datetime.now().isoformat())
        return employee


class EmployeeManager:
    """Gestionnaire pour les employés"""

    def __init__(self):
        self.file_path = Config.EMPLOYEES_FILE
        self._employees: Dict[str, Employee] = {}
        self.load_employees()

    def load_employees(self):
        """Charge les employés depuis le fichier JSON"""
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._employees = {
                        emp_id: Employee.from_dict(emp_data)
                        for emp_id, emp_data in data.items()
                    }
            else:
                # Créer des employés par défaut
                self._create_default_employees()
        except Exception as e:
            print(f"Erreur lors du chargement des employés: {e}")
            self._create_default_employees()

    def _create_default_employees(self):
        """Crée des employés par défaut"""
        default_employees = [
            Employee(nom="Dupont", prenom="Marie", poste="serveur", taux_horaire=16.0),
            Employee(nom="Martin", prenom="Pierre", poste="cuisinier", taux_horaire=18.0),
            Employee(nom="Lemaire", prenom="Julie", poste="barman", taux_horaire=17.0),
            Employee(nom="Durand", prenom="Thomas", poste="manager", taux_horaire=22.0),
            Employee(nom="Blanc", prenom="Sophie", poste="serveur", taux_horaire=15.5),
            Employee(nom="Noir", prenom="Lucas", poste="cuisinier", taux_horaire=19.0)
        ]

        for employee in default_employees:
            self._employees[employee.id] = employee

        self.save_employees()

    def save_employees(self):
        """Sauvegarde les employés dans le fichier JSON"""
        try:
            data = {
                emp_id: employee.to_dict()
                for emp_id, employee in self._employees.items()
            }
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erreur lors de la sauvegarde des employés: {e}")

    def add_employee(self, employee: Employee) -> bool:
        """Ajoute un employé"""
        try:
            self._employees[employee.id] = employee
            self.save_employees()
            return True
        except Exception as e:
            print(f"Erreur lors de l'ajout de l'employé: {e}")
            return False

    def get_employee(self, employee_id: str) -> Optional[Employee]:
        """Récupère un employé par son ID"""
        return self._employees.get(employee_id)

    def get_all_employees(self, actif_only: bool = True) -> List[Employee]:
        """Récupère tous les employés"""
        employees = list(self._employees.values())
        if actif_only:
            employees = [emp for emp in employees if emp.actif]
        return sorted(employees, key=lambda x: (x.nom, x.prenom))

    def update_employee(self, employee_id: str, data: Dict) -> bool:
        """Met à jour un employé"""
        try:
            if employee_id in self._employees:
                employee = self._employees[employee_id]
                for key, value in data.items():
                    if hasattr(employee, key):
                        setattr(employee, key, value)
                self.save_employees()
                return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de l'employé: {e}")
        return False

    def delete_employee(self, employee_id: str) -> bool:
        """Supprime un employé (désactivation)"""
        try:
            if employee_id in self._employees:
                self._employees[employee_id].actif = False
                self.save_employees()
                return True
        except Exception as e:
            print(f"Erreur lors de la suppression de l'employé: {e}")
        return False

    def get_employees_by_type(self, poste: str) -> List[Employee]:
        """Récupère les employés par type de poste"""
        return [emp for emp in self.get_all_employees() if emp.poste == poste]