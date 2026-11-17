import { SettingsScreen } from "@/components/settings/settings";

export default function Page() {
  return <SettingsScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
