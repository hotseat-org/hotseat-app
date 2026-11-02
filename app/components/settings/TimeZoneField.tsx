import { ComboBox, Description, Input, Label, ListBox } from "@heroui/react"
import { useMemo } from "react"
import { useI18n } from "~/i18n/I18nProvider"
import { formatTimeZone, getTimeZoneOffset, listTimeZones } from "~/utils/timeZone"

/**
 * An office's time zone, searchable ("prague", "new york"): what "today" is
 * there, and when the day's usual desks get booked. Sent as `name`.
 */
export const TimeZoneField = ({
  name,
  value,
  onChange,
  isDisabled,
}: {
  name: string
  value: string
  onChange: (zone: string) => void
  isDisabled?: boolean
}) => {
  const { t } = useI18n()
  const zones = useMemo(
    () =>
      listTimeZones().map((zone) => ({
        zone,
        label: `${formatTimeZone(zone)} · ${getTimeZoneOffset(zone)}`,
      })),
    []
  )

  return (
    <ComboBox
      selectedKey={value}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      isDisabled={isDisabled}
      menuTrigger="focus"
    >
      <Label>{t("Time zone")}</Label>
      <ComboBox.InputGroup>
        <Input placeholder={t("Search, e.g. London")} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <Description>{t("What “today” is in this office, for bookings.")}</Description>
      <ComboBox.Popover>
        <ListBox className="max-h-72">
          {zones.map(({ zone, label }) => (
            <ListBox.Item key={zone} id={zone} textValue={label}>
              {label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
      {/* The zone itself, not the text in the box. */}
      <input type="hidden" name={name} value={value} />
    </ComboBox>
  )
}
