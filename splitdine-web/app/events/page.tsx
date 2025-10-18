'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, UserEventMembership } from '@/lib/types';
import {
  createEvent as apiCreateEvent,
  joinEvent as apiJoinEvent,
  getMyEvents as apiGetMyEvents,
  deleteEvent as apiDeleteEvent,
  leaveEvent as apiLeaveEvent,
  getCurrentUser,
} from '@/lib/api-client';
import type { EventListItemProps } from '@/lib/types';

// Event List Item Component
function EventListItem({ event, onOpenEvent, onDeleteEvent, onCopyGuestCode, onShowToast, onShowPaymentDetails, onShowNotesSummary, onShowContactHost, onShowManageGuestName, onLeaveEvent }: EventListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onOpenEvent(event.id)}
          >
            {/* Event name and role badge */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {event.name}
                </h3>
                {event.userRole === 'host' && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Host
                  </span>
                )}
              </div>
              {/* Guest code - subtle and copyable */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyGuestCode(event.guestCode);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-mono"
                title="Click to copy guest code"
              >
                Join code: {event.guestCode}
              </button>
            </div>
          </div>

          {/* Three-dot menu button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0"
              aria-label="More options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onOpenEvent(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Open Event
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onShowPaymentDetails(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Payment Details
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onShowNotesSummary(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Notes Summary
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onShowManageGuestName(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  My Guest Name
                </button>

                {event.userRole === 'guest' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onShowContactHost(event.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Contact Host
                  </button>
                )}

                {event.userRole === 'host' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowShareModal(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Share Details
                    </button>

                    <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDeleteEvent(event.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Delete Bill
                    </button>
                  </>
                )}

                {event.userRole === 'guest' && (
                  <>
                    <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onLeaveEvent(event.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Leave Event
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Share Details
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500 dark:text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Invite guests to</div>
              <div className="text-blue-600 dark:text-blue-400 font-medium mb-3">https://splitdine.co.uk</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">using event code:</div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="font-mono text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-wider">
                  {event.guestCode}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(event.guestCode);
                    onShowToast('Code copied to clipboard');
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded transition-colors text-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyGuestCode(event.guestCode);
              }}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Copy Message (WhatsApp, email, etc.)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function EventsPage() {
  const router = useRouter();

  // Auth state
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; name: string } | null>(null);

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserEventMembership[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Modal states
  const [showStartEventModal, setShowStartEventModal] = useState(false);
  const [showJoinEventModal, setShowJoinEventModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToLeave, setEventToLeave] = useState<string | null>(null);

  // Form states
  const [eventName, setEventName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Refs
  const eventNameRef = useRef<HTMLInputElement>(null);
  const joinCodeRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  // Load events when user is present
  useEffect(() => {
    const loadEvents = async () => {
      if (!currentUser) {
        setIsLoadingEvents(false);
        return;
      }

      try {
        const apiEvents = await apiGetMyEvents();

        // Convert API response to local Event format
        const convertedApiEvents: Event[] = apiEvents.map((apiEvent: import('@/lib/api-client').Event) => ({
          id: apiEvent.id.toString(),
          name: apiEvent.name,
          guestCode: apiEvent.guest_code,
          guests: [],
          createdAt: new Date(apiEvent.created_at).getTime(),
          paymentMethod: apiEvent.payment_method,
          bankAccountNumber: apiEvent.bank_account_number,
          bankSortCode: apiEvent.bank_sort_code,
          bankAccountName: apiEvent.bank_account_name,
          allowGuestNotesEdit: apiEvent.allow_guest_notes_edit,
          hostContactInfo: apiEvent.host_contact_info,
        }));

        const convertedApiMemberships: UserEventMembership[] = apiEvents.map((apiEvent: import('@/lib/api-client').Event) => ({
          eventId: apiEvent.id.toString(),
          role: apiEvent.role as 'host' | 'guest',
          joinedAt: new Date(apiEvent.created_at).getTime(),
        }));

        setEvents(convertedApiEvents);
        setUserMemberships(convertedApiMemberships);
      } catch (error) {
        console.error('Error loading events:', error);
        showToastNotification('Failed to load events');
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadEvents();
  }, [currentUser]);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const createEvent = async () => {
    if (!eventName.trim() || !currentUser) return;

    setIsCreatingEvent(true);
    try {
      const apiEvent = await apiCreateEvent(eventName.trim());

      const newEvent: Event = {
        id: apiEvent.id.toString(),
        name: apiEvent.name,
        guestCode: apiEvent.guest_code,
        guests: [],
        createdAt: new Date(apiEvent.created_at).getTime(),
        paymentMethod: apiEvent.payment_method,
        bankAccountNumber: apiEvent.bank_account_number,
        bankSortCode: apiEvent.bank_sort_code,
        bankAccountName: apiEvent.bank_account_name,
        allowGuestNotesEdit: apiEvent.allow_guest_notes_edit,
        hostContactInfo: apiEvent.host_contact_info,
      };

      const newMembership: UserEventMembership = {
        eventId: newEvent.id,
        role: 'host',
        joinedAt: Date.now(),
      };

      setEvents([...events, newEvent]);
      setUserMemberships([...userMemberships, newMembership]);
      setShowStartEventModal(false);
      setEventName('');

      // Navigate to the new event
      router.push(`/events/${newEvent.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      showToastNotification('Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const joinEvent = async () => {
    if (!joinCode.trim() || !currentUser) return;

    try {
      const response = await apiJoinEvent(joinCode.trim());

      if (response.success && response.event) {
        const joinedEvent: Event = {
          id: response.event.id.toString(),
          name: response.event.name,
          guestCode: response.event.guest_code,
          guests: [],
          createdAt: new Date(response.event.created_at).getTime(),
          paymentMethod: response.event.payment_method,
          bankAccountNumber: response.event.bank_account_number,
          bankSortCode: response.event.bank_sort_code,
          bankAccountName: response.event.bank_account_name,
          allowGuestNotesEdit: response.event.allow_guest_notes_edit,
          hostContactInfo: response.event.host_contact_info,
        };

        const newMembership: UserEventMembership = {
          eventId: joinedEvent.id,
          role: response.event.role as 'host' | 'guest',
          joinedAt: Date.now(),
        };

        setEvents([...events, joinedEvent]);
        setUserMemberships([...userMemberships, newMembership]);
        setShowJoinEventModal(false);
        setJoinCode('');
        setJoinCodeError('');

        // Navigate to the joined event
        router.push(`/events/${joinedEvent.id}`);
      } else {
        setJoinCodeError(response.error || 'Invalid event code');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      setJoinCodeError('Failed to join event');
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      await apiDeleteEvent(parseInt(eventToDelete));
      setEvents(events.filter(e => e.id !== eventToDelete));
      setUserMemberships(userMemberships.filter(m => m.eventId !== eventToDelete));
      setShowDeleteConfirmModal(false);
      setEventToDelete(null);
      showToastNotification('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      showToastNotification('Failed to delete event');
    }
  };

  const confirmLeaveEvent = async () => {
    if (!eventToLeave) return;

    try {
      await apiLeaveEvent(parseInt(eventToLeave));
      setEvents(events.filter(e => e.id !== eventToLeave));
      setUserMemberships(userMemberships.filter(m => m.eventId !== eventToLeave));
      setShowLeaveConfirmModal(false);
      setEventToLeave(null);
      showToastNotification('Left event successfully');
    } catch (error) {
      console.error('Error leaving event:', error);
      showToastNotification('Failed to leave event');
    }
  };

  const copyGuestCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToastNotification('Event code copied to clipboard!');
  };

  const openEvent = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 transition-colors"
            >
              SplitDine
            </button>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors font-medium text-sm"
          >
            Profile
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Events</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowStartEventModal(true);
                setTimeout(() => eventNameRef.current?.focus(), 0);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
            >
              Start a Group Bill
            </button>
            <button
              onClick={() => {
                setShowJoinEventModal(true);
                setTimeout(() => joinCodeRef.current?.focus(), 0);
              }}
              className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded transition-colors"
            >
              Join Event
            </button>
          </div>
        </div>

        {/* Events List */}
        {isLoadingEvents ? (
          <div className="text-center py-12 text-slate-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No events yet</p>
            <p className="text-sm text-slate-400">Create a new event or join an existing one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => {
              const membership = userMemberships.find(m => m.eventId === event.id);
              if (!membership) return null;

              return (
                <EventListItem
                  key={event.id}
                  event={{ ...event, userRole: membership.role }}
                  onOpenEvent={openEvent}
                  onDeleteEvent={(eventId) => {
                    setEventToDelete(eventId);
                    setShowDeleteConfirmModal(true);
                  }}
                  onLeaveEvent={(eventId) => {
                    setEventToLeave(eventId);
                    setShowLeaveConfirmModal(true);
                  }}
                  onCopyGuestCode={copyGuestCode}
                  onShowToast={showToastNotification}
                  onShowPaymentDetails={() => {}} // Not implemented yet
                  onShowNotesSummary={() => {}} // Not implemented yet
                  onShowContactHost={() => {}} // Not implemented yet
                  onShowManageGuestName={() => {}} // Not implemented yet
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showStartEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Create new event and bill
            </h2>
            <input
              ref={eventNameRef}
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createEvent();
                if (e.key === 'Escape') {
                  setShowStartEventModal(false);
                  setEventName('');
                }
              }}
              placeholder="Event name (e.g., Pizza Night - Oct 18th)"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStartEventModal(false);
                  setEventName('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createEvent}
                disabled={!eventName.trim() || isCreatingEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingEvent ? 'Creating...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Event Modal */}
      {showJoinEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Join Event
            </h2>
            <input
              ref={joinCodeRef}
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setJoinCodeError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') joinEvent();
                if (e.key === 'Escape') {
                  setShowJoinEventModal(false);
                  setJoinCode('');
                  setJoinCodeError('');
                }
              }}
              placeholder="Enter event code"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 mb-2"
            />
            {joinCodeError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{joinCodeError}</p>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setShowJoinEventModal(false);
                  setJoinCode('');
                  setJoinCodeError('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={joinEvent}
                disabled={!joinCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Delete Event Bill
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEvent}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Leave Event
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to leave this event?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  setEventToLeave(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveEvent}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
