"""
Routes principales de l'application avec support de la granularité
"""

from flask import Blueprint, render_template, request, jsonify
from app.models.employee import EmployeeManager
from app.models.shift import ShiftManager
from config import Config

main_bp = Blueprint('main', __name__)

# Instances globales des gestionnaires
employee_manager = EmployeeManager()
shift_manager = ShiftManager()

@main_bp.route('/')
def index():
    """Page d'accueil avec le planning et support granularité"""
    try:
        # Charger les données
        employees = employee_manager.get_all_employees()
        shifts = shift_manager.get_all_shifts()

        # Préparer les données pour le template
        employees_data = [emp.to_dict() for emp in employees]
        shifts_data = [shift.to_dict() for shift in shifts]

        # Statistiques de la semaine
        week_stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK)

        # Données de configuration complètes pour le template
        config_data = Config.get_config_data_for_template()

        return render_template('index.html',
                             employees=employees_data,
                             shifts=shifts_data,
                             employee_types=Config.EMPLOYEE_TYPES,
                             days=Config.DAYS_OF_WEEK,
                             hours=Config.get_hours_range(),
                             stats=week_stats,
                             config_data=config_data,
                             time_slot_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)

    except Exception as e:
        print(f"Erreur dans la route index: {e}")
        # Retourner une page avec des données par défaut en cas d'erreur
        return render_template('index.html',
                             employees=[],
                             shifts=[],
                             employee_types=Config.EMPLOYEE_TYPES,
                             days=Config.DAYS_OF_WEEK,
                             hours=Config.get_hours_range(),
                             stats={'total_hours': 0, 'active_employees': 0, 'average_hours': 0},
                             config_data=Config.get_config_data_for_template(),
                             time_slot_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)


@main_bp.route('/planning')
def planning():
    """Page du planning détaillé avec granularité"""
    try:
        week = request.args.get('week', '')  # Format: YYYY-WW
        granularity = request.args.get('granularity')  # Granularité spécifique

        # Changer temporairement la granularité si demandée
        original_granularity = Config.TIME_SLOT_GRANULARITY
        if granularity and int(granularity) in Config.AVAILABLE_GRANULARITIES:
            Config.set_granularity(int(granularity))

        employees = employee_manager.get_all_employees()
        shifts = shift_manager.get_all_shifts()

        employees_data = [emp.to_dict() for emp in employees]
        shifts_data = [shift.to_dict() for shift in shifts]

        # Statistiques avec la granularité actuelle
        week_stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK, week)
        slot_stats = shift_manager.get_slot_usage_stats()

        # Données de configuration
        config_data = Config.get_config_data_for_template()

        # Restaurer la granularité originale si elle a été changée
        if granularity and original_granularity != Config.TIME_SLOT_GRANULARITY:
            Config.set_granularity(original_granularity)

        return render_template('planning.html',
                             employees=employees_data,
                             shifts=shifts_data,
                             employee_types=Config.EMPLOYEE_TYPES,
                             days=Config.DAYS_OF_WEEK,
                             hours=Config.get_hours_range(),
                             current_week=week,
                             week_stats=week_stats,
                             slot_stats=slot_stats,
                             config_data=config_data,
                             time_slot_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)

    except Exception as e:
        print(f"Erreur dans la route planning: {e}")
        return render_template('planning.html',
                             employees=[],
                             shifts=[],
                             employee_types=Config.EMPLOYEE_TYPES,
                             days=Config.DAYS_OF_WEEK,
                             hours=Config.get_hours_range(),
                             current_week=week,
                             config_data=Config.get_config_data_for_template(),
                             time_slot_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)


@main_bp.route('/employees')
def employees():
    """Page de gestion des employés"""
    try:
        employees = employee_manager.get_all_employees(actif_only=False)
        employees_data = [emp.to_dict() for emp in employees]

        # Statistiques des employés
        employee_stats = {}
        for emp in employees:
            if emp.actif:
                stats = shift_manager.get_employee_stats(emp.id)
                employee_stats[emp.id] = stats

        return render_template('employees.html',
                             employees=employees_data,
                             employee_types=Config.EMPLOYEE_TYPES,
                             employee_stats=employee_stats,
                             config_data=Config.get_config_data_for_template())

    except Exception as e:
        print(f"Erreur dans la route employees: {e}")
        return render_template('employees.html',
                             employees=[],
                             employee_types=Config.EMPLOYEE_TYPES,
                             employee_stats={},
                             config_data=Config.get_config_data_for_template())


