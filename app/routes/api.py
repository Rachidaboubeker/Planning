"""
API REST pour le planning restaurant
"""

from flask import Blueprint, request, jsonify
from app.models.employee import EmployeeManager, Employee
from app.models.shift import ShiftManager, Shift
from config import Config

api_bp = Blueprint('api', __name__)

# Instances globales des gestionnaires
employee_manager = EmployeeManager()
shift_manager = ShiftManager()


# ==================== EMPLOYÉS ====================

@api_bp.route('/employees', methods=['GET'])
def get_employees():
    """Récupère tous les employés"""
    try:
        actif_only = request.args.get('actif_only', 'true').lower() == 'true'
        employees = employee_manager.get_all_employees(actif_only=actif_only)

        return jsonify({
            'success': True,
            'employees': [emp.to_dict() for emp in employees],
            'count': len(employees)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees', methods=['POST'])
def create_employee():
    """Crée un nouvel employé"""
    try:
        data = request.get_json()

        # Validation des champs requis
        required_fields = ['nom', 'prenom', 'poste']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Le champ {field} est requis'
                }), 400

        # Validation du poste
        if data['poste'] not in Config.EMPLOYEE_TYPES:
            return jsonify({
                'success': False,
                'error': 'Type de poste invalide'
            }), 400

        employee = Employee(
            nom=data['nom'],
            prenom=data['prenom'],
            poste=data['poste'],
            email=data.get('email', ''),
            telephone=data.get('telephone', ''),
            taux_horaire=float(data.get('taux_horaire', 15.0))
        )

        if employee_manager.add_employee(employee):
            return jsonify({
                'success': True,
                'employee': employee.to_dict(),
                'message': 'Employé créé avec succès'
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la création'
            }), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Récupère un employé par son ID"""
    try:
        employee = employee_manager.get_employee(employee_id)
        if employee:
            return jsonify({
                'success': True,
                'employee': employee.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Employé introuvable'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Met à jour un employé"""
    try:
        data = request.get_json()

        # Validation du poste si fourni
        if 'poste' in data and data['poste'] not in Config.EMPLOYEE_TYPES:
            return jsonify({
                'success': False,
                'error': 'Type de poste invalide'
            }), 400

        if employee_manager.update_employee(employee_id, data):
            updated_employee = employee_manager.get_employee(employee_id)
            return jsonify({
                'success': True,
                'employee': updated_employee.to_dict(),
                'message': 'Employé mis à jour avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la mise à jour'
            }), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Supprime (désactive) un employé"""
    try:
        if employee_manager.delete_employee(employee_id):
            return jsonify({
                'success': True,
                'message': 'Employé supprimé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la suppression'
            }), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CRÉNEAUX ====================

@api_bp.route('/shifts', methods=['GET'])
def get_shifts():
    """Récupère tous les créneaux"""
    try:
        day = request.args.get('day')
        employee_id = request.args.get('employee_id')

        if day:
            shifts = shift_manager.get_shifts_by_day(day)
        elif employee_id:
            shifts = shift_manager.get_shifts_by_employee(employee_id)
        else:
            shifts = shift_manager.get_all_shifts()

        return jsonify({
            'success': True,
            'shifts': [shift.to_dict() for shift in shifts],
            'count': len(shifts)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts', methods=['POST'])
def create_shift():
    """Crée un nouveau créneau"""
    try:
        data = request.get_json()

        # Validation des champs requis
        required_fields = ['employee_id', 'day', 'start_hour', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Le champ {field} est requis'
                }), 400

        # Validation des valeurs
        if data['day'] not in Config.DAYS_OF_WEEK:
            return jsonify({
                'success': False,
                'error': 'Jour invalide'
            }), 400

        if data['start_hour'] not in Config.HOURS_RANGE:
            return jsonify({
                'success': False,
                'error': 'Heure de début invalide'
            }), 400

        if not (1 <= data['duration'] <= 12):
            return jsonify({
                'success': False,
                'error': 'Durée invalide (1-12 heures)'
            }), 400

        # Vérifier que l'employé existe
        if not employee_manager.get_employee(data['employee_id']):
            return jsonify({
                'success': False,
                'error': 'Employé introuvable'
            }), 400

        shift = Shift(
            employee_id=data['employee_id'],
            day=data['day'],
            start_hour=int(data['start_hour']),
            duration=int(data['duration']),
            poste_specifique=data.get('poste_specifique', ''),
            notes=data.get('notes', '')
        )

        success, message = shift_manager.add_shift(shift)
        if success:
            return jsonify({
                'success': True,
                'shift': shift.to_dict(),
                'message': message
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/<shift_id>', methods=['GET'])
def get_shift(shift_id):
    """Récupère un créneau par son ID"""
    try:
        shift = shift_manager.get_shift(shift_id)
        if shift:
            return jsonify({
                'success': True,
                'shift': shift.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Créneau introuvable'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/<shift_id>', methods=['PUT'])
def update_shift(shift_id):
    """Met à jour un créneau"""
    try:
        data = request.get_json()

        # Validation des valeurs si fournies
        if 'day' in data and data['day'] not in Config.DAYS_OF_WEEK:
            return jsonify({
                'success': False,
                'error': 'Jour invalide'
            }), 400

        if 'start_hour' in data and data['start_hour'] not in Config.HOURS_RANGE:
            return jsonify({
                'success': False,
                'error': 'Heure de début invalide'
            }), 400

        if 'duration' in data and not (1 <= data['duration'] <= 12):
            return jsonify({
                'success': False,
                'error': 'Durée invalide (1-12 heures)'
            }), 400

        success, message = shift_manager.update_shift(shift_id, data)
        if success:
            updated_shift = shift_manager.get_shift(shift_id)
            return jsonify({
                'success': True,
                'shift': updated_shift.to_dict(),
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/<shift_id>', methods=['DELETE'])
def delete_shift(shift_id):
    """Supprime un créneau"""
    try:
        if shift_manager.delete_shift(shift_id):
            return jsonify({
                'success': True,
                'message': 'Créneau supprimé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la suppression'
            }), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== STATISTIQUES ====================

@api_bp.route('/stats/weekly', methods=['GET'])
def get_weekly_stats():
    """Récupère les statistiques hebdomadaires"""
    try:
        stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK)

        # Enrichir avec les informations des employés
        employee_details = {}
        for emp_id, hours in stats['employee_hours'].items():
            employee = employee_manager.get_employee(emp_id)
            if employee:
                employee_details[emp_id] = {
                    'name': employee.nom_complet,
                    'type': employee.poste,
                    'hours': hours,
                    'cost': hours * employee.taux_horaire
                }

        total_cost = sum(detail['cost'] for detail in employee_details.values())

        return jsonify({
            'success': True,
            'stats': {
                'total_hours': stats['total_hours'],
                'active_employees': stats['active_employees'],
                'average_hours': round(stats['average_hours'], 1),
                'total_cost': round(total_cost, 2),
                'employee_details': employee_details
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/conflicts/<shift_id>', methods=['GET'])
def check_conflicts(shift_id):
    """Vérifie les conflits pour un créneau"""
    try:
        shift = shift_manager.get_shift(shift_id)
        if not shift:
            return jsonify({
                'success': False,
                'error': 'Créneau introuvable'
            }), 404

        conflicts = shift_manager.get_conflicts(shift)

        return jsonify({
            'success': True,
            'has_conflicts': len(conflicts) > 0,
            'conflicts': [conflict.to_dict() for conflict in conflicts]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GESTION DES ERREURS ====================

@api_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Requête invalide'
    }), 400


@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Ressource introuvable'
    }), 404


@api_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Erreur interne du serveur'
    }), 500