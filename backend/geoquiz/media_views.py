import os
import mimetypes
from django.http import FileResponse, HttpResponse, Http404
from django.conf import settings
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET", "HEAD"])
def serve_media(request, path):
    """
    Serve media files with HTTP Range request support for video/audio seeking.
    """
    # Build the full file path
    full_path = os.path.join(settings.MEDIA_ROOT, path)

    # Security check: ensure the path is within MEDIA_ROOT
    full_path = os.path.abspath(full_path)
    media_root = os.path.abspath(settings.MEDIA_ROOT)
    if not full_path.startswith(media_root):
        raise Http404("Invalid path")

    # Check if file exists
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404("File not found")

    # Get file info
    file_size = os.path.getsize(full_path)
    content_type, _ = mimetypes.guess_type(full_path)
    if content_type is None:
        content_type = 'application/octet-stream'

    # Handle Range requests
    range_header = request.META.get('HTTP_RANGE', '').strip()
    range_match = None

    if range_header and range_header.startswith('bytes='):
        range_value = range_header[6:]
        try:
            # Parse range like "0-1024" or "1024-"
            if '-' in range_value:
                start_str, end_str = range_value.split('-', 1)
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else file_size - 1

                # Validate range
                if start >= file_size or start < 0 or end >= file_size or start > end:
                    return HttpResponse(status=416)  # Range Not Satisfiable

                range_match = (start, end)
        except (ValueError, AttributeError):
            # Invalid range format, ignore and serve full file
            pass

    # Open file
    file_handle = open(full_path, 'rb')

    if range_match:
        start, end = range_match
        file_handle.seek(start)
        length = end - start + 1

        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = length
        response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
        response['Accept-Ranges'] = 'bytes'
        response.status_code = 206  # Partial Content
    else:
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = file_size
        response['Accept-Ranges'] = 'bytes'

    # Add CORS headers for cross-origin requests
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'

    return response
