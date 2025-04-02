import os
import psycopg2
import xml.etree.ElementTree as ET
import logging

# PostgreSQL Connection Config
DB_CONFIG = {
    "dbname": "splitdine",
    "user": "main",
    "password": "tr55*8",
    "host": "77.68.13.150",
    "port": "5432",
}

# Directory containing XML files
DATA_DIR = "fsa_data"

# Log File Setup
LOG_FILE = "import_fsa_data.log"
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format="%(asctime)s - %(message)s")

# ✅ Only allow relevant BusinessTypeIDs (Restaurants, Takeaways, Pubs)
# VALID_BUSINESS_TYPES = {"1", "7844", "7843"}  # Restaurant, Takeaway, Pub
VALID_BUSINESS_TYPES = {"7843"}  # Restaurant, Takeaway, Pub

def parse_xml(file_path):
    """Parse XML file and extract relevant restaurant data."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    restaurants = []
    for establishment in root.findall(".//EstablishmentDetail"):
        fhrsid = establishment.findtext("FHRSID")
        name = establishment.findtext("BusinessName")
        postcode = establishment.findtext("PostCode")
        rating = establishment.findtext("RatingValue")
        business_type_id = establishment.findtext("BusinessTypeID")

        # Skip if type doesn't qualify
        if business_type_id not in VALID_BUSINESS_TYPES:
            continue

        # Address: Combine available address fields
        address_parts = [
            establishment.findtext("AddressLine1"),
            establishment.findtext("AddressLine2"),
            establishment.findtext("AddressLine3"),
            establishment.findtext("AddressLine4"),
        ]
        address = ", ".join(filter(None, address_parts))  # Remove None values

        # City: Use LocalAuthorityName as fallback
        city = establishment.findtext("AddressLine3") or establishment.findtext("LocalAuthorityName")

        # Location data (can be None if not available)
        longitude = establishment.findtext("Geocode/Longitude")
        latitude = establishment.findtext("Geocode/Latitude")

        # Skip if essential fields are missing
        if not fhrsid or not name or not postcode:
            continue

        # ✅ Convert rating to a number (set -1 if not numeric)
        if rating and rating.isdigit():
            rating = int(rating)
        else:
            rating = -1  # Default for non-numeric values like "AwaitingInspection"

        restaurants.append((int(fhrsid), name, address, city, postcode, rating, longitude, latitude))

    return restaurants

def insert_or_update_restaurants(restaurants):
    """Insert new restaurants or update existing ones if data has changed."""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    insert_count = 0
    update_count = 0
    no_change_count = 0

    for fhrsid, name, address, city, postcode, rating, longitude, latitude in restaurants:
        
        # Check if restaurant already exists (by FHRSID)
        cursor.execute(
            "SELECT name, address, city, postcode, rating, longitude, latitude FROM restaurant WHERE fhrsid = %s",
            (fhrsid,),
        )
        existing = cursor.fetchone()

        if existing:
            # Extract current values from the database
            current_name, current_address, current_city, current_postcode, current_rating, current_longitude, current_latitude = existing

            # Check if any value has changed
            if (
                name != current_name
                or address != current_address
                or city != current_city
                or postcode != current_postcode
                or rating != current_rating
                or longitude != current_longitude
                or latitude != current_latitude
            ):
                cursor.execute(
                    """
                    UPDATE restaurant
                    SET name = %s, address = %s, city = %s, postcode = %s, rating = %s, longitude = %s, latitude = %s
                    WHERE fhrsid = %s
                    """,
                    (name, address, city, postcode, rating, longitude, latitude, fhrsid),
                )
                update_count += 1
            else:
                no_change_count += 1

        else:
            # Insert new record
            cursor.execute(
                """
                INSERT INTO restaurant (fhrsid, name, address, city, postcode, rating, longitude, latitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (fhrsid, name, address, city, postcode, rating, longitude, latitude),
            )
            insert_count += 1

    conn.commit()
    cursor.close()
    conn.close()

    logging.info(f"✅ Summary: {insert_count} inserted, {update_count} updated, {no_change_count} unchanged.")

def process_files():
    """Process all XML files in the directory."""
    xml_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".xml")]

    if not xml_files:
        logging.info("No XML files found in directory. Exiting.")
        return

    for file_name in xml_files:
        file_path = os.path.join(DATA_DIR, file_name)
        logging.info(f"Processing: {file_path}")

        # ✅ Ensure `restaurants` is always assigned
        restaurants = parse_xml(file_path) or []

        # ✅ Debugging: Check if we are extracting data from XML
        print(f"Extracted {len(restaurants)} restaurants from {file_name}")

        insert_or_update_restaurants(restaurants)
    
    logging.info("All XML files processed successfully!")


if __name__ == "__main__":
    process_files()
