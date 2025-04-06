import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_register_user.dart';
import '../styles/app_styles.dart';
import 'event_hub_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
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

    // Check if widget is still mounted before using setState
    if (!mounted) return;

    setState(() {
      isLoading = false;
    });

    if (result['return_code'] == 'SUCCESS') {
      final prefs = await SharedPreferences.getInstance();
      prefs.setString('token', result['token']);
      prefs.setString('user', jsonEncode(result['user']));

      // Brief delay for better UX
      await Future.delayed(const Duration(milliseconds: 800));

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
        message = result['message'] ?? 'Registration failed.';
        messageColor = AppStyles.errorColor;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStyles.backgroundColor,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: const Text('Create Account'),
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
                  'Join SplitDine',
                  style: AppStyles.headlineMedium.copyWith(
                    color: AppStyles.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Create an account to get started',
                  style: AppStyles.bodyMedium.copyWith(
                    color: AppStyles.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // Full Name field
                TextField(
                  controller: nameController,
                  decoration: AppStyles.inputDecoration(
                    'Full Name',
                    prefixIcon: const Icon(Icons.person_outline),
                  ),
                ),
                const SizedBox(height: 16),

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

                // Phone field
                TextField(
                  controller: phoneController,
                  decoration: AppStyles.inputDecoration(
                    'Phone',
                    prefixIcon: const Icon(Icons.phone_outlined),
                  ),
                  keyboardType: TextInputType.phone,
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
                const SizedBox(height: 32),

                // Register button
                SizedBox(
                  height: 50,
                  child: isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ElevatedButton(
                          onPressed: registerUser,
                          style: AppStyles.filledButtonStyle,
                          child: const Text('CREATE ACCOUNT'),
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
                const SizedBox(height: 32),

                // Terms and conditions text
                Text(
                  'By creating an account, you agree to our Terms of Service and Privacy Policy',
                  style: AppStyles.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // Already have an account link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Already have an account?',
                      style: AppStyles.bodyMedium,
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      style: AppStyles.textButtonStyle,
                      child: const Text('Login'),
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
