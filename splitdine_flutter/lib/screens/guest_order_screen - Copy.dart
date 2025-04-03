import 'package:flutter/material.dart';
import '../styles/styles.dart';
import '../api/api_get_guest_order.dart';
import '../api/api_submit_order.dart';
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
  final itemNameController = TextEditingController();
  final quantityController = TextEditingController(text: '1');
  final priceController = TextEditingController();

  List<Map<String, dynamic>> items = [];
  bool isLoading = true;
  String error = '';
  double total = 0.0;

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
        items = List<Map<String, dynamic>>.from(result['items']);
        total = _calculateTotal(items);
        isLoading = false;
      });
    } else {
      setState(() {
        error = result['message'] ?? 'Could not load guest order.';
        isLoading = false;
      });
    }
  }

  double _calculateTotal(List<Map<String, dynamic>> items) {
    return items.fold(0.0, (sum, item) {
      if (item['price_at_time'] is num && item['quantity'] is int) {
        return sum + item['price_at_time'] * item['quantity'];
      }
      return sum;
    });
  }

  void addItem() {
    final name = itemNameController.text.trim();
    final qty = int.tryParse(quantityController.text.trim()) ?? 0;
    final price = double.tryParse(priceController.text.trim()) ?? -1;

    if (name.isEmpty || qty <= 0 || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter valid item name, quantity and price')),
      );
      return;
    }

    final existingIndex = items.indexWhere(
        (item) => item['custom_item_name']?.toLowerCase() == name.toLowerCase());

    setState(() {
      if (existingIndex != -1) {
        items[existingIndex]['quantity'] += qty;
      } else {
        items.add({
          'menu_id': null,
          'custom_item_name': name,
          'quantity': qty,
          'price_at_time': price,
        });
      }

      total = _calculateTotal(items);
      itemNameController.clear();
      quantityController.text = '1';
      priceController.clear();
    });
  }

  void removeItem(int index) {
    setState(() {
      items.removeAt(index);
      total = _calculateTotal(items);
    });
  }

  void submitOrder() async {
    final result = await SubmitOrderAPI.submit(
      token: widget.token,
      eventId: widget.eventId,
      userId: widget.userId,
      items: items,
    );

    if (await handleAuthFailure(context, result)) return;

    if (result['return_code'] == 'SUCCESS') {
      setState(() {
        total = result['total_amount'] ?? _calculateTotal(items);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Order submitted!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Failed to submit order')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Your Order')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              child: SingleChildScrollView(
                padding: AppPadding.screen,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Add Item:', style: AppTextStyle.subtitle),
                    SizedBox(height: 8),
                    TextField(
                      controller: itemNameController,
                      decoration: InputDecoration(labelText: 'Item Name'),
                    ),
                    SizedBox(height: 8),
                    TextField(
                      controller: quantityController,
                      decoration: InputDecoration(labelText: 'Quantity'),
                      keyboardType: TextInputType.number,
                    ),
                    SizedBox(height: 8),
                    TextField(
                      controller: priceController,
                      decoration: InputDecoration(labelText: 'Price'),
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                    ),
                    SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: addItem,
                      child: Text('Add to Order'),
                    ),
                    Divider(height: 30),
                    Text('Your Items:', style: AppTextStyle.subtitle),
                    if (items.isEmpty)
                      Text('No items added yet.', style: AppTextStyle.subtitle)
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final item = items[index];
                          final itemName = item['custom_item_name'] ??
                              item['item_name'] ??
                              'Unnamed Item';

                          return ListTile(
                            title: Text(itemName),
                            subtitle: Text('Qty: ${item['quantity']}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('£${(item['price_at_time'] as num).toStringAsFixed(2)}'),
                                IconButton(
                                  icon: Icon(Icons.delete, color: Colors.red),
                                  onPressed: () => removeItem(index),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    Divider(height: 30),
                    Text('💰 Total: £${total.toStringAsFixed(2)}',
                        style: AppTextStyle.title),
                    SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: items.isNotEmpty ? submitOrder : null,
                      child: Text('Submit Order'),
                    ),
                    SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }
}
