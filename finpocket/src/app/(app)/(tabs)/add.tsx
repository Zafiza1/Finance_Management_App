import { Redirect } from 'expo-router';

/** The Add tab opens the transaction modal instead (see the tab listener); this is a fallback. */
export default function AddTab() {
  return <Redirect href="/transaction/new" />;
}
