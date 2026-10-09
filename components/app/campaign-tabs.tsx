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
  const approved = messages.filter((m) => m.review_status === 'approved').length;
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList>
        <TabsTrigger value="leads">{t.campaign.tabs.leads}<Badge variant="neutral"><span className="num">{leads.length}</span></Badge></TabsTrigger>
        <TabsTrigger value="review">{t.campaign.tabs.review}{pending > 0 && <Badge variant="warning"><span className="num">{pending}</span></Badge>}</TabsTrigger>
        <TabsTrigger value="send">{t.campaign.tabs.send}{approved > 0 && <Badge variant="success"><span className="num">{approved}</span></Badge>}</TabsTrigger>
      </TabsList>
      <TabsContent value="leads">
        <LeadsTable campaign={campaign} leads={leads} hasMessages={messages.length > 0} busy={busy} onGenerated={() => setTab('review')} />
      </TabsContent>
      <TabsContent value="review">
        <ReviewQueue messages={messages} leads={leads} onGoLeads={() => setTab('leads')} />
      </TabsContent>
      <TabsContent value="send">
        <SendList messages={messages} sentToday={sentToday} dailyCap={dailyCap} />
      </TabsContent>
    </Tabs>
  );
}
