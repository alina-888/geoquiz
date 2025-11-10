# Security Hardening - File Upload Protection

This document describes the security measures implemented to protect the GeoQuiz application from file upload vulnerabilities.

## Installation Requirements

Before running the application, install the new security dependencies:

```bash
pip install -r requirements.txt
```

New dependencies added:
- `python-magic==0.4.27` - MIME type detection
- `python-magic-bin==0.4.14` - Binary files for python-magic (Windows)

After installing dependencies, run migrations:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## Security Measures Implemented

### 1. File Size Limits

**What it protects against:** Disk space exhaustion (DoS attacks)

**Limits enforced:**
- Profile pictures: 5 MB
- Quiz images: 10 MB
- Question images: 10 MB
- Audio files: 50 MB
- Video files: 100 MB

**Where:** `backend/quizzes/validators.py`

### 2. File Type Validation

**What it protects against:** Malware uploads, code execution

**Validations:**
- Extension whitelist (blocks dangerous extensions like `.exe`, `.sh`, `.php`)
- MIME type verification using python-magic (checks actual file content, not just extension)
- Magic bytes verification (file signature check)

**Blocked attack example:**
- Attacker renames `malware.exe` to `malware.jpg`
- Extension check passes ✓
- MIME type check FAILS ✗ (detects it's actually an executable)
- Upload rejected 🛑

**Where:** `backend/quizzes/validators.py`

### 3. SVG Files Blocked

**What it protects against:** XSS (Cross-Site Scripting) attacks

**Why SVG is dangerous:**
SVG files can contain embedded JavaScript that executes when viewed in a browser:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('XSS Attack!')</script>
</svg>
```

**Action taken:** SVG removed from allowed image types

**Where:** `backend/quizzes/validators.py` (line 23)

### 4. Filename Sanitization

**What it protects against:** Path traversal attacks, command injection

**Sanitizations applied:**
- Remove path separators (`../`, `..\\`)
- Remove null bytes (`\x00`)
- Remove special characters
- Limit filename length to 100 characters
- Replace spaces with underscores

**Blocked attack example:**
- Attacker uploads file named: `../../etc/passwd`
- Sanitized to: `etc_passwd`
- Saved safely in media directory 🛑

**Where:** `backend/quizzes/validators.py` (`sanitize_filename()`)

### 5. User Storage Quotas

**What it protects against:** Resource exhaustion, storage DoS

**Quota:** 500 MB total storage per user

**Calculation includes:**
- All question media files (from user's quizzes)
- Quiz images
- Profile picture

**User experience:**
When quota exceeded, user receives clear error message:
```
Storage quota exceeded. You have used 512.3MB of 500MB.
Please delete some files before uploading new ones.
```

**Where:** `backend/quizzes/validators.py` (`check_user_storage_quota()`)

### 6. Media Serving Security

**What it protects against:** Path traversal, directory listing, XSS

**Protections:**
- Path traversal blocking (`..`, null bytes)
- Symlink resolution (prevents escaping MEDIA_ROOT)
- Force download for dangerous MIME types (HTML, JavaScript)
- Security headers:
  - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
  - `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
  - `Content-Disposition: attachment` - For dangerous file types

**HTTP Range Request Support:**
- Properly handles byte-range requests for video/audio seeking
- Returns 206 Partial Content for range requests
- Returns 416 Range Not Satisfiable for invalid ranges

**Where:** `backend/geoquiz/media_views.py`

## Security Best Practices for Developers

### When Adding New File Upload Features

1. **Always use the validators:**
   ```python
   from quizzes.validators import validate_image_file

   file_field = models.ImageField(validators=[validate_image_file])
   ```

2. **Check storage quota in serializers:**
   ```python
   def validate(self, attrs):
       file = attrs.get('file')
       if file:
           validate_user_storage_quota(request.user, file.size)
       return super().validate(attrs)
   ```

3. **Never trust user input:**
   - Always sanitize filenames
   - Always validate file content, not just extension
   - Always check file size before processing

### Testing Security

To test the security measures:

1. **Test file size limits:**
   ```bash
   # Try uploading a 20MB image (should fail)
   # Limit is 10MB
   ```

2. **Test MIME type validation:**
   ```bash
   # Rename malware.exe to malware.jpg
   # Try uploading (should fail - MIME type mismatch)
   ```

3. **Test path traversal:**
   ```bash
   # Try accessing: /media/../../../etc/passwd
   # Should return 404
   ```

4. **Test storage quota:**
   ```bash
   # Upload files until reaching 500MB
   # Next upload should be rejected
   ```

## Known Limitations

1. **No virus scanning:** python-magic only checks file signatures, not malware payloads. For production, consider integrating ClamAV.

2. **No image re-encoding:** Images are stored as-is. Malicious EXIF data or polyglot files could bypass checks. Consider using Pillow to re-encode images.

3. **Performance:** MIME type checking adds slight overhead. For high-traffic sites, consider async validation.

## Monitoring Recommendations

For production deployments:

1. **Monitor storage usage:**
   - Track total media directory size
   - Set up alerts for disk space < 20%

2. **Log suspicious activity:**
   - Failed validation attempts
   - Repeated quota exceeded errors
   - Path traversal attempts

3. **Regular security audits:**
   - Review uploaded files periodically
   - Check for unusual file types
   - Monitor for zero-day exploits in file format parsers

## References

- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- CWE-434 Unrestricted File Upload: https://cwe.mitre.org/data/definitions/434.html
- Django Security: https://docs.djangoproject.com/en/4.2/topics/security/
