import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  // The default dashboard is for the consumer role.
  redirect('/dashboard/consumer');
}
