import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_login_user.dart';
import '../styles/app_styles.dart';
import 'event_hub_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
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

    // Check if widget is still mounted before using setState
    if (!mounted) return;

    setState(() {
      isLoading = false;
    });

    if (result['return_code'] == 'SUCCESS') {
      final prefs = await SharedPreferences.getInstance();
      prefs.setString('token', result['token']);
      prefs.setString('user', jsonEncode(result['user']));

      // Check if widget is still mounted before using context
      if (!mounted) return;

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
        messageColor = AppStyles.errorColor;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStyles.backgroundColor,
      appBar: AppBar(
        title: const Text('Login'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: AppStyles.surfaceColor,
        foregroundColor: AppStyles.onSurface,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: AppStyles.paddingMedium,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                // Welcome text
                Text(
                  'Welcome Back',
                  style: AppStyles.headlineMedium.copyWith(
                    color: AppStyles.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to continue',
                  style: AppStyles.bodyMedium.copyWith(
                    color: AppStyles.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),

                // Email field
                TextField(
                  controller: emailController,
                  decoration: AppStyles.inputDecoration(
                    'Email',
                    prefixIcon: const Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),

                // Password field
                TextField(
                  controller: passwordController,
                  decoration: AppStyles.inputDecoration(
                    'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: const Icon(Icons.visibility_off_outlined),
                  ),
                  obscureText: true,
                ),

                // Forgot password link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      // TODO: Implement forgot password
                    },
                    style: AppStyles.textButtonStyle,
                    child: const Text('Forgot Password?'),
                  ),
                ),
                const SizedBox(height: 24),

                // Login button
                SizedBox(
                  height: 50,
                  child: isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ElevatedButton(
                          onPressed: loginUser,
                          style: AppStyles.filledButtonStyle,
                          child: const Text('LOGIN'),
                        ),
                ),
                const SizedBox(height: 20),

                // Error message
                if (message.isNotEmpty)
                  Container(
                    padding: AppStyles.paddingSmall,
                    decoration: BoxDecoration(
                      color: AppStyles.errorContainer,
                      borderRadius: AppStyles.borderRadiusSmall,
                    ),
                    child: Text(
                      message,
                      style: AppStyles.bodyMedium.copyWith(
                        color: AppStyles.errorColor,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                const SizedBox(height: 40),

                // Register link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account?",
                      style: AppStyles.bodyMedium,
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => RegisterScreen()),
                        );
                      },
                      style: AppStyles.textButtonStyle,
                      child: const Text('Register'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
