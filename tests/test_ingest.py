import io
import pytest
from pypdf import PdfWriter
from src.ai.ingest import clean_text, extract_text_from_pdf, chunk_document, ingest_pdf


def test_clean_text():
    dirty = "  Lecture   1:   Introduction  \n\n\n\nTo Operating Systems\t\t\n  "
    cleaned = clean_text(dirty)
    assert cleaned == "Lecture 1: Introduction\n\nTo Operating Systems"
    assert clean_text("") == ""
    assert clean_text(None) == ""


def test_chunk_document_slide_level():
    mock_pages = [
        (1, "Slide 1: Process Management\n\nA process is a program in execution."),
        (2, "Slide 2: Threading\n\nA thread is the smallest unit of execution within a process."),
    ]
    doc = chunk_document(mock_pages, filename="cs301_lecture1.pdf", max_chunk_words=100)

    assert doc.filename == "cs301_lecture1.pdf"
    assert doc.total_pages == 2
    assert len(doc.chunks) == 2
    assert doc.chunks[0].chunk_id == "chunk_001"
    assert doc.chunks[0].page_number == 1
    assert "Process Management" in doc.chunks[0].content
    assert doc.chunks[1].page_number == 2
    assert "Threading" in doc.chunks[1].content


def test_chunk_document_dense_splitting():
    dense_text = "word " * 600
    mock_pages = [(1, dense_text.strip())]
    doc = chunk_document(mock_pages, filename="dense.pdf", max_chunk_words=250)

    assert doc.total_pages == 1
    # 600 words with max 250 words per chunk -> 3 chunks (250, 250, 100)
    assert len(doc.chunks) == 3
    assert doc.chunks[0].token_estimate == 250
    assert doc.chunks[1].token_estimate == 250
    assert doc.chunks[2].token_estimate == 100


def test_extract_from_bytes_blank_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    # Empty page should extract 0 text pages without crashing
    pages = extract_text_from_pdf(pdf_bytes)
    assert len(pages) == 0

    doc = ingest_pdf(pdf_bytes, filename="empty.pdf")
    assert doc.total_pages == 0
    assert len(doc.chunks) == 0
