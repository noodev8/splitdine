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
    super.key,
    required this.eventId,
    required this.token,
    required this.userId,
  });

  @override
  State<GuestOrderScreen> createState() => _GuestOrderScreenState();
}

class _GuestOrderScreenState extends State<GuestOrderScreen> {
  final itemNameController = TextEditingController();

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

    if (!mounted) return;
    if (await handleAuthFailure(context, result)) return;

    if (result['return_code'] == 'SUCCESS') {
      if (!mounted) return;
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

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter a valid item name.')),
      );
      return;
    }

    final trimmedName = name.toLowerCase().trim();

    final existingIndex = items.indexWhere((item) {
      final rawName = (item['custom_item_name'] ?? item['item_name'] ?? '').toString();
      final existingName = rawName.toLowerCase().trim();
      return existingName == trimmedName;
    });

    setState(() {
      if (existingIndex != -1) {
        items[existingIndex]['quantity'] += 1;
      } else {
        items.add({
          'menu_id': null,
          'custom_item_name': name,
          'quantity': 1,
          'price_at_time': 0.0,
        });
      }

      total = _calculateTotal(items);
      itemNameController.clear();
    });

    submitOrder(shouldNavigateBack: false); // Don't navigate back after adding
  }

  void editItem(int index) {
    final item = items[index];
    final name = item['custom_item_name'] ?? item['item_name'] ?? 'Unnamed Item';
    final currentQty = item['quantity'].toString();
    final currentPrice = item['price_at_time'].toString();

    final qtyController = TextEditingController(text: currentQty);
    final priceController = TextEditingController(text: currentPrice);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Edit "$name"'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: qtyController,
              decoration: InputDecoration(labelText: 'Quantity'),
              keyboardType: TextInputType.number,
            ),
            SizedBox(height: 10),
            TextField(
              controller: priceController,
              decoration: InputDecoration(labelText: 'Price'),
              keyboardType: TextInputType.numberWithOptions(decimal: true),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final newQty = int.tryParse(qtyController.text.trim()) ?? 0;
              final newPrice = double.tryParse(priceController.text.trim()) ?? -1;

              if (newQty > 0 && newPrice >= 0) {
                setState(() {
                  items[index]['quantity'] = newQty;
                  items[index]['price_at_time'] = newPrice;
                  total = _calculateTotal(items);
                });
                Navigator.pop(context);
                submitOrder(shouldNavigateBack: false); // Don't navigate back after editing
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Please enter valid quantity and price.')),
                );
              }
            },
            child: Text('Save'),
          ),
        ],
      ),
    );
  }

  void removeItem(int index) {
    setState(() {
      items.removeAt(index);
      total = _calculateTotal(items);
    });

    submitOrder(shouldNavigateBack: false); // Don't navigate back after removing
  }

  void submitOrder({bool shouldNavigateBack = true}) async {
    final cleanedItems = items.map((item) {
      return {
        'menu_id': item['menu_id'] ?? null,
        'custom_item_name': item['custom_item_name'] ?? item['item_name'] ?? '',
        'quantity': item['quantity'] ?? 1,
        'price_at_time': item['price_at_time'] ?? 0.0,
      };
    }).toList();

    final result = await SubmitOrderAPI.submit(
      token: widget.token,
      eventId: widget.eventId,
      userId: widget.userId,
      items: cleanedItems,
    );

    // print('Submit order API response: $result');

    if (await handleAuthFailure(context, result)) return;

    if (result['return_code'] == 'SUCCESS') {
      setState(() {
        total = result['total_amount'] ?? _calculateTotal(items);
      });
      
      // print('Order submitted successfully, total: $total');
      if (shouldNavigateBack) {
        Navigator.pop(context, true); // Pass true to indicate refresh needed
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Failed to submit order')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Your Order'),
        actions: [
          TextButton(
            onPressed: () {
              // Navigate back with refresh indicator
              Navigator.pop(context, true);
            },
            child: Text(
              'Done',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: isLoading
        ? Center(child: CircularProgressIndicator())
        : GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: EdgeInsets.only(
                    left: AppPadding.screen.left,
                    right: AppPadding.screen.right,
                    top: AppPadding.screen.top,
                    bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Add Item:', style: AppTextStyle.subtitle),
                      SizedBox(height: 8),
                      TextField(
                        controller: itemNameController,
                        decoration: InputDecoration(labelText: 'Item Name'),
                        onSubmitted: (_) => addItem(),
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
                            final itemName = item['custom_item_name'] ?? item['item_name'] ?? 'Unnamed';
                            final price = item['price_at_time'] ?? 0.0;

                            return ListTile(
                              title: Text(itemName),
                              subtitle: Text('Qty: ${item['quantity']}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('£${price.toStringAsFixed(2)}'),
                                  IconButton(
                                    icon: Icon(Icons.edit, color: Colors.grey),
                                    onPressed: () => editItem(index),
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.delete, color: Colors.red),
                                    onPressed: () => removeItem(index),
                                  ),
                                ],
                              ),
                              onTap: () => editItem(index),
                            );
                          },
                        ),
                      Divider(height: 30),
                      Text('💰 Total: £${total.toStringAsFixed(2)}', style: AppTextStyle.title),
                      SizedBox(height: 20),
                    ],
                  ),
                );
              },
            ),
          ),
    );
  }
}
