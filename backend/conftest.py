import os
import pytest


@pytest.fixture(autouse=True, scope="session")
def change_to_backend_dir():
    """Ensure all relative JSON paths (src/utils/json/...) resolve correctly."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
