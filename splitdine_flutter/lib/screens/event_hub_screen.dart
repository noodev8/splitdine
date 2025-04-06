/*
This is the main hub (Dashboard)
Users arrive here after login. Some (not limited to) actions available include
- Join Event, Create Event, See Active Event list,
- See History Event List
- See and manage invites (not coded yet)
- Joining an event needs a 4 Digit PIN
- The event list can display brief details like location, date and number of guests
- Navigate to event details from here (event detail screen)
- Remove event from list
*/

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_get_user_events.dart';
import '../api/api_join_event.dart';
import '../styles/app_styles.dart';
import '../helpers/pin_code_field.dart';
import 'create_event_screen.dart';
import 'login_screen.dart';
import '../helpers/auth_helpers.dart';
import 'event_detail_screen.dart';

class EventHubScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const EventHubScreen({super.key, required this.user, required this.token});

  @override
  State<EventHubScreen> createState() => _EventHubScreenState();
}

class _EventHubScreenState extends State<EventHubScreen> {
  List<dynamic> events = [];
  bool isLoading = true;
  String error = '';

  @override
  void initState() {
    super.initState();
    loadUserEvents();
  }

  void showJoinEventDialog() {
    final codeController = TextEditingController();
    String dialogMessage = '';
    Color dialogColor = AppStyles.errorColor;
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: Text(
              'Join Event',
              style: AppStyles.titleLarge.copyWith(
                color: AppStyles.primaryColor,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            backgroundColor: AppStyles.surfaceColor,
            contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
            insetPadding: const EdgeInsets.symmetric(horizontal: 20),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Enter the 4-digit code',
                  style: AppStyles.titleMedium.copyWith(
                    color: AppStyles.secondaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Ask the event organizer for the code',
                  style: AppStyles.bodyMedium.copyWith(
                    color: AppStyles.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                PinCodeField(
                  controller: codeController,
                  onCompleted: (code) {
                    // Auto-submit when all 4 digits are entered
                    // The actual submission will be handled by the button's onPressed
                  },
                ),
                const SizedBox(height: 16),
                if (dialogMessage.isNotEmpty)
                  Container(
                    padding: AppStyles.paddingSmall,
                    decoration: BoxDecoration(
                      color: dialogColor == AppStyles.errorColor
                          ? AppStyles.errorContainer
                          : AppStyles.successContainer,
                      borderRadius: AppStyles.borderRadiusSmall,
                    ),
                    child: Text(
                      dialogMessage,
                      style: AppStyles.bodyMedium.copyWith(
                        color: dialogColor,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                style: AppStyles.textButtonStyle,
                child: const Text('CANCEL'),
              ),
              ElevatedButton(
                style: AppStyles.filledButtonStyle,
                onPressed: () async {
                  final code = codeController.text.trim();

                  if (code.length != 4) {
                    setState(() {
                      dialogMessage = 'Please enter a valid 4-digit code.';
                      dialogColor = AppStyles.errorColor;
                    });
                    return;
                  }

                  setState(() {
                    isSubmitting = true;
                    dialogMessage = '';
                  });

                  final result = await JoinEventAPI.joinEvent(widget.token, code);

                  // Check if the dialog is still mounted
                  if (!mounted) return;

                  // Store context in a local variable
                  final currentContext = context;

                  if (result['unauthorized'] == true) {
                    // Check if still mounted before using context
                    if (!mounted) return;
                    await handleAuthFailure(currentContext, result);
                    return;
                  }

                  setState(() {
                    isSubmitting = false;

                    if (result['return_code'] == 'SUCCESS') {
                      dialogMessage = '✅ Joined successfully!';
                      dialogColor = AppStyles.successColor;
                    } else if (result['return_code'] == 'ALREADY_JOINED') {
                      dialogMessage = 'ℹ️ Already joined. Opening event...';
                      dialogColor = AppStyles.successColor;
                    } else {
                      dialogMessage = result['message'] ?? 'Failed to join.';
                      dialogColor = AppStyles.errorColor;
                    }
                  });

                  if (result['return_code'] == 'SUCCESS' ||
                      result['return_code'] == 'ALREADY_JOINED') {
                    await Future.delayed(const Duration(milliseconds: 1200));

                    // Check if the dialog is still mounted
                    if (!mounted) return;

                    // Store context in a local variable
                    final dialogContext = context;
                    Navigator.pop(dialogContext);
                    loadUserEvents();
                  }
                },
                child: isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('JOIN'),
              ),
            ],
          ),
        );
      },
    );
  }

  void loadUserEvents() async {
    final result = await GetUserEventsAPI.fetch(widget.user['id'], widget.token);

    // Check if widget is still mounted before using context
    if (!mounted) return;

    if (await handleAuthFailure(context, result)) return;

    if (result['return_code'] == 'SUCCESS') {
      setState(() {
        events = result['events'];
        isLoading = false;
      });
    } else {
      setState(() {
        error = result['message'] ?? 'Could not load events.';
        isLoading = false;
      });
    }
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    // Check if widget is still mounted before using context
    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStyles.backgroundColor,
      appBar: AppBar(
        title: Text('Welcome ${widget.user['name']}'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: AppStyles.surfaceColor,
        foregroundColor: AppStyles.onSurface,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: logout,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: AppStyles.paddingMedium,
          child: isLoading
              ? Center(child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppStyles.primaryColor),
                ))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header section
                    Text(
                      'Your Events',
                      style: AppStyles.titleLarge.copyWith(
                        color: AppStyles.primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Error message if any
                    if (error.isNotEmpty)
                      Container(
                        padding: AppStyles.paddingSmall,
                        decoration: BoxDecoration(
                          color: AppStyles.errorContainer,
                          borderRadius: AppStyles.borderRadiusSmall,
                        ),
                        child: Text(
                          error,
                          style: AppStyles.bodyMedium.copyWith(
                            color: AppStyles.errorColor,
                          ),
                        ),
                      ),

                    // Events list
                    Expanded(
                      child: events.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.event_busy,
                                    size: 64,
                                    color: AppStyles.secondaryColor.withAlpha(128),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'No events yet',
                                    style: AppStyles.titleMedium.copyWith(
                                      color: AppStyles.secondaryColor,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Create a new event or join one with a code',
                                    style: AppStyles.bodyMedium.copyWith(
                                      color: AppStyles.onSurfaceVariant,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              itemCount: events.length,
                              itemBuilder: (context, index) {
                                final event = events[index];
                                final eventId = event['id'];
                                final restaurantName =
                                    event['restaurant_name'] ?? 'Unnamed Restaurant';
                                final eventDate = event['event_date'] ?? 'Unknown Date';
                                final guestCount = event['guest_count'] ?? 0;

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                  color: AppStyles.surfaceColor,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: () {
                                      if (eventId != null && eventId is int) {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => EventDetailScreen(
                                              token: widget.token,
                                              eventId: eventId,
                                            ),
                                          ),
                                        );
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              '⚠️ Unable to open event: missing ID.',
                                              style: AppStyles.bodyMedium.copyWith(
                                                color: Colors.white,
                                              ),
                                            ),
                                            backgroundColor: AppStyles.errorColor,
                                          ),
                                        );
                                      }
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.restaurant,
                                                color: AppStyles.primaryColor,
                                                size: 20,
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  restaurantName,
                                                  style: AppStyles.titleMedium.copyWith(
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Row(
                                                  children: [
                                                    Icon(
                                                      Icons.calendar_today,
                                                      color: AppStyles.secondaryColor,
                                                      size: 16,
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Text(
                                                      eventDate,
                                                      style: AppStyles.bodyMedium,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Row(
                                                children: [
                                                  Icon(
                                                    Icons.people,
                                                    color: AppStyles.secondaryColor,
                                                    size: 16,
                                                  ),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    '$guestCount guests',
                                                    style: AppStyles.bodyMedium,
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),

                    // Action buttons
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => CreateEventScreen(
                                    token: widget.token,
                                    userId: widget.user['id'],
                                  ),
                                ),
                              );
                            },
                            style: AppStyles.filledButtonStyle,
                            icon: const Icon(Icons.add),
                            label: const Text('CREATE EVENT'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: showJoinEventDialog,
                            style: AppStyles.outlinedButtonStyle,
                            icon: Icon(Icons.login, color: AppStyles.primaryColor),
                            label: Text('JOIN EVENT', style: TextStyle(color: AppStyles.primaryColor)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
