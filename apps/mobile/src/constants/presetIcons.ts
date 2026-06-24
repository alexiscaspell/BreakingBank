import type { MaterialCommunityIcons } from "@expo/vector-icons";
import { normalizeEntityName } from "../utils/normalize";

export const CATEGORY_ICON_PRESETS: PresetIcon[] = [
  { key: "supermarket", icon: "cart", label: "Supermercado", color: "#e91e8c" },
  { key: "house", icon: "home", label: "Casa", color: "#4ecdc4" },
  { key: "transport", icon: "bus", label: "Transporte", color: "#2196F3" },
  { key: "meat", icon: "food-steak", label: "Carnicería", color: "#f44336" },
  { key: "greengrocer", icon: "carrot", label: "Verdulería", color: "#4CAF50" },
  { key: "delivery", icon: "pizza", label: "Delivery", color: "#FFC107" },
  { key: "ant", icon: "spider", label: "Gasto hormiga", color: "#1a3d2e" },
  { key: "gift", icon: "gift", label: "Regalos", color: "#e91e8c" },
  { key: "salary", icon: "cash", label: "Salario", color: "#4CAF50" },
  { key: "other", icon: "help-circle", label: "Otros", color: "#9E9E9E" },
  { key: "restaurant", icon: "silverware-fork-knife", label: "Restaurante", color: "#FF5722" },
  { key: "coffee", icon: "coffee", label: "Café", color: "#795548" },
  { key: "beer", icon: "beer", label: "Bar", color: "#FF9800" },
  { key: "gas", icon: "gas-station", label: "Combustible", color: "#607D8B" },
  { key: "car", icon: "car", label: "Auto", color: "#3F51B5" },
  { key: "parking", icon: "parking", label: "Estacionamiento", color: "#9E9E9E" },
  { key: "taxi", icon: "taxi", label: "Taxi", color: "#FFEB3B" },
  { key: "train", icon: "train", label: "Tren", color: "#009688" },
  { key: "plane", icon: "airplane", label: "Viajes", color: "#03A9F4" },
  { key: "hotel", icon: "bed", label: "Hotel", color: "#673AB7" },
  { key: "health", icon: "hospital-box", label: "Salud", color: "#E53935" },
  { key: "pharmacy", icon: "pill", label: "Farmacia", color: "#00BCD4" },
  { key: "gym", icon: "dumbbell", label: "Gimnasio", color: "#FF4081" },
  { key: "beauty", icon: "face-woman", label: "Belleza", color: "#F06292" },
  { key: "clothes", icon: "tshirt-crew", label: "Ropa", color: "#AB47BC" },
  { key: "shoes", icon: "shoe-sneaker", label: "Calzado", color: "#8D6E63" },
  { key: "pets", icon: "dog", label: "Mascotas", color: "#A1887F" },
  { key: "kids", icon: "baby-carriage", label: "Hijos", color: "#81C784" },
  { key: "education", icon: "school", label: "Educación", color: "#5C6BC0" },
  { key: "books", icon: "book-open-variant", label: "Libros", color: "#7986CB" },
  { key: "phone", icon: "cellphone", label: "Celular", color: "#42A5F5" },
  { key: "internet", icon: "wifi", label: "Internet", color: "#29B6F6" },
  { key: "tv", icon: "television", label: "TV / Streaming", color: "#7E57C2" },
  { key: "music", icon: "music", label: "Música", color: "#EC407A" },
  { key: "games", icon: "gamepad-variant", label: "Juegos", color: "#7CB342" },
  { key: "tools", icon: "tools", label: "Herramientas", color: "#78909C" },
  { key: "repair", icon: "wrench", label: "Reparaciones", color: "#90A4AE" },
  { key: "electricity", icon: "flash", label: "Luz", color: "#FFD54F" },
  { key: "water", icon: "water", label: "Agua", color: "#4FC3F7" },
  { key: "gas_home", icon: "fire", label: "Gas", color: "#FF7043" },
  { key: "rent", icon: "home-city", label: "Alquiler", color: "#8D6E63" },
  { key: "taxes", icon: "file-document", label: "Impuestos", color: "#546E7A" },
  { key: "insurance", icon: "shield-check", label: "Seguros", color: "#26A69A" },
  { key: "investment", icon: "chart-line", label: "Inversiones", color: "#66BB6A" },
  { key: "savings", icon: "piggy-bank", label: "Ahorro", color: "#FFB74D" },
  { key: "loan", icon: "bank-transfer", label: "Préstamos", color: "#EF5350" },
  { key: "charity", icon: "hand-heart", label: "Donaciones", color: "#BA68C8" },
  { key: "party", icon: "party-popper", label: "Fiestas", color: "#FF8A65" },
  { key: "sport", icon: "soccer", label: "Deportes", color: "#43A047" },
  { key: "cinema", icon: "movie", label: "Cine", color: "#5E35B1" },
  { key: "shopping", icon: "shopping", label: "Compras", color: "#D81B60" },
  { key: "electronics", icon: "laptop", label: "Electrónica", color: "#3949AB" },
  { key: "furniture", icon: "sofa", label: "Muebles", color: "#6D4C41" },
  { key: "cleaning", icon: "broom", label: "Limpieza", color: "#80CBC4" },
  { key: "laundry", icon: "washing-machine", label: "Lavadero", color: "#4DD0E1" },
  { key: "baby", icon: "baby-carriage", label: "Bebé", color: "#F48FB1" },
  { key: "freelance", icon: "briefcase", label: "Freelance", color: "#26C6DA" },
  { key: "bonus", icon: "star", label: "Bonus", color: "#FFCA28" },
  { key: "refund", icon: "cash-refund", label: "Reembolso", color: "#AED581" },
  { key: "interest", icon: "percent", label: "Intereses", color: "#81D4FA" },
  { key: "rent_income", icon: "key", label: "Alquiler cobrado", color: "#A5D6A7" },
];

