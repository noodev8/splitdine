import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class AuthLoginAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> loginUser(String email, String password) async {
    final url = Uri.parse('$baseUrl/login_user');

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    // print('Status: ${response.statusCode}');
    // print('Response: ${response.body}');

    try {
      final data = jsonDecode(response.body);
      final code = data['return_code'];

      if (code == 'SUCCESS') {
        return {
          'return_code': 'SUCCESS',
          'token': data['token'],
          'user': data['user'],
        };
      }

      String message;
      switch (code) {
        case 'MISSING_FIELDS':
          message = 'Please enter both email and password.';
          break;
        case 'INVALID_CREDENTIALS':
          message = 'Invalid email or password.';
          break;
        default:
          message = 'Login failed. Code: $code';
      }

      return {
        'return_code': code,
        'message': message,
      };
    } catch (e) {
      return {
        'return_code': 'PARSE_ERROR',
        'message': 'Invalid server response.',
      };
    }
  }
}
