import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class JoinEventAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> joinEvent(String token, String publicCode) async {
    final url = Uri.parse('$baseUrl/join_event');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'public_event_code': publicCode}),
    );

    try {
      final data = jsonDecode(response.body);

      return {
        'return_code': data['return_code'],
        'message': data['message'],
        'guest_id': data['guest_id'],
        'unauthorized': response.statusCode == 401 || response.statusCode == 403,
      };
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'message': 'Server error. Try again later.',
      };
    }
  }
}
