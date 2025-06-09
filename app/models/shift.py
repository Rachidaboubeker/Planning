"""
Modèle Shift (Créneau)
"""

import json
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from config import Config


class Shift:
    """Modèle pour représenter un créneau de travail"""

    def __init__(self, shift_id: str = None, employee_id: str = "",
                 day: str = "", start_hour: int = 8, duration: int = 1,
                 poste_specifique: str = "", notes: str = ""):
        self.id = shift_id or self._generate_id()
        self.employee_id = employee_id
        self.day = day
        self.start_hour = start_hour
        self.duration = duration
        self.poste_specifique = poste_specifique
        self.notes = notes
        self.date_creation = datetime.now().isoformat()

    def _generate_id(self) -> str:
        """Génère un ID unique basé sur le timestamp"""
        return f"shift_{int(datetime.now().timestamp() * 1000)}"

    @property
    def end_hour(self) -> int:
        """Calcule l'heure de fin"""
        return (self.start_hour + self.duration) % 24

    @property
    def formatted_hours(self) -> str:
        """Retourne les heures formatées"""
        start = f"{self.start_hour:02d}:00"
        end = f"{self.end_hour:02d}:00"
        return f"{start} - {end}"

    @property
    def crosses_midnight(self) -> bool:
        """Vérifie si le créneau traverse minuit"""
        return self.start_hour + self.duration >= 24

    def conflicts_with(self, other_shift: 'Shift') -> bool:
        """Vérifie s'il y a conflit avec un autre créneau"""
        if self.day != other_shift.day or self.employee_id != other_shift.employee_id:
            return False

        # Créer les listes d'heures occupées
        my_hours = self.get_occupied_hours()
        other_hours = other_shift.get_occupied_hours()

        # Vérifier les intersections
        return bool(set(my_hours) & set(other_hours))

    def get_occupied_hours(self) -> List[int]:
        """Retourne la liste des heures occupées par ce créneau"""
        hours = []
        for i in range(self.duration):
            hour = (self.start_hour + i) % 24
            hours.append(hour)
        return hours

    def to_dict(self) -> Dict:
        """Convertit le créneau en dictionnaire"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'day': self.day,
            'start_hour': self.start_hour,
            'duration': self.duration,
            'poste_specifique': self.poste_specifique,
            'notes': self.notes,
            'date_creation': self.date_creation,
            'end_hour': self.end_hour,
            'formatted_hours': self.formatted_hours,
            'crosses_midnight': self.crosses_midnight
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Shift':
        """Crée un créneau à partir d'un dictionnaire"""
        shift = cls()
        shift.id = data.get('id')
        shift.employee_id = data.get('employee_id', '')
        shift.day = data.get('day', '')
        shift.start_hour = int(data.get('start_hour', 8))
        shift.duration = int(data.get('duration', 1))
        shift.poste_specifique = data.get('poste_specifique', '')
        shift.notes = data.get('notes', '')
        shift.date_creation = data.get('date_creation', datetime.now().isoformat())
        return shift


