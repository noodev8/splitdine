/*
Show the Event detail. Arrives here from the Event HUB screen
Shows the Restauarnt name, address and the Event details. Date, organiser
The list of guests are here, including status (Attending, Declined, Invited)
The Bill total is displayed
Each guest menu total is displayed for them
Any user can tap on a guest to see their choices by going to the guest_order screen
An organiser can manage guests from here 
- Remove, invite, lock, unlock menu choices
Organiser can close the event or even delete it
*/
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
// import '../styles/styles.dart';
import '../api/api_get_event_details.dart';
import '../api/api_get_event_guests.dart';
import '../helpers/auth_helpers.dart';
import 'guest_order_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final int eventId;
  final String token;

  const EventDetailScreen({
    super.key,
    required this.eventId,
    required this.token,
  });

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
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
    if (!mounted) return;
    if (await handleAuthFailure(context, detailResult)) return;

    final guestResult = await GetEventGuestsAPI.fetch(widget.token, widget.eventId);
    if (!mounted) return;
    if (await handleAuthFailure(context, guestResult)) return;

    if (detailResult['return_code'] == 'SUCCESS' && guestResult['return_code'] == 'SUCCESS') {
      if (!mounted) return;
      setState(() {
        event = detailResult['event'];
        guests = guestResult['guests'];
        combinedTotal = _calculateCombinedTotal(guests);
        isLoading = false;
      });
    } else {
      if (!mounted) return;
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

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => GuestOrderScreen(
            eventId: widget.eventId,
            token: widget.token,
            userId: userId,
          ),
        ),
      );
      
      if (!mounted) return;
      loadEventDetails();
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('User not found. Please log in again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Event Details'),
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: loadEventDetails,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                loadEventDetails();
              },
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // Header section with restaurant info
                  Container(
                    color: Theme.of(context).primaryColor,
                    padding: EdgeInsets.only(left: 20, right: 20, bottom: 30, top: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (event != null && event!['restaurant'] != null) ...[
                          Text(
                            '${event!['restaurant']['name'] ?? 'Unnamed Restaurant'}',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.location_on, color: Colors.white70, size: 16),
                              SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  '${event!['restaurant']['address'] ?? 'Address unavailable'}, ${event!['restaurant']['postcode'] ?? ''}',
                                  style: TextStyle(color: Colors.white70),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  
                  // Event details cards
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: error.isNotEmpty
                        ? Container(
                            padding: EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline, color: Colors.red),
                                SizedBox(width: 8),
                                Expanded(child: Text(error, style: TextStyle(color: Colors.red))),
                              ],
                            ),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Event info card
                              Card(
                                elevation: 2,
                                margin: EdgeInsets.only(bottom: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (event != null && event!['event_date'] != null) ...[
                                        Row(
                                          children: [
                                            Icon(Icons.calendar_today, size: 18, color: Colors.grey[600]),
                                            SizedBox(width: 8),
                                            Text(
                                              '${event!['event_date']}',
                                              style: TextStyle(fontSize: 16),
                                            ),
                                          ],
                                        ),
                                        SizedBox(height: 12),
                                      ],
                                      if (event != null && event!['public_event_code'] != null) ...[
                                        Row(
                                          children: [
                                            Icon(Icons.code, size: 18, color: Colors.grey[600]),
                                            SizedBox(width: 8),
                                            Text(
                                              'Event Code: ',
                                              style: TextStyle(fontSize: 16),
                                            ),
                                            SelectableText(
                                              '${event!['public_event_code']}',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: 1,
                                              ),
                                            ),
                                          ],
                                        ),
                                        SizedBox(height: 12),
                                      ],
                                      Row(
                                        children: [
                                          Icon(Icons.attach_money, size: 18, color: Colors.grey[600]),
                                          SizedBox(width: 8),
                                          Text(
                                            'Total Bill: ',
                                            style: TextStyle(fontSize: 16),
                                          ),
                                          Text(
                                            '£${(event != null && event!['total_amount'] is num) ? (event!['total_amount'] as num).toStringAsFixed(2) : '0.00'}',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Theme.of(context).primaryColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              
                              // Guests section
                              Text(
                                'Guests',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              SizedBox(height: 8),
                              
                              // Guest list
                              Card(
                                elevation: 2,
                                margin: EdgeInsets.only(bottom: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ListView.separated(
                                  shrinkWrap: true,
                                  physics: NeverScrollableScrollPhysics(),
                                  itemCount: guests.length,
                                  separatorBuilder: (context, index) => Divider(height: 1),
                                  itemBuilder: (context, index) {
                                    final guest = guests[index];
                                    final isCurrentUser = guest['user_id'] == currentUserId;
                                    final total = guest['total_amount'] ?? 0.0;
                                    
                                    return Container(
                                      decoration: BoxDecoration(
                                        color: isCurrentUser ? Colors.blue.withOpacity(0.05) : null,
                                        borderRadius: BorderRadius.vertical(
                                          top: index == 0 ? Radius.circular(12) : Radius.zero,
                                          bottom: index == guests.length - 1 ? Radius.circular(12) : Radius.zero,
                                        ),
                                      ),
                                      child: ListTile(
                                        leading: CircleAvatar(
                                          backgroundColor: isCurrentUser ? Colors.blue : Colors.grey[300],
                                          child: Text(
                                            (guest['name'] ?? 'U').substring(0, 1).toUpperCase(),
                                            style: TextStyle(color: Colors.white),
                                          ),
                                        ),
                                        title: Row(
                                          children: [
                                            Text(guest['name'] ?? 'Unknown'),
                                            if (isCurrentUser)
                                              Container(
                                                margin: EdgeInsets.only(left: 8),
                                                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.blue,
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                child: Text(
                                                  'You',
                                                  style: TextStyle(color: Colors.white, fontSize: 12),
                                                ),
                                              ),
                                          ],
                                        ),
                                        subtitle: Text('${guest['email'] ?? ''} (${guest['role'] ?? 'guest'})'),
                                        trailing: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            if (guest['locked'] == true)
                                              Container(
                                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.orange.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(Icons.lock_outline, size: 12, color: Colors.orange),
                                                    SizedBox(width: 4),
                                                    Text(
                                                      'Locked',
                                                      style: TextStyle(fontSize: 12, color: Colors.orange),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            SizedBox(height: 4),
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
                                  },
                                ),
                              ),
                              
                              // Total section
                              Card(
                                elevation: 2,
                                margin: EdgeInsets.only(bottom: 16),
                                color: Colors.deepPurple.shade50,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Combined Total:',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      Text(
                                        '£${combinedTotal.toStringAsFixed(2)}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.deepPurple,
                                          fontSize: 18,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              
                              // Action button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: goToGuestOrderScreen,
                                  icon: Icon(Icons.restaurant_menu),
                                  label: Text('Choose Menu Items'),
                                  style: ElevatedButton.styleFrom(
                                    padding: EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
