"""
Modèle Employee étendu avec support des photos
"""

import json
import os
import base64
from typing import List, Dict, Optional
from datetime import datetime
from config import Config


class Employee:
    """Modèle pour représenter un employé avec support photo"""

    def __init__(self, employee_id: str = None, nom: str = "", prenom: str = "",
                 poste: str = "serveur", email: str = "", telephone: str = "",
                 taux_horaire: float = 15.0, actif: bool = True, photo_data: str = None):
        self.id = employee_id or self._generate_id()
        self.nom = nom
        self.prenom = prenom
        self.poste = poste
        self.email = email
        self.telephone = telephone
        self.taux_horaire = taux_horaire
        self.actif = actif
        self.photo_data = photo_data  # Base64 encoded image data
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

    @property
    def has_photo(self) -> bool:
        """Vérifie si l'employé a une photo"""
        return self.photo_data is not None and len(self.photo_data) > 0

    @property
    def initials(self) -> str:
        """Retourne les initiales de l'employé"""
        if not self.prenom or not self.nom:
            return "?"
        return (self.prenom[0] + self.nom[0]).upper()

    def set_photo_from_file(self, file_path: str) -> bool:
        """Définit la photo à partir d'un fichier"""
        try:
            if not os.path.exists(file_path):
                return False

            # Vérifier la taille du fichier (max 5MB)
            if os.path.getsize(file_path) > 5 * 1024 * 1024:
                return False

            with open(file_path, 'rb') as f:
                image_data = f.read()
                self.photo_data = base64.b64encode(image_data).decode('utf-8')
                return True
        except Exception as e:
            print(f"Erreur lors de la lecture de la photo: {e}")
            return False

    def set_photo_from_base64(self, base64_data: str) -> bool:
        """Définit la photo à partir de données base64"""
        try:
            # Valider que c'est du base64 valide
            if base64_data.startswith('data:'):
                # Supprimer le préfixe data:image/...;base64,
                base64_data = base64_data.split(',', 1)[1]

            # Tester le décodage
            base64.b64decode(base64_data)
            self.photo_data = base64_data
            return True
        except Exception as e:
            print(f"Erreur lors de la validation base64: {e}")
            return False

    def get_photo_data_url(self) -> str:
        """Retourne l'URL data de la photo"""
        if not self.has_photo:
            return ""
        return f"data:image/jpeg;base64,{self.photo_data}"

    def remove_photo(self):
        """Supprime la photo de l'employé"""
        self.photo_data = None

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
            'photo_data': self.photo_data,
            'date_creation': self.date_creation,
            'nom_complet': self.nom_complet,
            'type_info': self.type_info,
            'has_photo': self.has_photo,
            'initials': self.initials
        }

    def to_dict_without_photo(self) -> Dict:
        """Convertit l'employé en dictionnaire sans les données photo (pour API légère)"""
        data = self.to_dict()
        data.pop('photo_data', None)
        return data

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
        employee.photo_data = data.get('photo_data')
        employee.date_creation = data.get('date_creation', datetime.now().isoformat())
        return employee


