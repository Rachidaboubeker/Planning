# app/routes/sync.py
"""
Route de synchronisation pour la sauvegarde automatique
Gestion robuste de la sérialisation/désérialisation JSON
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import logging
from app.managers.employee_manager import employee_manager
from app.managers.shift_manager import shift_manager

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sync_bp = Blueprint('sync', __name__)


@sync_bp.route('/sync', methods=['POST'])
def sync_data():
    """
    Endpoint de sauvegarde automatique
    Reçoit les données complètes du frontend et les sauvegarde
    """
    try:
        # Validation du Content-Type
        if not request.is_json:
            logger.error("Content-Type invalide pour /sync")
            return jsonify({
                'success': False,
                'error': 'Content-Type doit être application/json'
            }), 400

        # Récupération et validation des données JSON
        try:
            data = request.get_json(force=True)
        except Exception as json_error:
            logger.error(f"Erreur parsing JSON: {json_error}")
            return jsonify({
                'success': False,
                'error': f'JSON invalide: {str(json_error)}'
            }), 400

        if not data:
            logger.error("Données JSON vides")
            return jsonify({
                'success': False,
                'error': 'Aucune donnée reçue'
            }), 400

        # Validation de la structure des données
        validation_result = validate_sync_data(data)
        if not validation_result['valid']:
            logger.error(f"Données invalides: {validation_result['error']}")
            return jsonify({
                'success': False,
                'error': validation_result['error']
            }), 400

        logger.info(
            f"Début synchronisation: {len(data.get('employees', []))} employés, {len(data.get('shifts', []))} créneaux")

        # Sauvegarde des employés
        employees_result = sync_employees(data.get('employees', []))

        # Sauvegarde des créneaux
        shifts_result = sync_shifts(data.get('shifts', []))

        # Vérification des résultats
        total_errors = employees_result['errors'] + shifts_result['errors']

        if total_errors > 0:
            logger.warning(f"Synchronisation avec {total_errors} erreurs")

        # Réponse de succès
        response_data = {
            'success': True,
            'message': 'Synchronisation réussie',
            'timestamp': datetime.now().isoformat(),
            'stats': {
                'employees_synced': employees_result['synced'],
                'employees_errors': employees_result['errors'],
                'shifts_synced': shifts_result['synced'],
                'shifts_errors': shifts_result['errors'],
                'total_errors': total_errors
            }
        }

        logger.info(f"Synchronisation terminée: {response_data['stats']}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Erreur interne lors de la synchronisation: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Erreur serveur interne',
            'details': str(e) if request.args.get('debug') else None
        }), 500


def validate_sync_data(data):
    """
    Valide la structure des données de synchronisation
    """
    if not isinstance(data, dict):
        return {'valid': False, 'error': 'Les données doivent être un objet JSON'}

    # Vérification des champs requis
    required_fields = ['employees', 'shifts']
    for field in required_fields:
        if field not in data:
            return {'valid': False, 'error': f'Champ manquant: {field}'}

        if not isinstance(data[field], list):
            return {'valid': False, 'error': f'Le champ {field} doit être une liste'}

    # Validation des métadonnées si présentes
    if 'meta' in data and not isinstance(data['meta'], dict):
        return {'valid': False, 'error': 'Les métadonnées doivent être un objet'}

    return {'valid': True}


def sync_employees(employees_data):
    """
    Synchronise les données des employés
    """
    synced = 0
    errors = 0

    for emp_data in employees_data:
        try:
            # Validation des données employé
            if not validate_employee_data(emp_data):
                errors += 1
                continue

            # Recherche de l'employé existant
            existing_employee = employee_manager.get_employee(emp_data['id'])

            if existing_employee:
                # Mise à jour
                update_success = employee_manager.update_employee(
                    emp_data['id'],
                    {
                        'nom': emp_data.get('nom', existing_employee.nom),
                        'prenom': emp_data.get('prenom', existing_employee.prenom),
                        'poste': emp_data.get('poste', existing_employee.poste),
                        'email': emp_data.get('email', existing_employee.email),
                        'telephone': emp_data.get('telephone', existing_employee.telephone),
                        'taux_horaire': float(emp_data.get('taux_horaire', existing_employee.taux_horaire))
                    }
                )
                if update_success:
                    synced += 1
                else:
                    errors += 1
            else:
                # Création nouvel employé
                from app.models.employee import Employee
                new_employee = Employee(
                    id=emp_data['id'],
                    nom=emp_data['nom'],
                    prenom=emp_data['prenom'],
                    poste=emp_data['poste'],
                    email=emp_data.get('email', ''),
                    telephone=emp_data.get('telephone', ''),
                    taux_horaire=float(emp_data.get('taux_horaire', 15.0))
                )

                if employee_manager.add_employee(new_employee):
                    synced += 1
                else:
                    errors += 1

        except Exception as e:
            logger.error(f"Erreur sync employé {emp_data.get('id', 'unknown')}: {e}")
            errors += 1

    return {'synced': synced, 'errors': errors}


def sync_shifts(shifts_data):
    """
    Synchronise les données des créneaux
    """
    synced = 0
    errors = 0

    for shift_data in shifts_data:
        try:
            # Validation des données créneau
            if not validate_shift_data(shift_data):
                errors += 1
                continue

            # Vérification que l'employé existe
            if not employee_manager.get_employee(shift_data['employee_id']):
                logger.error(f"Employé {shift_data['employee_id']} introuvable pour le créneau {shift_data.get('id')}")
                errors += 1
                continue

            # Recherche du créneau existant
            existing_shift = shift_manager.get_shift(shift_data['id'])

            if existing_shift:
                # Mise à jour
                update_success = shift_manager.update_shift(
                    shift_data['id'],
                    {
                        'employee_id': shift_data['employee_id'],
                        'day': shift_data['day'],
                        'start_hour': int(shift_data['start_hour']),
                        'start_minutes': int(shift_data.get('start_minutes', 0)),
                        'duration': float(shift_data.get('duration', 1.0)),
                        'notes': shift_data.get('notes', '')
                    }
                )
                if update_success:
                    synced += 1
                else:
                    errors += 1
            else:
                # Création nouveau créneau
                from app.models.shift import Shift
                new_shift = Shift(
                    id=shift_data['id'],
                    employee_id=shift_data['employee_id'],
                    day=shift_data['day'],
                    start_hour=int(shift_data['start_hour']),
                    start_minutes=int(shift_data.get('start_minutes', 0)),
                    duration=float(shift_data.get('duration', 1.0)),
                    notes=shift_data.get('notes', '')
                )

                if shift_manager.add_shift(new_shift):
                    synced += 1
                else:
                    errors += 1

        except Exception as e:
            logger.error(f"Erreur sync créneau {shift_data.get('id', 'unknown')}: {e}")
            errors += 1

    return {'synced': synced, 'errors': errors}


def validate_employee_data(emp_data):
    """
    Valide les données d'un employé
    """
    if not isinstance(emp_data, dict):
        return False

    required_fields = ['id', 'nom', 'prenom', 'poste']
    for field in required_fields:
        if field not in emp_data or not emp_data[field]:
            logger.error(f"Champ employé manquant ou vide: {field}")
            return False

    # Validation du poste
    valid_postes = ['cuisinier', 'serveur', 'manager', 'aide_cuisine', 'barman', 'plongeur']
    if emp_data['poste'] not in valid_postes:
        logger.error(f"Poste employé invalide: {emp_data['poste']}")
        return False

    # Validation du taux horaire si présent
    if 'taux_horaire' in emp_data:
        try:
            taux = float(emp_data['taux_horaire'])
            if taux < 0 or taux > 100:
                logger.error(f"Taux horaire invalide: {taux}")
                return False
        except (ValueError, TypeError):
            logger.error(f"Taux horaire non numérique: {emp_data['taux_horaire']}")
            return False

    return True


def validate_shift_data(shift_data):
    """
    Valide les données d'un créneau
    """
    if not isinstance(shift_data, dict):
        return False

    required_fields = ['id', 'employee_id', 'day', 'start_hour']
    for field in required_fields:
        if field not in shift_data or shift_data[field] is None:
            logger.error(f"Champ créneau manquant: {field}")
            return False

    # Validation du jour
    valid_days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    if shift_data['day'] not in valid_days:
        logger.error(f"Jour invalide: {shift_data['day']}")
        return False

    # Validation de l'heure
    try:
        hour = int(shift_data['start_hour'])
        if hour < 0 or hour > 23:
            logger.error(f"Heure invalide: {hour}")
            return False
    except (ValueError, TypeError):
        logger.error(f"Heure non numérique: {shift_data['start_hour']}")
        return False

    # Validation des minutes si présent
    if 'start_minutes' in shift_data:
        try:
            minutes = int(shift_data['start_minutes'])
            if minutes < 0 or minutes > 59:
                logger.error(f"Minutes invalides: {minutes}")
                return False
        except (ValueError, TypeError):
            logger.error(f"Minutes non numériques: {shift_data['start_minutes']}")
            return False

    # Validation de la durée si présent
    if 'duration' in shift_data:
        try:
            duration = float(shift_data['duration'])
            if duration <= 0 or duration > 24:
                logger.error(f"Durée invalide: {duration}")
                return False
        except (ValueError, TypeError):
            logger.error(f"Durée non numérique: {shift_data['duration']}")
            return False

    return True


@sync_bp.route('/health', methods=['GET'])
def health_check():
    """
    Endpoint de vérification de santé du serveur
    """
    try:
        # Vérification basique de l'état des managers
        employees_count = len(employee_manager.get_all_employees())
        shifts_count = len(shift_manager.get_all_shifts())

        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'stats': {
                'employees': employees_count,
                'shifts': shifts_count
            }
        }), 200

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500


# Ajout à app/__init__.py ou app/routes/__init__.py
"""
# Dans app/__init__.py, ajouter:

from app.routes.sync import sync_bp
app.register_blueprint(sync_bp, url_prefix='/api')
"""