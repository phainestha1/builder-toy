import styles from "../../admin.module.css";
import { ApplicationTable } from "../_components/application-table";
import { DetailPanel } from "../_components/detail-panel";
import { PageHeader } from "../_components/page-header";
import { SearchBox } from "../_components/search-box";
import { StatusTabs } from "../_components/status-tabs";
import { loadApplicationDetail, loadApplicationList } from "../_lib/load";
import { STATUS_TABS, type StatusFilter } from "../_lib/view-model";
import { changeStatusAction, payRewardAction, revealPhoneNumberAction } from "../actions";

const BASE_PATH = "/admin/applications";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusParam = single(params.status);
  const status: StatusFilter = STATUS_TABS.some((tab) => tab.key === statusParam) ? (statusParam as StatusFilter) : "All";
  const query = single(params.q);
  const selectedId = single(params.id);

  const [list, detail] = await Promise.all([
    loadApplicationList({ status, query }),
    selectedId ? loadApplicationDetail(selectedId) : Promise.resolve(null),
  ]);

  const linkFor = (applicationId: string) => {
    const next = new URLSearchParams();
    if (status !== "All") next.set("status", status);
    if (query) next.set("q", query);
    next.set("id", applicationId);
    return `${BASE_PATH}?${next}`;
  };

  return (
    <>
      <PageHeader title="접수 관리" aside={`오늘 접수 ${list.todayCount}건`} />
      <div className={styles.toolbar}>
        <StatusTabs basePath={BASE_PATH} current={status} query={query} counts={list.counts} />
        <SearchBox basePath={BASE_PATH} status={status === "All" ? null : status} query={query} error={list.searchError} />
      </div>
      <div className={styles.workspace}>
        <div>
          <ApplicationTable rows={list.rows} selectedId={selectedId} linkFor={linkFor} />
        </div>
        {detail ? (
          <DetailPanel
            key={detail.applicationId}
            detail={detail}
            message={single(params.msg)}
            actions={{
              changeStatus: changeStatusAction,
              payReward: payRewardAction,
              revealPhoneNumber: revealPhoneNumberAction.bind(null, detail.applicationId),
            }}
          />
        ) : (
          <aside className={styles.panel}>
            <p className={styles.caption}>
              {selectedId ? "접수를 찾을 수 없어요." : "목록에서 접수를 고르면 상세가 보여요."}
            </p>
          </aside>
        )}
      </div>
    </>
  );
}
