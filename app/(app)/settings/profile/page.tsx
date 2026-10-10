import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { InterviewFlow } from '@/components/app/interview-flow';
import { PageHeader } from '@/components/app/page-header';

// Settings > business profile: the same interview, rerunnable. Nothing changes until the user confirms the summary card.
export default async function ProfileInterviewPage() {
  const { org } = await requireOrg();
  const { t } = await getT();
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t.interview.rerun} description={t.interview.rerunDesc} />
      <InterviewFlow mode="rerun" orgName={org.name} initial={org.offer_profile} />
    </div>
  );
}
