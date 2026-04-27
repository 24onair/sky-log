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
- [ ] `app/api/admin/[기능]/route.ts` — service role API
