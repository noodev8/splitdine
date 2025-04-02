import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class EventCreateAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> createEvent(
    String token, {
    required int restaurantId,
    required DateTime? eventDate,
  }) async {
    if (restaurantId == 0 || eventDate == null) {
      return {
        'return_code': 'MISSING_FIELDS',
        'message': 'Restaurant ID and event date are required.',
      };
    }

    final url = Uri.parse('$baseUrl/create_event');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'restaurant_id': restaurantId,
        'event_date': eventDate.toIso8601String(),
      }),
    );

    // print('Create event status: ${response.statusCode}');
    // print('Response: ${response.body}');

    try {
      final data = jsonDecode(response.body);
      final returnCode = data['return_code'];

      if (response.statusCode == 201 && returnCode == 'SUCCESS') {
        return {
          'return_code': 'SUCCESS',
          'event_id': data['event_id'],
          'public_event_code': data['public_event_code'],
          'message': '✅ Event created successfully!',
        };
      } else {
        return {
          'return_code': returnCode ?? 'UNKNOWN_ERROR',
          'message': _mapErrorMessage(returnCode),
        };
      }
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'message': 'Server returned invalid response.',
      };
    }
  }

  static String _mapErrorMessage(String? code) {
    switch (code) {
      case 'MISSING_FIELDS':
        return 'Please provide all fields.';
      case 'RESTAURANT_NOT_FOUND':
        return 'Restaurant not found.';
      case 'EVENT_ALREADY_EXISTS':
        return 'You already have an event at this restaurant.';
      case 'SERVER_ERROR':
        return 'Something went wrong on the server.';
      default:
        return 'Something went wrong.';
    }
  }
}
