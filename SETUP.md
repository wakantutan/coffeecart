# Froyo Diaries — Setup Guide

## First-time setup (run these commands once)

```bash
# 1. Install all dependencies (including whitenoise)
pip install -r requirements.txt

# 2. Run database migrations
python manage.py makemigrations landing
python manage.py migrate

# 3. Create the admin user (username: admin, password: 1234)
python manage.py setup_admin

# 4. Collect static files (CSS, JS, images)
python manage.py collectstatic --noinput

# 5. Run the development server
python manage.py runserver
```

## Access your website
- **Public website:**    http://127.0.0.1:8000/
- **Admin dashboard:**  http://127.0.0.1:8000/admin-login/
  - Username: `admin`
  - Password: `1234`
  - ⚠️ Change this password before going live!

## Enable real email sending
1. Enable 2-Step Verification on your Google account
2. Go to: myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Open `coffeecart/settings.py` and:
   - Change EMAIL_BACKEND to `django.core.mail.backends.smtp.EmailBackend`
   - Replace `YOUR_GMAIL_APP_PASSWORD_HERE` with your App Password

## Deploying to Railway
1. Push your code to GitHub
2. Go to railway.app and create a new project
3. Connect your GitHub repo
4. Add these environment variables in Railway:
   - DJANGO_DEBUG = False
   - DJANGO_SECRET_KEY = (generate a random key)
   - ALLOWED_HOSTS = yourdomain.railway.app
   - EMAIL_HOST_PASSWORD = (your Gmail App Password)
5. Railway will automatically run migrations and collectstatic

## Dashboard URLs
- `/admin-login/`              — Login
- `/dashboard/`                — Overview
- `/dashboard/bookings/`       — All bookings
- `/dashboard/bookings/<id>/`  — Edit booking
- `/dashboard/calendar/`       — Calendar view
- `/dashboard/export/`         — Download CSV
- `/dashboard/reviews/`        — Manage reviews
