"""Preset integration sources for the MVP bank/wallet apps."""

INTEGRATION_PRESETS: list[dict[str, str]] = [
    {
        "key": "mercadopago",
        "display_name": "Mercado Pago",
        "android_package": "com.mercadopago.wallet",
    },
    {
        "key": "santander",
        "display_name": "Santander",
        "android_package": "ar.com.santander.rio.mbanking",
    },
    {
        "key": "banco_provincia",
        "display_name": "Banco Provincia (BIP)",
        "android_package": "ar.bapro",
    },
]

INTEGRATION_KEYS = frozenset(p["key"] for p in INTEGRATION_PRESETS)
PACKAGE_TO_SOURCE = {p["android_package"]: p["key"] for p in INTEGRATION_PRESETS}
