import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { errorMessage } from '../src/api.js';
import {
  AFFECTED_BY,
  STOREFRONT_POLLED,
  meQuery,
  refreshAfterSave,
  staffOrdersQuery,
  staffStoreQuery,
} from '../src/queries.js';
import { formatClock } from '../src/constants/storefront.js';
import { useStoreSwitch } from '../src/useStoreSwitch.js';
import { useNow } from '../src/useNow.js';
import StaffOrderCard from '../src/components/StaffOrderCard.jsx';
import Spinner from '../src/components/Spinner.jsx';

// The three tabs, in order. The tab lives in the URL (?tab=cooking) so a
// refresh, or coming back from ร้าน / เมนู, lands on the same tab (Jui,
// 2026-11-11); one page and one request feed all three.
const TABS = [
  {
    id: 'pending',
    status: 'pending_payment',
    label: 'รอยืนยันจ่าย',
    empty: 'ไม่มีออเดอร์รอยืนยันจ่าย',
  },
  {
    id: 'cooking',
    status: 'cooking',
    label: 'กำลังทำ',
    empty: 'ไม่มีออเดอร์ที่กำลังทำ',
  },
  {
    id: 'ready',
    status: 'ready',
    label: 'รอรับ',
    empty: 'ไม่มีออเดอร์รอรับ',
  },
];

const time = (iso) => (iso ? new Date(iso).getTime() : Infinity);

// How each tab is ordered (the server sends them oldest first): awaiting
// payment oldest first; cooking by queue number, an order without one last;
// ready by when it became ready
const SORTERS = {
  pending_payment: (a, b) => time(a.createdAt) - time(b.createdAt),
  cooking: (a, b) => (a.queueNumber ?? Infinity) - (b.queueNumber ?? Infinity),
  ready: (a, b) => time(a.readyAt) - time(b.readyAt),
};

function Dot({ color }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill="currentColor" className={color} />
    </svg>
  );
}

function StoreIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10l1.5-5h15L21 10" />
      <path d="M4 10v10h16V10" />
      <path d="M3 10h18" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

// The red card at the top while the store is closed (artifact StaffClosed,
// Jui 2026-11-11). Opening is refused by the server while the payment QR
// isn't set up (400) — said here in Thai.
function StoreClosedCard({ store, tab }) {
  const { setOpen, isPending, error } = useStoreSwitch();

  return (
    <section
      role="status"
      className="flex flex-col gap-3.5 rounded-md border-2 border-danger bg-surface-raised p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-pink text-danger">
          <StoreIcon size={22} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-page-title text-danger">
            ร้านปิดรับออเดอร์อยู่
          </h2>
          <p className="text-body-small text-ink-muted">
            ลูกค้าสแกน QR จะเห็นหน้าร้านปิด สั่งไม่ได้
            {store.updatedBy &&
              ` · ปิดโดย ${store.updatedBy.name} ${formatClock(store.updatedAt)}`}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-body-small text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="flex min-h-13 items-center justify-center gap-2 rounded-md bg-status-done text-button-primary text-on-brand disabled:opacity-60"
      >
        <StoreIcon size={18} />
        {isPending ? 'กำลังเปิดร้าน…' : 'เปิดร้าน'}
      </button>
      <Link
        to="/staff/menu"
        state={{ tab }}
        className="inline-flex min-h-11 items-center self-center text-button-secondary text-brand hover:text-brand-hover"
      >
        เช็กเมนูที่หมดก่อนเปิด
      </Link>
    </section>
  );
}

// Dashed box for a tab with nothing in it (the design draws it in StaffClosed;
// the wording for each tab is ours)
function EmptyTab({ title, hint }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed border-border px-4 py-10 text-center">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-ink-muted"
      >
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="12" y2="16" />
      </svg>
      <p className="text-[15px] font-semibold leading-[22px]">{title}</p>
      {hint && <p className="text-body-small text-ink-muted">{hint}</p>}
    </div>
  );
}

function InfoNote({ children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-surface-peach px-4 py-3">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-px shrink-0 text-status-pending"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16" x2="12" y2="16" />
      </svg>
      <p className="text-body-small text-ink">{children}</p>
    </div>
  );
}

