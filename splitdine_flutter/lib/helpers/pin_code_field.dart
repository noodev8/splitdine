import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../styles/app_styles.dart';

class PinCodeField extends StatefulWidget {
  final Function(String) onCompleted;
  final TextEditingController controller;

  const PinCodeField({
    super.key,
    required this.onCompleted,
    required this.controller,
  });

  @override
  State<PinCodeField> createState() => _PinCodeFieldState();
}

class _PinCodeFieldState extends State<PinCodeField> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();

    // Auto-focus after a short delay
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        FocusScope.of(context).requestFocus(_focusNode);
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 60,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          // The boxes
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              4,
              (index) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 6),
                width: 50,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: widget.controller.text.length == index
                        ? AppStyles.primaryColor
                        : AppStyles.outlineColor,
                    width: widget.controller.text.length == index ? 2 : 1,
                  ),
                ),
                alignment: Alignment.center,
                child: index < widget.controller.text.length
                    ? Text(
                        widget.controller.text[index],
                        style: AppStyles.headlineMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppStyles.primaryColor,
                        ),
                      )
                    : null,
              ),
            ),
          ),

          // Invisible text field for input only
          Opacity(
            opacity: 0, // Make it completely invisible
            child: Align(
              alignment: Alignment.bottomCenter,
              child: SizedBox(
                height: 1, // Minimal height
                child: TextField(
                  controller: widget.controller,
                  focusNode: _focusNode,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  showCursor: false,
                  enableInteractiveSelection: false,
                  autofocus: true,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    counterText: '',
                    contentPadding: EdgeInsets.zero,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  onChanged: (value) {
                    setState(() {}); // Refresh to update the displayed digits
                    if (value.length == 4) {
                      widget.onCompleted(value);
                    }
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
