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
import '../styles/styles.dart';
import 'create_event_screen.dart';
import 'login_screen.dart';
import '../helpers/auth_helpers.dart';
import 'event_detail_screen.dart';

class EventHubScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const EventHubScreen({required this.user, required this.token});

  @override
  _EventHubScreenState createState() => _EventHubScreenState();
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
    Color dialogColor = Colors.red;
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: Text('Join Event'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: codeController,
                  decoration: InputDecoration(
                    labelText: 'Enter 4-digit Code',
                  ),
                  keyboardType: TextInputType.number,
                ),
                SizedBox(height: 10),
                if (dialogMessage.isNotEmpty)
                  Text(
                    dialogMessage,
                    style: TextStyle(
                      color: dialogColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
            actions: [
              TextButton(
                child: Text('Cancel'),
                onPressed: () => Navigator.pop(context),
              ),
              ElevatedButton(
                child: isSubmitting
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text('Join'),
                onPressed: () async {
                  final code = codeController.text.trim();

                  if (code.length != 4) {
                    setState(() {
                      dialogMessage = 'Please enter a valid 4-digit code.';
                      dialogColor = Colors.red;
                    });
                    return;
                  }

                  setState(() {
                    isSubmitting = true;
                    dialogMessage = '';
                  });

                  final result = await JoinEventAPI.joinEvent(widget.token, code);

                  if (result['unauthorized'] == true) {
                    await handleAuthFailure(context, result);
                    return;
                  }

                  setState(() {
                    isSubmitting = false;

                    if (result['return_code'] == 'SUCCESS') {
                      dialogMessage = '✅ Joined successfully!';
                      dialogColor = Colors.green;
                    } else if (result['return_code'] == 'ALREADY_JOINED') {
                      dialogMessage = 'ℹ️ Already joined. Opening event...';
                      dialogColor = Colors.green;
                    } else {
                      dialogMessage = result['message'] ?? 'Failed to join.';
                      dialogColor = Colors.red;
                    }
                  });

                  if (result['return_code'] == 'SUCCESS' ||
                      result['return_code'] == 'ALREADY_JOINED') {
                    await Future.delayed(Duration(milliseconds: 1200));
                    Navigator.pop(context);
                    loadUserEvents();
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void loadUserEvents() async {
    final result = await GetUserEventsAPI.fetch(widget.user['id'], widget.token);

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

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome ${widget.user['name']}'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: logout,
          ),
        ],
      ),
      body: Padding(
        padding: AppPadding.screen,
        child: isLoading
            ? Center(child: CircularProgressIndicator())
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Your Events', style: AppTextStyle.title),
                  SizedBox(height: 10),
                  if (error.isNotEmpty)
                    Text(error, style: AppTextStyle.error),
                  Expanded(
                    child: events.isEmpty
                        ? Text('No events yet.', style: AppTextStyle.subtitle)
                        : ListView.builder(
                            itemCount: events.length,
                            itemBuilder: (context, index) {
                              final event = events[index];
                              final eventId = event['id']; // updated to 'id'
                              final restaurantName =
                                  event['restaurant_name'] ?? 'Unnamed Restaurant';
                              final eventDate = event['event_date'] ?? 'Unknown Date';

                              return ListTile(
                                title: Text('Event at $restaurantName'),
                                subtitle: Text('Date: $eventDate'),
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
                                              '⚠️ Unable to open event: missing ID.')),
                                    );
                                  }
                                },
                              );
                            },
                          ),
                  ),
                  SizedBox(height: 20),
                  ElevatedButton(
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
                    child: Text('Create New Event'),
                  ),
                  SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: showJoinEventDialog,
                    child: Text('Join Event with Code'),
                  ),
                ],
              ),
      ),
    );
  }
}
