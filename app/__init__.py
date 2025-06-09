# app/__init__.py
"""
Package principal de l'application Planning Restaurant
"""

from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name='default'):
    """Créer et configurer l'application Flask"""
    app = Flask(__name__)

    # Charger la configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # Activer CORS pour les requêtes AJAX
    CORS(app)

    # Enregistrer les blueprints
    from app.routes.main import main_bp
    from app.routes.api import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    return app