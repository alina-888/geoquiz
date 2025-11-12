"""
Image compression utilities using Pillow
Compresses and optimizes uploaded images for web delivery
"""
import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys


# Compression settings
PROFILE_PICTURE_SIZE = (800, 800)
PROFILE_PICTURE_QUALITY = 85

QUIZ_IMAGE_SIZE = (1200, 1200)
QUIZ_IMAGE_QUALITY = 85

QUESTION_IMAGE_SIZE = (1920, 1920)
QUESTION_IMAGE_QUALITY = 90


def compress_image(image_file, max_size, quality, image_type='image'):
    """
    Compress and optimize an image file while preserving transparency.

    Args:
        image_file: Django UploadedFile object
        max_size: Tuple (width, height) - max dimensions
        quality: Integer 1-100 - quality for lossy formats
        image_type: String - type of image for naming

    Returns:
        InMemoryUploadedFile: Compressed image file
    """
    try:
        # Open the image
        img = Image.open(image_file)

        # Store original format and filename
        original_format = img.format
        original_filename = image_file.name
        has_transparency = img.mode in ('RGBA', 'LA', 'P') or (img.mode == 'P' and 'transparency' in img.info)

        # Resize if needed (preserve aspect ratio)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Determine output format based on transparency and original format
        if has_transparency:
            # Keep PNG for images with transparency
            output_format = 'PNG'
            filename_ext = '.png'
            # Convert palette mode with transparency to RGBA
            if img.mode == 'P':
                img = img.convert('RGBA')
        else:
            # Convert to RGB for JPEG
            if img.mode != 'RGB':
                img = img.convert('RGB')
            output_format = 'JPEG'
            filename_ext = '.jpg'

        # Update filename extension if format changed
        name_parts = original_filename.rsplit('.', 1)
        if len(name_parts) > 1:
            original_filename = name_parts[0] + filename_ext
        else:
            original_filename = original_filename + filename_ext

        # Save to BytesIO
        output = io.BytesIO()

        if output_format == 'JPEG':
            img.save(
                output,
                format='JPEG',
                quality=quality,
                optimize=True,
                progressive=True  # Progressive JPEG for better web loading
            )
        else:
            # PNG - preserve transparency
            img.save(
                output,
                format='PNG',
                optimize=True,
                compress_level=9  # Maximum PNG compression
            )

        output.seek(0)

        # Create new InMemoryUploadedFile
        compressed_file = InMemoryUploadedFile(
            output,
            'ImageField',
            original_filename,
            f'image/{output_format.lower()}',
            sys.getsizeof(output),
            None
        )

        return compressed_file

    except Exception as e:
        # If compression fails, return original file
        # This ensures uploads don't fail due to compression issues
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Image compression failed for {image_file.name}: {str(e)}")
        image_file.seek(0)
        return image_file


def compress_profile_picture(image_file):
    """
    Compress profile picture: 800x800, 85% quality
    """
    return compress_image(
        image_file,
        PROFILE_PICTURE_SIZE,
        PROFILE_PICTURE_QUALITY,
        'profile_picture'
    )


def compress_quiz_image(image_file):
    """
    Compress quiz image: 1200x1200, 85% quality
    """
    return compress_image(
        image_file,
        QUIZ_IMAGE_SIZE,
        QUIZ_IMAGE_QUALITY,
        'quiz_image'
    )


def compress_question_image(image_file):
    """
    Compress question image: 1920x1920, 90% quality (higher quality for quiz content)
    """
    return compress_image(
        image_file,
        QUESTION_IMAGE_SIZE,
        QUESTION_IMAGE_QUALITY,
        'question_image'
    )
