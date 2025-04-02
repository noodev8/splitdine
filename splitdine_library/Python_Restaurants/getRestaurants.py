import os
import requests
from bs4 import BeautifulSoup

# URL of the FSA data page
BASE_URL = "https://data.food.gov.uk/catalog/datasets/38dd8d6a-5ab1-4f50-b753-ab33288e3200"

# Folder to save downloaded XML files
SAVE_FOLDER = "fsa_data"

# Ensure the save directory exists
os.makedirs(SAVE_FOLDER, exist_ok=True)

def get_xml_links():
    """Scrape the FSA page to get all XML file download links."""
    response = requests.get(BASE_URL)
    if response.status_code != 200:
        print("Failed to access the webpage.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    # Find all XML file links
    xml_links = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if href.endswith(".xml"):  # Filter for XML files
            full_url = href if href.startswith("http") else f"https://data.food.gov.uk{href}"
            xml_links.append(full_url)

    return xml_links

def download_xml_files(xml_links):
    """Download each XML file and save it locally."""
    for link in xml_links:
        file_name = os.path.join(SAVE_FOLDER, os.path.basename(link))
        
        # Skip download if file already exists
        if os.path.exists(file_name):
            print(f"Skipping {file_name}, already downloaded.")
            continue
        
        print(f"Downloading {file_name}...")
        response = requests.get(link, stream=True)
        if response.status_code == 200:
            with open(file_name, "wb") as file:
                for chunk in response.iter_content(chunk_size=1024):
                    file.write(chunk)
            print(f"Saved: {file_name}")
        else:
            print(f"Failed to download: {link}")

def main():
    print("Fetching XML links from the FSA page...")
    xml_links = get_xml_links()

    if not xml_links:
        print("No XML files found. Exiting.")
        return

    print(f"Found {len(xml_links)} XML files. Downloading...")
    download_xml_files(xml_links)
    print("All XML files downloaded successfully!")

if __name__ == "__main__":
    main()
