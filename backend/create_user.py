from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.db import SessionLocal
from backend.models import User
from backend.security import hash_password


def main() -> None:
    username = input("Username: ").strip()

    if not 1 <= len(username) <= 100:
        raise SystemExit(
            "Логин должен содержать от 1 до 100 символов."
        )

    password = getpass("Password: ")
    confirmation = getpass("Repeat password: ")

    if password != confirmation:
        raise SystemExit("Пароли не совпадают.")

    if not 12 <= len(password) <= 128:
        raise SystemExit(
            "Пароль должен содержать от 12 до 128 символов."
        )

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.username == username)
        )

        if existing_user is not None:
            raise SystemExit(
                "Пользователь с таким логином уже существует."
            )

        user = User(
            username=username,
            password_hash=hash_password(password),
        )

        db.add(user)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise SystemExit(
                "Не удалось создать пользователя: конфликт данных."
            ) from None

    print(f"Пользователь {username!r} создан.")


if __name__ == "__main__":
    main()