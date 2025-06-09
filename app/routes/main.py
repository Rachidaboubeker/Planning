"""
Routes principales de l'application
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
    """Page d'accueil avec le planning"""
    employees = employee_manager.get_all_employees()
    shifts = shift_manager.get_all_shifts()

    # Préparer les données pour le template
    employees_data = [emp.to_dict() for emp in employees]
    shifts_data = [shift.to_dict() for shift in shifts]

    # Statistiques de la semaine
    week_stats = shift_manager.get_weekly_stats(Config.DAYS_OF_WEEK)

    return render_template('index.html',
                         employees=employees_data,
                         shifts=shifts_data,
                         employee_types=Config.EMPLOYEE_TYPES,
                         days=Config.DAYS_OF_WEEK,
                         hours=Config.HOURS_RANGE,
                         stats=week_stats)

@main_bp.route('/planning')
def planning():
    """Page du planning détaillé"""
    week = request.args.get('week', '')  # Format: YYYY-WW

    employees = employee_manager.get_all_employees()
    shifts = shift_manager.get_all_shifts()

    employees_data = [emp.to_dict() for emp in employees]
    shifts_data = [shift.to_dict() for shift in shifts]

    return render_template('planning.html',
                         employees=employees_data,
                         shifts=shifts_data,
                         employee_types=Config.EMPLOYEE_TYPES,
                         days=Config.DAYS_OF_WEEK,
                         hours=Config.HOURS_RANGE,
                         current_week=week)

@main_bp.route('/employees')
def employees():
    """Page de gestion des employés"""
    employees = employee_manager.get_all_employees(actif_only=False)
    employees_data = [emp.to_dict() for emp in employees]

    return render_template('employees.html',
                         employees=employees_data,
                         employee_types=Config.EMPLOYEE_TYPES)

@main_bp.context_processor
def inject_config():
    """Injecte la configuration dans tous les templates"""
    return {
        'config': Config,
        'employee_types': Config.EMPLOYEE_TYPES,
        'days_of_week': Config.DAYS_OF_WEEK,
        'hours_range': Config.HOURS_RANGE
    }