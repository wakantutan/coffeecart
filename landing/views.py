"""
Views for the landing app.
"""

from django.shortcuts import render, redirect
from django.contrib import messages
from django.utils import timezone
import datetime

from .models import Booking
from .emails import send_customer_confirmation, send_admin_new_booking


def home(request):
    context = {
        'business_name': 'Froyo Diaries',
        'tagline': 'Frozen Yogurt, Waffles & Sweet Things.',
        'about_text': (
            'Froyo Diaries is a mobile dessert cart serving handcrafted frozen yogurt, '
            'creamy sundaes, and freshly made Koi Taiyaki Japanese waffles. '
            'We bring the sweetest experience to weddings, corporate events, markets, '
            'and private parties — every treat made with care and the finest ingredients.'
        ),
        'nav_links': [
            ('About',    '#about'),
            ('Services', '#services'),
            ('Packages', '#packages'),
            ('Menu',     '#menu'),
            ('Gallery',  '#gallery'),
            ('Contact',  '#contact'),
        ],
        'services': [
            {'title': 'Weddings',         'desc': 'Make your big day sweeter with a stunning dessert cart your guests will adore.'},
            {'title': 'Corporate Events', 'desc': 'Treat your team and clients to premium frozen yogurt and waffles at your next event.'},
            {'title': 'Private Parties',  'desc': 'Birthdays, graduations, garden parties — we bring the sweetest experience to you.'},
            {'title': 'Markets & Pop-ups','desc': 'Partnering with local markets and events to share our desserts with the community.'},
        ],
        'menu': [
            {'category': 'Frozen Yogurt', 'items': [
                ('Classic Plain Tart', '₱120'), ('Strawberry Swirl', '₱140'),
                ('Mango Tango', '₱140'), ('Cookies & Cream', '₱150'),
                ('Matcha Green Tea', '₱150'), ('Mixed Berry', '₱140'),
            ]},
            {'category': 'Sundae Creations', 'items': [
                ('Classic Vanilla Sundae', '₱160'), ('Chocolate Fudge Sundae', '₱170'),
                ('Strawberry Fields Sundae', '₱170'), ('Caramel Crunch Sundae', '₱180'),
                ('Build Your Own Sundae', '₱190'),
            ]},
            {'category': 'Koi Taiyaki Waffles', 'items': [
                ('Classic Red Bean', '₱130'), ('Nutella & Banana', '₱150'),
                ('Matcha Custard', '₱150'), ('Ube Cream', '₱150'),
                ('Strawberry Cheesecake', '₱160'),
            ]},
        ],
    }
    from .models import Review
    import statistics
    approved_reviews = list(Review.objects.filter(status='approved'))
    avg_rating = round(statistics.mean([r.rating for r in approved_reviews]), 1) if approved_reviews else 0
    context['reviews'] = approved_reviews
    context['avg_rating'] = avg_rating
    context['review_count'] = len(approved_reviews)
    return render(request, 'landing/home.html', context)


