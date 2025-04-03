import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class GetEventGuestsAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> fetch(String token, int eventId) async {
    final url = Uri.parse('$baseUrl/get_event_guests');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'event_id': eventId}),
    );

    try {
      final data = jsonDecode(response.body);
      final returnCode = data['return_code'];

      if (response.statusCode == 200 && returnCode == 'SUCCESS') {
        return {
          'return_code': 'SUCCESS',
          'guests': data['guests'],
        };
      } else {
        return {
          'return_code': returnCode,
          'message': 'Failed to fetch guest list.',
        };
      }
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'message': 'Server returned invalid response.',
      };
    }
  }
}
