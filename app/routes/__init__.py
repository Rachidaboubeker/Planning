# app/routes/__init__.py
"""
Package des routes de l'application
"""

from .main import main_bp
from .api import api_bp

__all__ = ['main_bp', 'api_bp']