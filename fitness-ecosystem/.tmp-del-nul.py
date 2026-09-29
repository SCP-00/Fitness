# One-shot: delete the undeletable reserved-name file via Win32 DeleteFileW.
# The \\?\ prefix makes the Windows API treat the name literally (no device-
# name normalization), which is the only way `nul` can be addressed.
import ctypes

PATH = "\\\\?\\C:\\Games\\Forza Horizon 6\\nul"
ok = ctypes.windll.kernel32.DeleteFileW(PATH)
err = ctypes.GetLastError()
print(f"DeleteFileW ok={ok} lastError={err}")
if not ok:
    buf = ctypes.create_unicode_buffer(512)
    n = ctypes.windll.kernel32.FormatMessageW(0x1000, None, err, 0, buf, 512, None)
    print("error message:", buf.value[:n] if n else "?")
else:
    import os
    gone = not os.path.exists("C:\\Games\\Forza Horizon 6\\nul")
    print("file gone:", gone)
