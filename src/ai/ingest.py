import io
import re
from typing import List, Tuple, Union
from pathlib import Path
from pypdf import PdfReader
from src.ai.schemas import DocumentChunk, IngestedDocument


def clean_text(text: str) -> str:
    """
    Normalizes whitespace, strips line-level spaces, and collapses
    excessive consecutive newlines from extracted text.
    """
    if not text:
        return ""
    # Strip whitespace from each individual line and normalize internal spaces
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    # Re-join lines
    joined = "\n".join(lines)
    # Collapse 3 or more consecutive newlines into 2 (paragraph break)
    cleaned = re.sub(r"\n{3,}", "\n\n", joined)
    return cleaned.strip()


def extract_text_from_pdf(pdf_source: Union[str, Path, bytes, io.BytesIO]) -> List[Tuple[int, str]]:
    """
    Extracts text page-by-page from a PDF source.
    Accepts a filepath, raw bytes (from S3/Lambda upload), or BytesIO.
    Returns a list of (page_number, cleaned_text) tuples.
    """
    if isinstance(pdf_source, (str, Path)):
        reader = PdfReader(str(pdf_source))
    elif isinstance(pdf_source, bytes):
        reader = PdfReader(io.BytesIO(pdf_source))
    elif isinstance(pdf_source, io.BytesIO):
        reader = PdfReader(pdf_source)
    else:
        raise TypeError(f"Unsupported PDF source type: {type(pdf_source)}")

    pages_text: List[Tuple[int, str]] = []
    for idx, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        if cleaned:
            pages_text.append((idx, cleaned))

    return pages_text


def chunk_document(
    pages_text: List[Tuple[int, str]], 
    filename: str = "document.pdf",
    max_chunk_words: int = 400
) -> IngestedDocument:
    """
    Transforms extracted page texts into structured semantic chunks.
    For slide presentations, each slide typically acts as an atomic chunk.
    If a slide/page exceeds max_chunk_words, it is partitioned cleanly.
    """
    chunks: List[DocumentChunk] = []
    chunk_counter = 1
    all_text_parts: List[str] = []

    for page_num, text in pages_text:
        all_text_parts.append(text)
        words = text.split()

        if len(words) <= max_chunk_words:
            chunks.append(
                DocumentChunk(
                    chunk_id=f"chunk_{chunk_counter:03d}",
                    page_number=page_num,
                    content=text,
                    token_estimate=len(words),
                )
            )
            chunk_counter += 1
        else:
            for i in range(0, len(words), max_chunk_words):
                sub_words = words[i : i + max_chunk_words]
                sub_text = " ".join(sub_words)
                chunks.append(
                    DocumentChunk(
                        chunk_id=f"chunk_{chunk_counter:03d}",
                        page_number=page_num,
                        content=sub_text,
                        token_estimate=len(sub_words),
                    )
                )
                chunk_counter += 1

    return IngestedDocument(
        filename=filename,
        total_pages=len(pages_text),
        chunks=chunks,
        full_text="\n\n".join(all_text_parts),
    )


def ingest_pdf(
    pdf_source: Union[str, Path, bytes, io.BytesIO], 
    filename: str = "lecture.pdf"
) -> IngestedDocument:
    """
    High-level entrypoint: parses, cleans, and semantically chunks
    a PDF document for the Didactic AI engine.
    """
    pages = extract_text_from_pdf(pdf_source)
    return chunk_document(pages, filename=filename)
