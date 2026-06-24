import { ChipGroup } from "./material/Chip";
import { useLocale } from "../contexts/LocaleContext";
import { PERIOD_KEYS, type PeriodKey } from "../i18n";

export function PeriodTabs({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  const { t } = useLocale();
  return (
    <ChipGroup
      items={PERIOD_KEYS.map((p) => ({ key: p, label: t(`period.${p}`) }))}
      value={value}
      onChange={onChange}
      scrollable
    />
  );
}
