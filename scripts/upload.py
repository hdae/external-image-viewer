import io
import requests
import os
from modules import script_callbacks
from modules import shared

ENDPOINT = os.getenv("EIV_ENDPOINT")
API_KEY = os.getenv("EIV_APIKEY")

def post_image_as_png(filename, url):

    # Set headers.
    headers = {
        'Content-Type': 'image/png',
        'Authorization': f'Bearer {API_KEY}',
    }

    # Read file.
    with open(filename, 'rb') as f:
        data = f.read()

    # Post to endpoint.
    response = requests.post(
        url=url,
        data=data,
        headers=headers,
        timeout=30
    )

    # Failed to upload.
    if response.status_code != 200:
        raise Exception(f"Failed to upload ")

    # Success.
    return response

def handle_image_saved(param: script_callbacks.ImageSaveParams):

    # Attempt to convert and upload.
    try:
        response = post_image_as_png(param.filename, f"{ENDPOINT}/api/images")
        print(response)

        # Logging...
        if hasattr(shared, 'log'):
            if response and response.status_code == 200:
                shared.log.info(f"[External Image Viewer] Upload successful: {file_name}")
            else:
                shared.log.warning(f"[External Image Viewer] Upload failed: {filename}")

    # Network error.
    except Exception as error:
        if hasattr(shared, 'log'):
            shared.log.error(f"[External Image Viewer] Fatal error, upload failed: {str(error)}")

def on_app_started(demo, app):
    print(f"[External Image Viewer] Initialized, All generated images are uploaded to {ENDPOINT}.")

# Add handlers, if apikey provided.
if ENDPOINT != None or API_KEY != None:
    script_callbacks.on_image_saved(handle_image_saved)
    script_callbacks.on_app_started(on_app_started)
