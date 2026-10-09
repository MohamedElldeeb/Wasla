'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LeadsTable } from '@/components/app/leads-table';
import { ReviewQueue } from '@/components/app/review-queue';
import { SendList } from '@/components/app/send-list';
import { useT } from '@/components/app/i18n-provider';
import type { Campaign, CampaignLead, Message } from '@/lib/types';

type Props = { campaign: Campaign; leads: CampaignLead[]; messages: Message[]; sentToday: number; dailyCap: number; busy: boolean };

export function CampaignTabs({ campaign, leads, messages, sentToday, dailyCap, busy }: Props) {
  const t = useT();
  const [tab, setTab] = useState('leads');
  const pending = messages.filter((m) => m.review_status === 'pending').length;
  const approved = messages.filter((m) => m.review_status === 'approved' || m.review_status === 'sent').length;
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList className="h-auto w-full justify-start">
        <TabsTrigger value="leads" className="gap-2 py-2.5 text-sm">{t.campaign.tabs.leads}<Badge variant="secondary">{leads.length}</Badge></TabsTrigger>
        <TabsTrigger value="review" className="gap-2 py-2.5 text-sm">{t.campaign.tabs.review}{pending > 0 && <Badge variant="secondary">{pending}</Badge>}</TabsTrigger>
        <TabsTrigger value="send" className="gap-2 py-2.5 text-sm">{t.campaign.tabs.send}{approved > 0 && <Badge variant="secondary">{approved}</Badge>}</TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-5">
        <LeadsTable campaign={campaign} leads={leads} hasMessages={messages.length > 0} busy={busy} onGenerated={() => setTab('review')} />
      </TabsContent>
      <TabsContent value="review" className="mt-5">
        <ReviewQueue messages={messages} onGoLeads={() => setTab('leads')} />
      </TabsContent>
      <TabsContent value="send" className="mt-5">
        <SendList messages={messages} sentToday={sentToday} dailyCap={dailyCap} />
      </TabsContent>
    </Tabs>
  );
}
