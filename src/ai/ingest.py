import io
import re
from typing import Any, Dict, List, Tuple, Union
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


def extract_from_pptx(
    source: Union[bytes, str, io.BytesIO]
) -> Tuple[List[Dict[str, Any]], str, List[str]]:
    """
    Extracts text and speaker notes from a PowerPoint (.pptx) presentation.
    Detects image-only slides.

    Returns:
        Tuple of (slides_data, full_text, warnings)
    """
    from pptx import Presentation

    if isinstance(source, bytes):
        stream = io.BytesIO(source)
    elif isinstance(source, io.BytesIO):
        stream = source
    else:
        stream = source

    prs = Presentation(stream)
    slides_data = []
    full_text_parts = []
    warnings = []

    for idx, slide in enumerate(prs.slides):
        slide_num = idx + 1
        text_runs = []

        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        text_runs.append(line)

        slide_text = "\n".join(text_runs) if text_runs else "No text found (potential image/diagram only slide)"
        if not text_runs:
            warnings.append(f"Slide {slide_num}: No text found - may be image or diagram only")

        notes_text = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes_paragraphs = [p.text.strip() for p in slide.notes_slide.notes_text_frame.paragraphs if p.text.strip()]
            notes_text = "\n".join(notes_paragraphs)

        slides_data.append({
            "slide_number": slide_num,
            "text": slide_text,
            "speaker_notes": notes_text,
        })

        full_text_parts.append(f"[Slide {slide_num}]\n{slide_text}")
        if notes_text:
            full_text_parts.append(f"[Slide {slide_num} Speaker Notes]\n{notes_text}")

    full_text = "\n\n".join(full_text_parts)
    return slides_data, full_text, warnings


def extract_from_docx(source: Union[bytes, str, io.BytesIO]) -> str:
    """Extracts text from a Word (.docx) document."""
    from docx import Document

    if isinstance(source, bytes):
        stream = io.BytesIO(source)
    elif isinstance(source, io.BytesIO):
        stream = source
    else:
        stream = source

    doc = Document(stream)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


class DocumentExtractionResult(tuple):
    """
    Polymorphic extraction result that behaves as a 3-tuple (full_text, sections, warnings)
    when unpacked, and as a string when evaluated as str().
    """

    def __new__(cls, full_text: str, sections: List[Dict[str, Any]], warnings: List[str]):
        return super().__new__(cls, (full_text, sections, warnings))

    def __str__(self) -> str:
        return self[0]

    @property
    def full_text(self) -> str:
        return self[0]

    @property
    def sections(self) -> List[Dict[str, Any]]:
        return self[1]

    @property
    def warnings(self) -> List[str]:
        return self[2]


def extract_document_text(
    source: Union[bytes, str, io.BytesIO],
    filename: str,
    file_type: Optional[str] = None,
) -> DocumentExtractionResult:
    """
    Extracts cleaned text and section chunks from PDF, PPTX, DOCX, or TXT.
    Compatible with both (source, filename) and (source, filename, file_type).
    """
    ext = Path(filename).suffix.lower() if filename else f".{file_type or 'txt'}"
    sections: List[Dict[str, Any]] = []
    warnings: List[str] = []
    full_text = ""

    if ext == ".pdf":
        pages = extract_text_from_pdf(source)
        full_text = "\n\n".join(t for _, t in pages)
        sections = [{"source_ref": f"Page {p}", "text": t} for p, t in pages]
    elif ext in (".pptx", ".ppt"):
        pptx_sections, full_text, notes = extract_from_pptx(source)
        sections = pptx_sections
    elif ext in (".docx", ".doc"):
        full_text = extract_from_docx(source)
        paragraphs = [p for p in full_text.split("\n\n") if p.strip()]
        sections = [{"source_ref": f"Section {i+1}", "text": p} for i, p in enumerate(paragraphs)]
    else:
        if isinstance(source, bytes):
            full_text = source.decode("utf-8", errors="replace")
        elif hasattr(source, "read"):
            content = source.read()
            full_text = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else str(content)
        else:
            full_text = Path(source).read_text(encoding="utf-8", errors="replace")
        sections = [{"source_ref": "text", "text": full_text}]

    return DocumentExtractionResult(full_text, sections, warnings)

