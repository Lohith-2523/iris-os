import type { Prisma } from '@prisma/client';

export async function purgeOrganizationData(
  tx: Prisma.TransactionClient,
  orgId: string,
  onStage: (stage: string) => void = () => undefined,
) {
  onStage('deleting generated documents');
  await tx.generatedDocument.deleteMany({ where: { orgId } });

  onStage('deleting secure messages');
  await tx.encryptedAttachment.deleteMany({ where: { orgId } });
  await tx.encryptedMessage.deleteMany({ where: { orgId } });
  await tx.messagingConversation.deleteMany({ where: { orgId } });
  await tx.messagingDevice.deleteMany({ where: { orgId } });

  onStage('deleting workspace activity');
  await tx.notification.deleteMany({ where: { orgId } });
  await tx.calendarEvent.deleteMany({ where: { orgId } });
  await tx.googleCalendarConnection.deleteMany({ where: { orgId } });
  await tx.memberInvite.deleteMany({ where: { orgId } });

  onStage('deleting financial data');
  await tx.transaction.deleteMany({ where: { orgId } });
  await tx.invoice.deleteMany({ where: { orgId } });
  await tx.expense.deleteMany({ where: { orgId } });
  await tx.recurringSubscription.deleteMany({ where: { orgId } });
  await tx.recurringRetainer.deleteMany({ where: { orgId } });
  await tx.financialForecast.deleteMany({ where: { orgId } });

  onStage('deleting project and client data');
  await tx.deliverable.deleteMany({ where: { orgId } });
  await tx.changeRequest.deleteMany({ where: { orgId } });
  await tx.clientTask.deleteMany({ where: { client: { orgId } } });
  await tx.project.deleteMany({ where: { orgId } });
  await tx.metaLead.deleteMany({ where: { orgId } });
  await tx.client.deleteMany({ where: { orgId } });
  await tx.agencyLead.deleteMany({ where: { orgId } });

  onStage('deleting reports and intelligence data');
  await tx.report.deleteMany({ where: { orgId } });
  await tx.strategy.deleteMany({ where: { orgId } });
  await tx.askAtlasMessage.deleteMany({ where: { orgId } });
  await tx.atlasChatSession.deleteMany({ where: { orgId } });
  await tx.atlasInsight.deleteMany({ where: { orgId } });

  onStage('deleting automations and integrations');
  await tx.automationRun.deleteMany({ where: { automation: { orgId } } });
  await tx.automation.deleteMany({ where: { orgId } });
  await tx.metaPageConnection.deleteMany({ where: { orgId } });
  await tx.integrationConnection.deleteMany({ where: { orgId } });

  onStage('deleting campaigns and creative data');
  await tx.metaAd.deleteMany({ where: { orgId } });
  await tx.metaCampaign.deleteMany({ where: { orgId } });
  await tx.agencyMetaAdAccount.deleteMany({ where: { orgId } });
  await tx.designAsset.deleteMany({ where: { brand: { orgId } } });
  await tx.campaign.deleteMany({ where: { brand: { orgId } } });
  await tx.brand.deleteMany({ where: { orgId } });
}