// Storefront orders for staff (/staff, DESIGN §4.2–4.6): three tabs fed by
// one GET /api/staff/orders polled every 5 s. Only reached from inside the
// app — the dashboard's way in (a card on Home) comes with the go-live merge.
function Staff() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const now = useNow(15000);

  const orders = useQuery({ ...staffOrdersQuery, ...STOREFRONT_POLLED });
  const store = useQuery({ ...staffStoreQuery, ...STOREFRONT_POLLED });
  const me = useQuery(meQuery);

  const tab = TABS.find((t) => t.id === searchParams.get('tab')) ?? TABS[0];
  const byStatus = Object.fromEntries(
    TABS.map(({ status }) => [
      status,
      (orders.data ?? [])
        .filter((o) => o.status === status)
        .sort(SORTERS[status]),
    ]),
  );
  const list = byStatus[tab.status];
  const isClosed = store.data?.isOpen === false;

  // A card that slid away is dropped from the cache at once, then the list
  // catches up with the server
  function removeOrder(id) {
    queryClient.setQueryData(staffOrdersQuery.queryKey, (old) =>
      old?.filter((o) => o._id !== id),
    );
    refreshAfterSave(queryClient, AFFECTED_BY.staffOrder);
  }
  // The other phone got there first: just show what's true now
  function refreshOrders() {
    queryClient.invalidateQueries({ queryKey: staffOrdersQuery.queryKey });
  }

  // Only before the first load: a poll that fails later keeps the last data
  // on screen and says so in the header
  const failed = !orders.data && orders.error;
  const reconnecting = orders.data && orders.isError;
  const name = me.data?.name ? ` · ${me.data.name}` : '';

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface">
      <header className="flex flex-col gap-3 border-b border-border bg-surface-raised px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="font-heading text-page-title">ออเดอร์หน้าร้าน</h1>
            <p className="flex items-center gap-1.5 text-label text-ink-muted">
              {reconnecting ? (
                <>
                  <Dot color="text-status-pending" />
                  เชื่อมต่อไม่ได้ · กำลังลองใหม่
                </>
              ) : isClosed ? (
                <>
                  <Dot color="text-danger" />
                  ร้านปิดอยู่{name}
                </>
              ) : (
                <>
                  <Dot color="text-status-done" />
                  อัปเดตทุก 5 วิ{name}
                </>
              )}
            </p>
          </div>
          <Link
            to="/staff/menu"
            state={{ tab: tab.id }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-surface-peach px-3.5 text-button-secondary text-ink"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
            ร้าน / เมนู
          </Link>
        </div>

        <nav
          aria-label="สถานะออเดอร์"
          className="grid grid-cols-3 gap-1 rounded-pill bg-surface p-1"
        >
          {TABS.map((t) => {
            const active = t.id === tab.id;
            return (
              <Link
                key={t.id}
                to={{ search: t.id === 'pending' ? '' : `?tab=${t.id}` }}
                replace
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill text-body-small ${
                  active ? 'bg-brand font-semibold text-on-brand' : 'text-ink'
                }`}
              >
                {t.label}
                {/* No count until the first load: a "0" would read as "no orders" */}
                {orders.data && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-bold ${
                      active
                        ? 'bg-surface-raised text-brand'
                        : 'bg-surface-apricot text-ink'
                    }`}
                  >
                    {byStatus[t.status].length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-3 p-4">
        {failed ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {errorMessage(orders.error)}
            </p>
            <button
              type="button"
              onClick={() => orders.refetch()}
              className="min-h-11 rounded-md bg-surface-peach px-4 text-button-secondary text-ink"
            >
              ลองใหม่
            </button>
          </div>
        ) : !orders.data ? (
          <Spinner label="กำลังโหลดออเดอร์" />
        ) : (
          <>
            {isClosed && <StoreClosedCard store={store.data} tab={tab.id} />}

            {isClosed &&
              tab.status !== 'ready' &&
              byStatus.ready.length > 0 && (
                <Link
                  to={{ search: '?tab=ready' }}
                  replace
                  className="flex items-center gap-3 rounded-md bg-status-done-bg px-4 py-3.5 text-ink"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised font-heading text-[16px] font-bold text-status-done">
                    {byStatus.ready.length}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-body font-semibold text-status-done">
                      ยังมีออเดอร์รอลูกค้ามารับ
                    </span>
                    <span className="text-label text-ink">
                      ปิดร้านแล้วยังส่งของ/กด “ลูกค้ารับแล้ว” ได้ตามปกติ
                    </span>
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-status-done"
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </Link>
              )}

            {list.length === 0 ? (
              <EmptyTab
                title={tab.empty}
                hint={
                  tab.status === 'pending_payment'
                    ? isClosed
                      ? 'เปิดร้านแล้ว ออเดอร์ใหม่จะขึ้นที่นี่'
                      : 'ออเดอร์ใหม่จะขึ้นที่นี่'
                    : ''
                }
              />
            ) : (
              <>
                <p className="text-body-small text-ink-muted">
                  {tab.status === 'pending_payment' && (
                    <>
                      เทียบ <strong className="text-ink">ยอด + ชื่อ</strong>{' '}
                      กับแจ้งเตือนธนาคาร แล้วกดยืนยัน — เก่าสุดอยู่บน
                    </>
                  )}
                  {tab.status === 'cooking' &&
                    'เรียงตามเลขคิว — ทำเสร็จกด “พร้อมรับ” หน้าลูกค้าจะขึ้นว่ามารับได้'}
                  {tab.status === 'ready' &&
                    'ลูกค้ามารับ → เช็กเลขคิวกับชื่อ → ส่งของ แล้วกด “ลูกค้ารับแล้ว”'}
                </p>
                <ul>
                  {list.map((order) => (
                    <StaffOrderCard
                      key={order._id}
                      order={order}
                      now={now}
                      onGone={removeOrder}
                      onConflict={refreshOrders}
                    />
                  ))}
                </ul>
                {tab.status === 'pending_payment' && (
                  <InfoNote>
                    ออเดอร์ที่รอเกิน 5 นาทีจะมีกรอบสีส้ม — ถ้าลูกค้าไม่ได้จ่าย กด “ยกเลิก”
                  </InfoNote>
                )}
                {tab.status === 'ready' && (
                  <InfoNote>
                    พร้อมเกิน 10 นาทีแล้วยังไม่มารับ จะมีกรอบสีส้ม — กดเบอร์เพื่อโทรตามได้
                  </InfoNote>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Staff;
