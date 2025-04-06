import 'package:flutter/material.dart';
import '../styles/app_styles.dart';

class StyleShowcaseScreen extends StatelessWidget {
  const StyleShowcaseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Style Showcase'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: AppStyles.paddingMedium,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Typography showcase
            const Text('Typography', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            const Text('Display Large', style: AppStyles.displayLarge),
            const Text('Display Medium', style: AppStyles.displayMedium),
            const Text('Display Small', style: AppStyles.displaySmall),
            const Divider(),
            
            const Text('Headline Large', style: AppStyles.headlineLarge),
            const Text('Headline Medium', style: AppStyles.headlineMedium),
            const Text('Headline Small', style: AppStyles.headlineSmall),
            const Divider(),
            
            const Text('Title Large', style: AppStyles.titleLarge),
            const Text('Title Medium', style: AppStyles.titleMedium),
            const Text('Title Small', style: AppStyles.titleSmall),
            const Divider(),
            
            const Text('Body Large', style: AppStyles.bodyLarge),
            const Text('Body Medium', style: AppStyles.bodyMedium),
            const Text('Body Small', style: AppStyles.bodySmall),
            const Divider(),
            
            const Text('Label Large', style: AppStyles.labelLarge),
            const Text('Label Medium', style: AppStyles.labelMedium),
            const Text('Label Small', style: AppStyles.labelSmall),
            const SizedBox(height: AppStyles.spacing32),
            
            // Colors showcase
            const Text('Colors', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            _buildColorRow('Primary', AppStyles.primaryColor),
            _buildColorRow('Primary Container', AppStyles.primaryContainer),
            _buildColorRow('Secondary', AppStyles.secondaryColor),
            _buildColorRow('Secondary Container', AppStyles.secondaryContainer),
            _buildColorRow('Tertiary', AppStyles.tertiaryColor),
            _buildColorRow('Tertiary Container', AppStyles.tertiaryContainer),
            _buildColorRow('Surface', AppStyles.surfaceColor),
            _buildColorRow('Surface Variant', AppStyles.surfaceVariant),
            _buildColorRow('Background', AppStyles.backgroundColor),
            _buildColorRow('Error', AppStyles.errorColor),
            _buildColorRow('Success', AppStyles.successColor),
            const SizedBox(height: AppStyles.spacing32),
            
            // Buttons showcase
            const Text('Buttons', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton(
                  onPressed: () {},
                  style: AppStyles.filledButtonStyle,
                  child: const Text('Filled'),
                ),
                ElevatedButton(
                  onPressed: () {},
                  style: AppStyles.tonalButtonStyle,
                  child: const Text('Tonal'),
                ),
              ],
            ),
            const SizedBox(height: AppStyles.spacing16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton(
                  onPressed: () {},
                  style: AppStyles.outlinedButtonStyle,
                  child: const Text('Outlined'),
                ),
                TextButton(
                  onPressed: () {},
                  style: AppStyles.textButtonStyle,
                  child: const Text('Text'),
                ),
              ],
            ),
            const SizedBox(height: AppStyles.spacing32),
            
            // Input fields showcase
            const Text('Input Fields', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            TextField(
              decoration: AppStyles.inputDecoration('Standard Input'),
            ),
            const SizedBox(height: AppStyles.spacing16),
            TextField(
              decoration: AppStyles.filledInputDecoration('Filled Input'),
            ),
            const SizedBox(height: AppStyles.spacing16),
            TextField(
              decoration: AppStyles.inputDecoration(
                'Input with Icon',
                prefixIcon: const Icon(Icons.search),
              ),
            ),
            const SizedBox(height: AppStyles.spacing32),
            
            // Cards showcase
            const Text('Cards', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            Container(
              decoration: AppStyles.cardDecoration,
              padding: AppStyles.paddingMedium,
              width: double.infinity,
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Standard Card', style: AppStyles.titleMedium),
                  SizedBox(height: AppStyles.spacing8),
                  Text(
                    'This is a standard card with subtle elevation and rounded corners.',
                    style: AppStyles.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppStyles.spacing16),
            
            Container(
              decoration: AppStyles.elevatedCardDecoration,
              padding: AppStyles.paddingMedium,
              width: double.infinity,
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Elevated Card', style: AppStyles.titleMedium),
                  SizedBox(height: AppStyles.spacing8),
                  Text(
                    'This card has more pronounced elevation with multiple shadows.',
                    style: AppStyles.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppStyles.spacing16),
            
            Container(
              decoration: AppStyles.outlinedCardDecoration,
              padding: AppStyles.paddingMedium,
              width: double.infinity,
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Outlined Card', style: AppStyles.titleMedium),
                  SizedBox(height: AppStyles.spacing8),
                  Text(
                    'This card has a border instead of elevation.',
                    style: AppStyles.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppStyles.spacing32),
            
            // Chips showcase
            const Text('Chips', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            Wrap(
              spacing: AppStyles.spacing8,
              runSpacing: AppStyles.spacing8,
              children: [
                _buildChip('Design'),
                _buildChip('Material 3'),
                _buildChip('Flutter'),
                _buildChip('Clean UI'),
                _buildChip('Modern'),
              ],
            ),
            const SizedBox(height: AppStyles.spacing32),
            
            // Glass effect showcase
            const Text('Glass Effect', style: AppStyles.headlineMedium),
            const SizedBox(height: AppStyles.spacing16),
            
            Stack(
              children: [
                Container(
                  height: 200,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppStyles.primaryColor,
                        AppStyles.tertiaryColor,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                Positioned(
                  top: 50,
                  left: 30,
                  right: 30,
                  child: Container(
                    padding: AppStyles.paddingMedium,
                    decoration: AppStyles.glassDecoration,
                    child: const Column(
                      children: [
                        Text(
                          'Glassmorphism',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'A modern UI trend with a frosted glass effect',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppStyles.spacing32),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: AppStyles.primaryColor,
        child: const Icon(Icons.add),
      ),
    );
  }
  
  Widget _buildColorRow(String name, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.withOpacity(0.2)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppStyles.titleSmall),
                Text(
                  '#${color.value.toRadixString(16).toUpperCase().substring(2)}',
                  style: AppStyles.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: AppStyles.chipDecoration,
      child: Text(
        label,
        style: AppStyles.labelMedium.copyWith(color: AppStyles.onSurfaceVariant),
      ),
    );
  }
}