export const ACCOUNT_ICON_PRESETS: PresetIcon[] = [
  { key: "wallet", icon: "wallet", label: "Billetera", color: "#4ecdc4" },
  { key: "bank", icon: "bank", label: "Banco", color: "#2196F3" },
  { key: "cash", icon: "cash", label: "Efectivo", color: "#4CAF50" },
  { key: "credit_card", icon: "credit-card", label: "Tarjeta", color: "#9C27B0" },
  { key: "savings", icon: "piggy-bank", label: "Ahorros", color: "#FF9800" },
  { key: "investment", icon: "chart-line", label: "Inversión", color: "#00BCD4" },
  { key: "crypto", icon: "bitcoin", label: "Crypto", color: "#FFC107" },
  { key: "paypal", icon: "contactless-payment", label: "Digital", color: "#3F51B5" },
  { key: "safe", icon: "safe", label: "Caja fuerte", color: "#795548" },
  { key: "business", icon: "briefcase", label: "Negocio", color: "#607D8B" },
];

export const PRESET_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
  Object.fromEntries(CATEGORY_ICON_PRESETS.map((p) => [p.key, p.icon]));

export const ACCOUNT_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
  Object.fromEntries(ACCOUNT_ICON_PRESETS.map((p) => [p.key, p.icon]));

export const COLOR_OPTIONS = [
  "#4ecdc4", "#2196F3", "#4CAF50", "#e91e8c", "#FFC107", "#FF5722",
  "#9C27B0", "#795548", "#607D8B", "#E53935", "#00BCD4", "#673AB7",
];

const CATEGORY_ALIASES: Record<string, string> = {
  carniceria: "Carnicería",
  verduleria: "Verdulería",
  libreria: "Libros",
  indumentaria: "Ropa",
  bazar: "Compras",
  salidas: "Restaurante",
  ocio: "Cine",
  veterinaria: "Mascotas",
};

export function presetForCategoryName(name: string, type: "expense" | "income" = "expense"): PresetIcon | undefined {
  const norm = normalizeEntityName(name);
  const aliasLabel = CATEGORY_ALIASES[norm];
  if (aliasLabel) {
    const aliasNorm = normalizeEntityName(aliasLabel);
    const fromAlias = CATEGORY_ICON_PRESETS.find((p) => normalizeEntityName(p.label) === aliasNorm);
    if (fromAlias) return fromAlias;
  }
  return CATEGORY_ICON_PRESETS.find((p) => normalizeEntityName(p.label) === norm);
}