@main_bp.route('/analytics')
def analytics():
    """Page d'analyse et statistiques avancées"""
    try:
        # Statistiques globales
        week_stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK)
        slot_stats = shift_manager.get_slot_usage_stats()

        # Analyse de la granularité
        granularity_analysis = shift_manager.optimize_granularity_for_shifts()

        # Validation des créneaux
        validation_result = shift_manager.validate_all_shifts_granularity()

        # Statistiques par employé
        employees = employee_manager.get_all_employees()
        employee_analytics = []

        for emp in employees:
            if emp.actif:
                emp_stats = shift_manager.get_employee_stats(emp.id)
                employee_analytics.append({
                    'employee': emp.to_dict(),
                    'stats': emp_stats
                })

        return render_template('analytics.html',
                             week_stats=week_stats,
                             slot_stats=slot_stats,
                             granularity_analysis=granularity_analysis,
                             validation_result=validation_result,
                             employee_analytics=employee_analytics,
                             config_data=Config.get_config_data_for_template(),
                             available_granularities=Config.AVAILABLE_GRANULARITIES)

    except Exception as e:
        print(f"Erreur dans la route analytics: {e}")
        return render_template('analytics.html',
                             week_stats={},
                             slot_stats={},
                             granularity_analysis={},
                             validation_result={},
                             employee_analytics=[],
                             config_data=Config.get_config_data_for_template(),
                             available_granularities=Config.AVAILABLE_GRANULARITIES)


@main_bp.route('/settings')
def settings():
    """Page de configuration avec gestion granularité"""
    try:
        # Informations sur la configuration actuelle
        hours_info = Config.get_formatted_hours_info()
        granularity_info = Config.get_granularity_info()

        # Statistiques d'utilisation
        slot_stats = shift_manager.get_slot_usage_stats()

        # Analyse des créneaux pour recommandations
        granularity_analysis = shift_manager.optimize_granularity_for_shifts()

        # Validation des créneaux
        validation_result = shift_manager.validate_all_shifts_granularity()

        return render_template('settings.html',
                             hours_info=hours_info,
                             granularity_info=granularity_info,
                             slot_stats=slot_stats,
                             granularity_analysis=granularity_analysis,
                             validation_result=validation_result,
                             config_data=Config.get_config_data_for_template(),
                             available_granularities=Config.AVAILABLE_GRANULARITIES,
                             restaurant_configs=get_restaurant_configs_info())

    except Exception as e:
        print(f"Erreur dans la route settings: {e}")
        return render_template('settings.html',
                             hours_info={},
                             granularity_info={},
                             slot_stats={},
                             granularity_analysis={},
                             validation_result={},
                             config_data=Config.get_config_data_for_template(),
                             available_granularities=Config.AVAILABLE_GRANULARITIES)


@main_bp.route('/demo')
def demo():
    """Page de démonstration des différentes granularités"""
    try:
        demo_granularities = [15, 30, 60]
        demo_data = {}

        original_granularity = Config.TIME_SLOT_GRANULARITY

        for granularity in demo_granularities:
            Config.set_granularity(granularity)

            demo_data[granularity] = {
                'granularity_info': Config.get_granularity_info(),
                'time_slots': Config.get_all_time_slots()[:24],  # Limiter pour la démo
                'config_data': Config.get_config_data_for_template()
            }

        # Restaurer la granularité originale
        Config.set_granularity(original_granularity)

        return render_template('demo.html',
                             demo_data=demo_data,
                             current_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)

    except Exception as e:
        print(f"Erreur dans la route demo: {e}")
        return render_template('demo.html',
                             demo_data={},
                             current_granularity=Config.TIME_SLOT_GRANULARITY,
                             available_granularities=Config.AVAILABLE_GRANULARITIES)


# ==================== ROUTES UTILITAIRES ====================