def contact(request):
    """
    Handles booking form submission from the modal.
    Saves to DB, sends emails to customer and admin.
    Returns JSON for the modal's fetch() call.
    """
    from django.http import JsonResponse

    if request.method == 'POST':
        name       = request.POST.get('name', '').strip()
        email      = request.POST.get('email', '').strip()
        event_type = request.POST.get('event_type', '').strip()
        message    = request.POST.get('message', '').strip()
        phone      = request.POST.get('phone', '').strip()
        pkg_name   = request.POST.get('pkg_name', '').strip()
        pkg_price  = request.POST.get('pkg_price', '').strip()
        pkg_type   = request.POST.get('pkg_type', 'froyo').strip()
        sauces     = request.POST.get('sauces', '').strip()
        crunches   = request.POST.get('crunches', '').strip()
        fruits     = request.POST.get('fruits', '').strip()
        notes      = request.POST.get('notes', '').strip()
        event_date_str = request.POST.get('event_date', '').strip()
        event_time_str = request.POST.get('event_time', '').strip()
        setup_time_str = request.POST.get('setup_time', '').strip()
        venue          = request.POST.get('venue',      '').strip()
        venue_lat      = request.POST.get('venue_lat',  '').strip()
        venue_lng      = request.POST.get('venue_lng',  '').strip()

        if not name or not email:
            return JsonResponse({'ok': False, 'error': 'Name and email are required.'})

        # Parse event date
        event_date = None
        if event_date_str:
            try:
                event_date = datetime.date.fromisoformat(event_date_str)
            except ValueError:
                pass

        # ── SERVER-SIDE blocked date check ───────────────────────
        # This is the real enforcement — the JS check can be bypassed
        if event_date:
            from .models import BlockedDate
            blocked = BlockedDate.objects.filter(date=event_date).first()
            if blocked:
                reason = blocked.reason or 'This date is unavailable'
                return JsonResponse({
                    'ok': False,
                    'error': f'Sorry, {event_date.strftime("%B %d, %Y")} is not available: {reason}. Please choose a different date.',
                    'blocked_date': True,
                })

        # Parse event time and setup time
        import datetime as dt
        event_time = None
        setup_time = None
        if event_time_str:
            try:
                event_time = dt.time.fromisoformat(event_time_str)
            except ValueError:
                pass
        if setup_time_str:
            try:
                setup_time = dt.time.fromisoformat(setup_time_str)
            except ValueError:
                pass

        # Parse package info from message if not sent separately
        if not pkg_name and message:
            lines = message.split('\n')
            for line in lines:
                if line.startswith('Package:'):
                    parts = line.replace('Package:', '').strip()
                    if '(' in parts:
                        pkg_name  = parts[:parts.index('(')].strip()
                        pkg_price = parts[parts.index('(')+1:parts.index(')')].strip()
                    else:
                        pkg_name = parts

        # Create booking record
        booking = Booking.objects.create(
            name       = name,
            email      = email,
            phone      = phone,
            event_type = event_type,
            event_date = event_date,
            event_time = event_time,
            setup_time = setup_time,
            venue      = venue,
            venue_lat  = venue_lat,
            venue_lng  = venue_lng,
            pkg_name   = pkg_name or 'Not specified',
            pkg_price  = pkg_price or '',
            pkg_type   = pkg_type,
            sauces     = sauces,
            crunches   = crunches,
            fruits     = fruits,
            notes      = notes or message,
            status     = 'new',
        )

        # Send emails
        send_customer_confirmation(booking)
        send_admin_new_booking(booking)

        # Create dashboard notification
        from .models import Notification
        Notification.objects.create(
            type    = 'new_booking',
            title   = f'New Booking — {booking.reference}',
            message = f'{booking.name} booked {booking.pkg_name} ({booking.pkg_price}). {booking.event_type or "Event"} on {booking.event_date or "TBD"} at {booking.event_time.strftime("%I:%M %p") if booking.event_time else "TBD"}. Venue: {booking.venue or "Not specified"}.',
            link    = f'/dashboard/bookings/{booking.pk}/',
        )

        return JsonResponse({
            'ok': True,
            'reference': booking.reference,
            'name': booking.name,
            'email': booking.email,
        })

    return redirect('landing:home')


def submit_review(request):
    """Handle public review form submission."""
    from django.http import JsonResponse
    from .models import Review

    if request.method == 'POST':
        name       = request.POST.get('name', '').strip()
        event_type = request.POST.get('event_type', '').strip()
        rating     = request.POST.get('rating', '5').strip()
        body       = request.POST.get('body', '').strip()

        if not name or not body:
            return JsonResponse({'ok': False, 'error': 'Name and review are required.'})

        try:
            rating = max(1, min(5, int(rating)))
        except ValueError:
            rating = 5

        review = Review.objects.create(
            name       = name,
            event_type = event_type,
            rating     = rating,
            body       = body,
            status     = 'pending',
        )

        # Create dashboard notification
        from .models import Notification
        Notification.objects.create(
            type    = 'new_review',
            title   = f'New Review from {name}',
            message = f'{name} left a {rating}-star review. Waiting for your approval.',
            link    = '/dashboard/reviews/',
        )

        return JsonResponse({'ok': True})

    return redirect('landing:home')


def blocked_dates_api(request):
    """Returns list of blocked dates as JSON for the booking modal."""
    from django.http import JsonResponse
    from .models import BlockedDate
    import datetime

    today = datetime.date.today()
    blocked = list(
        BlockedDate.objects.filter(date__gte=today).values('date', 'reason')
    )
    # Convert dates to strings
    result = [
        {'date': str(b['date']), 'reason': b['reason'] or 'Unavailable'}
        for b in blocked
    ]
    return JsonResponse({'blocked_dates': result})
