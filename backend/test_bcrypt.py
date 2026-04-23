from app.core.security import get_password_hash
try:
    print(get_password_hash("password123"))
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
