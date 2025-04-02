import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class GetGuestOrderAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> fetch({
    required String token,
    required int eventId,
    required int userId,
  }) async {
    final url = Uri.parse('$baseUrl/get_guest_order');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'event_id': eventId,
        'user_id': userId,
      }),
    );

    try {
      final data = jsonDecode(response.body);
      return {
        'return_code': data['return_code'],
        'items': data['items'] ?? [],
        'message': data['message'] ?? '',
      };
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'items': [],
        'message': 'Failed to parse server response.',
      };
    }
  }
}
