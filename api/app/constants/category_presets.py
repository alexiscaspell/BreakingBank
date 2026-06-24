from app.utils.names import normalize_entity_name

# (label, type, color, icon_key) — mirrors apps/mobile/src/constants/presetIcons.ts
CATEGORY_PRESETS: list[tuple[str, str, str, str]] = [
    ("Supermercado", "expense", "#e91e8c", "supermarket"),
    ("Casa", "expense", "#4ecdc4", "house"),
    ("Transporte", "expense", "#2196F3", "transport"),
    ("Carnicería", "expense", "#f44336", "meat"),
    ("Verdulería", "expense", "#4CAF50", "greengrocer"),
    ("Delivery", "expense", "#FFC107", "delivery"),
    ("Gasto hormiga", "expense", "#1a3d2e", "ant"),
    ("Regalos", "expense", "#e91e8c", "gift"),
    ("Salario", "income", "#4CAF50", "salary"),
    ("Otros", "expense", "#9E9E9E", "other"),
    ("Otros ingresos", "income", "#9E9E9E", "other"),
    ("Restaurante", "expense", "#FF5722", "restaurant"),
    ("Café", "expense", "#795548", "coffee"),
    ("Bar", "expense", "#FF9800", "beer"),
    ("Combustible", "expense", "#607D8B", "gas"),
    ("Auto", "expense", "#3F51B5", "car"),
    ("Estacionamiento", "expense", "#9E9E9E", "parking"),
    ("Taxi", "expense", "#FFEB3B", "taxi"),
    ("Tren", "expense", "#009688", "train"),
    ("Viajes", "expense", "#03A9F4", "plane"),
    ("Hotel", "expense", "#673AB7", "hotel"),
    ("Salud", "expense", "#E53935", "health"),
    ("Farmacia", "expense", "#00BCD4", "pharmacy"),
    ("Gimnasio", "expense", "#FF4081", "gym"),
    ("Belleza", "expense", "#F06292", "beauty"),
    ("Ropa", "expense", "#AB47BC", "clothes"),
    ("Calzado", "expense", "#8D6E63", "shoes"),
    ("Mascotas", "expense", "#A1887F", "pets"),
    ("Hijos", "expense", "#81C784", "kids"),
    ("Educación", "expense", "#5C6BC0", "education"),
    ("Libros", "expense", "#7986CB", "books"),
    ("Celular", "expense", "#42A5F5", "phone"),
    ("Internet", "expense", "#29B6F6", "internet"),
    ("TV / Streaming", "expense", "#7E57C2", "tv"),
    ("Música", "expense", "#EC407A", "music"),
    ("Juegos", "expense", "#7CB342", "games"),
    ("Herramientas", "expense", "#78909C", "tools"),
    ("Reparaciones", "expense", "#90A4AE", "repair"),
    ("Luz", "expense", "#FFD54F", "electricity"),
    ("Agua", "expense", "#4FC3F7", "water"),
    ("Gas", "expense", "#FF7043", "gas_home"),
    ("Alquiler", "expense", "#8D6E63", "rent"),
    ("Impuestos", "expense", "#546E7A", "taxes"),
    ("Seguros", "expense", "#26A69A", "insurance"),
    ("Inversiones", "expense", "#66BB6A", "investment"),
    ("Ahorro", "expense", "#FFB74D", "savings"),
    ("Préstamos", "expense", "#EF5350", "loan"),
    ("Donaciones", "expense", "#BA68C8", "charity"),
    ("Fiestas", "expense", "#FF8A65", "party"),
    ("Deportes", "expense", "#43A047", "sport"),
    ("Cine", "expense", "#5E35B1", "cinema"),
    ("Compras", "expense", "#D81B60", "shopping"),
    ("Electrónica", "expense", "#3949AB", "electronics"),
    ("Muebles", "expense", "#6D4C41", "furniture"),
    ("Limpieza", "expense", "#80CBC4", "cleaning"),
    ("Lavadero", "expense", "#4DD0E1", "laundry"),
    ("Bebé", "expense", "#F48FB1", "baby"),
    ("Freelance", "income", "#26C6DA", "freelance"),
    ("Bonus", "income", "#FFCA28", "bonus"),
    ("Reembolso", "income", "#AED581", "refund"),
    ("Intereses", "income", "#81D4FA", "interest"),
    ("Alquiler cobrado", "income", "#A5D6A7", "rent_income"),
]

# Aliases from common imports / other apps (normalized key -> preset label)
CATEGORY_ALIASES: dict[str, str] = {
    "carniceria": "Carnicería",
    "verduleria": "Verdulería",
    "libreria": "Libros",
    "indumentaria": "Ropa",
    "bazar": "Compras",
    "salidas": "Restaurante",
    "ocio": "Cine",
    "veterinaria": "Mascotas",
}

DEFAULT_CATEGORIES = CATEGORY_PRESETS[:11]

_PRESET_BY_NORM: dict[tuple[str, str], tuple[str, str, str]] = {}
for _label, _typ, _color, _key in CATEGORY_PRESETS:
    _PRESET_BY_NORM[(normalize_entity_name(_label), _typ)] = (_label, _color, _key)


def preset_for_category_name(name: str, tx_type: str) -> tuple[str, str, str] | None:
    norm = normalize_entity_name(name)
    hit = _PRESET_BY_NORM.get((norm, tx_type))
    if hit:
        return hit
    alias_label = CATEGORY_ALIASES.get(norm)
    if alias_label:
        hit = _PRESET_BY_NORM.get((normalize_entity_name(alias_label), tx_type))
        if hit:
            return hit
    hit = _PRESET_BY_NORM.get((norm, "expense"))
    if hit:
        return hit
    return None
