from dotenv import load_dotenv


def load_app_env() -> None:
    """Load local dev settings first, then .env for anything still unset."""
    load_dotenv(".env.dev")
    load_dotenv()
