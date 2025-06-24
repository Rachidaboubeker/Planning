"""
API REST complète pour le planning restaurant avec gestion de la granularité
"""

from flask import Blueprint, request, jsonify, send_file
from app.models.employee import EmployeeManager, Employee
from app.routes.shift import ShiftManager, Shift
from config import Config
import base64
import io
import os
import imghdr
from datetime import datetime
import json

api_bp = Blueprint('api', __name__)

# Instances globales des gestionnaires
employee_manager = EmployeeManager()
shift_manager = ShiftManager()


# ==================== CONFIGURATION GRANULARITÉ ====================

@api_bp.route('/config/granularity', methods=['POST'])
def set_granularity():
    """Change la granularité temporelle"""
    try:
        data = request.get_json()
        new_granularity = int(data.get('granularity'))

        if new_granularity not in Config.AVAILABLE_GRANULARITIES:
            return jsonify({
                'success': False,
                'error': f'Granularité {new_granularity} non supportée'
            }), 400

        # Mettre à jour la configuration
        Config.set_granularity(new_granularity)

        # Générer les nouveaux créneaux
        all_time_slots = Config.get_all_time_slots()
        granularity_info = Config.get_granularity_info()

        return jsonify({
            'success': True,
            'granularity': new_granularity,
            'all_time_slots': all_time_slots,
            'granularity_info': granularity_info,
            'message': f'Granularité changée à {granularity_info["granularity_label"]}'
        })

    except (ValueError, TypeError) as e:
        return jsonify({
            'success': False,
            'error': 'Granularité invalide'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/config/granularity', methods=['GET'])
def get_granularity():
    """Retourne la configuration de granularité actuelle"""
    try:
        granularity_info = Config.get_granularity_info()
        all_time_slots = Config.get_all_time_slots()

        return jsonify({
            'success': True,
            'granularity': Config.TIME_SLOT_GRANULARITY,
            'granularity_info': granularity_info,
            'all_time_slots': all_time_slots,
            'available_granularities': Config.AVAILABLE_GRANULARITIES
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== EMPLOYÉS ====================

@api_bp.route('/employees', methods=['GET'])
def get_employees():
    """Récupère tous les employés"""
    try:
        actif_only = request.args.get('actif_only', 'true').lower() == 'true'
        include_photos = request.args.get('include_photos', 'false').lower() == 'true'

        employees_data = employee_manager.get_all_employees_dict(
            actif_only=actif_only,
            include_photos=include_photos
        )

        return jsonify({
            'success': True,
            'employees': employees_data,
            'count': len(employees_data),
            'photos_included': include_photos
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees', methods=['POST'])
def create_employee():
    """Crée un nouvel employé"""
    try:
        data = request.get_json()

        # Validation des données
        errors = employee_manager.validate_employee_data(data)
        if errors:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400

        employee = Employee(
            nom=data['nom'],
            prenom=data['prenom'],
            poste=data['poste'],
            email=data.get('email', ''),
            telephone=data.get('telephone', ''),
            taux_horaire=float(data.get('taux_horaire', 15.0))
        )

        # Gérer la photo si fournie
        if data.get('photo_data'):
            if not employee.set_photo_from_base64(data['photo_data']):
                return jsonify({
                    'success': False,
                    'error': 'Données photo invalides'
                }), 400

        if employee_manager.add_employee(employee):
            return jsonify({
                'success': True,
                'employee': employee.to_dict(),
                'message': f'Employé {employee.prenom} {employee.nom} créé avec succès'
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la création de l\'employé'
            }), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Récupère un employé par son ID"""
    try:
        employee = employee_manager.get_employee_by_id(employee_id)
        if employee:
            return jsonify({
                'success': True,
                'employee': employee.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Employé non trouvé'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Met à jour un employé"""
    try:
        data = request.get_json()

        # Validation
        errors = employee_manager.validate_employee_data(data, employee_id)
        if errors:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400

        if employee_manager.update_employee(employee_id, data):
            employee = employee_manager.get_employee_by_id(employee_id)
            return jsonify({
                'success': True,
                'employee': employee.to_dict() if employee else None,
                'message': 'Employé mis à jour avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Employé non trouvé ou erreur lors de la mise à jour'
            }), 404

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Supprime un employé (désactivation)"""
    try:
        if employee_manager.delete_employee(employee_id):
            return jsonify({
                'success': True,
                'message': 'Employé supprimé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Employé non trouvé'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>/photo', methods=['POST'])
def upload_employee_photo(employee_id):
    """Upload une photo pour un employé"""
    try:
        data = request.get_json()
        photo_data = data.get('photo_data')

        if not photo_data:
            return jsonify({
                'success': False,
                'error': 'Données photo manquantes'
            }), 400

        employee = employee_manager.get_employee_by_id(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'error': 'Employé non trouvé'
            }), 404

        if employee.set_photo_from_base64(photo_data):
            if employee_manager.save_employees():
                return jsonify({
                    'success': True,
                    'message': 'Photo mise à jour avec succès',
                    'photo_url': employee.photo
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Erreur lors de la sauvegarde'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'Format photo invalide'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>/photo', methods=['DELETE'])
def delete_employee_photo(employee_id):
    """Supprime la photo d'un employé"""
    try:
        employee = employee_manager.get_employee_by_id(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'error': 'Employé non trouvé'
            }), 404

        if employee.delete_photo():
            if employee_manager.save_employees():
                return jsonify({
                    'success': True,
                    'message': 'Photo supprimée avec succès'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Erreur lors de la sauvegarde'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'Aucune photo à supprimer'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CRÉNEAUX ====================

@api_bp.route('/shifts', methods=['GET'])
def get_shifts():
    """Récupère tous les créneaux"""
    try:
        week = request.args.get('week')  # Format: YYYY-WW
        employee_id = request.args.get('employee_id')

        shifts_data = shift_manager.get_all_shifts_dict(
            week=week,
            employee_id=employee_id
        )

        return jsonify({
            'success': True,
            'shifts': shifts_data,
            'count': len(shifts_data)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts', methods=['POST'])
def create_shift():
    """Crée un nouveau créneau avec support granularité"""
    try:
        data = request.get_json()

        # Validation des données avec granularité
        errors = shift_manager.validate_shift_data(data)
        if errors:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400

        shift = Shift(
            employee_id=data['employee_id'],
            day=data['day'],
            start_hour=int(data['start_hour']),
            start_minutes=int(data.get('start_minutes', 0)),
            duration=float(data.get('duration', 1)),
            notes=data.get('notes', '')
        )

        if shift_manager.add_shift(shift):
            return jsonify({
                'success': True,
                'shift': shift.to_dict(),
                'message': 'Créneau créé avec succès'
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la création du créneau'
            }), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/<shift_id>', methods=['GET'])
def get_shift(shift_id):
    """Récupère un créneau par son ID"""
    try:
        shift = shift_manager.get_shift_by_id(shift_id)
        if shift:
            return jsonify({
                'success': True,
                'shift': shift.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Créneau non trouvé'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/<shift_id>', methods=['PUT'])
def update_shift(shift_id):
    """Met à jour un créneau avec support granularité"""
    try:
        data = request.get_json()

        # Validation avec granularité
        errors = shift_manager.validate_shift_data(data, shift_id)
        if errors:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400

        if shift_manager.update_shift(shift_id, data):
            shift = shift_manager.get_shift_by_id(shift_id)
            return jsonify({
                'success': True,
                'shift': shift.to_dict() if shift else None,
                'message': 'Créneau mis à jour avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Créneau non trouvé ou erreur lors de la mise à jour'
            }), 404

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
                'error': 'Créneau non trouvé'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/shifts/conflicts/<employee_id>', methods=['GET'])
def check_shift_conflicts(employee_id):
    """Vérifie les conflits pour un employé avec granularité"""
    try:
        day = request.args.get('day')
        start_hour = int(request.args.get('start_hour', 0))
        start_minutes = int(request.args.get('start_minutes', 0))
        duration = float(request.args.get('duration', 1))
        exclude_shift_id = request.args.get('exclude_shift_id')

        conflicts = shift_manager.check_conflicts_with_granularity(
            employee_id, day, start_hour, start_minutes, duration, exclude_shift_id
        )

        return jsonify({
            'success': True,
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== STATISTIQUES ====================

@api_bp.route('/stats/weekly', methods=['GET'])
def get_weekly_stats():
    """Statistiques hebdomadaires"""
    try:
        week = request.args.get('week')  # Format: YYYY-WW
        stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK, week)

        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/stats/employee/<employee_id>', methods=['GET'])
def get_employee_stats(employee_id):
    """Statistiques pour un employé"""
    try:
        week = request.args.get('week')
        stats = shift_manager.get_employee_stats(employee_id, week)

        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/stats/granularity', methods=['GET'])
def get_granularity_stats():
    """Statistiques sur l'utilisation de la granularité"""
    try:
        granularity_info = Config.get_granularity_info()
        all_time_slots = Config.get_all_time_slots()

        # Calculer l'utilisation des créneaux
        shifts = shift_manager.get_all_shifts()
        slots_usage = {}

        for shift in shifts:
            start_minutes = getattr(shift, 'start_minutes', 0)
            slot_key = f"{shift.start_hour}_{start_minutes}"
            slots_usage[slot_key] = slots_usage.get(slot_key, 0) + 1

        # Statistiques d'utilisation par granularité
        granularity_usage = {}
        total_shifts = len(shifts)

        for slot in all_time_slots:
            usage_count = slots_usage.get(slot['key'], 0)
            if slot['minutes'] not in granularity_usage:
                granularity_usage[slot['minutes']] = 0
            granularity_usage[slot['minutes']] += usage_count

        return jsonify({
            'success': True,
            'granularity_info': granularity_info,
            'total_slots': len(all_time_slots),
            'used_slots': len(slots_usage),
            'total_shifts': total_shifts,
            'slots_usage': slots_usage,
            'granularity_usage': granularity_usage
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== EXPORT/IMPORT ====================

@api_bp.route('/export/planning', methods=['GET'])
def export_planning():
    """Exporte le planning en JSON"""
    try:
        week = request.args.get('week')
        format_type = request.args.get('format', 'json')  # json, csv

        employees = employee_manager.get_all_employees()
        shifts = shift_manager.get_all_shifts()

        export_data = {
            'export_date': datetime.now().isoformat(),
            'week': week,
            'granularity': Config.TIME_SLOT_GRANULARITY,
            'config': Config.get_config_data_for_template(),
            'employees': [emp.to_dict() for emp in employees],
            'shifts': [shift.to_dict() for shift in shifts]
        }

        if format_type == 'json':
            return jsonify({
                'success': True,
                'data': export_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Format non supporté'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/import/planning', methods=['POST'])
def import_planning():
    """Importe un planning depuis JSON"""
    try:
        data = request.get_json()
        import_data = data.get('data')

        if not import_data:
            return jsonify({
                'success': False,
                'error': 'Données d\'import manquantes'
            }), 400

        # Validation de base
        required_fields = ['employees', 'shifts']
        for field in required_fields:
            if field not in import_data:
                return jsonify({
                    'success': False,
                    'error': f'Champ requis manquant: {field}'
                }), 400

        # Import des employés
        imported_employees = 0
        for emp_data in import_data['employees']:
            try:
                employee = Employee(
                    nom=emp_data['nom'],
                    prenom=emp_data['prenom'],
                    poste=emp_data['poste'],
                    email=emp_data.get('email', ''),
                    telephone=emp_data.get('telephone', ''),
                    taux_horaire=float(emp_data.get('taux_horaire', 15.0))
                )
                if employee_manager.add_employee(employee):
                    imported_employees += 1
            except Exception as e:
                continue  # Ignorer les erreurs d'employés individuels

        # Import des créneaux
        imported_shifts = 0
        for shift_data in import_data['shifts']:
            try:
                shift = Shift(
                    employee_id=shift_data['employee_id'],
                    day=shift_data['day'],
                    start_hour=int(shift_data['start_hour']),
                    start_minutes=int(shift_data.get('start_minutes', 0)),
                    duration=float(shift_data.get('duration', 1)),
                    notes=shift_data.get('notes', '')
                )
                if shift_manager.add_shift(shift):
                    imported_shifts += 1
            except Exception as e:
                continue  # Ignorer les erreurs de créneaux individuels

        return jsonify({
            'success': True,
            'message': f'Import terminé: {imported_employees} employés, {imported_shifts} créneaux',
            'imported_employees': imported_employees,
            'imported_shifts': imported_shifts
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== VALIDATION GRANULARITÉ ====================

@api_bp.route('/validate/time-slot', methods=['POST'])
def validate_time_slot():
    """Valide un créneau temporel selon la granularité"""
    try:
        data = request.get_json()
        hour = int(data.get('hour', 0))
        minutes = int(data.get('minutes', 0))

        # Vérifier que l'heure est dans la plage
        if hour not in Config.get_hours_range():
            return jsonify({
                'success': False,
                'valid': False,
                'error': f'Heure {hour} en dehors des heures d\'ouverture'
            })

        # Vérifier que les minutes correspondent à la granularité
        granularity = Config.TIME_SLOT_GRANULARITY
        if minutes % granularity != 0:
            return jsonify({
                'success': False,
                'valid': False,
                'error': f'Minutes {minutes} invalides pour granularité {granularity}min'
            })

        if minutes < 0 or minutes >= 60:
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'Minutes doivent être entre 0 et 59'
            })

        # Vérifier que le créneau existe
        all_slots = Config.get_all_time_slots()
        slot_key = f"{hour}_{minutes}"

        valid_slot = any(slot['key'] == slot_key for slot in all_slots)

        return jsonify({
            'success': True,
            'valid': valid_slot,
            'slot_key': slot_key,
            'display': Config.format_time_slot(hour, minutes),
            'granularity': granularity
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== UTILITAIRES ====================

@api_bp.route('/utils/generate-time-slots', methods=['GET'])
def generate_time_slots():
    """Génère tous les créneaux temporels selon la granularité actuelle"""
    try:
        all_slots = Config.get_all_time_slots()
        granularity_info = Config.get_granularity_info()

        return jsonify({
            'success': True,
            'granularity': Config.TIME_SLOT_GRANULARITY,
            'granularity_info': granularity_info,
            'time_slots': all_slots,
            'total_slots': len(all_slots)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/utils/reset-granularity', methods=['POST'])
def reset_granularity():
    """Remet la granularité à la valeur par défaut"""
    try:
        default_granularity = 60  # 1 heure par défaut
        Config.set_granularity(default_granularity)

        return jsonify({
            'success': True,
            'granularity': default_granularity,
            'message': 'Granularité remise à 1 heure'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GESTION D'ERREURS ====================

@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint non trouvé'
    }), 404


@api_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Requête invalide'
    }), 400


@api_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Erreur serveur interne'
    }), 500


# ==================== ROUTES D'INFORMATION ====================

@api_bp.route('/info', methods=['GET'])
def api_info():
    """Informations sur l'API"""
    return jsonify({
        'success': True,
        'api_version': '1.0',
        'granularity_support': True,
        'current_granularity': Config.TIME_SLOT_GRANULARITY,
        'available_granularities': Config.AVAILABLE_GRANULARITIES,
        'endpoints': {
            'config': '/api/config/granularity',
            'employees': '/api/employees',
            'shifts': '/api/shifts',
            'stats': '/api/stats',
            'utils': '/api/utils'
        }
    })


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Vérification de santé de l'API"""
    try:
        # Vérifier que les managers fonctionnent
        employees_count = len(employee_manager.get_all_employees())
        shifts_count = len(shift_manager.get_all_shifts())

        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'employees_count': employees_count,
            'shifts_count': shifts_count,
            'granularity': Config.TIME_SLOT_GRANULARITY
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500