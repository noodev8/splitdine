import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class GetUserEventsAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> fetch(int userId, String token) async {
    final url = Uri.parse('$baseUrl/get_user_events?user_id=$userId');

    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    try {
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['return_code'] == 'SUCCESS') {
        return {
          'return_code': 'SUCCESS',
          'events': data['events'] ?? [],
        };
      } else {
        return {
          'return_code': data['return_code'] ?? 'UNKNOWN_ERROR',
          'message': data['message'] ?? 'Could not load events.',
        };
      }
    } catch (e) {
      return {
        'return_code': 'PARSE_ERROR',
        'message': 'Server returned invalid JSON.',
      };
    }
  }
}
