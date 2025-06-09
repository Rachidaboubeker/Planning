#!/usr/bin/env python3
"""
Point d'entrée de l'application Planning Restaurant
"""

from app import create_app
import os

if __name__ == '__main__':
    app = create_app()

    # Configuration pour le développement
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=True
    )