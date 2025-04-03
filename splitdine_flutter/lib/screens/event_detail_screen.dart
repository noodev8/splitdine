import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../styles/styles.dart';
import '../api/api_get_event_details.dart';
import '../api/api_get_event_guests.dart';
import '../helpers/auth_helpers.dart';
import 'guest_order_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final int eventId;
  final String token;

  const EventDetailScreen({
    required this.eventId,
    required this.token,
  });

  @override
  _EventDetailScreenState createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  Map<String, dynamic>? event;
  List<dynamic> guests = [];
  int? currentUserId;
  bool isLoading = true;
  String error = '';
  double combinedTotal = 0.0;

  @override
  void initState() {
    super.initState();
    loadEventDetails();
  }

  void loadEventDetails() async {
    setState(() {
      isLoading = true;
      error = '';
    });

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    if (userJson != null) {
      final user = jsonDecode(userJson);
      currentUserId = user['id'];
    }

    final detailResult = await GetEventDetailsAPI.fetch(widget.token, widget.eventId);
    if (await handleAuthFailure(context, detailResult)) return;

    final guestResult = await GetEventGuestsAPI.fetch(widget.token, widget.eventId);
    if (await handleAuthFailure(context, guestResult)) return;

    if (detailResult['return_code'] == 'SUCCESS' && guestResult['return_code'] == 'SUCCESS') {
      setState(() {
        event = detailResult['event'];
        guests = guestResult['guests'];
        combinedTotal = _calculateCombinedTotal(guests);
        isLoading = false;
      });
    } else {
      setState(() {
        error = detailResult['message'] ?? guestResult['message'] ?? 'Could not load event data.';
        isLoading = false;
      });
    }
  }

  double _calculateCombinedTotal(List<dynamic> guests) {
    return guests.fold(0.0, (sum, guest) {
      final total = guest['total_amount'];
      return sum + (total is num ? total.toDouble() : 0.0);
    });
  }

  void goToGuestOrderScreen() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');

    if (userJson != null) {
      final user = jsonDecode(userJson);
      final userId = user['id'];

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => GuestOrderScreen(
            eventId: widget.eventId,
            token: widget.token,
            userId: userId,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('User not found. Please log in again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Event Details')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : Padding(
              padding: AppPadding.screen,
              child: error.isNotEmpty
                  ? Text(error, style: AppTextStyle.error)
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (event != null && event!['restaurant'] != null) ...[
                          Text('📍 ${event!['restaurant']['name'] ?? 'Unnamed Restaurant'}', style: AppTextStyle.title),
                          Text('${event!['restaurant']['address'] ?? 'Address unavailable'}, ${event!['restaurant']['postcode'] ?? ''}'),
                        ],
                        SizedBox(height: 8),
                        if (event != null && event!['event_date'] != null)
                          Text('🕓 ${event!['event_date']}'),
                        if (event != null && event!['public_event_code'] != null)
                          Text('📢 Code: ${event!['public_event_code']}'),
                        Text(
                          '💰 Total: £${(event != null && event!['total_amount'] is num) ? (event!['total_amount'] as num).toStringAsFixed(2) : '0.00'}',
                        ),
                        SizedBox(height: 16),
                        Text('Guests:', style: AppTextStyle.subtitle),
                        ...guests.map((guest) {
                          final isCurrentUser = guest['user_id'] == currentUserId;
                          final total = guest['total_amount'] ?? 0.0;
                          return Container(
                            color: isCurrentUser ? Colors.lightBlueAccent.withOpacity(0.1) : null,
                            child: ListTile(
                              title: Text(guest['name'] ?? 'Unknown'),
                              subtitle: Text('${guest['email'] ?? ''} (${guest['role'] ?? 'guest'})'),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (guest['locked'] == true) Icon(Icons.lock_outline, size: 16),
                                  Text(
                                    '£${(total is num ? total.toStringAsFixed(2) : '0.00')}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.teal[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                        Divider(height: 30),
                        Text(
                          '🧾 Combined Total from Guests: £${combinedTotal.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.deepPurple,
                            fontSize: 16,
                          ),
                        ),
                        SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: goToGuestOrderScreen,
                          child: Text('Choose Menu Items'),
                        ),
                      ],
                    ),
            ),
    );
  }
}
