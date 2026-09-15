import Image from 'next/image';
import {
  BarChart3, Bell, CalendarDays, CheckSquare2, CircleDollarSign, FileText,
  FolderKanban, LayoutDashboard, Search, Settings2, Sparkles, Sun, Users,
} from 'lucide-react';
import styles from './iris-landing.module.css';

const defaultNavigation = [
  [LayoutDashboard, 'Command Center'], [Users, 'Clients'], [FolderKanban, 'Projects'],
  [CheckSquare2, 'Tasks'], [CircleDollarSign, 'Finance'], [BarChart3, 'Reporting'],
  [CalendarDays, 'Calendar'], [FileText, 'Documents'], [Sparkles, 'Atlas AI'],
] as const;

type WorkspacePreviewProps = {
  active?: string;
  area: string;
  children: React.ReactNode;
  description?: string;
  navigation?: readonly string[];
  title: string;
};

export function WorkspacePreview({
  active = 'Command Center', area, children,
  description = 'Northstar Studio workspace', navigation, title,
}: WorkspacePreviewProps) {
  const navigationItems = navigation
    ? navigation.map((label, index) => [defaultNavigation[index % defaultNavigation.length][0], label] as const)
    : defaultNavigation;

  return (
    <div className={`${styles.workspacePreview} workspace-shell`} aria-label={`Iris OS ${area} preview with sample data`}>
      <aside className={`${styles.previewSidebar} workspace-sidebar`}>
        <div className={styles.previewBrand}><Image src="/iris-logo-white-transparent.svg" alt="" width={24} height={24} /><span><b>IRIS</b> OS</span></div>
        <div className={styles.previewOrganization}><span>NS</span><div><b>Northstar Studio</b><small>Advanced workspace</small></div></div>
        <nav aria-label={`${area} preview navigation`}>
          <small>Workspace</small>
          {navigationItems.map(([Icon, label]) => <span className={label === active ? styles.previewNavActive : undefined} key={label}><Icon aria-hidden="true" /><b>{label}</b></span>)}
        </nav>
        <div className={styles.previewProfile}><span>AK</span><div><b>Alex Kim</b><small>Workspace admin</small></div><Settings2 aria-hidden="true" /></div>
      </aside>

      <div className={styles.previewMain}>
        <div className={`${styles.previewTopbar} workspace-topbar`}>
          <div className={styles.previewAtlasSearch}><Sparkles aria-hidden="true" /><span>Ask Atlas AI</span></div>
          <div className={styles.previewTopbarActions}><Bell aria-hidden="true" /><Sun aria-hidden="true" /><span><Search aria-hidden="true" /> Search <kbd>⌘ K</kbd></span></div>
        </div>
        <div className={`${styles.previewCanvas} workspace-main`}>
          <header className={styles.previewPageHeader}>
            <div><small>{area}</small><h3>{title}</h3><p>{description}</p></div>
            <span className={styles.previewDataBadge}><i /> Preview data</span>
          </header>
          <div className={styles.previewContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}
