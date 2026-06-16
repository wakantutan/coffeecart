from django.urls import path
from . import views
from . import admin_views

app_name = 'landing'

urlpatterns = [
    # Public pages
    path('',               views.home,               name='home'),
    path('contact/',       views.contact,             name='contact'),
    path('submit-review/', views.submit_review,       name='submit_review'),
    path('blocked-dates/', views.blocked_dates_api,   name='blocked_dates_api'),

    # Admin auth
    path('admin-login/',  admin_views.admin_login,  name='admin_login'),
    path('admin-logout/', admin_views.admin_logout, name='admin_logout'),

    # Admin dashboard
    path('dashboard/',                   admin_views.dashboard,           name='dashboard'),
    path('dashboard/bookings/',          admin_views.bookings_list,       name='bookings_list'),
    path('dashboard/bookings/<int:pk>/', admin_views.booking_detail,      name='booking_detail'),
    path('dashboard/calendar/',          admin_views.calendar_view,       name='calendar_view'),
    path('dashboard/export/',            admin_views.export_csv,          name='export_csv'),
    path('dashboard/reviews/',           admin_views.reviews_list,        name='reviews_list'),
    path('dashboard/quick-status/',      admin_views.quick_status,        name='quick_status'),
    path('dashboard/blocked-dates/',     admin_views.blocked_dates,       name='blocked_dates'),
    path('dashboard/notifications/',     admin_views.notifications_list,  name='notifications_list'),
    path('dashboard/notifications/count/', admin_views.notifications_count_api, name='notifications_count'),
    path('dashboard/settings/',            admin_views.account_settings,         name='account_settings'),
]
