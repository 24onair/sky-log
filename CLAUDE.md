@AGENTS.md

---

# 실수 기록 — 이거 이렇게 하지 마

## [Next.js] Server Component에서 `dynamic` + `ssr: false` 쓰지 마

**틀린 코드 (app/layout.tsx):**
```ts
import dynamic from "next/dynamic";
const AnnouncementPopup = dynamic(() => import("@/components/AnnouncementPopup"), { ssr: false });
```

**에러:** `'ssr: false' is not allowed with next/dynamic in Server Components.`

**올바른 방법:**  
`app/layout.tsx`는 Server Component다. `"use client"` 컴포넌트를 여기에 넣을 때는  
그냥 직접 import 해라. `useEffect` 안에서만 `localStorage` 접근하면 SSR에서 안 터진다.

```ts
import AnnouncementPopup from "@/components/AnnouncementPopup"; // 그냥 이렇게
```

---

## [Supabase] 어드민이 다른 회원 데이터 조회할 때 user_id 필터 걸리는 함수 쓰지 마

**틀린 코드 (app/logbook/[id]/page.tsx):**
```ts
const data = await getFlightLogById(user.id, logId); // user_id 필터 포함
```

**에러:** 어드민이 다른 회원 로그 상세 페이지 열면 "비행 기록을 찾을 수 없습니다"

**원인:** `getFlightLogById`는 `user_id = currentUser.id` AND `id = logId`로 필터.  
어드민 본인 ID != 로그 소유자 ID → null 반환.

**올바른 방법:**  
어드민이 다른 회원 데이터를 봐야 할 경우, service role 키를 쓰는 API 라우트를 별도로 만들고  
user_id 필터 없이 id만으로 조회해라.

```ts
// app/api/admin/logs/[id]/route.ts — user_id 필터 없이 service role로 조회
const res = await sbFetch(`flight_logs?id=eq.${id}&limit=1`);
```

---

## [Navbar] 어드민 전용 링크는 Navbar 컴포넌트에도 추가해야 함

관리자 페이지(`/admin/page.tsx`)에 메뉴 카드를 추가했다고 끝이 아니다.  
`components/Navbar.tsx`의 ADMIN 섹션(83번째 줄 근처)에도 `navLink`를 추가해야  
상단 네브바에서 바로 접근할 수 있다.

**체크리스트:** 어드민 기능 추가 시
- [ ] `/admin/page.tsx` — 메뉴 카드
- [ ] `components/Navbar.tsx` — ADMIN 섹션 navLink
- [ ] `app/api/admin/[기능]/route.ts` — service role API + **`requireAdmin()` 가드**

---

## [보안] service role API 라우트엔 반드시 `requireAdmin()` 가드를 걸어라

service role 키는 RLS를 우회한다. `app/api/admin/**` 라우트는 클라이언트 페이지의
이메일 체크(`router.push("/")`)만으로는 못 막는다 — URL만 알면 누구나 직접 호출 가능.
모든 핸들러 최상단에 가드를 넣어라:

```ts
import { requireAdmin } from "@/lib/supabase/adminGuard";
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  // ...
}
```

---

## [Supabase] 테이블/컬럼을 대시보드에서 손으로 만들지 마 — 마이그레이션으로 남겨라

SQL Editor에서 직접 `create table`/`alter table` 하면 운영 DB와 git이 어긋난다
(스키마 드리프트). 새 환경에서 `supabase/migrations/`만 돌리면 기능이 깨진다.

실제로 `profiles.is_active`, `flight_logs.track_points`, `announcements`/`banners`
테이블이 마이그레이션 없이 운영 DB에만 존재했었다(2026-06-30 역기록 완료).
스키마를 바꾸면 **반드시** `supabase/migrations/`에 멱등(`if not exists`,
`drop policy if exists`, `create or replace`) 마이그레이션 파일을 추가할 것.
