'use client';

import * as React from 'react';
import { invalidateWorkspaceDataTags } from '@/lib/workspace-data-cache';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Video, 
  MapPin, 
  Users, 
  Clock, 
  Check, 
  X, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { readWorkspaceUiPreference, type WorkspaceUiScope, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { DateInput } from '@/components/ui/date-input';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

// Helper for formatting time (e.g., "10:00 AM")
function formatTime(dateStr: string | Date) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Helper for formatting date (e.g., "Thursday, July 2, 2026")
function formatDateLong(dateStr: string | Date) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// Helper to check if two dates are on the same day
function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetLink?: string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrence?: string | null;
  color: string;
  creatorId: string;
  attendees: string[];
  attendeeStatus?: any | null;
  isGoogleEvent: boolean;
}

export default function CalendarPage() {
  const runtime = useWorkspaceRuntime();
  const router = runtime.router;
  const fetch = runtime.fetch;
  const searchParams = useSearchParams();
  const [viewerEmail, setViewerEmail] = React.useState('');
  const [userRole, setUserRole] = React.useState('');
  const [uiScope, setUiScope] = React.useState<WorkspaceUiScope | null>(null);
  
  // App States
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncingGoogle, setSyncingGoogle] = React.useState(false);
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = React.useState('');
  const [currentView, setCurrentView] = React.useState<'month' | 'week' | 'day' | 'agenda'>('month');
  
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Filters
  const [filters, setFilters] = React.useState({
    meetings: true,
    google: true,
    calls: true,
  });

  // Modal / Drawer States
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  // Form States for creation/edit
  const [formTitle, setFormTitle] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formLocation, setFormLocation] = React.useState('');
  const [formMeetLink, setFormMeetLink] = React.useState('');
  const [formAddMeet, setFormAddMeet] = React.useState(false);
  const [formStartDate, setFormStartDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [formStartTime, setFormStartTime] = React.useState('10:00');
  const [formEndDate, setFormEndDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [formEndTime, setFormEndTime] = React.useState('11:00');
  const [formColor, setFormColor] = React.useState('#3b82f6');
  const [formType, setFormType] = React.useState<'meetings' | 'calls'>('meetings');
  const [formAttendees, setFormAttendees] = React.useState('');
  const [formRecurring, setFormRecurring] = React.useState(false);
  const [formRecurrence, setFormRecurrence] = React.useState('NONE');

  // Conflict state
  const [timeConflictWarning, setTimeConflictWarning] = React.useState<string | null>(null);

  // Load user session
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load user details
      fetch('/api/user')
        .then(res => res.json())
        .then(data => {
          if (data && data.role) {
            setUserRole(data.role.toLowerCase());
            setViewerEmail(data.email);
            setUiScope({ userId: data.id, orgId: data.orgId });
          }
        })
        .catch(e => console.error('Error fetching user info:', e));

      // Fetch integration status to check if Google is connected
      fetch('/api/integrations')
        .then(res => res.json())
        .then(data => {
          const googleConn = data.find((i: any) => i.provider === 'GOOGLE');
          const isConnected = googleConn && googleConn.status === 'CONNECTED';
          setGoogleConnected(isConnected);
          setGoogleAccountEmail(isConnected && typeof googleConn.accountEmail === 'string'
            ? googleConn.accountEmail
            : '');
        })
        .catch(e => console.error('Error fetching integrations status:', e));
    }
  }, [fetch]);

  React.useEffect(() => {
    const saved = readWorkspaceUiPreference(
      uiScope,
      'calendar',
      { view: 'month' as const, filters: { meetings: true, google: true, calls: true } },
      (value): value is { view: 'month' | 'week' | 'day' | 'agenda'; filters: { meetings: boolean; google: boolean; calls: boolean } } => {
        if (!value || typeof value !== 'object') return false;
        const stored = value as { view?: unknown; filters?: Record<string, unknown> };
        return ['month', 'week', 'day', 'agenda'].includes(String(stored.view)) &&
          typeof stored.filters?.meetings === 'boolean' &&
          typeof stored.filters?.google === 'boolean' &&
          typeof stored.filters?.calls === 'boolean';
      },
    );
    setCurrentView(saved.view);
    setFilters(saved.filters);
  }, [uiScope]);

  React.useEffect(() => {
    writeWorkspaceUiPreference(uiScope, 'calendar', { view: currentView, filters });
  }, [uiScope, currentView, filters]);

  // Fetch events
  const loadEvents = React.useCallback(async () => {
    if (!viewerEmail) return;
    setLoading(true);
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Error loading calendar events:', e);
    } finally {
      setLoading(false);
    }
  }, [fetch, viewerEmail]);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle incoming OAuth redirects with google_connected parameter
  React.useEffect(() => {
    const googleConnectedParam = searchParams.get('google_connected');
    if (googleConnectedParam) {
      if (googleConnectedParam === 'true') {
        setGoogleConnected(true);
        invalidateWorkspaceDataTags(['calendar', 'integrations', 'dashboard']);
        loadEvents();
        alert('Google Calendar successfully connected and synchronized!');
      } else if (googleConnectedParam === 'denied') {
        alert('Google Calendar access request was denied.');
      } else {
        const reason = searchParams.get('reason');
        const messages: Record<string, string> = {
          configuration_error: 'Google Calendar OAuth is not configured for this deployment.',
          forbidden: 'Your account could not start Google Calendar authorization.',
          initial_sync_failed: 'Google connected, but the initial calendar synchronization failed. Try Sync Now.',
          permissions_missing: 'Approve both Calendar reading and event management permissions to connect.',
          refresh_token_missing: 'Google did not grant offline access. Remove CrystalOS from your Google account permissions and reconnect.',
          state_mismatch: 'The Calendar connection session could not be verified. Start the connection again.',
          workspace_mismatch: 'Your CrystalOS session changed during authorization. Sign in and reconnect the calendar.',
        };
        alert(messages[reason || ''] || 'Failed to connect Google Calendar.');
      }
      router.replace('/calendar');
    }
  }, [searchParams, loadEvents, router]);

  // Toggle connection to Google Calendar
  const handleGoogleConnect = () => {
    if (googleConnected) {
      // Disconnect
      setSyncingGoogle(true);
      fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      })
      .then(res => res.json())
      .then(() => {
        setGoogleConnected(false);
        setGoogleAccountEmail('');
        loadEvents();
      })
      .catch(err => console.error('Error disconnecting google calendar:', err))
      .finally(() => setSyncingGoogle(false));
    } else {
      if (runtime.isDemo) {
        runtime.demo?.showNotice('Google Calendar connection is simulated in this safe demo.');
        return;
      }
      setSyncingGoogle(true);
      // OAuth starts through a Route Handler and therefore requires a document navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/api/integrations/google/start?returnTo=/calendar');
    }
  };

  // Conflict Checking on frontend
  React.useEffect(() => {
    if (!formStartDate || !formStartTime || !formEndDate || !formEndTime) {
      setTimeConflictWarning(null);
      return;
    }

    const start = new Date(`${formStartDate}T${formStartTime}:00`);
    const end = new Date(`${formEndDate}T${formEndTime}:00`);

    if (start >= end) {
      setTimeConflictWarning('Start time must be before end time');
      return;
    }

    const currentEditingId = selectedEvent?.id;
    const conflictingEvent = events.find(ev => {
      if (ev.id === currentEditingId) return false;
      const evStart = new Date(ev.startTime);
      const evEnd = new Date(ev.endTime);
      return evStart < end && evEnd > start;
    });

    if (conflictingEvent) {
      setTimeConflictWarning(`⚠️ Overlaps with: "${conflictingEvent.title}"`);
    } else {
      setTimeConflictWarning(null);
    }
  }, [formStartDate, formStartTime, formEndDate, formEndTime, events, selectedEvent]);

  // Open creation modal for a specific day
  const handleOpenCreate = (date: Date = currentDate) => {
    const formatted = date.toISOString().split('T')[0];
    setSelectedEvent(null);
    setIsEditing(false);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');
    setFormAddMeet(false);
    setFormMeetLink('');
    setFormStartDate(formatted);
    setFormEndDate(formatted);
    setFormStartTime('10:00');
    setFormEndTime('11:00');
    setFormColor('#3b82f6');
    setFormType('meetings');
    setFormAttendees('');
    setFormRecurring(false);
    setFormRecurrence('NONE');
    setShowEventModal(true);
  };

  // Open Edit Mode
  const handleOpenEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormLocation(event.location || '');
    setFormAddMeet(!!event.meetLink);
    setFormMeetLink(event.meetLink || '');
    
    const startObj = new Date(event.startTime);
    const endObj = new Date(event.endTime);
    
    // Local time formatting for inputs
    const startStr = startObj.getFullYear() + '-' + String(startObj.getMonth() + 1).padStart(2, '0') + '-' + String(startObj.getDate()).padStart(2, '0');
    const endStr = endObj.getFullYear() + '-' + String(endObj.getMonth() + 1).padStart(2, '0') + '-' + String(endObj.getDate()).padStart(2, '0');
    
    const startHourStr = String(startObj.getHours()).padStart(2, '0') + ':' + String(startObj.getMinutes()).padStart(2, '0');
    const endHourStr = String(endObj.getHours()).padStart(2, '0') + ':' + String(endObj.getMinutes()).padStart(2, '0');

    setFormStartDate(startStr);
    setFormEndDate(endStr);
    setFormStartTime(startHourStr);
    setFormEndTime(endHourStr);
    setFormColor(event.color);
    setFormType(event.color === '#a855f7' ? 'calls' : 'meetings');
    setFormAttendees(event.attendees.join(', '));
    setFormRecurring(event.isRecurring);
    setFormRecurrence(event.recurrence || 'NONE');
    
    setShowDetailsModal(false);
    setShowEventModal(true);
  };

  // Submit create/update
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const start = new Date(`${formStartDate}T${formStartTime}:00`);
    const end = new Date(`${formEndDate}T${formEndTime}:00`);

    if (start >= end) {
      alert('Error: End time must be after start time.');
      return;
    }

    const payload = {
      id: selectedEvent?.id,
      title: formTitle,
      description: formDescription,
      location: formLocation,
      meetLink: isEditing && formAddMeet ? formMeetLink : '',
      createGoogleMeet: !isEditing && formAddMeet,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      isRecurring: formRecurring,
      recurrence: formRecurrence,
      color: formType === 'calls' ? '#a855f7' : formColor,
      attendees: formAttendees ? formAttendees.split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
    };

    try {
      const url = '/api/calendar';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEventModal(false);
        loadEvents();
      } else {
        const err = await res.json();
        alert('Failed to save event: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await fetch(`/api/calendar?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setShowDetailsModal(false);
        loadEvents();
      } else {
        alert('Failed to delete event.');
      }
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  // RSVP response
  const handleRSVP = async (eventId: string, rsvpStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING') => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          rsvpStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedEvent(data.event);
        loadEvents();
      }
    } catch (e) {
      console.error('Error submitting RSVP:', e);
    }
  };

  // Filter events by Search + Filters
  const filteredEvents = React.useMemo(() => {
    return events.filter(ev => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(query);
        const matchesDesc = ev.description?.toLowerCase().includes(query) || false;
        const matchesGuests = ev.attendees.some(g => g.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesGuests) return false;
      }

      // 2. Calendar Types checkboxes
      if (ev.isGoogleEvent) {
        return filters.google;
      }
      if (ev.color === '#a855f7') {
        return filters.calls; // Client call purple
      }
      return filters.meetings;
    });
  }, [events, searchQuery, filters]);

  // Navigate Date helper
  const handleNavigate = (direction: 'prev' | 'next') => {
    const nextDate = new Date(currentDate);
    if (currentView === 'month') {
      nextDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      nextDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      nextDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(nextDate);
  };

  // Generate Month Grid Array
  const monthGridData = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Days in current month

    const days = [];

    // Past month overflow days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Future month overflow days (to make a full grid of 42 boxes)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Generate Week Days Array
  const weekDaysData = React.useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Hours array for Grid (8 AM to 8 PM)
  const hoursArray = Array.from({ length: 13 }, (_, i) => i + 8); // [8, 9, 10, ... 20]

  if (loading) return <PageSkeleton variant="calendar" />;

  return (
    <div data-tour="calendar-workspace" className="space-y-6 select-none font-sans text-xs">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-zinc-100" />
            <span>Interactive Calendar Hub</span>
          </h1>
          <p className="text-xs text-zinc-500">Coordinate workspace events and synchronize your own Google Calendar account.</p>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-3">
          <Card className={cn(
            "bg-zinc-950/40 border-zinc-800 p-2 flex items-center gap-3.5 rounded-lg shadow-md",
            googleConnected && "border-emerald-900/40 bg-emerald-950/5"
          )}>
            <div className="flex items-center gap-2">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <div>
                <span className="block font-bold text-[10px] text-white">Google Calendar</span>
                <span className={cn(
                  "text-[9px] font-mono",
                  googleConnected ? "text-emerald-400" : "text-zinc-500"
                )}>
                  {googleConnected ? 'CONNECTED & SYNCED' : 'NOT CONNECTED'}
                </span>
                {googleConnected && googleAccountEmail && (
                  <span className="block max-w-44 truncate text-[9px] text-zinc-500" title={googleAccountEmail}>
                    {googleAccountEmail}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {googleConnected && (
                <Button
                  onClick={async () => {
                    setSyncingGoogle(true);
                    try {
                      const res = await fetch('/api/calendar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'sync' })
                      });
                      if (res.ok) {
                        loadEvents();
                        alert('Google Calendar events synced successfully.');
                      } else {
                        const data = await res.json();
                        alert('Sync failed: ' + (data.message || 'Unknown error'));
                      }
                    } catch (e) {
                      console.error('Error syncing calendar:', e);
                      alert('Error syncing calendar.');
                    } finally {
                      setSyncingGoogle(false);
                    }
                  }}
                  disabled={syncingGoogle}
                  className="h-7 text-[10px] font-semibold border px-3 cursor-pointer transition-all bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                >
                  {syncingGoogle ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                  )}
                  <span>Sync Now</span>
                </Button>
              )}
              <Button
                data-tour="calendar-connect"
                onClick={handleGoogleConnect}
                disabled={syncingGoogle}
                className={cn(
                  "h-7 text-[10px] font-semibold border px-3 cursor-pointer transition-all",
                  googleConnected 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-rose-950/20 hover:border-rose-900/30 hover:text-rose-400"
                    : "bg-white text-zinc-950 hover:bg-zinc-200 border-zinc-200"
                )}
              >
                {syncingGoogle && !googleConnected ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                ) : null}
                {googleConnected ? 'Disconnect' : 'Connect Calendar'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Filter, Search, and Miniature Control Panel */}
        <div className="space-y-6 lg:col-span-1">
          
          <Button
            data-tour="create-event"
            onClick={() => handleOpenCreate()}
            className="w-full h-10 font-bold bg-white text-zinc-950 hover:bg-zinc-250 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer rounded-lg uppercase tracking-wider"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create New Event</span>
          </Button>

          {/* Search bar */}
          <Card className="bg-[#0d0e12] border-zinc-800 p-4">
            <CardHeader className="p-0 pb-3 border-b border-zinc-850">
              <CardTitle className="text-[10px] uppercase tracking-wider text-zinc-400">Search Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="flex items-center gap-2.5 rounded border border-zinc-850 bg-zinc-900/40 pl-3 transition-all focus-within:border-zinc-750 focus-within:bg-zinc-900">
                <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <input
                  type="text"
                  aria-label="Search events"
                  placeholder="Filter title, details, guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-white placeholder-zinc-650 focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendars Checkboxes filters */}
          <Card className="bg-[#0d0e12] border-zinc-800 p-4">
            <CardHeader className="p-0 pb-3 border-b border-zinc-850">
              <CardTitle className="text-[10px] uppercase tracking-wider text-zinc-400">My Calendars</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer group text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.meetings}
                  onChange={() => setFilters(f => ({ ...f, meetings: !f.meetings }))}
                  className="rounded border-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 h-3.5 w-3.5"
                />
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-medium">My Meetings</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.calls}
                  onChange={() => setFilters(f => ({ ...f, calls: !f.calls }))}
                  className="rounded border-zinc-800 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 h-3.5 w-3.5"
                />
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="font-medium">Client Consults</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  disabled={!googleConnected}
                  checked={googleConnected && filters.google}
                  onChange={() => setFilters(f => ({ ...f, google: !f.google }))}
                  className="rounded border-zinc-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                />
                <div className={cn("h-2 w-2 rounded-full bg-emerald-500", !googleConnected && "opacity-30")} />
                <span className={cn("font-medium", !googleConnected && "text-zinc-600")}>Google Calendar Events</span>
              </label>
            </CardContent>
          </Card>

        </div>

        {/* Right Side: Main Calendar Interface */}
        <div className="space-y-4 lg:col-span-3">
          
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0d0e12] border border-zinc-800 p-3 rounded-lg gap-3">
            
            {/* View navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('prev')}
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleNavigate('next')}
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="h-7 px-2.5 text-[10px] font-semibold rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white cursor-pointer"
              >
                Today
              </button>

              <span className="text-sm font-bold text-white ml-2">
                {currentView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {currentView === 'week' && (
                  `Week of ${weekDaysData[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDaysData[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                )}
                {currentView === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {currentView === 'agenda' && 'Upcoming Agenda'}
              </span>
            </div>

            {/* View tabs */}
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-md border border-zinc-850">
              {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wide cursor-pointer transition-all",
                    currentView === view 
                      ? "bg-zinc-800 text-white shadow" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

          </div>

          {/* Calendar Views Grid */}
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg overflow-hidden min-h-[500px] relative shadow-2xl">
            {loading && (
              <div className="absolute inset-0 bg-[#0c0c0e]/80 z-20 flex items-center justify-center">
                <div className="text-zinc-500 text-xs flex items-center gap-2.5">
                  <span className="h-4.5 w-4.5 animate-spin rounded-full border border-t-transparent border-zinc-400" />
                  <span>Retrieving calendar index...</span>
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {currentView === 'month' && (
              <div className="grid grid-cols-7 h-full">
                {/* Days of week header */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="border-b border-r border-zinc-850 bg-zinc-950/60 p-2 text-center font-bold text-zinc-500 uppercase tracking-widest text-[9px]">
                    {d}
                  </div>
                ))}

                {/* Day boxes */}
                {monthGridData.map((cell, idx) => {
                  const dayEvents = filteredEvents.filter(ev => isSameDay(new Date(ev.startTime), cell.date));
                  const isToday = isSameDay(cell.date, new Date());
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenCreate(cell.date)}
                      className={cn(
                        "border-b border-r border-zinc-850 min-h-[90px] p-1.5 transition-all hover:bg-zinc-900/10 cursor-pointer flex flex-col gap-1 relative",
                        !cell.isCurrentMonth && "bg-zinc-950/20 text-zinc-650",
                        isToday && "bg-zinc-900/20 border-zinc-700"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "text-[10px] font-bold p-0.5 rounded-full min-w-5 h-5 flex items-center justify-center",
                          isToday ? "bg-white text-zinc-950" : cell.isCurrentMonth ? "text-zinc-400" : "text-zinc-600"
                        )}>
                          {cell.date.getDate()}
                        </span>
                      </div>

                      {/* Events listed */}
                      <div className="space-y-1 flex-1 overflow-y-auto">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              setShowDetailsModal(true);
                            }}
                            style={{ borderLeftColor: ev.color }}
                            className="text-[9px] font-semibold text-white px-1.5 py-0.5 rounded bg-zinc-900 border-l-2 border-zinc-800 hover:bg-zinc-850 flex items-center justify-between gap-1 overflow-hidden truncate transition-colors"
                          >
                            <span className="truncate">{ev.title}</span>
                            {ev.isGoogleEvent && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-0.5 rounded scale-75 shrink-0">G</span>
                            )}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="block text-[8px] text-zinc-500 text-center font-mono">
                            + {dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WEEK VIEW */}
            {currentView === 'week' && (
              <div className="flex flex-col h-full overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-8 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
                  <div className="p-3 border-r border-zinc-850 text-zinc-500 text-center font-bold text-[9px] uppercase tracking-wider">Time</div>
                  {weekDaysData.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={idx} className={cn(
                        "p-3 border-r border-zinc-850 text-center space-y-0.5",
                        isToday && "bg-zinc-900/30"
                      )}>
                        <span className="block font-bold text-zinc-500 text-[9px] uppercase tracking-widest">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className={cn(
                          "inline-block text-xs font-bold px-1.5 py-0.5 rounded-full",
                          isToday ? "bg-white text-zinc-950" : "text-white"
                        )}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Body hours lines */}
                <div className="flex-1 overflow-y-auto max-h-[600px] min-w-[700px]">
                  {hoursArray.map((hour) => {
                    const hourLabel = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
                    return (
                      <div key={hour} className="grid grid-cols-8 border-b border-zinc-900 min-h-[50px] relative group hover:bg-zinc-950/10">
                        {/* Time Label */}
                        <div className="p-2 border-r border-zinc-850 bg-zinc-950/20 text-zinc-500 font-mono text-[9px] text-right pr-3 flex items-center justify-end">
                          {hourLabel}
                        </div>

                        {/* Columns */}
                        {weekDaysData.map((day, idx) => {
                          const isToday = isSameDay(day, new Date());
                          // Filter events overlapping this specific hour box
                          const cellEvents = filteredEvents.filter(ev => {
                            const evStart = new Date(ev.startTime);
                            const evEnd = new Date(ev.endTime);
                            const cellStart = new Date(day);
                            cellStart.setHours(hour, 0, 0, 0);
                            const cellEnd = new Date(day);
                            cellEnd.setHours(hour + 1, 0, 0, 0);
                            return evStart < cellEnd && evEnd > cellStart;
                          });

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                const clickDate = new Date(day);
                                clickDate.setHours(hour);
                                handleOpenCreate(clickDate);
                              }}
                              className={cn(
                                "border-r border-zinc-900 p-1 relative flex flex-col gap-1 cursor-pointer",
                                isToday && "bg-zinc-900/10"
                              )}
                            >
                              {cellEvents.map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                    setShowDetailsModal(true);
                                  }}
                                  style={{ borderLeftColor: ev.color }}
                                  className="text-[9px] font-semibold text-white p-1 rounded bg-zinc-900 border-l-2 border-zinc-800 hover:bg-zinc-850 truncate flex items-center justify-between gap-1 overflow-hidden"
                                >
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DAY VIEW */}
            {currentView === 'day' && (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-zinc-850 bg-zinc-950/60 font-bold text-zinc-400 text-center uppercase tracking-wider">
                  {formatDateLong(currentDate)}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[600px]">
                  {hoursArray.map((hour) => {
                    const hourLabel = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
                    const dayEvents = filteredEvents.filter(ev => {
                      if (!isSameDay(new Date(ev.startTime), currentDate)) return false;
                      const evStart = new Date(ev.startTime);
                      const evEnd = new Date(ev.endTime);
                      const cellStart = new Date(currentDate);
                      cellStart.setHours(hour, 0, 0, 0);
                      const cellEnd = new Date(currentDate);
                      cellEnd.setHours(hour + 1, 0, 0, 0);
                      return evStart < cellEnd && evEnd > cellStart;
                    });

                    return (
                      <div key={hour} className="grid grid-cols-6 border-b border-zinc-900 min-h-[60px] hover:bg-zinc-950/10">
                        <div className="col-span-1 p-3 border-r border-zinc-850 bg-zinc-950/20 text-zinc-500 font-mono text-[9px] text-right pr-4 flex items-center justify-end">
                          {hourLabel}
                        </div>
                        <div
                          onClick={() => {
                            const clickDate = new Date(currentDate);
                            clickDate.setHours(hour);
                            handleOpenCreate(clickDate);
                          }}
                          className="col-span-5 p-2 flex flex-col gap-1.5 cursor-pointer"
                        >
                          {dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                                setShowDetailsModal(true);
                              }}
                              style={{ borderLeftColor: ev.color }}
                              className="text-[10px] font-semibold text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 border-l-3 hover:bg-zinc-850 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span>{ev.title}</span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ev.meetLink && <Video className="h-3.5 w-3.5 text-zinc-400" />}
                                {ev.isGoogleEvent && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded uppercase tracking-wider">Synced</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA VIEW */}
            {currentView === 'agenda' && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="h-10 w-10 text-zinc-700 mb-3 animate-pulse" />
                    <span className="block font-bold text-zinc-400">No scheduled meetings found</span>
                    <span className="block text-[10px] text-zinc-650 mt-1">Try relaxing filters or sync Google Calendar.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((ev) => {
                      const isGoogle = ev.isGoogleEvent;
                      return (
                        <Card
                          key={ev.id}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setShowDetailsModal(true);
                          }}
                          className={cn(
                            "bg-[#0d0e12] border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer overflow-hidden relative",
                            isGoogle && "border-emerald-950 hover:border-emerald-900"
                          )}
                        >
                          <div
                            style={{ backgroundColor: ev.color }}
                            className="absolute top-0 bottom-0 left-0 w-1"
                          />
                          <CardContent className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{ev.title}</h3>
                                {isGoogle && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-900 text-[8px] scale-90">
                                    Google Calendar
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 line-clamp-1">{ev.description || 'No description provided.'}</p>
                              
                              <div className="flex flex-wrap gap-4 pt-1.5 text-[9px] text-zinc-400 font-mono">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-zinc-500" />
                                  <span>{formatDateLong(ev.startTime)} @ {formatTime(ev.startTime)} - {formatTime(ev.endTime)}</span>
                                </span>
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-zinc-500" />
                                    <span className="max-w-[150px] truncate">{ev.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {ev.meetLink && (
                                <a
                                  href={ev.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-8 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  <span>Join Meet</span>
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* --------------------------------- MODALS --------------------------------- */}

      {/* CREATE / EDIT EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowEventModal(false)}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <CardHeader className="border-b border-zinc-850/80 pb-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                {isEditing ? 'Modify Schedule' : 'Schedule Meeting'}
              </span>
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-white mt-0.5">
                {isEditing ? 'Edit Calendar Event' : 'Create New Event'}
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleSaveEvent}>
              <CardContent className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly Operations Sync"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block">Description (Optional)</label>
                  <textarea
                    placeholder="Event agenda, requirements, etc."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all min-h-16"
                  />
                </div>

                {/* Calendar Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Calendar Category</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        const type = e.target.value as 'meetings' | 'calls';
                        setFormType(type);
                        setFormColor(type === 'calls' ? '#a855f7' : '#3b82f6');
                      }}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-2 text-white focus:border-zinc-750 focus:outline-none transition-all"
                    >
                      <option value="meetings" className="bg-[#0c0c0e]">My Meetings</option>
                      <option value="calls" className="bg-[#0c0c0e]">Client Consults</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Color Highlight</label>
                    <div className="flex items-center gap-2 py-1">
                      {['#3b82f6', '#0f9d58', '#db4437', '#f4b400', '#a855f7'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormColor(c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "h-5 w-5 rounded-full border border-black cursor-pointer transform hover:scale-110 transition-all",
                            formColor === c && "ring-2 ring-white"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date & Time selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Start Date</label>
                    <DateInput
                      required
                      value={formStartDate}
                      onChange={(value) => {
                        setFormStartDate(value);
                        setFormEndDate(value);
                      }}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white focus:border-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Start Time</label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white focus:border-zinc-750 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">End Date</label>
                    <DateInput
                      required
                      value={formEndDate}
                      onChange={(value) => setFormEndDate(value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white focus:border-zinc-750 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">End Time</label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white focus:border-zinc-750 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Conflict Alert indicator */}
                {timeConflictWarning && (
                  <div className="rounded bg-rose-950/20 border border-rose-900/30 p-2 flex items-center gap-2 text-[10px] text-rose-400 font-medium">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{timeConflictWarning}</span>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block">Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Room 3 or Zoom Link"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                  />
                </div>

                {/* Guests */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block">Guests Emails (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. sarah.chen@apex.co, sophie.d@client.co"
                    value={formAttendees}
                    onChange={(e) => setFormAttendees(e.target.value)}
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2 px-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                  />
                </div>

                {/* Recurrence */}
                <div className="grid grid-cols-2 gap-4 items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-400">
                    <input
                      type="checkbox"
                      checked={formRecurring}
                      onChange={(e) => setFormRecurring(e.target.checked)}
                      className="rounded border-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 h-3.5 w-3.5"
                    />
                    <span className="font-semibold">Recurring Event</span>
                  </label>

                  {formRecurring && (
                    <select
                      value={formRecurrence}
                      onChange={(e) => setFormRecurrence(e.target.value)}
                      className="rounded border border-zinc-850 bg-zinc-900/40 py-1.5 px-2 text-white focus:outline-none transition-all"
                    >
                      <option value="DAILY" className="bg-[#0c0c0e]">Daily</option>
                      <option value="WEEKLY" className="bg-[#0c0c0e]">Weekly</option>
                    </select>
                  )}
                </div>

                {/* Meet Link Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer text-zinc-400 pt-1">
                  <input
                    type="checkbox"
                    checked={formAddMeet}
                    onChange={(e) => setFormAddMeet(e.target.checked)}
                    disabled={!googleConnected && !isEditing}
                    className="rounded border-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 h-3.5 w-3.5"
                  />
                  <span className="font-semibold flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-zinc-450" />
                    <span>Add Google Meet video conferencing</span>
                  </span>
                </label>
                {!googleConnected && !isEditing && (
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    Connect Google Calendar to generate a valid Meet link and send calendar invitations.
                  </p>
                )}

              </CardContent>

              <CardContent className="px-5 pb-5 pt-3 border-t border-zinc-850 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 h-9 font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-9 font-bold bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                >
                  Save Event
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* EVENT DETAILS / DETAILS MODAL */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <CardHeader className="border-b border-zinc-850/80 pb-4">
              <div className="flex justify-between items-start gap-4 pr-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-zinc-400">Meeting Details</span>
                    {selectedEvent.isGoogleEvent && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-900 text-[8px] scale-90">
                        Synced
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold uppercase tracking-tight text-white mt-1">
                    {selectedEvent.title}
                  </CardTitle>
                </div>

                {/* Edit / Delete (Only for admins, or creator client) */}
                {(userRole === 'admin' || selectedEvent.creatorId === uiScope?.userId) && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(selectedEvent)}
                      className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-900/30 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-5 py-4 space-y-4">
              
              {/* Date & Time */}
              <div className="flex gap-3 items-start">
                <Clock className="h-4 w-4 text-zinc-500 mt-0.5" />
                <div>
                  <span className="block font-bold text-zinc-300">Time Window</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">
                    {formatDateLong(selectedEvent.startTime)}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                  </span>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex gap-3 items-start">
                  <MapPin className="h-4 w-4 text-zinc-500 mt-0.5" />
                  <div>
                    <span className="block font-bold text-zinc-300">Location</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">{selectedEvent.location}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-1">
                  <span className="block font-bold text-zinc-300">Description</span>
                  <div className="rounded border border-zinc-850 bg-zinc-900/10 p-2.5 text-[10px] text-zinc-400 leading-normal">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              {/* Join Meet Action button */}
              {selectedEvent.meetLink && (
                <a
                  href={selectedEvent.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 rounded bg-[#4285f4] hover:bg-[#357ae8] text-white flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition-all shadow-md"
                >
                  <Video className="h-4.5 w-4.5" />
                  <span>Join with Google Meet</span>
                </a>
              )}

              {/* Guests RSVP status list */}
              <div className="space-y-2 pt-2 border-t border-zinc-850">
                <span className="block font-bold text-zinc-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Guests & RSVP List</span>
                </span>
                
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {selectedEvent.attendees.map((guest) => {
                    const status = selectedEvent.attendeeStatus?.[guest] || 'PENDING';
                    return (
                      <div key={guest} className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-medium truncate max-w-[200px]">{guest}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded font-mono text-[8px] uppercase tracking-wider",
                          status === 'ACCEPTED' && "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400",
                          status === 'DECLINED' && "bg-rose-950/40 border border-rose-900/30 text-rose-400",
                          status === 'PENDING' && "bg-zinc-900 border border-zinc-800 text-zinc-500"
                        )}>
                          {status.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendee RSVP Action buttons */}
              {selectedEvent.attendees.includes(viewerEmail) && (
                <div className="pt-2 border-t border-zinc-850 space-y-2">
                  <span className="block text-[10px] font-bold text-zinc-400">Are you attending this meeting?</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRSVP(selectedEvent.id, 'ACCEPTED')}
                      className={cn(
                        "flex-1 h-8 text-[10px] font-bold cursor-pointer transition-all border",
                        selectedEvent.attendeeStatus?.[viewerEmail] === 'ACCEPTED'
                          ? "bg-emerald-500/10 border-emerald-800 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Yes, Accept
                    </Button>
                    <Button
                      onClick={() => handleRSVP(selectedEvent.id, 'DECLINED')}
                      className={cn(
                        "flex-1 h-8 text-[10px] font-bold cursor-pointer transition-all border",
                        selectedEvent.attendeeStatus?.[viewerEmail] === 'DECLINED'
                          ? "bg-rose-500/10 border-rose-800 text-rose-400 hover:bg-rose-500/20"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      <X className="h-3 w-3 mr-1" />
                      No, Decline
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