class EmployeeManager:
    """Gestionnaire pour les employés avec support photo"""

    def __init__(self):
        self.file_path = Config.EMPLOYEES_FILE
        self.photos_dir = os.path.join(Config.DATA_FOLDER, 'photos')
        self._employees: Dict[str, Employee] = {}
        self._ensure_photos_dir()
        self.load_employees()

    def _ensure_photos_dir(self):
        """S'assurer que le dossier photos existe"""
        if not os.path.exists(self.photos_dir):
            os.makedirs(self.photos_dir)

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
            Employee(nom="Dupont", prenom="Marie", poste="serveur", taux_horaire=16.0,
                     email="marie.dupont@restaurant.com", telephone="06.12.34.56.78"),
            Employee(nom="Martin", prenom="Pierre", poste="cuisinier", taux_horaire=18.0,
                     email="pierre.martin@restaurant.com", telephone="06.23.45.67.89"),
            Employee(nom="Lemaire", prenom="Julie", poste="barman", taux_horaire=17.0,
                     email="julie.lemaire@restaurant.com", telephone="06.34.56.78.90"),
            Employee(nom="Durand", prenom="Thomas", poste="manager", taux_horaire=22.0,
                     email="thomas.durand@restaurant.com", telephone="06.45.67.89.01"),
            Employee(nom="Blanc", prenom="Sophie", poste="serveur", taux_horaire=15.5,
                     email="sophie.blanc@restaurant.com", telephone="06.56.78.90.12"),
            Employee(nom="Noir", prenom="Lucas", poste="cuisinier", taux_horaire=19.0,
                     email="lucas.noir@restaurant.com", telephone="06.67.89.01.23"),
            Employee(nom="Roux", prenom="Emma", poste="aide", taux_horaire=12.5,
                     email="emma.roux@restaurant.com", telephone="06.78.90.12.34"),
            Employee(nom="Vert", prenom="Antoine", poste="commis", taux_horaire=13.0,
                     email="antoine.vert@restaurant.com", telephone="06.89.01.23.45")
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

    def get_all_employees(self, actif_only: bool = True, include_photos: bool = True) -> List[Employee]:
        """Récupère tous les employés"""
        employees = list(self._employees.values())
        if actif_only:
            employees = [emp for emp in employees if emp.actif]
        return sorted(employees, key=lambda x: (x.nom, x.prenom))

    def get_all_employees_dict(self, actif_only: bool = True, include_photos: bool = True) -> List[Dict]:
        """Récupère tous les employés sous forme de dictionnaires"""
        employees = self.get_all_employees(actif_only)
        if include_photos:
            return [emp.to_dict() for emp in employees]
        else:
            return [emp.to_dict_without_photo() for emp in employees]

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

    def update_employee_photo(self, employee_id: str, photo_data: str) -> bool:
        """Met à jour la photo d'un employé"""
        try:
            if employee_id in self._employees:
                employee = self._employees[employee_id]
                if employee.set_photo_from_base64(photo_data):
                    self.save_employees()
                    return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de la photo: {e}")
        return False

    def remove_employee_photo(self, employee_id: str) -> bool:
        """Supprime la photo d'un employé"""
        try:
            if employee_id in self._employees:
                employee = self._employees[employee_id]
                employee.remove_photo()
                self.save_employees()
                return True
        except Exception as e:
            print(f"Erreur lors de la suppression de la photo: {e}")
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

    def get_employees_with_photos(self) -> List[Employee]:
        """Récupère tous les employés qui ont une photo"""
        return [emp for emp in self.get_all_employees() if emp.has_photo]

    def get_employees_without_photos(self) -> List[Employee]:
        """Récupère tous les employés qui n'ont pas de photo"""
        return [emp for emp in self.get_all_employees() if not emp.has_photo]

    def get_photo_statistics(self) -> Dict:
        """Retourne des statistiques sur les photos"""
        all_employees = self.get_all_employees()
        with_photos = self.get_employees_with_photos()

        return {
            'total_employees': len(all_employees),
            'employees_with_photos': len(with_photos),
            'employees_without_photos': len(all_employees) - len(with_photos),
            'photo_completion_rate': round((len(with_photos) / len(all_employees)) * 100, 1) if all_employees else 0
        }

    def export_employee_photos(self, export_dir: str) -> bool:
        """Exporte toutes les photos des employés vers un dossier"""
        try:
            if not os.path.exists(export_dir):
                os.makedirs(export_dir)

            employees_with_photos = self.get_employees_with_photos()

            for employee in employees_with_photos:
                if employee.photo_data:
                    # Décoder les données base64
                    image_data = base64.b64decode(employee.photo_data)

                    # Nom de fichier sécurisé
                    safe_name = f"{employee.prenom}_{employee.nom}".replace(' ', '_')
                    safe_name = ''.join(c for c in safe_name if c.isalnum() or c in ('_', '-'))
                    filename = f"{safe_name}_{employee.id}.jpg"

                    # Sauvegarder le fichier
                    file_path = os.path.join(export_dir, filename)
                    with open(file_path, 'wb') as f:
                        f.write(image_data)

            return True
        except Exception as e:
            print(f"Erreur lors de l'export des photos: {e}")
            return False

    def import_employee_photos(self, import_dir: str) -> Dict:
        """Importe les photos depuis un dossier"""
        results = {
            'success': 0,
            'errors': 0,
            'messages': []
        }

        try:
            if not os.path.exists(import_dir):
                results['messages'].append(f"Dossier {import_dir} introuvable")
                return results

            # Parcourir tous les fichiers image du dossier
            image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp')

            for filename in os.listdir(import_dir):
                if filename.lower().endswith(image_extensions):
                    file_path = os.path.join(import_dir, filename)

                    # Essayer de matcher le fichier avec un employé
                    # Format attendu: prenom_nom_id.jpg ou prenom_nom.jpg
                    base_name = os.path.splitext(filename)[0]

                    # Chercher l'employé correspondant
                    matched_employee = None

                    # Méthode 1: si le nom contient l'ID
                    if '_emp_' in base_name:
                        try:
                            employee_id = 'emp_' + base_name.split('_emp_')[1]
                            matched_employee = self.get_employee(employee_id)
                        except:
                            pass

                    # Méthode 2: chercher par nom/prénom
                    if not matched_employee:
                        parts = base_name.replace('_', ' ').lower()
                        for employee in self.get_all_employees():
                            full_name = f"{employee.prenom} {employee.nom}".lower()
                            if parts in full_name or full_name in parts:
                                matched_employee = employee
                                break

                    if matched_employee:
                        if matched_employee.set_photo_from_file(file_path):
                            results['success'] += 1
                            results['messages'].append(f"Photo importée pour {matched_employee.nom_complet}")
                        else:
                            results['errors'] += 1
                            results['messages'].append(f"Erreur lors de l'import pour {matched_employee.nom_complet}")
                    else:
                        results['errors'] += 1
                        results['messages'].append(f"Aucun employé trouvé pour {filename}")

            # Sauvegarder les modifications
            if results['success'] > 0:
                self.save_employees()

        except Exception as e:
            results['errors'] += 1
            results['messages'].append(f"Erreur générale: {e}")

        return results

    def generate_employee_report(self, include_photos: bool = False) -> Dict:
        """Génère un rapport détaillé des employés"""
        all_employees = self.get_all_employees(actif_only=False)
        active_employees = self.get_all_employees(actif_only=True)
        photo_stats = self.get_photo_statistics()

        # Statistiques par poste
        stats_by_type = {}
        for employee in active_employees:
            poste = employee.poste
            if poste not in stats_by_type:
                stats_by_type[poste] = {
                    'count': 0,
                    'total_rate': 0,
                    'with_photos': 0
                }
            stats_by_type[poste]['count'] += 1
            stats_by_type[poste]['total_rate'] += employee.taux_horaire
            if employee.has_photo:
                stats_by_type[poste]['with_photos'] += 1

        # Calculer les moyennes
        for poste_stats in stats_by_type.values():
            if poste_stats['count'] > 0:
                poste_stats['average_rate'] = round(poste_stats['total_rate'] / poste_stats['count'], 2)
                poste_stats['photo_rate'] = round((poste_stats['with_photos'] / poste_stats['count']) * 100, 1)

        report = {
            'summary': {
                'total_employees': len(all_employees),
                'active_employees': len(active_employees),
                'inactive_employees': len(all_employees) - len(active_employees),
                'average_hourly_rate': round(sum(emp.taux_horaire for emp in active_employees) / len(active_employees),
                                             2) if active_employees else 0
            },
            'photo_stats': photo_stats,
            'stats_by_type': stats_by_type,
            'generation_date': datetime.now().isoformat()
        }

        if include_photos:
            report['employees'] = [emp.to_dict() for emp in all_employees]
        else:
            report['employees'] = [emp.to_dict_without_photo() for emp in all_employees]

        return report

    def cleanup_orphaned_photos(self) -> int:
        """Nettoie les photos orphelines (employés supprimés)"""
        # Cette méthode pourrait être utilisée si on stockait les photos séparément
        # Pour l'instant, les photos sont intégrées dans le JSON, donc pas d'orphelins
        return 0

    def validate_employee_data(self, employee_data: Dict) -> List[str]:
        """Valide les données d'un employé"""
        errors = []

        # Champs requis
        required_fields = ['nom', 'prenom', 'poste']
        for field in required_fields:
            if not employee_data.get(field):
                errors.append(f"Le champ '{field}' est requis")

        # Validation du poste
        if employee_data.get('poste') and employee_data['poste'] not in Config.EMPLOYEE_TYPES:
            errors.append("Type de poste invalide")

        # Validation du taux horaire
        if employee_data.get('taux_horaire'):
            try:
                rate = float(employee_data['taux_horaire'])
                if rate < 0 or rate > 100:
                    errors.append("Taux horaire invalide (doit être entre 0 et 100)")
            except ValueError:
                errors.append("Taux horaire doit être un nombre")

        # Validation de l'email
        if employee_data.get('email'):
            email = employee_data['email']
            if '@' not in email or '.' not in email.split('@')[1]:
                errors.append("Format d'email invalide")

        # Validation du téléphone français
        if employee_data.get('telephone'):
            phone = employee_data['telephone'].replace(' ', '').replace('.', '')
            if not phone.startswith('0') or len(phone) != 10 or not phone.isdigit():
                errors.append("Format de téléphone invalide (format français attendu)")

        return errors