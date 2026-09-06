"""Unit tests for notification parsers (no FastAPI/DB required)."""

from app.services.notification_parsers import parse_ars_amount, parse_notification


def test_parse_ars_thousands_and_decimals():
    assert parse_ars_amount("Transferiste $1.250,50 a juan.mp") == 1250.5
    assert parse_ars_amount("Transferiste $2.000 a panaderia.mp") == 2000.0
    assert parse_ars_amount("Pagaste $350,00 en Panaderia") == 350.0


def test_mercadopago_transfer_out():
    parsed = parse_notification(
        android_package="com.mercadopago.wallet",
        title="Transferencia",
        text="Transferiste $2.000 a panaderia.mp",
    )
    assert parsed is not None
    assert parsed.source == "mercadopago"
    assert parsed.amount == 2000.0
    assert parsed.direction == "out"
    assert parsed.alias == "panaderia.mp"


def test_santander_payment():
    parsed = parse_notification(
        android_package="ar.com.santander.rio.mbanking",
        title="Pago",
        text="Pagaste $350,00 en Panaderia X",
    )
    assert parsed is not None
    assert parsed.source == "santander"
    assert parsed.amount == 350.0
    assert parsed.name == "Panaderia X"


def test_provincia_package():
    parsed = parse_notification(
        android_package="ar.bapro",
        title="BIP",
        text="Recibiste $10.000,00 de sueldo.mp",
    )
    assert parsed is not None
    assert parsed.source == "banco_provincia"
    assert parsed.direction == "in"
    assert parsed.amount == 10000.0
