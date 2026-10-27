"""
File storage service for Didactic AI.
Provides local filesystem storage by default and an abstract interface
for S3 or cloud storage backends.
Computes SHA-256 hash on save for integrity and deduplication.
"""

import os
import hashlib
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, Optional


class BaseStorageBackend(ABC):
    """Abstract contract for document storage backends."""

    @abstractmethod
    def save_file(
        self, file_bytes: bytes, filename: str, subfolder: str = "uploads"
    ) -> Tuple[str, str]:
        """
        Saves file bytes and returns (relative_or_uri_path, sha256_hash).
        """
        pass

    @abstractmethod
    def load_file(self, file_path: str) -> bytes:
        """Loads and returns raw bytes from stored path."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Deletes file at path. Returns True if deleted or did not exist."""
        pass


class LocalStorageBackend(BaseStorageBackend):
    """
    Default local filesystem storage provider.
    Stores files inside ./storage/{subfolder}/{uuid}_{filename}.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or os.getenv("STORAGE_DIR", "./storage")).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_file(
        self, file_bytes: bytes, filename: str, subfolder: str = "uploads"
    ) -> Tuple[str, str]:
        folder = self.base_dir / subfolder
        folder.mkdir(parents=True, exist_ok=True)

        sha256 = hashlib.sha256(file_bytes).hexdigest()
        clean_name = Path(filename).name.replace(" ", "_")
        unique_name = f"{uuid.uuid4().hex[:8]}_{clean_name}"
        destination = folder / unique_name

        with open(destination, "wb") as f:
            f.write(file_bytes)

        rel_path = str(destination.relative_to(self.base_dir)).replace("\\", "/")
        return rel_path, sha256

    def load_file(self, file_path: str) -> bytes:
        target = (self.base_dir / file_path).resolve()
        if not target.exists() or not target.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(target, "rb") as f:
            return f.read()

    def delete_file(self, file_path: str) -> bool:
        try:
            target = (self.base_dir / file_path).resolve()
            if target.exists() and target.is_file():
                target.unlink()
            return True
        except Exception:
            return False


_storage_instance: Optional[BaseStorageBackend] = None


def get_storage() -> BaseStorageBackend:
    """Returns singleton storage backend instance."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorageBackend()
    return _storage_instance
