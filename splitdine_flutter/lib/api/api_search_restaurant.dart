import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class SearchRestaurantAPI {
  static const baseUrl = APIConfig.baseUrl;

  static Future<Map<String, dynamic>> searchRestaurants(String name, String location) async {
    final query = Uri.encodeFull('$baseUrl/search_restaurant?businessName=$name&location=$location');

    try {
      final response = await http.get(Uri.parse(query), headers: {
        'Content-Type': 'application/json',
      });

      final data = jsonDecode(response.body);
      final code = data['return_code'];

      if (code == 'SUCCESS') {
        return {
          'return_code': 'SUCCESS',
          'restaurants': data['restaurants'] ?? [],
        };
      } else {
        return {
          'return_code': code,
          'message': 'No restaurants found or invalid search.',
        };
      }
    } catch (e) {
      return {
        'return_code': 'SERVER_ERROR',
        'message': 'Failed to fetch restaurants.',
      };
    }
  }
}
