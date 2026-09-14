import { Trans } from "@lingui/react/macro";

import { AppIconSelector } from "./app-icon";
import { SidebarItemFieldsSettings } from "./sidebar-item-fields";
import { ThemeSelector } from "./theme";

import { SettingsPageTitle } from "~/settings/page-title";
import { PERSONAL_HIDE_APP_ICON_PICKER } from "~/shared/personal";

export function SettingsAppearance() {
  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <SettingsPageTitle title={<Trans>Appearance</Trans>} />
      <ThemeSelector />
      {!PERSONAL_HIDE_APP_ICON_PICKER && <AppIconSelector />}
      <SidebarItemFieldsSettings />
    </div>
  );
}