@main_bp.route('/test-granularity/<int:granularity>')
def test_granularity(granularity):
    """Route de test pour tester une granularité"""
    try:
        if granularity not in Config.AVAILABLE_GRANULARITIES:
            return f"Granularité {granularity} non supportée", 400

        # Sauvegarder la granularité actuelle
        original_granularity = Config.TIME_SLOT_GRANULARITY

        # Changer temporairement
        Config.set_granularity(granularity)

        # Générer les données de test
        test_data = {
            'granularity': granularity,
            'granularity_info': Config.get_granularity_info(),
            'time_slots': Config.get_all_time_slots(),
            'config_data': Config.get_config_data_for_template()
        }

        # Restaurer la granularité
        Config.set_granularity(original_granularity)

        return jsonify({
            'success': True,
            'test_data': test_data,
            'original_granularity': original_granularity
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@main_bp.route('/migrate-granularity', methods=['POST'])
def migrate_granularity():
    """Route pour migrer les créneaux vers une nouvelle granularité"""
    try:
        data = request.get_json()
        new_granularity = int(data.get('granularity'))

        success, message = shift_manager.migrate_shifts_to_granularity(new_granularity)

        if success:
            return jsonify({
                'success': True,
                'message': message,
                'new_granularity': Config.TIME_SLOT_GRANULARITY
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@main_bp.route('/fix-invalid-shifts', methods=['POST'])
def fix_invalid_shifts():
    """Route pour corriger les créneaux invalides"""
    try:
        success, message = shift_manager.fix_invalid_shifts()

        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== FONCTIONS HELPER ====================

def get_restaurant_configs_info():
    """Retourne les informations sur les configurations prédéfinies"""
    from config import RestaurantConfigs
    configs = {}

    for attr_name in dir(RestaurantConfigs):
        if not attr_name.startswith('_'):
            config_data = getattr(RestaurantConfigs, attr_name)
            if isinstance(config_data, dict):
                configs[attr_name] = config_data

    return configs


# ==================== CONTEXTE GLOBAL ====================

@main_bp.context_processor
def inject_config():
    """Injecte la configuration dans tous les templates"""
    try:
        return {
            'config': Config,
            'employee_types': Config.EMPLOYEE_TYPES,
            'days_of_week': Config.DAYS_OF_WEEK,
            'hours_range': Config.get_hours_range(),
            'time_slot_granularity': Config.TIME_SLOT_GRANULARITY,
            'available_granularities': Config.AVAILABLE_GRANULARITIES,
            'granularity_info': Config.get_granularity_info(),
            'config_data': Config.get_config_data_for_template()
        }
    except Exception as e:
        print(f"Erreur lors de l'injection de la configuration: {e}")
        return {
            'config': Config,
            'employee_types': Config.EMPLOYEE_TYPES,
            'days_of_week': Config.DAYS_OF_WEEK,
            'hours_range': [],
            'time_slot_granularity': 60,
            'available_granularities': {60: '1 heure'},
            'granularity_info': {},
            'config_data': {}
        }


# ==================== GESTION D'ERREURS ====================

@main_bp.errorhandler(404)
def not_found_error(error):
    """Gestion des erreurs 404"""
    return render_template('errors/404.html'), 404


@main_bp.errorhandler(500)
def internal_error(error):
    """Gestion des erreurs 500"""
    return render_template('errors/500.html'), 500


@main_bp.errorhandler(403)
def forbidden_error(error):
    """Gestion des erreurs 403"""
    return render_template('errors/403.html'), 403


# ==================== ROUTES DE DEBUG (À SUPPRIMER EN PRODUCTION) ====================

@main_bp.route('/debug/config')
def debug_config():
    """Route de debug pour afficher la configuration actuelle"""
    try:
        debug_info = {
            'current_granularity': Config.TIME_SLOT_GRANULARITY,
            'available_granularities': Config.AVAILABLE_GRANULARITIES,
            'hours_range': Config.get_hours_range(),
            'granularity_info': Config.get_granularity_info(),
            'all_time_slots_count': len(Config.get_all_time_slots()),
            'restaurant_hours': {
                'opening': Config.RESTAURANT_OPENING_HOUR,
                'closing': Config.RESTAURANT_CLOSING_HOUR
            },
            'shifts_count': len(shift_manager.get_all_shifts()),
            'employees_count': len(employee_manager.get_all_employees())
        }

        return jsonify(debug_info)

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@main_bp.route('/debug/slots')
def debug_slots():
    """Route de debug pour afficher tous les créneaux temporels"""
    try:
        all_slots = Config.get_all_time_slots()

        return jsonify({
            'granularity': Config.TIME_SLOT_GRANULARITY,
            'total_slots': len(all_slots),
            'slots': all_slots[:50],  # Limiter l'affichage
            'granularity_info': Config.get_granularity_info()
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@main_bp.route('/debug/validation')
def debug_validation():
    """Route de debug pour valider tous les créneaux"""
    try:
        validation_result = shift_manager.validate_all_shifts_granularity()

        return jsonify(validation_result)

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500