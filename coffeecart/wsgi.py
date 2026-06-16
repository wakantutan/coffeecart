"""
WSGI config for coffeecart project.
Uses WhiteNoise to serve static files in production.
"""

import os
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coffeecart.settings')

application = get_wsgi_application()

# Wrap with WhiteNoise for static file serving
BASE_DIR = Path(__file__).resolve().parent.parent
application = WhiteNoise(application, root=str(BASE_DIR / 'staticfiles'))
