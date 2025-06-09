"""
Logique métier pour le planning
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from app.models.employee import EmployeeManager
from app.models.shift import ShiftManager
from config import Config


class PlanningManager:
    """Gestionnaire principal du planning"""

    def __init__(self):
        self.employee_manager = EmployeeManager()
        self.shift_manager = ShiftManager()

    def get_week_planning(self, week_offset: int = 0) -> Dict:
        """Récupère le planning d'une semaine spécifique"""
        week_days = self._get_week_days(week_offset)
        week_shifts = {}

        for day in Config.DAYS_OF_WEEK:
            week_shifts[day] = self.shift_manager.get_shifts_by_day(day)

        return {
            'week_info': {
                'start_date': week_days[0],
                'end_date': week_days[-1],
                'offset': week_offset
            },
            'shifts_by_day': week_shifts,
            'employees': self.employee_manager.get_all_employees(),
            'stats': self._calculate_week_stats(week_shifts)
        }

    def _get_week_days(self, offset: int = 0) -> List[datetime]:
        """Calcule les jours d'une semaine avec offset"""
        today = datetime.now()
        monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)

        week_days = []
        for i in range(7):
            week_days.append(monday + timedelta(days=i))

        return week_days

    def _calculate_week_stats(self, week_shifts: Dict) -> Dict:
        """Calcule les statistiques d'une semaine"""
        total_hours = 0
        employee_hours = {}
        employee_costs = {}

        for day_shifts in week_shifts.values():
            for shift in day_shifts:
                total_hours += shift.duration

                # Heures par employé
                if shift.employee_id not in employee_hours:
                    employee_hours[shift.employee_id] = 0
                employee_hours[shift.employee_id] += shift.duration

                # Coûts par employé
                employee = self.employee_manager.get_employee(shift.employee_id)
                if employee:
                    if shift.employee_id not in employee_costs:
                        employee_costs[shift.employee_id] = 0
                    employee_costs[shift.employee_id] += shift.duration * employee.taux_horaire

        total_cost = sum(employee_costs.values())
        active_employees = len(employee_hours)
        average_hours = total_hours / active_employees if active_employees > 0 else 0

        return {
            'total_hours': total_hours,
            'total_cost': round(total_cost, 2),
            'active_employees': active_employees,
            'average_hours': round(average_hours, 1),
            'employee_hours': employee_hours,
            'employee_costs': employee_costs
        }

    def validate_shift_placement(self, shift_data: Dict) -> Tuple[bool, str]:
        """Valide le placement d'un créneau"""
        # Vérifier que l'employé existe
        employee = self.employee_manager.get_employee(shift_data['employee_id'])
        if not employee:
            return False, "Employé introuvable"

        # Vérifier que l'employé est actif
        if not employee.actif:
            return False, "Employé inactif"

        # Vérifier les heures de travail
        if shift_data['duration'] > 12:
            return False, "Durée maximale de 12 heures dépassée"

        # Vérifier les heures légales (exemple: pas plus de 35h/semaine)
        week_hours = self._get_employee_week_hours(shift_data['employee_id'], shift_data['day'])
        if week_hours + shift_data['duration'] > 35:
            return False, f"Limite hebdomadaire dépassée ({week_hours + shift_data['duration']}h > 35h)"

        # Vérifier les repos obligatoires (exemple: 11h entre deux services)
        if not self._check_rest_period(shift_data):
            return False, "Période de repos insuffisante (11h minimum requis)"

        return True, "Créneau valide"

    def _get_employee_week_hours(self, employee_id: str, current_day: str) -> int:
        """Calcule les heures déjà travaillées dans la semaine"""
        total_hours = 0

        for day in Config.DAYS_OF_WEEK:
            if day == current_day:
                continue

            day_shifts = self.shift_manager.get_shifts_by_day(day)
            for shift in day_shifts:
                if shift.employee_id == employee_id:
                    total_hours += shift.duration

        return total_hours

    def _check_rest_period(self, shift_data: Dict) -> bool:
        """Vérifie les périodes de repos entre services"""
        employee_id = shift_data['employee_id']
        new_start = shift_data['start_hour']
        new_end = (new_start + shift_data['duration']) % 24
        current_day = shift_data['day']

        # Vérifier avec le jour précédent
        day_index = Config.DAYS_OF_WEEK.index(current_day)
        if day_index > 0:
            prev_day = Config.DAYS_OF_WEEK[day_index - 1]
            prev_shifts = self.shift_manager.get_shifts_by_day(prev_day)

            for shift in prev_shifts:
                if shift.employee_id == employee_id:
                    shift_end = (shift.start_hour + shift.duration) % 24

                    # Calculer la différence en heures
                    if shift_end <= new_start:
                        rest_hours = new_start - shift_end
                    else:
                        rest_hours = (24 - shift_end) + new_start

                    if rest_hours < 11:
                        return False

        # Vérifier avec le jour suivant
        if day_index < len(Config.DAYS_OF_WEEK) - 1:
            next_day = Config.DAYS_OF_WEEK[day_index + 1]
            next_shifts = self.shift_manager.get_shifts_by_day(next_day)

            for shift in next_shifts:
                if shift.employee_id == employee_id:
                    next_start = shift.start_hour

                    # Calculer la différence en heures
                    if new_end <= next_start:
                        rest_hours = next_start - new_end
                    else:
                        rest_hours = (24 - new_end) + next_start

                    if rest_hours < 11:
                        return False

        return True

    def get_employee_planning(self, employee_id: str, week_offset: int = 0) -> Dict:
        """Récupère le planning d'un employé pour une semaine"""
        employee = self.employee_manager.get_employee(employee_id)
        if not employee:
            return None

        week_days = self._get_week_days(week_offset)
        employee_shifts = {}
        total_hours = 0
        total_cost = 0

        for day in Config.DAYS_OF_WEEK:
            day_shifts = self.shift_manager.get_shifts_by_day(day)
            employee_day_shifts = [s for s in day_shifts if s.employee_id == employee_id]
            employee_shifts[day] = employee_day_shifts

            for shift in employee_day_shifts:
                total_hours += shift.duration
                total_cost += shift.duration * employee.taux_horaire

        return {
            'employee': employee.to_dict(),
            'week_info': {
                'start_date': week_days[0],
                'end_date': week_days[-1],
                'offset': week_offset
            },
            'shifts_by_day': employee_shifts,
            'stats': {
                'total_hours': total_hours,
                'total_cost': round(total_cost, 2),
                'average_hours_per_day': round(total_hours / 7, 1)
            }
        }

    def suggest_optimal_planning(self, requirements: Dict) -> Dict:
        """Suggère un planning optimal basé sur des critères"""
        # Exemple de critères:
        # - Heures d'ouverture
        # - Nombre minimum de personnes par service
        # - Types de postes requis par créneau
        # - Équité de répartition des heures

        suggestions = []

        # Récupérer les employés par type
        employees_by_type = {}
        for employee in self.employee_manager.get_all_employees():
            if employee.poste not in employees_by_type:
                employees_by_type[employee.poste] = []
            employees_by_type[employee.poste].append(employee)

        # Exemple de logique pour service de midi
        lunch_requirements = requirements.get('lunch', {})
        if lunch_requirements:
            needed_cooks = lunch_requirements.get('cuisiniers', 1)
            needed_servers = lunch_requirements.get('serveurs', 2)

            # Assigner les cuisiniers
            if 'cuisinier' in employees_by_type:
                for i, cook in enumerate(employees_by_type['cuisinier'][:needed_cooks]):
                    suggestions.append({
                        'employee_id': cook.id,
                        'day': 'Lundi',  # Exemple
                        'start_hour': 11,
                        'duration': 4,
                        'reason': 'Service de midi - cuisinier principal'
                    })

            # Assigner les serveurs
            if 'serveur' in employees_by_type:
                for i, server in enumerate(employees_by_type['serveur'][:needed_servers]):
                    suggestions.append({
                        'employee_id': server.id,
                        'day': 'Lundi',  # Exemple
                        'start_hour': 12,
                        'duration': 3,
                        'reason': 'Service de midi - équipe service'
                    })

        return {
            'suggestions': suggestions,
            'criteria_used': requirements,
            'optimization_score': self._calculate_optimization_score(suggestions)
        }

    def _calculate_optimization_score(self, suggestions: List[Dict]) -> float:
        """Calcule un score d'optimisation du planning"""
        # Critères possibles:
        # - Équité de répartition des heures
        # - Respect des contraintes légales
        # - Couverture des services
        # - Coût optimal

        if not suggestions:
            return 0.0

        # Exemple simple: score basé sur l'équité
        employee_hours = {}
        for suggestion in suggestions:
            emp_id = suggestion['employee_id']
            if emp_id not in employee_hours:
                employee_hours[emp_id] = 0
            employee_hours[emp_id] += suggestion['duration']

        if not employee_hours:
            return 0.0

        hours_values = list(employee_hours.values())
        avg_hours = sum(hours_values) / len(hours_values)
        variance = sum((h - avg_hours) ** 2 for h in hours_values) / len(hours_values)

        # Score inversement proportionnel à la variance (plus équitable = meilleur score)
        equity_score = max(0, 100 - variance * 10)

        return round(equity_score, 2)

    def export_planning_data(self, format_type: str = 'json', week_offset: int = 0) -> Dict:
        """Exporte les données du planning dans différents formats"""
        planning_data = self.get_week_planning(week_offset)

        if format_type == 'csv':
            # Préparer pour export CSV
            csv_data = []
            for day, shifts in planning_data['shifts_by_day'].items():
                for shift in shifts:
                    employee = self.employee_manager.get_employee(shift.employee_id)
                    csv_data.append({
                        'Jour': day,
                        'Employé': employee.nom_complet if employee else 'Inconnu',
                        'Poste': employee.poste if employee else 'Inconnu',
                        'Début': f"{shift.start_hour:02d}:00",
                        'Fin': f"{shift.end_hour:02d}:00",
                        'Durée': f"{shift.duration}h",
                        'Notes': shift.notes
                    })
            return {'format': 'csv', 'data': csv_data}

        elif format_type == 'summary':
            # Résumé textuel
            summary = []
            for day, shifts in planning_data['shifts_by_day'].items():
                if shifts:
                    summary.append(f"\n{day}:")
                    for shift in shifts:
                        employee = self.employee_manager.get_employee(shift.employee_id)
                        name = employee.nom_complet if employee else 'Inconnu'
                        summary.append(f"  - {name}: {shift.formatted_hours} ({shift.duration}h)")
                else:
                    summary.append(f"\n{day}: Aucun service")

            return {'format': 'summary', 'data': '\n'.join(summary)}

        else:
            # Format JSON par défaut
            return {'format': 'json', 'data': planning_data}

    def get_planning_conflicts(self) -> List[Dict]:
        """Récupère tous les conflits du planning"""
        conflicts = []
        all_shifts = self.shift_manager.get_all_shifts()

        for i, shift1 in enumerate(all_shifts):
            for shift2 in all_shifts[i + 1:]:
                if shift1.conflicts_with(shift2):
                    employee1 = self.employee_manager.get_employee(shift1.employee_id)
                    employee2 = self.employee_manager.get_employee(shift2.employee_id)

                    conflicts.append({
                        'type': 'employee_overlap' if shift1.employee_id == shift2.employee_id else 'schedule_conflict',
                        'shift1': {
                            'id': shift1.id,
                            'employee': employee1.nom_complet if employee1 else 'Inconnu',
                            'day': shift1.day,
                            'hours': shift1.formatted_hours
                        },
                        'shift2': {
                            'id': shift2.id,
                            'employee': employee2.nom_complet if employee2 else 'Inconnu',
                            'day': shift2.day,
                            'hours': shift2.formatted_hours
                        },
                        'severity': 'high' if shift1.employee_id == shift2.employee_id else 'medium'
                    })

        return conflicts