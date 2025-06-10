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

    # ==================== CONFIGURATION HORAIRES ====================
    # Paramètres horaires du restaurant - MODIFIABLES selon vos besoins

    # Heure d'ouverture (format 24h)
    RESTAURANT_OPENING_HOUR = 8

    # Heure de fermeture (format 24h) - peut dépasser 24 pour le service de nuit
    RESTAURANT_CLOSING_HOUR = 23  # 26 = 2h du matin le lendemain

    # Génération automatique de la plage horaire
    @classmethod
    def get_hours_range(cls):
        """Génère la plage d'heures selon les paramètres du restaurant"""
        hours = []

        # Si fermeture après minuit
        if cls.RESTAURANT_CLOSING_HOUR > 24:
            # Heures avant minuit
            for hour in range(cls.RESTAURANT_OPENING_HOUR, 24):
                hours.append(hour)
            # Heures après minuit
            for hour in range(0, cls.RESTAURANT_CLOSING_HOUR - 24):
                hours.append(hour)
        else:
            # Fermeture le même jour
            for hour in range(cls.RESTAURANT_OPENING_HOUR, cls.RESTAURANT_CLOSING_HOUR):
                hours.append(hour)

        return hours

    # Utilisation de la méthode pour définir HOURS_RANGE
    HOURS_RANGE = None  # Sera initialisé dans init_app()

    # ==================== AUTRES CONFIGURATIONS ====================

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

    # Configuration des créneaux
    MIN_SHIFT_DURATION = 1      # Durée minimale d'un créneau (heures)
    MAX_SHIFT_DURATION = 12     # Durée maximale d'un créneau (heures)
    MAX_WEEKLY_HOURS = 35       # Limite hebdomadaire légale (heures)
    MIN_REST_PERIOD = 11        # Repos minimum entre deux services (heures)

    @staticmethod
    def init_app(app):
        """Initialiser la configuration de l'app"""
        # Créer le dossier data s'il n'existe pas
        if not os.path.exists(Config.DATA_FOLDER):
            os.makedirs(Config.DATA_FOLDER)

        # Initialiser la plage horaire
        Config.HOURS_RANGE = Config.get_hours_range()

        # Ajouter la configuration à l'app Flask
        app.config['HOURS_RANGE'] = Config.HOURS_RANGE
        app.config['RESTAURANT_OPENING_HOUR'] = Config.RESTAURANT_OPENING_HOUR
        app.config['RESTAURANT_CLOSING_HOUR'] = Config.RESTAURANT_CLOSING_HOUR

    @classmethod
    def get_formatted_hours_info(cls):
        """Retourne des informations lisibles sur les horaires"""
        if cls.RESTAURANT_CLOSING_HOUR > 24:
            closing_display = f"{cls.RESTAURANT_CLOSING_HOUR - 24:02d}:00 (lendemain)"
        else:
            closing_display = f"{cls.RESTAURANT_CLOSING_HOUR:02d}:00"

        return {
            'opening': f"{cls.RESTAURANT_OPENING_HOUR:02d}:00",
            'closing': closing_display,
            'total_hours': len(cls.get_hours_range()),
            'crosses_midnight': cls.RESTAURANT_CLOSING_HOUR > 24
        }


class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True

    # Exemple : horaires étendus pour le développement
    # RESTAURANT_OPENING_HOUR = 6
    # RESTAURANT_CLOSING_HOUR = 28  # Jusqu'à 4h du matin


class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False

    # Exemple : horaires standard pour la production
    # RESTAURANT_OPENING_HOUR = 8
    # RESTAURANT_CLOSING_HOUR = 24


# Configurations prédéfinies pour différents types de restaurants
class RestaurantConfigs:
    """Configurations prêtes à l'emploi pour différents types de restaurants"""

    CAFE_MORNING = {
        'RESTAURANT_OPENING_HOUR': 6,
        'RESTAURANT_CLOSING_HOUR': 15,
        'description': 'Café du matin (6h-15h)'
    }

    RESTAURANT_CLASSIQUE = {
        'RESTAURANT_OPENING_HOUR': 8,
        'RESTAURANT_CLOSING_HOUR': 23,
        'description': 'Restaurant classique (8h-23h)'
    }

    BAR_NUIT = {
        'RESTAURANT_OPENING_HOUR': 17,
        'RESTAURANT_CLOSING_HOUR': 26,  # 2h du matin
        'description': 'Bar de nuit (17h-2h)'
    }

    RESTAURANT_CONTINU = {
        'RESTAURANT_OPENING_HOUR': 7,
        'RESTAURANT_CLOSING_HOUR': 25,  # 1h du matin
        'description': 'Service continu (7h-1h)'
    }

    FAST_FOOD = {
        'RESTAURANT_OPENING_HOUR': 10,
        'RESTAURANT_CLOSING_HOUR': 22,
        'description': 'Fast-food (10h-22h)'
    }


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


# Utilitaires pour changer la configuration facilement
def apply_restaurant_config(config_name):
    """
    Applique une configuration prédéfinie

    Usage:
    apply_restaurant_config('BAR_NUIT')
    """
    if hasattr(RestaurantConfigs, config_name):
        restaurant_config = getattr(RestaurantConfigs, config_name)
        Config.RESTAURANT_OPENING_HOUR = restaurant_config['RESTAURANT_OPENING_HOUR']
        Config.RESTAURANT_CLOSING_HOUR = restaurant_config['RESTAURANT_CLOSING_HOUR']
        Config.HOURS_RANGE = Config.get_hours_range()
        print(f"Configuration appliquée: {restaurant_config['description']}")
        print(f"Heures: {Config.get_formatted_hours_info()}")
    else:
        print(f"Configuration '{config_name}' introuvable")


def set_custom_hours(opening_hour, closing_hour):
    """
    Définit des horaires personnalisés

    Usage:
    set_custom_hours(9, 25)  # 9h à 1h du matin
    """
    Config.RESTAURANT_OPENING_HOUR = opening_hour
    Config.RESTAURANT_CLOSING_HOUR = closing_hour
    Config.HOURS_RANGE = Config.get_hours_range()
    hours_info = Config.get_formatted_hours_info()
    print(f"Horaires personnalisés appliqués: {hours_info['opening']} - {hours_info['closing']}")
    print(f"Total: {hours_info['total_hours']} heures")


if __name__ == '__main__':
    # Test des configurations
    print("=== CONFIGURATIONS DISPONIBLES ===")

    for attr_name in dir(RestaurantConfigs):
        if not attr_name.startswith('_'):
            config_data = getattr(RestaurantConfigs, attr_name)
            if isinstance(config_data, dict):
                print(f"- {attr_name}: {config_data['description']}")

    print("\n=== CONFIGURATION ACTUELLE ===")
    hours_info = Config.get_formatted_hours_info()
    print(f"Ouverture: {hours_info['opening']}")
    print(f"Fermeture: {hours_info['closing']}")
    print(f"Total heures: {hours_info['total_hours']}")
    print(f"Traverse minuit: {'Oui' if hours_info['crosses_midnight'] else 'Non'}")
    print(f"Plage: {Config.get_hours_range()}")