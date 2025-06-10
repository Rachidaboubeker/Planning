"""
API REST complète pour le planning restaurant avec gestion des photos
Version corrigée sans dépendance PIL
"""

from flask import Blueprint, request, jsonify, send_file
from app.models.employee import EmployeeManager, Employee
from app.models.shift import ShiftManager, Shift
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
        include_photo = request.args.get('include_photo', 'true').lower() == 'true'

        employee = employee_manager.get_employee(employee_id)
        if employee:
            employee_data = employee.to_dict() if include_photo else employee.to_dict_without_photo()
            return jsonify({
                'success': True,
                'employee': employee_data
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

        # Validation si des champs critiques sont modifiés
        if any(field in data for field in ['nom', 'prenom', 'poste', 'taux_horaire', 'email', 'telephone']):
            errors = employee_manager.validate_employee_data(data)
            if errors:
                return jsonify({
                    'success': False,
                    'errors': errors
                }), 400

        # Gérer la photo séparément
        photo_updated = False
        if 'photo_data' in data:
            photo_data = data.pop('photo_data')
            if photo_data:
                photo_updated = employee_manager.update_employee_photo(employee_id, photo_data)
            else:
                photo_updated = employee_manager.remove_employee_photo(employee_id)

        # Mettre à jour les autres champs
        if employee_manager.update_employee(employee_id, data):
            updated_employee = employee_manager.get_employee(employee_id)
            return jsonify({
                'success': True,
                'employee': updated_employee.to_dict(),
                'photo_updated': photo_updated,
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


# ==================== GESTION DES PHOTOS ====================

@api_bp.route('/employees/<employee_id>/photo', methods=['GET'])
def get_employee_photo(employee_id):
    """Récupère la photo d'un employé"""
    try:
        employee = employee_manager.get_employee(employee_id)
        if not employee:
            return jsonify({'success': False, 'error': 'Employé introuvable'}), 404

        if not employee.has_photo:
            return jsonify({'success': False, 'error': 'Aucune photo disponible'}), 404

        # Retourner l'URL data
        return jsonify({
            'success': True,
            'photo_url': employee.get_photo_data_url(),
            'has_photo': True
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>/photo', methods=['POST'])
def upload_employee_photo(employee_id):
    """Upload une photo pour un employé"""
    try:
        employee = employee_manager.get_employee(employee_id)
        if not employee:
            return jsonify({'success': False, 'error': 'Employé introuvable'}), 404

        # Vérifier si c'est un upload de fichier ou des données base64
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'Aucun fichier sélectionné'}), 400

            # Vérifier le type de fichier
            if not file.content_type.startswith('image/'):
                return jsonify({'success': False, 'error': 'Type de fichier invalide'}), 400

            # Lire le fichier
            file_data = file.read()
            if len(file_data) > 5 * 1024 * 1024:  # 5MB max
                return jsonify({'success': False, 'error': 'Fichier trop volumineux'}), 400

            # Valider que c'est une image valide
            if not validate_image_data(file_data):
                return jsonify({'success': False, 'error': 'Format d\'image invalide'}), 400

            # Encoder en base64
            photo_data = base64.b64encode(file_data).decode('utf-8')

        elif request.is_json:
            data = request.get_json()
            photo_data = data.get('photo_data')
            if not photo_data:
                return jsonify({'success': False, 'error': 'Données photo manquantes'}), 400
        else:
            return jsonify({'success': False, 'error': 'Format de requête invalide'}), 400

        # Sauvegarder la photo
        if employee_manager.update_employee_photo(employee_id, photo_data):
            return jsonify({
                'success': True,
                'message': 'Photo mise à jour avec succès',
                'photo_url': employee.get_photo_data_url()
            })
        else:
            return jsonify({'success': False, 'error': 'Erreur lors de la sauvegarde'}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/employees/<employee_id>/photo', methods=['DELETE'])
def delete_employee_photo(employee_id):
    """Supprime la photo d'un employé"""
    try:
        employee = employee_manager.get_employee(employee_id)
        if not employee:
            return jsonify({'success': False, 'error': 'Employé introuvable'}), 404

        if employee_manager.remove_employee_photo(employee_id):
            return jsonify({
                'success': True,
                'message': 'Photo supprimée avec succès'
            })
        else:
            return jsonify({'success': False, 'error': 'Erreur lors de la suppression'}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/photos/stats', methods=['GET'])
def get_photo_stats():
    """Récupère les statistiques des photos"""
    try:
        stats = employee_manager.get_photo_statistics()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/photos/bulk-upload', methods=['POST'])
def bulk_upload_photos():
    """Upload en lot de photos"""
    try:
        if 'files' not in request.files:
            return jsonify({'success': False, 'error': 'Aucun fichier fourni'}), 400

        files = request.files.getlist('files')
        results = {
            'success': 0,
            'errors': 0,
            'messages': []
        }

        for file in files:
            if file.filename == '':
                continue

            try:
                # Essayer de matcher le nom de fichier avec un employé
                filename = file.filename.lower()
                base_name = os.path.splitext(filename)[0]

                # Chercher l'employé correspondant
                matched_employee = None
                for employee in employee_manager.get_all_employees():
                    full_name = f"{employee.prenom}_{employee.nom}".lower()
                    if full_name in base_name or base_name in full_name:
                        matched_employee = employee
                        break

                if matched_employee:
                    # Traiter le fichier
                    file_data = file.read()
                    if len(file_data) > 5 * 1024 * 1024:
                        results['errors'] += 1
                        results['messages'].append(f"{file.filename}: Fichier trop volumineux")
                        continue

                    # Valider l'image
                    if not validate_image_data(file_data):
                        results['errors'] += 1
                        results['messages'].append(f"{file.filename}: Format d'image invalide")
                        continue

                    # Encoder en base64
                    photo_data = base64.b64encode(file_data).decode('utf-8')

                    if employee_manager.update_employee_photo(matched_employee.id, photo_data):
                        results['success'] += 1
                        results['messages'].append(f"Photo mise à jour pour {matched_employee.nom_complet}")
                    else:
                        results['errors'] += 1
                        results['messages'].append(f"Erreur lors de la sauvegarde pour {matched_employee.nom_complet}")
                else:
                    results['errors'] += 1
                    results['messages'].append(f"{file.filename}: Aucun employé correspondant trouvé")

            except Exception as e:
                results['errors'] += 1
                results['messages'].append(f"{file.filename}: Erreur de traitement - {str(e)}")

        return jsonify({
            'success': True,
            'results': results
        })

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
                    'cost': hours * employee.taux_horaire,
                    'has_photo': employee.has_photo
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


@api_bp.route('/stats/employees', methods=['GET'])
def get_employee_stats():
    """Récupère les statistiques détaillées des employés"""
    try:
        report = employee_manager.generate_employee_report(include_photos=False)
        photo_stats = employee_manager.get_photo_statistics()

        return jsonify({
            'success': True,
            'stats': {
                'summary': report['summary'],
                'stats_by_type': report['stats_by_type'],
                'photo_stats': photo_stats,
                'generation_date': report['generation_date']
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


# ==================== IMPORT/EXPORT ====================

@api_bp.route('/export/employees', methods=['GET'])
def export_employees():
    """Exporte les données des employés"""
    try:
        include_photos = request.args.get('include_photos', 'false').lower() == 'true'
        format_type = request.args.get('format', 'json')

        if format_type == 'json':
            report = employee_manager.generate_employee_report(include_photos=include_photos)
            return jsonify({
                'success': True,
                'data': report,
                'format': 'json'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Format non supporté'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/export/planning', methods=['GET'])
def export_planning():
    """Exporte le planning de la semaine"""
    try:
        format_type = request.args.get('format', 'json')
        include_photos = request.args.get('include_photos', 'false').lower() == 'true'

        # Récupérer tous les créneaux
        shifts = shift_manager.get_all_shifts()
        shifts_data = []

        for shift in shifts:
            shift_dict = shift.to_dict()
            employee = employee_manager.get_employee(shift.employee_id)
            if employee:
                shift_dict['employee'] = employee.to_dict() if include_photos else employee.to_dict_without_photo()
            shifts_data.append(shift_dict)

        # Statistiques
        stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK)
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

        export_data = {
            'export_date': datetime.now().isoformat(),
            'week_days': Config.DAYS_OF_WEEK,
            'shifts': shifts_data,
            'statistics': {
                'total_hours': stats['total_hours'],
                'active_employees': stats['active_employees'],
                'employee_details': employee_details
            },
            'metadata': {
                'photos_included': include_photos,
                'format': format_type
            }
        }

        return jsonify({
            'success': True,
            'data': export_data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== UTILITAIRES ====================

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Vérification de l'état de l'API"""
    try:
        # Vérifier les managers
        employees_count = len(employee_manager.get_all_employees())
        shifts_count = len(shift_manager.get_all_shifts())
        photo_stats = employee_manager.get_photo_statistics()

        return jsonify({
            'success': True,
            'status': 'healthy',
            'data': {
                'employees_count': employees_count,
                'shifts_count': shifts_count,
                'photos_stats': photo_stats,
                'config': {
                    'days_of_week': Config.DAYS_OF_WEEK,
                    'hours_range': len(Config.HOURS_RANGE),
                    'employee_types': list(Config.EMPLOYEE_TYPES.keys())
                }
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@api_bp.route('/config', methods=['GET'])
def get_config():
    """Récupère la configuration de l'application"""
    return jsonify({
        'success': True,
        'config': {
            'days_of_week': Config.DAYS_OF_WEEK,
            'hours_range': Config.HOURS_RANGE,
            'employee_types': Config.EMPLOYEE_TYPES
        }
    })


# ==================== FONCTIONS UTILITAIRES ====================

def validate_image_data(file_data):
    """Valide qu'un fichier est une image valide sans PIL"""
    try:
        # Utiliser imghdr qui est inclus dans Python
        image_type = imghdr.what(None, h=file_data)
        return image_type in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp']
    except:
        return False


def get_image_format(file_data):
    """Détecte le format d'une image"""
    try:
        return imghdr.what(None, h=file_data)
    except:
        return None


def validate_image_size(file_data, max_size_mb=5):
    """Valide la taille d'une image"""
    return len(file_data) <= max_size_mb * 1024 * 1024


# ==================== GESTION DES ERREURS ====================

@api_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Requête invalide',
        'status_code': 400
    }), 400


@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Ressource introuvable',
        'status_code': 404
    }), 404


@api_bp.errorhandler(413)
def payload_too_large(error):
    return jsonify({
        'success': False,
        'error': 'Fichier trop volumineux (max 5MB)',
        'status_code': 413
    }), 413


@api_bp.errorhandler(415)
def unsupported_media_type(error):
    return jsonify({
        'success': False,
        'error': 'Type de média non supporté',
        'status_code': 415
    }), 415


@api_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Erreur interne du serveur',
        'status_code': 500
    }), 500


# ==================== MIDDLEWARES ====================

@api_bp.before_request
def before_request():
    """Middleware exécuté avant chaque requête API"""
    # Log des requêtes pour le debugging
    if request.method != 'GET':
        print(f"API Request: {request.method} {request.path}")


@api_bp.after_request
def after_request(response):
    """Middleware exécuté après chaque requête API"""
    # Ajouter des headers personnalisés
    response.headers['X-API-Version'] = '1.1'
    response.headers['X-Planning-App'] = 'Restaurant-Scheduler'
    return response