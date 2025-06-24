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

    # ==================== CONFIGURATION GRANULARITÉ TEMPORELLE ====================
    # Granularité des créneaux (en minutes)
    TIME_SLOT_GRANULARITY = 15  # 60 = 1h, 30 = 30min, 15 = 15min

    # Options disponibles pour la granularité
    AVAILABLE_GRANULARITIES = {
        15: "15 minutes",
        30: "30 minutes",
        60: "1 heure"
    }

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

    @classmethod
    def get_time_slots_for_hour(cls, hour):
        """
        Génère les créneaux temporels pour une heure donnée selon la granularité
        Retourne une liste des créneaux (en minutes depuis le début de l'heure)
        """
        slots_per_hour = 60 // cls.TIME_SLOT_GRANULARITY
        return [i * cls.TIME_SLOT_GRANULARITY for i in range(slots_per_hour)]

    @classmethod
    def get_all_time_slots(cls):
        """
        Génère tous les créneaux temporels selon la granularité actuelle
        """
        all_slots = []
        hours_range = cls.get_hours_range()

        for hour in hours_range:
            time_slots = cls.get_time_slots_for_hour(hour)
            for minutes in time_slots:
                all_slots.append({
                    'hour': hour,
                    'minutes': minutes,
                    'key': f"{hour}_{minutes}",
                    'display': cls.format_time_slot(hour, minutes),
                    'is_main_hour': minutes == 0
                })

        return all_slots

    @classmethod
    def format_time_slot(cls, hour, minutes):
        """
        Formate un créneau temporel pour l'affichage
        """
        return f"{hour:02d}:{minutes:02d}"

    @classmethod
    def get_slot_key(cls, hour, minutes):
        """
        Génère une clé unique pour un créneau
        """
        return f"{hour}_{minutes}"

    @classmethod
    def set_granularity(cls, granularity):
        """
        Définit la granularité temporelle
        """
        if granularity in cls.AVAILABLE_GRANULARITIES:
            cls.TIME_SLOT_GRANULARITY = granularity
            return True
        return False

    @classmethod
    def get_granularity_info(cls):
        """
        Retourne des informations sur la granularité actuelle
        """
        slots_per_hour = 60 // cls.TIME_SLOT_GRANULARITY
        total_hours = len(cls.get_hours_range())
        total_slots = total_hours * slots_per_hour

        # Calculer la hauteur de cellule selon la granularité
        if cls.TIME_SLOT_GRANULARITY == 60:
            cell_height = 60
        elif cls.TIME_SLOT_GRANULARITY == 30:
            cell_height = 30
        elif cls.TIME_SLOT_GRANULARITY == 15:
            cell_height = 15
        else:
            cell_height = max(10, 60 // (60 // cls.TIME_SLOT_GRANULARITY))

        return {
            'granularity': cls.TIME_SLOT_GRANULARITY,
            'granularity_label': cls.AVAILABLE_GRANULARITIES[cls.TIME_SLOT_GRANULARITY],
            'slots_per_hour': slots_per_hour,
            'total_slots': total_slots,
            'total_hours': total_hours,
            'cell_height': cell_height
        }

    @classmethod
    def get_config_data_for_template(cls):
        """
        Retourne toutes les données de configuration pour les templates
        """
        return {
            'HOURS_RANGE': cls.get_hours_range(),
            'DAYS_OF_WEEK': cls.DAYS_OF_WEEK,
            'EMPLOYEE_TYPES': cls.EMPLOYEE_TYPES,
            'TIME_SLOT_GRANULARITY': cls.TIME_SLOT_GRANULARITY,
            'AVAILABLE_GRANULARITIES': cls.AVAILABLE_GRANULARITIES,
            'ALL_TIME_SLOTS': cls.get_all_time_slots(),
            'GRANULARITY_INFO': cls.get_granularity_info()
        }

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
        app.config['TIME_SLOT_GRANULARITY'] = Config.TIME_SLOT_GRANULARITY
        app.config['AVAILABLE_GRANULARITIES'] = Config.AVAILABLE_GRANULARITIES

    @classmethod
    def get_formatted_hours_info(cls):
        """Retourne des informations lisibles sur les horaires"""
        if cls.RESTAURANT_CLOSING_HOUR > 24:
            closing_display = f"{cls.RESTAURANT_CLOSING_HOUR - 24:02d}:00 (lendemain)"
        else:
            closing_display = f"{cls.RESTAURANT_CLOSING_HOUR:02d}:00"

        granularity_info = cls.get_granularity_info()

        return {
            'opening': f"{cls.RESTAURANT_OPENING_HOUR:02d}:00",
            'closing': closing_display,
            'total_hours': len(cls.get_hours_range()),
            'crosses_midnight': cls.RESTAURANT_CLOSING_HOUR > 24,
            'granularity': granularity_info
        }


class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True


class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False


# Configurations prédéfinies pour différents types de restaurants
class RestaurantConfigs:
    """Configurations prêtes à l'emploi pour différents types de restaurants"""

    CAFE_MORNING = {
        'RESTAURANT_OPENING_HOUR': 6,
        'RESTAURANT_CLOSING_HOUR': 15,
        'TIME_SLOT_GRANULARITY': 30,  # 30 min pour les cafés
        'description': 'Café du matin (6h-15h, créneaux 30min)'
    }

    RESTAURANT_CLASSIQUE = {
        'RESTAURANT_OPENING_HOUR': 8,
        'RESTAURANT_CLOSING_HOUR': 23,
        'TIME_SLOT_GRANULARITY': 60,  # 1h pour les restaurants classiques
        'description': 'Restaurant classique (8h-23h, créneaux 1h)'
    }

    BAR_NUIT = {
        'RESTAURANT_OPENING_HOUR': 17,
        'RESTAURANT_CLOSING_HOUR': 26,  # 2h du matin
        'TIME_SLOT_GRANULARITY': 60,  # 1h pour les bars
        'description': 'Bar de nuit (17h-2h, créneaux 1h)'
    }

    RESTAURANT_CONTINU = {
        'RESTAURANT_OPENING_HOUR': 7,
        'RESTAURANT_CLOSING_HOUR': 25,  # 1h du matin
        'TIME_SLOT_GRANULARITY': 30,  # 30 min pour service continu
        'description': 'Service continu (7h-1h, créneaux 30min)'
    }

    FAST_FOOD = {
        'RESTAURANT_OPENING_HOUR': 10,
        'RESTAURANT_CLOSING_HOUR': 22,
        'TIME_SLOT_GRANULARITY': 15,  # 15 min pour fast-food
        'description': 'Fast-food (10h-22h, créneaux 15min)'
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
        if 'TIME_SLOT_GRANULARITY' in restaurant_config:
            Config.TIME_SLOT_GRANULARITY = restaurant_config['TIME_SLOT_GRANULARITY']
        Config.HOURS_RANGE = Config.get_hours_range()
        print(f"Configuration appliquée: {restaurant_config['description']}")

        hours_info = Config.get_formatted_hours_info()
        print(f"Heures: {hours_info['opening']} - {hours_info['closing']}")
        print(f"Granularité: {hours_info['granularity']['granularity_label']}")
    else:
        print(f"Configuration '{config_name}' introuvable")


def set_custom_hours(opening_hour, closing_hour, granularity=None):
    """
    Définit des horaires personnalisés

    Usage:
    set_custom_hours(9, 25, 30)  # 9h à 1h du matin, créneaux de 30min
    """
    Config.RESTAURANT_OPENING_HOUR = opening_hour
    Config.RESTAURANT_CLOSING_HOUR = closing_hour
    if granularity and granularity in Config.AVAILABLE_GRANULARITIES:
        Config.TIME_SLOT_GRANULARITY = granularity

    Config.HOURS_RANGE = Config.get_hours_range()
    hours_info = Config.get_formatted_hours_info()
    print(f"Horaires personnalisés appliqués: {hours_info['opening']} - {hours_info['closing']}")
    print(f"Total: {hours_info['total_hours']} heures")
    print(f"Granularité: {hours_info['granularity']['granularity_label']}")
    print(f"Créneaux totaux: {hours_info['granularity']['total_slots']}")


def set_granularity(granularity):
    """
    Change uniquement la granularité temporelle

    Usage:
    set_granularity(15)  # Créneaux de 15 minutes
    """
    if Config.set_granularity(granularity):
        granularity_info = Config.get_granularity_info()
        print(f"Granularité changée vers: {granularity_info['granularity_label']}")
        print(f"Créneaux par heure: {granularity_info['slots_per_hour']}")
        print(f"Créneaux totaux: {granularity_info['total_slots']}")
        return True
    else:
        print(f"Granularité {granularity} non supportée")
        print(f"Granularités disponibles: {list(Config.AVAILABLE_GRANULARITIES.keys())}")
        return False


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
    print(f"Granularité: {hours_info['granularity']['granularity_label']}")
    print(f"Créneaux totaux: {hours_info['granularity']['total_slots']}")

    print("\n=== TEST DES FONCTIONS ===")
    print("Créneaux pour 14h:")
    slots_14h = Config.get_time_slots_for_hour(14)
    for minutes in slots_14h:
        print(f"  - {Config.format_time_slot(14, minutes)}")