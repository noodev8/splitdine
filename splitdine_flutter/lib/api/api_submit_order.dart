import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class SubmitOrderAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> submit({
    required String token,
    required int eventId,
    required int userId,
    required List<Map<String, dynamic>> items,
  }) async {
    final url = Uri.parse('$baseUrl/submit_order');

    final payload = {
      'event_id': eventId,
      'user_id': userId,
      'items': items,
    };

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(payload),
    );

    try {
      final data = jsonDecode(response.body);
      return {
        'return_code': data['return_code'],
        'message': data['message'],
        'total_amount': data['total_amount'],
      };
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'message': 'Unexpected server error.',
      };
    }
  }
}
