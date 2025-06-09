"""
Configuration de l'application
"""
import os
from datetime import datetime


class Config:
    """Configuration de base"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Dossiers de données
    DATA_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    EMPLOYEES_FILE = os.path.join(DATA_FOLDER, 'employees.json')
    SHIFTS_FILE = os.path.join(DATA_FOLDER, 'shifts.json')

    # Configuration de l'interface
    HOURS_RANGE = list(range(8, 24)) + list(range(0, 3))  # 8h-23h + 0h-2h
    DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

    # Configuration des postes
    EMPLOYEE_TYPES = {
        'cuisinier': {'color': '#74b9ff', 'name': 'Cuisinier'},
        'serveur': {'color': '#00b894', 'name': 'Serveur/se'},
        'barman': {'color': '#fdcb6e', 'name': 'Barman'},
        'manager': {'color': '#a29bfe', 'name': 'Manager'},
        'aide': {'color': '#6c5ce7', 'name': 'Aide de cuisine'},
        'commis': {'color': '#fd79a8', 'name': 'Commis'}
    }

    @staticmethod
    def init_app(app):
        """Initialiser la configuration de l'app"""
        # Créer le dossier data s'il n'existe pas
        if not os.path.exists(Config.DATA_FOLDER):
            os.makedirs(Config.DATA_FOLDER)


class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True


class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}