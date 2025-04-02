const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

// Enable JSON body parsing
app.use(express.json());
app.use(cors());

// Import routes
 const lock_event = require("./routes/lock_event");
 app.use("/lock_event", lock_event);

const lock_guest = require("./routes/lock_guest");
app.use("/lock_guest", lock_guest);

const lock_order_item = require("./routes/lock_order_item");
app.use("/lock_order_item", lock_order_item);

const submit_order = require("./routes/submit_order");
app.use("/submit_order", submit_order);

const get_event_bill = require("./routes/get_event_bill");
app.use("/get_event_bill", get_event_bill);

const get_event_menu = require("./routes/get_event_menu");
app.use("/get_event_menu", get_event_menu);

const join_event = require("./routes/join_event");
app.use("/join_event", join_event);

const get_event_guests = require("./routes/get_event_guests");
app.use("/get_event_guests", get_event_guests);

const register_user = require("./routes/register_user");
app.use("/register_user", register_user);

const login_user = require("./routes/login_user");
app.use("/login_user", login_user);

const get_user_events = require("./routes/get_user_events");
app.use("/get_user_events", get_user_events);

const search_restaurant = require("./routes/search_restaurant");
app.use("/search_restaurant", search_restaurant);

const get_menu = require("./routes/get_menu");
app.use("/get_menu", get_menu);

const create_event = require("./routes/create_event");
app.use("/create_event", create_event);

const get_event_details = require("./routes/get_event_details");
app.use("/get_event_details", get_event_details);

const get_guest_order = require("./routes/get_guest_order");
app.use("/get_guest_order", get_guest_order);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SplitDine-server running on port ${PORT}`));
