import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_login_user.dart';
import 'event_hub_screen.dart';
import 'register_screen.dart';
import '../styles/styles.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  String message = '';
  Color messageColor = Colors.red;
  bool isLoading = false;

  void loginUser() async {
    setState(() {
      isLoading = true;
      message = '';
    });

    final result = await AuthLoginAPI.loginUser(
      emailController.text.trim(),
      passwordController.text,
    );

    setState(() {
      isLoading = false;
    });

    if (result['return_code'] == 'SUCCESS') {
      final prefs = await SharedPreferences.getInstance();
      prefs.setString('token', result['token']);
      prefs.setString('user', jsonEncode(result['user']));

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => EventHubScreen(
            user: result['user'],
            token: result['token'],
          ),
        ),
      );
    } else {
      setState(() {
        message = result['message'] ?? 'Login failed.';
        messageColor = Colors.red;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: AppPadding.screen,
        child: Column(
          children: [
            TextField(
              controller: emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            SizedBox(height: 12),
            TextField(
              controller: passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 20),
            isLoading
                ? CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: loginUser,
                    child: Text('Login'),
                  ),
            SizedBox(height: 20),
            if (message.isNotEmpty)
              Text(
                message,
                style: TextStyle(
                  color: messageColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            Spacer(),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => RegisterScreen()),
                );
              },
              child: Text("Don't have an account? Register here"),
            ),
          ],
        ),
      ),
    );
  }
}
