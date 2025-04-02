import 'package:flutter/material.dart';
import '../styles/styles.dart';
import '../api/api_get_guest_order.dart';
import '../helpers/auth_helpers.dart';

class GuestOrderScreen extends StatefulWidget {
  final int eventId;
  final String token;
  final int userId;

  const GuestOrderScreen({
    required this.eventId,
    required this.token,
    required this.userId,
  });

  @override
  _GuestOrderScreenState createState() => _GuestOrderScreenState();
}

class _GuestOrderScreenState extends State<GuestOrderScreen> {
  List<dynamic> items = [];
  bool isLoading = true;
  String error = '';

  @override
  void initState() {
    super.initState();
    loadGuestOrder();
  }

  void loadGuestOrder() async {
    setState(() {
      isLoading = true;
      error = '';
    });

    final result = await GetGuestOrderAPI.fetch(
      token: widget.token,
      eventId: widget.eventId,
      userId: widget.userId,
    );

    if (await handleAuthFailure(context, result)) return;

    if (result['return_code'] == 'SUCCESS') {
      setState(() {
        items = result['items'];
        isLoading = false;
      });
    } else {
      setState(() {
        error = result['message'] ?? 'Could not load guest order.';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Your Order')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : Padding(
              padding: AppPadding.screen,
              child: error.isNotEmpty
                  ? Text(error, style: AppTextStyle.error)
                  : items.isEmpty
                      ? Text('No items added yet.', style: AppTextStyle.subtitle)
                      : ListView.builder(
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final item = items[index];
                            return ListTile(
                              title: Text('${item['item_name']}'),
                              subtitle: Text('Quantity: ${item['quantity']}'),
                              trailing: Text('£${(item['price_at_time'] as num).toStringAsFixed(2)}'),
                            );
                          },
                        ),
            ),
    );
  }
} 