class ShiftManager:
    """Gestionnaire pour les créneaux"""

    def __init__(self):
        self.file_path = Config.SHIFTS_FILE
        self._shifts: Dict[str, Shift] = {}
        self.load_shifts()

    def load_shifts(self):
        """Charge les créneaux depuis le fichier JSON"""
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._shifts = {
                        shift_id: Shift.from_dict(shift_data)
                        for shift_id, shift_data in data.items()
                    }
            else:
                # Créer des créneaux par défaut
                self._create_default_shifts()
        except Exception as e:
            print(f"Erreur lors du chargement des créneaux: {e}")
            self._create_default_shifts()

    def _create_default_shifts(self):
        """Crée des créneaux par défaut"""
        # Pour la démonstration, on ajoute quelques créneaux
        default_shifts = [
            Shift(employee_id="emp_1", day="Lundi", start_hour=11, duration=4),
            Shift(employee_id="emp_1", day="Lundi", start_hour=19, duration=4),
            Shift(employee_id="emp_2", day="Mardi", start_hour=11, duration=4),
            Shift(employee_id="emp_2", day="Mardi", start_hour=12, duration=2),
            Shift(employee_id="emp_4", day="Mercredi", start_hour=10, duration=8),
            Shift(employee_id="emp_3", day="Vendredi", start_hour=18, duration=8),
            Shift(employee_id="emp_5", day="Samedi", start_hour=12, duration=6),
            Shift(employee_id="emp_3", day="Samedi", start_hour=18, duration=8),
            Shift(employee_id="emp_6", day="Samedi", start_hour=18, duration=6)
        ]

        for shift in default_shifts:
            self._shifts[shift.id] = shift

        self.save_shifts()

    def save_shifts(self):
        """Sauvegarde les créneaux dans le fichier JSON"""
        try:
            data = {
                shift_id: shift.to_dict()
                for shift_id, shift in self._shifts.items()
            }
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erreur lors de la sauvegarde des créneaux: {e}")

    def add_shift(self, shift: Shift) -> Tuple[bool, str]:
        """Ajoute un créneau avec validation"""
        try:
            # Vérifier les conflits
            conflicts = self.get_conflicts(shift)
            if conflicts:
                conflict_names = [f"{c.day} {c.formatted_hours}" for c in conflicts]
                return False, f"Conflit avec: {', '.join(conflict_names)}"

            self._shifts[shift.id] = shift
            self.save_shifts()
            return True, "Créneau ajouté avec succès"
        except Exception as e:
            return False, f"Erreur lors de l'ajout: {e}"

    def get_shift(self, shift_id: str) -> Optional[Shift]:
        """Récupère un créneau par son ID"""
        return self._shifts.get(shift_id)

    def get_all_shifts(self) -> List[Shift]:
        """Récupère tous les créneaux"""
        return list(self._shifts.values())

    def get_shifts_by_day(self, day: str) -> List[Shift]:
        """Récupère les créneaux d'un jour"""
        return [shift for shift in self._shifts.values() if shift.day == day]

    def get_shifts_by_employee(self, employee_id: str) -> List[Shift]:
        """Récupère les créneaux d'un employé"""
        return [shift for shift in self._shifts.values() if shift.employee_id == employee_id]

    def get_shifts_by_week(self, week_days: List[str]) -> Dict[str, List[Shift]]:
        """Récupère les créneaux d'une semaine"""
        week_shifts = {}
        for day in week_days:
            week_shifts[day] = self.get_shifts_by_day(day)
        return week_shifts

    def update_shift(self, shift_id: str, data: Dict) -> Tuple[bool, str]:
        """Met à jour un créneau"""
        try:
            if shift_id not in self._shifts:
                return False, "Créneau introuvable"

            # Créer une copie pour validation
            updated_shift = Shift.from_dict({**self._shifts[shift_id].to_dict(), **data})
            updated_shift.id = shift_id

            # Vérifier les conflits (excluant le créneau actuel)
            conflicts = self.get_conflicts(updated_shift, exclude_id=shift_id)
            if conflicts:
                conflict_names = [f"{c.day} {c.formatted_hours}" for c in conflicts]
                return False, f"Conflit avec: {', '.join(conflict_names)}"

            # Appliquer les modifications
            self._shifts[shift_id] = updated_shift
            self.save_shifts()
            return True, "Créneau modifié avec succès"
        except Exception as e:
            return False, f"Erreur lors de la modification: {e}"

    def delete_shift(self, shift_id: str) -> bool:
        """Supprime un créneau"""
        try:
            if shift_id in self._shifts:
                del self._shifts[shift_id]
                self.save_shifts()
                return True
        except Exception as e:
            print(f"Erreur lors de la suppression du créneau: {e}")
        return False

    def get_conflicts(self, shift: Shift, exclude_id: str = None) -> List[Shift]:
        """Trouve les créneaux en conflit"""
        conflicts = []
        for other_shift in self._shifts.values():
            if exclude_id and other_shift.id == exclude_id:
                continue
            if shift.conflicts_with(other_shift):
                conflicts.append(other_shift)
        return conflicts

    def get_weekly_stats(self, week_days: List[str]) -> Dict:
        """Calcule les statistiques de la semaine"""
        week_shifts = self.get_shifts_by_week(week_days)

        total_hours = 0
        employee_hours = {}

        for day_shifts in week_shifts.values():
            for shift in day_shifts:
                total_hours += shift.duration
                if shift.employee_id not in employee_hours:
                    employee_hours[shift.employee_id] = 0
                employee_hours[shift.employee_id] += shift.duration

        return {
            'total_hours': total_hours,
            'employee_hours': employee_hours,
            'average_hours': total_hours / len(employee_hours) if employee_hours else 0,
            'active_employees': len(employee_hours)
        }