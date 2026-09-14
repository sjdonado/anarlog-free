import { Trans } from "@lingui/react/macro";

import { useSetSettingValue } from "~/settings/queries";
import { SettingSwitchRow } from "~/settings/setting-row";
import { useConfigValue } from "~/shared/config";

export function AutoEnhanceToggle() {
  const enabled = useConfigValue("auto_enhance_after_transcript") !== false;
  const setValue = useSetSettingValue("auto_enhance_after_transcript");

  return (
    <SettingSwitchRow
      title={<Trans>Auto-generate summary</Trans>}
      description={
        <Trans>
          When off, transcripts stay as-is until you generate the summary
          manually.
        </Trans>
      }
      checked={enabled}
      onChange={setValue}
    />
  );
}
