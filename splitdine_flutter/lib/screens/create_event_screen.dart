import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../styles/styles.dart';
import '../api/api_create_event.dart';
import '../api/api_search_restaurant.dart';
import '../helpers/auth_helpers.dart';
import 'event_hub_screen.dart';

class CreateEventScreen extends StatefulWidget {
  final String token;
  final int userId;

  const CreateEventScreen({required this.token, required this.userId});

  @override
  _CreateEventScreenState createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
  final businessNameController = TextEditingController();
  final locationController = TextEditingController();
  List<dynamic> searchResults = [];
  int? selectedRestaurantId;

  DateTime? selectedDateTime;
  String message = '';
  Color messageColor = Colors.black;
  bool isLoading = false;
  bool isSearching = false;

  void pickDateTime() async {
    DateTime? date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime(2100),
    );

    if (date == null) return;

    TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: 18, minute: 0),
    );

    if (time == null) return;

    setState(() {
      selectedDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void searchRestaurants() async {
    final name = businessNameController.text.trim();
    final location = locationController.text.trim();

    if (name.length < 2 || location.length < 2) {
      setState(() {
        message = 'Please enter at least 2 characters for both fields.';
        messageColor = Colors.red;
      });
      return;
    }

    setState(() {
      isSearching = true;
      message = '';
      searchResults = [];
    });

    final result = await SearchRestaurantAPI.searchRestaurants(name, location);

    setState(() {
      isSearching = false;
      if (result['return_code'] == 'SUCCESS') {
        searchResults = result['restaurants'];
        if (searchResults.isEmpty) {
          message = 'No restaurants found.';
          messageColor = Colors.red;
        } else if (searchResults.length == 1) {
          selectedRestaurantId = searchResults[0]['id'];
          message = '✅ Auto-selected: ${searchResults[0]['name']} (${searchResults[0]['postcode']})';
          messageColor = Colors.green;
        }
      } else {
        message = result['message'] ?? 'Search failed.';
        messageColor = Colors.red;
      }
    });
  }

  void createEvent() async {
    if (selectedRestaurantId == null || selectedDateTime == null) {
      setState(() {
        message = 'Please select a restaurant and date/time.';
        messageColor = Colors.red;
      });
      return;
    }

    setState(() {
      isLoading = true;
      message = '';
    });

    final result = await EventCreateAPI.createEvent(
      widget.token,
      restaurantId: selectedRestaurantId!,
      eventDate: selectedDateTime,
    );

    if (await handleAuthFailure(context, result)) return;

    setState(() {
      isLoading = false;
    });

    if (result['return_code'] == 'SUCCESS') {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('user');
      final user = userJson != null ? jsonDecode(userJson) : null;

      if (user != null) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (context) => EventHubScreen(
              user: user,
              token: widget.token,
            ),
          ),
          (route) => false,
        );
      }
    } else {
      setState(() {
        message = result['message'] ?? 'Event creation failed.';
        messageColor = Colors.red;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (selectedRestaurantId != null && selectedDateTime != null) {
          final shouldLeave = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Discard Event?'),
              content: Text('You haven’t created your event yet. Leave without saving?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: Text('Leave'),
                ),
              ],
            ),
          );
          return shouldLeave ?? false;
        }
        return true;
      },
      child: Scaffold(
        appBar: AppBar(title: Text('Create Event')),
        body: SingleChildScrollView(
          padding: AppPadding.screen,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: businessNameController,
                decoration: InputDecoration(labelText: 'Business Name'),
              ),
              SizedBox(height: 10),
              TextField(
                controller: locationController,
                decoration: InputDecoration(labelText: 'Town, City or Postcode'),
              ),
              SizedBox(height: 10),
              ElevatedButton(
                onPressed: searchRestaurants,
                child: Text('Search'),
              ),
              SizedBox(height: 10),
              if (isSearching) Center(child: CircularProgressIndicator()),
              if (searchResults.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: searchResults.map<Widget>((restaurant) {
                    final summary =
                        '${restaurant['name']} (${restaurant['postcode']}, ${restaurant['city']})';
                    return ListTile(
                      title: Text(summary),
                      trailing: selectedRestaurantId == restaurant['id']
                          ? Icon(Icons.check_circle, color: Colors.green)
                          : null,
                      onTap: () {
                        setState(() {
                          selectedRestaurantId = restaurant['id'];
                          message = '✅ Selected: $summary';
                          messageColor = Colors.green;
                        });
                      },
                    );
                  }).toList(),
                ),
              SizedBox(height: 12),
              ElevatedButton(
                onPressed: pickDateTime,
                child: Text(
                  selectedDateTime == null
                      ? 'Pick Date & Time'
                      : 'Chosen: ${selectedDateTime!.toLocal()}',
                ),
              ),
              SizedBox(height: 20),
              isLoading
                  ? Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: createEvent,
                      child: Text('Create Event'),
                    ),
              SizedBox(height: 20),
              if (message.isNotEmpty)
                Text(
                  message,
                  style: TextStyle(
                    color: messageColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
