"""
Booking model for Froyo Diaries.
Stores all customer booking requests submitted via the website.
"""

from django.db import models
from django.utils import timezone
import datetime


def generate_reference():
    """Generate a unique reference number like FD-2026-001"""
    year = timezone.now().year
    prefix = f"FD-{year}-"
    last = Booking.objects.filter(reference__startswith=prefix).order_by('-reference').first()
    if last:
        try:
            num = int(last.reference.split('-')[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"{prefix}{str(num).zfill(3)}"


class Booking(models.Model):
    STATUS_CHOICES = [
        ('new',       'New'),
        ('reviewed',  'Reviewed'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PKG_TYPE_CHOICES = [
        ('froyo',   'Frozen Yogurt & Soft Serve'),
        ('taiyaki', 'Koi Taiyaki'),
    ]

    # Reference
    reference    = models.CharField(max_length=20, unique=True, blank=True)

    # Customer info
    name         = models.CharField(max_length=200)
    email        = models.EmailField()
    phone        = models.CharField(max_length=30, blank=True)

    # Event info
    event_type   = models.CharField(max_length=100, blank=True)
    event_date   = models.DateField(null=True, blank=True)
    event_time   = models.TimeField(null=True, blank=True,
                                    help_text="What time the event starts")
    setup_time   = models.TimeField(null=True, blank=True,
                                    help_text="What time we need to arrive for setup")
    venue        = models.TextField(blank=True, help_text="Full venue address")
    venue_lat    = models.CharField(max_length=30, blank=True)
    venue_lng    = models.CharField(max_length=30, blank=True)
    notes        = models.TextField(blank=True)

    # Package info
    pkg_type     = models.CharField(max_length=20, choices=PKG_TYPE_CHOICES, default='froyo')
    pkg_name     = models.CharField(max_length=100)
    pkg_price    = models.CharField(max_length=30)

    # Froyo customization (stored as comma-separated)
    sauces       = models.CharField(max_length=500, blank=True)
    crunches     = models.CharField(max_length=500, blank=True)
    fruits       = models.CharField(max_length=500, blank=True)

    # Admin fields
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    admin_notes   = models.TextField(blank=True)
    cancel_reason = models.TextField(blank=True)
    payment_notes = models.TextField(blank=True, help_text="Internal payment tracking notes")
    payment_received = models.BooleanField(default=False, help_text="Has payment been received?")

    # Timestamps
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} — {self.name} ({self.pkg_name})"

    @property
    def status_color(self):
        return {
            'new':       'blue',
            'reviewed':  'amber',
            'confirmed': 'green',
            'completed': 'gray',
            'cancelled': 'red',
        }.get(self.status, 'gray')

    @property
    def has_duplicate_date(self):
        if not self.event_date:
            return False
        return Booking.objects.filter(
            event_date=self.event_date
        ).exclude(pk=self.pk).exclude(status='cancelled').exists()


class BookingMessage(models.Model):
    """Messages sent from admin to customer about a booking."""
    booking    = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='messages')
    subject    = models.CharField(max_length=200)
    body       = models.TextField()
    sent_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Message to {self.booking.name} re {self.booking.reference}"


class Review(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    EVENT_CHOICES = [
        ('Wedding',        'Wedding'),
        ('Birthday Party', 'Birthday Party'),
        ('Debut',          'Debut'),
        ('Corporate Event','Corporate Event'),
        ('School Event',   'School Event'),
        ('Market / Pop-up','Market / Pop-up'),
        ('Other',          'Other'),
    ]

    name       = models.CharField(max_length=150)
    event_type = models.CharField(max_length=100, choices=EVENT_CHOICES, blank=True)
    rating     = models.PositiveSmallIntegerField(default=5)  # 1–5
    body       = models.TextField()
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.rating}★ ({self.get_status_display()})"

    @property
    def initials(self):
        parts = self.name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return self.name[:2].upper()


class BlockedDate(models.Model):
    """Dates blocked by admin — customers cannot book these dates."""
    date   = models.DateField(unique=True)
    reason = models.CharField(max_length=200, blank=True,
                              help_text="e.g. Holiday, Rest day, Already full")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"Blocked: {self.date} — {self.reason or 'No reason'}"


class Notification(models.Model):
    """In-dashboard notifications for admin."""
    TYPE_CHOICES = [
        ('new_booking', 'New Booking'),
        ('new_review',  'New Review'),
        ('status',      'Status Update'),
    ]
    type       = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    link       = models.CharField(max_length=300, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{'Read' if self.is_read else 'Unread'}] {self.title}"
