import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_register_user.dart'; // ✅ Your new modular API file
import 'event_hub_screen.dart';
import '../styles/styles.dart';

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final phoneController = TextEditingController();
  final passwordController = TextEditingController();

  String message = '';
  Color messageColor = Colors.red;
  bool isLoading = false;

  void registerUser() async {
    setState(() {
      isLoading = true;
      message = '';
    });

    final result = await AuthRegisterAPI.registerUser(
      nameController.text.trim(),
      emailController.text.trim(),
      passwordController.text,
      phoneController.text.trim(),
    );

    setState(() {
      isLoading = false;
    });

    if (result['return_code'] == 'SUCCESS') {
      final prefs = await SharedPreferences.getInstance();
      prefs.setString('token', result['token']);
      prefs.setString('user', jsonEncode(result['user']));

      // setState(() {
      //   message = '✅ Registration successful!';
      //   messageColor = Colors.green;
      // });

      await Future.delayed(Duration(milliseconds: 800));

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
        message = result['message'] ?? 'Registration failed.';
        messageColor = Colors.red;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(title: Text('Register')),
      body: SingleChildScrollView(
        padding: AppPadding.screen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: nameController,
              decoration: InputDecoration(labelText: 'Full Name'),
            ),
            SizedBox(height: 12),
            TextField(
              controller: emailController,
              decoration: InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            SizedBox(height: 12),
            TextField(
              controller: phoneController,
              decoration: InputDecoration(labelText: 'Phone'),
              keyboardType: TextInputType.phone,
            ),
            SizedBox(height: 12),
            TextField(
              controller: passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 20),
            isLoading
                ? Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: registerUser,
                    child: Text('Register'),
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
          ],
        ),
      ),
    );
  }
}
