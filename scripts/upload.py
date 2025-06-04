import io
import requests
import os
import multiprocessing
from modules import script_callbacks
from modules import shared
from concurrent.futures import ThreadPoolExecutor

ENDPOINT = os.getenv("EIV_ENDPOINT")
API_KEY = os.getenv("EIV_APIKEY")

max_worker_threads = multiprocessing.cpu_count()
executor = ThreadPoolExecutor(max_workers=max_worker_threads)


def post_image_as_png(filename, url):
    headers = {
        'Content-Type': 'image/png',
        'Authorization': f'Bearer {API_KEY}',
    }

    with open(filename, 'rb') as f:
        data = f.read()

    response = requests.post(
        url=url,
        data=data,
        headers=headers,
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(f"Upload failed with status code {response.status_code}")

    return response


def _handle_image_saved_async(param: script_callbacks.ImageSaveParams):
    filename = param.filename
    try:
        response = post_image_as_png(filename, f"{ENDPOINT}/api/images")

        if hasattr(shared, 'log'):
            if response and response.status_code == 200:
                shared.log.info(f"[External Image Viewer] Upload successful: {os.path.basename(filename)}")
            else:
                shared.log.warning(f"[External Image Viewer] Upload failed: {os.path.basename(filename)}")

    except Exception as error:
        if hasattr(shared, 'log'):
            shared.log.error(f"[External Image Viewer] Upload error for {os.path.basename(filename)}: {str(error)}")

def handle_image_saved(param: script_callbacks.ImageSaveParams):
    executor.submit(_handle_image_saved_async, param)


def on_app_started(demo, app):
    print(f"[External Image Viewer] Initialized, All generated images are uploaded to {ENDPOINT}.")
    print(f"[External Image Viewer] Using {max_worker_threads} worker threads for image uploads.")


# Add handlers, if apikey provided.
if ENDPOINT is not None and API_KEY is not None:
    script_callbacks.on_image_saved(handle_image_saved)
    script_callbacks.on_app_started(on_app_started)
