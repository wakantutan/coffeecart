# ☕ Froyo Diaries — Django Landing Page

A clean, mobile-first landing page for a specialty mobile coffee cart business,
built with Django and a premium editorial aesthetic.

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
Make sure you have **Python 3.10+** installed.

```bash
python --version   # should say Python 3.10 or higher
```

### 2. Create a Virtual Environment

```bash
# Navigate into the project folder
cd coffeecart

# Create virtual environment
python -m venv venv

# Activate it
# On macOS / Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Django

```bash
pip install -r requirements.txt
```

### 4. Run Migrations (sets up the database)

```bash
python manage.py migrate
```

### 5. Start the Development Server

```bash
python manage.py runserver
```

### 6. Open your browser

```
http://127.0.0.1:8000
```

That's it! 🎉

---

## 📁 Project Structure

```
coffeecart/
├── coffeecart/                ← Django project config
│   ├── settings.py            ← App settings (static files, DB, etc.)
│   ├── urls.py                ← Root URL routing
│   └── wsgi.py
│
├── landing/                   ← Our landing page app
│   ├── templates/
│   │   └── landing/
│   │       ├── base.html      ← Shared layout (navbar, footer, scripts)
│   │       └── home.html      ← The main landing page sections
│   │
│   ├── static/
│   │   └── landing/
│   │       ├── css/
│   │       │   └── style.css  ← All styles — edit this for theming
│   │       ├── js/
│   │       │   └── main.js    ← Navbar scroll, mobile menu, AOS init
│   │       └── images/        ← ← PUT YOUR PHOTOS HERE
│   │
│   ├── views.py               ← Page logic + context data
│   └── urls.py                ← Landing app URL patterns
│
├── manage.py
└── requirements.txt
```

---

## ✏️ Customisation Guide

### Change Business Name & Text
Open `landing/views.py` and edit the `context` dictionary in the `home()` function:

```python
context = {
    'business_name': 'Your Business Name',
    'tagline': 'Your tagline here.',
    'about_text': 'Your story...',
    ...
}
```

### Replace Images

All images currently use Unsplash placeholder URLs. To use your own:

1. Place your photos in `landing/static/landing/images/`
2. In `home.html`, replace the `src=` attribute:

```html
<!-- Before (placeholder) -->
<img src="https://images.unsplash.com/..." />

<!-- After (your local image) -->
<img src="{% static 'landing/images/your-photo.jpg' %}" />
```

3. For the **hero background**, edit this line in `style.css`:

```css
--hero-bg: url('/static/landing/images/hero.jpg');
```

### Edit the Menu
In `views.py`, find the `menu` list and add/remove items:

```python
('Your Drink Name', '₱999'),
```

### Change Colors / Fonts
All design tokens live at the top of `style.css` under `:root`:

```css
:root {
  --color-accent: #B5832A;   /* gold — change to your brand color */
  --font-display: 'Cormorant Garamond', ...;
  ...
}
```

### Set Up Contact Form Emails
In `views.py`, find the `contact()` view and uncomment the `send_mail()` block.
Then add your email settings to `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
```

---

## 🛠 Production Checklist

Before deploying to a live server:

- [ ] Set `DEBUG = False` in `settings.py`
- [ ] Set a strong `SECRET_KEY` (use an environment variable)
- [ ] Set `ALLOWED_HOSTS = ['yourdomain.com']`
- [ ] Run `python manage.py collectstatic`
- [ ] Use a proper web server (Gunicorn + Nginx) or a platform like Railway/Render

---

## 📦 Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Backend    | Django 5                    |
| Templating | Django Templates            |
| Fonts      | Google Fonts (Cormorant + DM Sans) |
| Animations | AOS (Animate On Scroll)     |
| Styling    | Vanilla CSS (CSS Variables) |
| JS         | Vanilla JavaScript          |

---

Made with ☕ and care.
