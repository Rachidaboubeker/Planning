"""
Modèle pour la gestion des créneaux de travail avec support de la granularité
"""

import json
import os
from datetime import datetime, timedelta
from config import Config


class Shift:
    """Modèle d'un créneau de travail avec support granularité"""

    def __init__(self, employee_id, day, start_hour, duration=1,
                 start_minutes=0, notes='', shift_id=None):
        """
        Créer un créneau avec support des minutes

        Args:
            employee_id: ID de l'employé
            day: Jour de la semaine
            start_hour: Heure de début (0-23)
            duration: Durée en heures (float)
            start_minutes: Minutes de début (0, 15, 30, 45 selon granularité)
            notes: Notes optionnelles
            shift_id: ID unique (généré automatiquement si None)
        """
        self.id = shift_id or self.generate_id()
        self.employee_id = employee_id
        self.day = day
        self.start_hour = start_hour
        self.start_minutes = start_minutes or 0
        self.duration = duration
        self.notes = notes
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

    def generate_id(self):
        """Génère un ID unique pour le créneau"""
        return f"shift_{datetime.now().strftime('%Y%m%d%H%M%S')}_{id(self)}"

    def to_dict(self):
        """Convertit en dictionnaire avec support minutes"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'day': self.day,
            'start_hour': self.start_hour,
            'start_minutes': self.start_minutes,
            'duration': self.duration,
            'notes': self.notes,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'formatted_time': self.get_formatted_time(),
            'formatted_hours': f"{self.start_hour:02d}:{self.start_minutes:02d}",
            'end_time': self.get_end_time(),
            'time_decimal': self.get_time_decimal(),
            'slot_key': self.get_slot_key()
        }

    def get_formatted_time(self):
        """Retourne l'heure formatée avec minutes"""
        start = f"{self.start_hour:02d}:{self.start_minutes:02d}"

        # Calculer l'heure de fin
        total_minutes = (self.start_hour * 60) + self.start_minutes + (self.duration * 60)
        end_hour = int(total_minutes // 60) % 24
        end_minutes = int(total_minutes % 60)
        end = f"{end_hour:02d}:{end_minutes:02d}"

        return f"{start} - {end}"

    def get_end_time(self):
        """Retourne l'heure de fin sous forme de dictionnaire"""
        total_minutes = (self.start_hour * 60) + self.start_minutes + (self.duration * 60)
        end_hour = int(total_minutes // 60) % 24
        end_minutes = int(total_minutes % 60)

        return {
            'hour': end_hour,
            'minutes': end_minutes,
            'formatted': f"{end_hour:02d}:{end_minutes:02d}"
        }

    def get_time_decimal(self):
        """Retourne l'heure en décimal pour les calculs"""
        return self.start_hour + (self.start_minutes / 60)

    def get_slot_key(self):
        """Retourne la clé du créneau selon la granularité"""
        return f"{self.start_hour}_{self.start_minutes}"

    def overlaps_with(self, other_shift):
        """Vérifie si ce créneau chevauche avec un autre (avec minutes)"""
        if self.day != other_shift.day:
            return False

        if self.employee_id == other_shift.employee_id and self.id == other_shift.id:
            return False

        start1 = self.get_time_decimal()
        end1 = start1 + self.duration

        start2 = other_shift.get_time_decimal()
        end2 = start2 + other_shift.duration

        return not (end1 <= start2 or start1 >= end2)

    def is_valid_for_granularity(self):
        """Vérifie si le créneau respecte la granularité actuelle"""
        granularity = Config.TIME_SLOT_GRANULARITY
        return self.start_minutes % granularity == 0

    def adjust_to_granularity(self):
        """Ajuste le créneau à la granularité actuelle"""
        granularity = Config.TIME_SLOT_GRANULARITY

        # Ajuster les minutes au créneau le plus proche
        adjusted_minutes = (self.start_minutes // granularity) * granularity
        self.start_minutes = adjusted_minutes
        self.updated_at = datetime.now().isoformat()

        return self

    def get_duration_in_slots(self):
        """Retourne la durée en nombre de créneaux selon la granularité"""
        granularity = Config.TIME_SLOT_GRANULARITY
        duration_minutes = self.duration * 60
        return int(duration_minutes // granularity)

    def get_all_occupied_slots(self):
        """Retourne tous les créneaux occupés par ce shift"""
        granularity = Config.TIME_SLOT_GRANULARITY
        slots = []

        current_hour = self.start_hour
        current_minutes = self.start_minutes
        remaining_duration = self.duration * 60  # en minutes

        while remaining_duration > 0:
            slots.append({
                'hour': current_hour,
                'minutes': current_minutes,
                'key': f"{current_hour}_{current_minutes}",
                'display': f"{current_hour:02d}:{current_minutes:02d}"
            })

            # Passer au créneau suivant
            current_minutes += granularity
            if current_minutes >= 60:
                current_minutes = 0
                current_hour = (current_hour + 1) % 24

            remaining_duration -= granularity

        return slots

    @classmethod
    def from_dict(cls, data):
        """Crée un Shift depuis un dictionnaire"""
        return cls(
            employee_id=data['employee_id'],
            day=data['day'],
            start_hour=data['start_hour'],
            duration=data.get('duration', 1),
            start_minutes=data.get('start_minutes', 0),
            notes=data.get('notes', ''),
            shift_id=data.get('id')
        )


class ShiftManager:
    """Gestionnaire des créneaux avec support granularité"""

    def __init__(self):
        self.shifts_file = Config.SHIFTS_FILE
        self.shifts = []
        self.load_shifts()

    def load_shifts(self):
        """Charge les créneaux depuis le fichier JSON"""
        try:
            if os.path.exists(self.shifts_file):
                with open(self.shifts_file, 'r', encoding='utf-8') as f:
                    shifts_data = json.load(f)
                    self.shifts = [Shift.from_dict(shift_data) for shift_data in shifts_data]
            else:
                self.shifts = []
                self.save_shifts()  # Créer le fichier
        except Exception as e:
            print(f"Erreur lors du chargement des créneaux: {e}")
            self.shifts = []

    def save_shifts(self):
        """Sauvegarde les créneaux dans le fichier JSON"""
        try:
            # Créer le dossier si nécessaire
            os.makedirs(os.path.dirname(self.shifts_file), exist_ok=True)

            shifts_data = [shift.to_dict() for shift in self.shifts]
            with open(self.shifts_file, 'w', encoding='utf-8') as f:
                json.dump(shifts_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Erreur lors de la sauvegarde des créneaux: {e}")
            return False

    def get_all_shifts(self):
        """Retourne tous les créneaux"""
        return self.shifts

    def get_all_shifts_dict(self, week=None, employee_id=None):
        """Retourne tous les créneaux sous forme de dictionnaires avec filtres"""
        shifts = self.shifts

        # Filtrer par employé si spécifié
        if employee_id:
            shifts = [s for s in shifts if s.employee_id == employee_id]

        # TODO: Filtrer par semaine si nécessaire

        return [shift.to_dict() for shift in shifts]

    def get_shift_by_id(self, shift_id):
        """Récupère un créneau par son ID"""
        for shift in self.shifts:
            if shift.id == shift_id:
                return shift
        return None

    def add_shift(self, shift):
        """Ajoute un nouveau créneau"""
        try:
            # Vérifier la validité par rapport à la granularité
            if not shift.is_valid_for_granularity():
                shift.adjust_to_granularity()

            self.shifts.append(shift)
            return self.save_shifts()
        except Exception as e:
            print(f"Erreur lors de l'ajout du créneau: {e}")
            return False

    def update_shift(self, shift_id, updates):
        """Met à jour un créneau avec support des minutes"""
        shift = self.get_shift_by_id(shift_id)
        if not shift:
            return False

        try:
            # Mettre à jour les champs, y compris start_minutes
            if 'day' in updates:
                shift.day = updates['day']
            if 'start_hour' in updates:
                shift.start_hour = int(updates['start_hour'])
            if 'start_minutes' in updates:
                shift.start_minutes = int(updates['start_minutes'])
            if 'duration' in updates:
                shift.duration = float(updates['duration'])
            if 'notes' in updates:
                shift.notes = updates['notes']
            if 'employee_id' in updates:
                shift.employee_id = updates['employee_id']

            # Vérifier la granularité
            if not shift.is_valid_for_granularity():
                shift.adjust_to_granularity()

            shift.updated_at = datetime.now().isoformat()

            return self.save_shifts()
        except Exception as e:
            print(f"Erreur lors de la mise à jour du créneau: {e}")
            return False

    def delete_shift(self, shift_id):
        """Supprime un créneau"""
        try:
            self.shifts = [s for s in self.shifts if s.id != shift_id]
            return self.save_shifts()
        except Exception as e:
            print(f"Erreur lors de la suppression du créneau: {e}")
            return False

    def validate_shift_data(self, data, shift_id=None):
        """Validation étendue avec support des minutes"""
        errors = []

        # Validation de base
        if not data.get('employee_id'):
            errors.append('ID employé requis')

        if not data.get('day'):
            errors.append('Jour requis')
        elif data.get('day') not in Config.DAYS_OF_WEEK:
            errors.append('Jour invalide')

        if 'start_hour' not in data:
            errors.append('Heure de début requise')
        else:
            try:
                start_hour = int(data['start_hour'])
                if start_hour not in Config.get_hours_range():
                    errors.append('Heure de début en dehors des heures d\'ouverture')
            except (ValueError, TypeError):
                errors.append('Heure de début invalide')

        # Validation des minutes avec granularité
        start_minutes = data.get('start_minutes', 0)
        try:
            start_minutes = int(start_minutes)
            granularity = Config.TIME_SLOT_GRANULARITY

            # Vérifier que les minutes correspondent à la granularité
            if start_minutes % granularity != 0:
                errors.append(f'Minutes invalides pour granularité {granularity}min')

            if start_minutes < 0 or start_minutes >= 60:
                errors.append('Minutes doivent être entre 0 et 59')

        except (ValueError, TypeError):
            errors.append('Minutes invalides')

        # Validation de la durée
        if 'duration' in data:
            try:
                duration = float(data['duration'])
                if duration < Config.MIN_SHIFT_DURATION or duration > Config.MAX_SHIFT_DURATION:
                    errors.append(f'Durée doit être entre {Config.MIN_SHIFT_DURATION}h et {Config.MAX_SHIFT_DURATION}h')
            except (ValueError, TypeError):
                errors.append('Durée invalide')

        # Vérifier les chevauchements avec granularité
        if not errors:  # Seulement si les données de base sont valides
            conflicts = self.check_conflicts_with_granularity(
                data.get('employee_id'),
                data.get('day'),
                int(data.get('start_hour')),
                start_minutes,
                float(data.get('duration', 1)),
                shift_id
            )

            if conflicts:
                conflicts_str = ', '.join([c['formatted_time'] for c in conflicts])
                errors.append(f'Conflit avec créneaux existants: {conflicts_str}')

        return errors

    def check_conflicts_with_granularity(self, employee_id, day, start_hour,
                                         start_minutes, duration, exclude_shift_id=None):
        """Vérifie les conflits pour un employé avec granularité"""
        conflicts = []

        # Créer un créneau temporaire pour la comparaison
        temp_shift = Shift(
            employee_id=employee_id,
            day=day,
            start_hour=start_hour,
            start_minutes=start_minutes,
            duration=duration
        )

        for shift in self.shifts:
            # Ignorer le créneau qu'on met à jour
            if exclude_shift_id and shift.id == exclude_shift_id:
                continue

            # Vérifier seulement pour le même employé
            if shift.employee_id == employee_id and temp_shift.overlaps_with(shift):
                conflicts.append({
                    'shift_id': shift.id,
                    'day': shift.day,
                    'formatted_time': shift.get_formatted_time(),
                    'start_hour': shift.start_hour,
                    'start_minutes': shift.start_minutes,
                    'duration': shift.duration
                })

        return conflicts

    def get_shifts_by_employee(self, employee_id):
        """Récupère tous les créneaux d'un employé"""
        return [shift for shift in self.shifts if shift.employee_id == employee_id]

    def get_shifts_by_day(self, day):
        """Récupère tous les créneaux d'un jour"""
        return [shift for shift in self.shifts if shift.day == day]

    def get_weekly_stats(self, days_of_week, week=None):
        """Calcule les statistiques hebdomadaires"""
        try:
            shifts = self.shifts

            # TODO: Filtrer par semaine si nécessaire

            total_hours = sum(shift.duration for shift in shifts)
            active_employees = len(set(shift.employee_id for shift in shifts))
            average_hours = total_hours / active_employees if active_employees > 0 else 0

            # Statistiques par granularité
            granularity_stats = {}
            for shift in shifts:
                minutes_key = shift.start_minutes
                if minutes_key not in granularity_stats:
                    granularity_stats[minutes_key] = {'count': 0, 'total_hours': 0}
                granularity_stats[minutes_key]['count'] += 1
                granularity_stats[minutes_key]['total_hours'] += shift.duration

            # Répartition par jour
            daily_stats = {}
            for day in days_of_week:
                day_shifts = [s for s in shifts if s.day == day]
                daily_stats[day] = {
                    'shifts_count': len(day_shifts),
                    'total_hours': sum(s.duration for s in day_shifts),
                    'employees': len(set(s.employee_id for s in day_shifts))
                }

            return {
                'total_hours': round(total_hours, 2),
                'active_employees': active_employees,
                'average_hours': round(average_hours, 2),
                'total_shifts': len(shifts),
                'granularity_stats': granularity_stats,
                'daily_stats': daily_stats,
                'week': week
            }

        except Exception as e:
            print(f"Erreur lors du calcul des statistiques: {e}")
            return {
                'total_hours': 0,
                'active_employees': 0,
                'average_hours': 0,
                'total_shifts': 0,
                'granularity_stats': {},
                'daily_stats': {},
                'week': week
            }

    def get_employee_stats(self, employee_id, week=None):
        """Calcule les statistiques pour un employé"""
        try:
            employee_shifts = self.get_shifts_by_employee(employee_id)

            # TODO: Filtrer par semaine si nécessaire

            total_hours = sum(shift.duration for shift in employee_shifts)
            total_shifts = len(employee_shifts)

            # Répartition par jour
            daily_hours = {}
            for day in Config.DAYS_OF_WEEK:
                day_shifts = [s for s in employee_shifts if s.day == day]
                daily_hours[day] = sum(s.duration for s in day_shifts)

            # Répartition par granularité
            granularity_usage = {}
            for shift in employee_shifts:
                minutes_key = shift.start_minutes
                granularity_usage[minutes_key] = granularity_usage.get(minutes_key, 0) + 1

            return {
                'employee_id': employee_id,
                'total_hours': round(total_hours, 2),
                'total_shifts': total_shifts,
                'daily_hours': daily_hours,
                'granularity_usage': granularity_usage,
                'average_shift_duration': round(total_hours / total_shifts, 2) if total_shifts > 0 else 0,
                'week': week
            }

        except Exception as e:
            print(f"Erreur lors du calcul des statistiques employé: {e}")
            return {
                'employee_id': employee_id,
                'total_hours': 0,
                'total_shifts': 0,
                'daily_hours': {},
                'granularity_usage': {},
                'average_shift_duration': 0,
                'week': week
            }

    def get_slot_usage_stats(self):
        """Statistiques d'utilisation des créneaux selon la granularité"""
        try:
            all_slots = Config.get_all_time_slots()
            slot_usage = {}

            # Initialiser tous les créneaux à 0
            for slot in all_slots:
                slot_usage[slot['key']] = {
                    'display': slot['display'],
                    'hour': slot['hour'],
                    'minutes': slot['minutes'],
                    'is_main_hour': slot['is_main_hour'],
                    'count': 0,
                    'total_hours': 0,
                    'employees': set()
                }

            # Compter l'utilisation
            for shift in self.shifts:
                occupied_slots = shift.get_all_occupied_slots()

                for slot in occupied_slots:
                    if slot['key'] in slot_usage:
                        slot_usage[slot['key']]['count'] += 1
                        slot_usage[slot['key']]['total_hours'] += shift.duration / len(occupied_slots)
                        slot_usage[slot['key']]['employees'].add(shift.employee_id)

            # Convertir les sets en listes pour JSON
            for key in slot_usage:
                slot_usage[key]['employees'] = len(slot_usage[key]['employees'])
                slot_usage[key]['total_hours'] = round(slot_usage[key]['total_hours'], 2)

            return {
                'granularity': Config.TIME_SLOT_GRANULARITY,
                'total_slots': len(all_slots),
                'used_slots': len([s for s in slot_usage.values() if s['count'] > 0]),
                'slot_usage': slot_usage
            }

        except Exception as e:
            print(f"Erreur lors du calcul des statistiques de créneaux: {e}")
            return {
                'granularity': Config.TIME_SLOT_GRANULARITY,
                'total_slots': 0,
                'used_slots': 0,
                'slot_usage': {}
            }

    def optimize_granularity_for_shifts(self):
        """Analyse les créneaux existants pour suggérer une granularité optimale"""
        try:
            minutes_usage = {}

            for shift in self.shifts:
                minutes = shift.start_minutes
                minutes_usage[minutes] = minutes_usage.get(minutes, 0) + 1

            # Analyser les patterns
            analysis = {
                'current_granularity': Config.TIME_SLOT_GRANULARITY,
                'minutes_usage': minutes_usage,
                'total_shifts': len(self.shifts)
            }

            # Suggérer une granularité optimale
            if minutes_usage:
                used_minutes = set(minutes_usage.keys())

                # Si seulement des heures pleines sont utilisées
                if used_minutes == {0}:
                    analysis['suggested_granularity'] = 60
                    analysis['reason'] = 'Seules les heures pleines sont utilisées'

                # Si des demi-heures sont utilisées
                elif used_minutes.issubset({0, 30}):
                    analysis['suggested_granularity'] = 30
                    analysis['reason'] = 'Utilisation des demi-heures détectée'

                # Si des quarts d'heure sont utilisés
                elif used_minutes.issubset({0, 15, 30, 45}):
                    analysis['suggested_granularity'] = 15
                    analysis['reason'] = 'Utilisation des quarts d\'heure détectée'

                else:
                    analysis['suggested_granularity'] = Config.TIME_SLOT_GRANULARITY
                    analysis['reason'] = 'Granularité actuelle appropriée'
            else:
                analysis['suggested_granularity'] = 60
                analysis['reason'] = 'Aucun créneau existant, granularité par défaut'

            return analysis

        except Exception as e:
            print(f"Erreur lors de l'optimisation de granularité: {e}")
            return {
                'current_granularity': Config.TIME_SLOT_GRANULARITY,
                'suggested_granularity': Config.TIME_SLOT_GRANULARITY,
                'reason': 'Erreur lors de l\'analyse'
            }

    def migrate_shifts_to_granularity(self, new_granularity):
        """Migre tous les créneaux vers une nouvelle granularité"""
        try:
            if new_granularity not in Config.AVAILABLE_GRANULARITIES:
                return False, f"Granularité {new_granularity} non supportée"

            migrated_count = 0
            errors = []

            # Sauvegarder l'ancienne granularité
            old_granularity = Config.TIME_SLOT_GRANULARITY

            # Changer temporairement la granularité
            Config.set_granularity(new_granularity)

            for shift in self.shifts:
                try:
                    # Ajuster le créneau à la nouvelle granularité
                    old_minutes = shift.start_minutes
                    shift.adjust_to_granularity()

                    if old_minutes != shift.start_minutes:
                        migrated_count += 1

                except Exception as e:
                    errors.append(f"Erreur migration créneau {shift.id}: {str(e)}")

            # Sauvegarder les changements
            if self.save_shifts():
                return True, f"Migration réussie: {migrated_count} créneaux ajustés"
            else:
                # Restaurer l'ancienne granularité en cas d'erreur
                Config.set_granularity(old_granularity)
                return False, "Erreur lors de la sauvegarde"

        except Exception as e:
            return False, f"Erreur lors de la migration: {str(e)}"

    def validate_all_shifts_granularity(self):
        """Valide que tous les créneaux respectent la granularité actuelle"""
        try:
            invalid_shifts = []

            for shift in self.shifts:
                if not shift.is_valid_for_granularity():
                    invalid_shifts.append({
                        'id': shift.id,
                        'employee_id': shift.employee_id,
                        'day': shift.day,
                        'start_minutes': shift.start_minutes,
                        'formatted_time': shift.get_formatted_time()
                    })

            return {
                'valid': len(invalid_shifts) == 0,
                'total_shifts': len(self.shifts),
                'invalid_shifts': invalid_shifts,
                'invalid_count': len(invalid_shifts),
                'granularity': Config.TIME_SLOT_GRANULARITY
            }

        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'granularity': Config.TIME_SLOT_GRANULARITY
            }

    def fix_invalid_shifts(self):
        """Corrige automatiquement les créneaux invalides"""
        try:
            fixed_count = 0

            for shift in self.shifts:
                if not shift.is_valid_for_granularity():
                    shift.adjust_to_granularity()
                    fixed_count += 1

            if fixed_count > 0 and self.save_shifts():
                return True, f"{fixed_count} créneaux corrigés"
            elif fixed_count == 0:
                return True, "Aucun créneau à corriger"
            else:
                return False, "Erreur lors de la sauvegarde des corrections"

        except Exception as e:
            return False, f"Erreur lors de la correction: {str(e)}"