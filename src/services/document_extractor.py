"""
Document Extractor adapter.
Re-exports document extraction functions directly from src.ai.ingest.
"""

from src.ai.ingest import (
    clean_text,
    extract_text_from_pdf,
    extract_text_from_pdf as extract_text_from_pdf_pages,
    extract_from_pptx,
    extract_from_docx,
    extract_document_text,
)

__all__ = [
    "clean_text",
    "extract_text_from_pdf",
    "extract_text_from_pdf_pages",
    "extract_from_pptx",
    "extract_from_docx",
    "extract_document_text",
]
