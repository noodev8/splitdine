import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class GetEventDetailsAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> fetch(String token, int eventId) async {
    final url = Uri.parse('$baseUrl/get_event_details/$eventId');

    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    try {
      final data = jsonDecode(response.body);
      final returnCode = data['return_code'];

      if (response.statusCode == 200 && returnCode == 'SUCCESS' && data['event'] != null) {
        return {
          'return_code': 'SUCCESS',
          'event': data['event'],
        };
      } else {
        return {
          'return_code': returnCode ?? 'UNKNOWN_ERROR',
          'message': data['message'] ?? 'Failed to fetch event details.',
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
