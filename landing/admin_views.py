"""
Admin dashboard views for Froyo Diaries.
All views require staff login.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.db.models import Count, Q
from django.utils import timezone
import datetime
import csv

from .models import Booking, BookingMessage
from .emails import (
    send_customer_status_update,
    send_custom_message,
)


# ── Login / Logout ────────────────────────────────────────────

def admin_login(request):
    if request.user.is_authenticated:
        return redirect('landing:dashboard')

    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        user = authenticate(request, username=username, password=password)
        if user is not None and (user.is_staff or user.is_superuser):
            login(request, user)
            return redirect('landing:dashboard')
        else:
            error = 'Invalid credentials or insufficient permissions.'

    return render(request, 'landing/admin/login.html', {'error': error})


def admin_logout(request):
    logout(request)
    return redirect('landing:admin_login')


# ── Dashboard ─────────────────────────────────────────────────

@login_required(login_url='/admin-login/')
def dashboard(request):
    now   = timezone.now()
    today = now.date()
    week_end = today + datetime.timedelta(days=7)

    total      = Booking.objects.count()
    new_count  = Booking.objects.filter(status='new').count()
    confirmed  = Booking.objects.filter(status='confirmed').count()
    cancelled  = Booking.objects.filter(status='cancelled').count()
    completed  = Booking.objects.filter(status='completed').count()

    upcoming = Booking.objects.filter(
        event_date__gte=today,
        event_date__lte=week_end,
    ).exclude(status='cancelled').order_by('event_date')[:5]

    recent = Booking.objects.order_by('-created_at')[:5]

    # Package breakdown
    pkg_stats = Booking.objects.values('pkg_name').annotate(count=Count('id')).order_by('-count')[:5]

    # Monthly stats
    this_month_bookings = Booking.objects.filter(
        created_at__year=today.year,
        created_at__month=today.month,
    ).count()
    pending_payment = Booking.objects.filter(
        status__in=['new', 'reviewed'],
        payment_received=False,
    ).count()
    next_event = Booking.objects.filter(
        event_date__gte=today,
    ).exclude(status='cancelled').order_by('event_date').first()

    context = {
        'total': total,
        'new_count': new_count,
        'confirmed': confirmed,
        'cancelled': cancelled,
        'completed': completed,
        'upcoming': upcoming,
        'recent': recent,
        'pkg_stats': pkg_stats,
        'today': today,
        'this_month_bookings': this_month_bookings,
        'pending_payment': pending_payment,
        'next_event': next_event,
    }
    return render(request, 'landing/admin/dashboard.html', context)


# ── Bookings list ─────────────────────────────────────────────

@login_required(login_url='/admin-login/')
def bookings_list(request):
    qs = Booking.objects.all()

    # Filters
    status    = request.GET.get('status', '')
    pkg_type  = request.GET.get('pkg_type', '')
    search    = request.GET.get('q', '').strip()
    date_from = request.GET.get('date_from', '')
    date_to   = request.GET.get('date_to', '')

    if status:
        qs = qs.filter(status=status)
    if pkg_type:
        qs = qs.filter(pkg_type=pkg_type)
    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(email__icontains=search) |
            Q(reference__icontains=search)
        )
    if date_from:
        try:
            qs = qs.filter(event_date__gte=datetime.date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            qs = qs.filter(event_date__lte=datetime.date.fromisoformat(date_to))
        except ValueError:
            pass

    context = {
        'bookings': qs,
        'status_filter': status,
        'pkg_type_filter': pkg_type,
        'search': search,
        'date_from': date_from,
        'date_to': date_to,
        'status_choices': Booking.STATUS_CHOICES,
        'total_filtered': qs.count(),
    }
    return render(request, 'landing/admin/bookings.html', context)


# ── Booking detail / edit ─────────────────────────────────────

@login_required(login_url='/admin-login/')
def booking_detail(request, pk):
    booking = get_object_or_404(Booking, pk=pk)
    booking_messages = booking.messages.all()

    if request.method == 'POST':
        action = request.POST.get('action', '')

        if action == 'update':
            # Update booking details
            booking.name       = request.POST.get('name', booking.name).strip()
            booking.email      = request.POST.get('email', booking.email).strip()
            booking.phone      = request.POST.get('phone', booking.phone).strip()
            booking.event_type = request.POST.get('event_type', booking.event_type).strip()
            booking.pkg_name   = request.POST.get('pkg_name', booking.pkg_name).strip()
            booking.pkg_price  = request.POST.get('pkg_price', booking.pkg_price).strip()
            booking.pkg_type   = request.POST.get('pkg_type', booking.pkg_type).strip()
            booking.sauces     = request.POST.get('sauces', booking.sauces).strip()
            booking.crunches   = request.POST.get('crunches', booking.crunches).strip()
            booking.fruits     = request.POST.get('fruits', booking.fruits).strip()
            booking.admin_notes = request.POST.get('admin_notes', booking.admin_notes).strip()
            booking.notes      = request.POST.get('notes', booking.notes).strip()

            # Event date
            event_date_str = request.POST.get('event_date', '').strip()
            if event_date_str:
                try:
                    booking.event_date = datetime.date.fromisoformat(event_date_str)
                except ValueError:
                    pass
            else:
                booking.event_date = None

            # Event time and setup time
            import datetime as dt
            event_time_str = request.POST.get('event_time', '').strip()
            setup_time_str = request.POST.get('setup_time', '').strip()
            if event_time_str:
                try:
                    booking.event_time = dt.time.fromisoformat(event_time_str)
                except ValueError:
                    pass
            else:
                booking.event_time = None
            if setup_time_str:
                try:
                    booking.setup_time = dt.time.fromisoformat(setup_time_str)
                except ValueError:
                    pass
            else:
                booking.setup_time = None

            old_status = booking.status
            new_status = request.POST.get('status', booking.status)

            if new_status == 'cancelled':
                booking.cancel_reason = request.POST.get('cancel_reason', '').strip()

            # Payment tracking fields
            booking.payment_received = request.POST.get('payment_received') == '1'
            booking.payment_notes    = request.POST.get('payment_notes', booking.payment_notes).strip()

            booking.status = new_status
            booking.save()

            # Send email if status changed
            if new_status != old_status and new_status in ('confirmed', 'cancelled', 'reviewed', 'completed'):
                send_customer_status_update(booking)

            messages.success(request, f'Booking {booking.reference} updated successfully.')
            return redirect('landing:booking_detail', pk=pk)

        elif action == 'send_message':
            subject = request.POST.get('msg_subject', '').strip()
            body    = request.POST.get('msg_body', '').strip()
            if subject and body:
                BookingMessage.objects.create(booking=booking, subject=subject, body=body)
                send_custom_message(booking, subject, body)
                messages.success(request, f'Message sent to {booking.email}.')
            else:
                messages.error(request, 'Subject and message body are required.')
            return redirect('landing:booking_detail', pk=pk)

    context = {
        'booking': booking,
        'booking_messages': booking_messages,
        'status_choices': Booking.STATUS_CHOICES,
        'duplicate_warning': booking.has_duplicate_date,
    }
    return render(request, 'landing/admin/booking_detail.html', context)


# ── Calendar view ─────────────────────────────────────────────

@login_required(login_url='/admin-login/')
def calendar_view(request):
    today = timezone.now().date()
    year  = int(request.GET.get('year',  today.year))
    month = int(request.GET.get('month', today.month))

    # Build calendar grid
    import calendar
    cal = calendar.monthcalendar(year, month)
    month_name = calendar.month_name[month]

    # Get all bookings for this month
    bookings_this_month = Booking.objects.filter(
        event_date__year=year,
        event_date__month=month,
    ).exclude(status='cancelled')

    # Map day → list of bookings
    day_map = {}
    for b in bookings_this_month:
        d = b.event_date.day
        day_map.setdefault(d, []).append(b)

    # Prev / next month navigation
    if month == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month - 1

    if month == 12:
        next_year, next_month = year + 1, 1
    else:
        next_year, next_month = year, month + 1

    context = {
        'cal': cal,
        'month_name': month_name,
        'year': year,
        'month': month,
        'day_map': day_map,
        'today': today,
        'prev_year': prev_year,  'prev_month': prev_month,
        'next_year': next_year,  'next_month': next_month,
    }
    return render(request, 'landing/admin/calendar.html', context)


# ── CSV export ────────────────────────────────────────────────

@login_required(login_url='/admin-login/')
def export_csv(request):
    qs = Booking.objects.all()

    status   = request.GET.get('status', '')
    pkg_type = request.GET.get('pkg_type', '')
    if status:
        qs = qs.filter(status=status)
    if pkg_type:
        qs = qs.filter(pkg_type=pkg_type)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="froyo_diaries_bookings.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Reference', 'Status', 'Name', 'Email', 'Phone',
        'Package', 'Price', 'Type', 'Event Type', 'Event Date',
        'Event Time', 'Setup Time', 'Venue',
        'Sauces', 'Crunches', 'Fruits', 'Notes', 'Admin Notes', 'Submitted At',
    ])

    for b in qs:
        writer.writerow([
            b.reference, b.get_status_display(), b.name, b.email, b.phone,
            b.pkg_name, b.pkg_price, b.get_pkg_type_display(),
            b.event_type, b.event_date or '',
            b.event_time.strftime('%I:%M %p') if b.event_time else '',
            b.setup_time.strftime('%I:%M %p') if b.setup_time else '',
            b.venue or '',
            b.sauces, b.crunches, b.fruits,
            b.notes, b.admin_notes,
            b.created_at.strftime('%Y-%m-%d %H:%M'),
        ])

    return response


# ── Reviews management ────────────────────────────────────────

@login_required(login_url='/admin-login/')
def reviews_list(request):
    from .models import Review
    status = request.GET.get('status', '')
    qs = Review.objects.all()
    if status:
        qs = qs.filter(status=status)

    if request.method == 'POST':
        review_id = request.POST.get('review_id')
        action    = request.POST.get('action')
        try:
            review = Review.objects.get(pk=review_id)
            if action == 'approve':
                review.status = 'approved'
                review.save()
                messages.success(request, f'Review by {review.name} approved.')
            elif action == 'reject':
                review.status = 'rejected'
                review.save()
                messages.success(request, f'Review by {review.name} rejected.')
            elif action == 'delete':
                review.delete()
                messages.success(request, 'Review deleted.')
        except Review.DoesNotExist:
            messages.error(request, 'Review not found.')
        return redirect('landing:reviews_list')

    context = {
        'reviews': qs,
        'status_filter': status,
        'pending_count': Review.objects.filter(status='pending').count(),
    }
    return render(request, 'landing/admin/reviews.html', context)


# ── Quick status change (from bookings list) ──────────────────

@login_required(login_url='/admin-login/')
def quick_status(request):
    from .models import Notification
    if request.method == 'POST':
        pk         = request.POST.get('pk')
        new_status = request.POST.get('status')
        next_url   = request.POST.get('next', '/dashboard/bookings/')
        try:
            booking = Booking.objects.get(pk=pk)
            old_status = booking.status
            if new_status in dict(Booking.STATUS_CHOICES):
                booking.status = new_status
                booking.save()
                # Send email if meaningful status change
                if new_status in ('confirmed', 'cancelled', 'reviewed', 'completed'):
                    send_customer_status_update(booking)
                # Create notification
                Notification.objects.create(
                    type    = 'status',
                    title   = f'Booking {booking.reference} → {booking.get_status_display()}',
                    message = f'{booking.name}\'s booking status changed from {old_status} to {new_status}.',
                    link    = f'/dashboard/bookings/{booking.pk}/',
                )
                messages.success(request, f'{booking.reference} status updated to {booking.get_status_display()}.')
        except Booking.DoesNotExist:
            messages.error(request, 'Booking not found.')
    return redirect(request.POST.get('next', '/dashboard/bookings/'))


# ── Block out dates ───────────────────────────────────────────

@login_required(login_url='/admin-login/')
def blocked_dates(request):
    from .models import BlockedDate
    import datetime

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'block':
            date_str = request.POST.get('date', '').strip()
            reason   = request.POST.get('reason', '').strip()
            if date_str:
                try:
                    date = datetime.date.fromisoformat(date_str)
                    BlockedDate.objects.get_or_create(date=date, defaults={'reason': reason})
                    messages.success(request, f'{date.strftime("%B %d, %Y")} has been blocked.')
                except ValueError:
                    messages.error(request, 'Invalid date format.')

        elif action == 'unblock':
            date_id = request.POST.get('date_id')
            try:
                bd = BlockedDate.objects.get(pk=date_id)
                date_str = bd.date.strftime('%B %d, %Y')
                bd.delete()
                messages.success(request, f'{date_str} has been unblocked.')
            except BlockedDate.DoesNotExist:
                messages.error(request, 'Blocked date not found.')

        return redirect('landing:blocked_dates')

    # Get upcoming blocked dates
    today = datetime.date.today()
    upcoming_blocked = BlockedDate.objects.filter(date__gte=today)
    past_blocked     = BlockedDate.objects.filter(date__lt=today)

    context = {
        'upcoming_blocked': upcoming_blocked,
        'past_blocked':     past_blocked,
        'today':            today,
    }
    return render(request, 'landing/admin/blocked_dates.html', context)


# ── Notifications ─────────────────────────────────────────────

@login_required(login_url='/admin-login/')
def notifications_list(request):
    from .models import Notification

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'mark_all_read':
            Notification.objects.filter(is_read=False).update(is_read=True)
            messages.success(request, 'All notifications marked as read.')
        elif action == 'mark_read':
            nid = request.POST.get('notification_id')
            Notification.objects.filter(pk=nid).update(is_read=True)
        return redirect('landing:notifications_list')

    notifications = Notification.objects.all()[:50]
    unread_count  = Notification.objects.filter(is_read=False).count()

    context = {
        'notifications': notifications,
        'unread_count':  unread_count,
    }
    return render(request, 'landing/admin/notifications.html', context)


def notifications_count_api(request):
    """API endpoint — returns unread notification count as JSON."""
    from django.http import JsonResponse
    from .models import Notification
    if not request.user.is_authenticated:
        return JsonResponse({'count': 0})
    count = Notification.objects.filter(is_read=False).count()
    return JsonResponse({'count': count})


# ── Account Settings ──────────────────────────────────────────

@login_required(login_url='/admin-login/')
def account_settings(request):
    user = request.user
    errors = {}
    success = None

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'change_username':
            new_username = request.POST.get('new_username', '').strip()
            if not new_username:
                errors['username'] = 'Username cannot be empty.'
            elif new_username == user.username:
                errors['username'] = 'That is already your current username.'
            else:
                from django.contrib.auth.models import User
                if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                    errors['username'] = 'That username is already taken.'
                else:
                    user.username = new_username
                    user.save()
                    success = 'username'
                    messages.success(request, 'Username updated successfully.')

        elif action == 'change_password':
            from django.contrib.auth import update_session_auth_hash
            current   = request.POST.get('current_password', '')
            new_pass  = request.POST.get('new_password', '').strip()
            confirm   = request.POST.get('confirm_password', '').strip()

            if not user.check_password(current):
                errors['password'] = 'Current password is incorrect.'
            elif len(new_pass) < 8:
                errors['password'] = 'New password must be at least 8 characters.'
            elif new_pass != confirm:
                errors['password'] = 'New passwords do not match.'
            else:
                user.set_password(new_pass)
                user.save()
                update_session_auth_hash(request, user)  # keep user logged in
                success = 'password'
                messages.success(request, 'Password updated successfully.')

    return render(request, 'landing/admin/account_settings.html', {
        'errors': errors,
        'success': success,
    })
