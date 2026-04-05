import RtaPlayerOverviewClient from '@/features/rta/components/RtaPlayerOverviewClient';

export default async function RtaPlayerOverviewPage({ params }: { params: Promise<{ wizardId: string }> }) {
  const { wizardId } = await params;
  return <RtaPlayerOverviewClient wizardId={wizardId} />;
}
