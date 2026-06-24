import unicodedata


def normalize_entity_name(name: str) -> str:
    text = " ".join(str(name).strip().split())
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.casefold()
