import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class AuthRegisterAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> registerUser(
      String name, String email, String password, String phone) async {
    final url = Uri.parse('$baseUrl/register_user');

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
      }),
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
        case 'EMAIL_EXISTS':
          message = 'This email is already registered.';
          break;
        case 'MISSING_FIELDS':
          message = 'All fields are required.';
          break;
        default:
          message = 'Registration failed. Code: $code';
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
