import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def create_admin():
    email = "admin@lumen.com"
    password = "admin123"
    full_name = "Admin User"

    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).filter(User.email == email))
        user = result.scalars().first()

        if not user:
            print(f"Creating admin user: {email}")
            hashed_password = get_password_hash(password)
            new_user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name
            )
            session.add(new_user)
            await session.commit()
            print("Admin user created successfully.")
        else:
            print(f"Admin user {email} already exists.")

if __name__ == "__main__":
    asyncio.run(create_admin())
