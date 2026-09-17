# CDSCO Desk

GitHub Pages에서 제공하는 공개 프로젝트 데모입니다. `index.html`과 `membership-preview.html`은 로그인 없이 바로 프로젝트 화면을 표시합니다. 왼쪽 화면 선택 메뉴에서 올라 어드민(소유주)과 고객사 페이지를 전환하며, 처음에는 어드민 화면이 열립니다. 화면의 예시 데이터와 브라우저 저장 기능을 사용하며 Supabase 인증 및 회원 조회를 호출하지 않습니다.

## 현재 회원가입 정책

공개 회원가입 화면과 가입 API 호출을 제거했습니다. 기존 계정의 로그인과 관리자 업체 관리는 유지합니다. 로컬 `supabase/config.toml`에서도 신규 가입을 비활성화했습니다. 운영 Supabase의 신규 가입 허용 설정은 별도로 꺼야 하며, 이 로컬 변경만으로 운영 설정이 변경되지는 않습니다.

## 회원 서비스 연결

아래는 보관된 회원 서비스의 설정 기록입니다. 현재 공개 페이지에서는 `membership.js`, `membership.css`, `auth-config.js`를 로드하지 않습니다.

### Supabase CLI로 설정하기 (권장)

Node.js 20 이상과 로컬 실행용 Docker가 필요합니다. CLI 설정과 최초 회원 테이블 마이그레이션이 포함되어 있으므로 `supabase init`을 다시 실행할 필요는 없습니다.

```sh
npm install
npx supabase start
npx supabase migration up
npx supabase status
python3 -m http.server 8000
```

`supabase status`에 표시된 API URL과 공개 publishable/anon 키를 `auth-config.js`에 입력하고 `http://127.0.0.1:8000/`을 엽니다. 인증 이메일은 로컬 Mailpit(`http://127.0.0.1:54324`)에서 확인합니다. service_role/secret 키는 사용하지 않습니다.

원격의 **새 프로젝트**에는 다음 순서로 적용합니다.

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

그 후 아래 3~8단계의 원격 Auth 설정, 공개 연결 정보, 관리자 지정 작업을 진행합니다. 로컬 `config.toml`의 Auth 설정은 `db push`로 원격에 적용되지 않습니다.

이미 `schema.sql`을 실행한 프로젝트에서는 최초 마이그레이션을 중복 실행하지 마세요. 기존 스키마가 해당 SQL과 같은지 확인한 경우에만 `npx supabase migration repair 20260915000000 --status applied`로 이력을 등록합니다.

### 기존 최초 구축 절차 (회원가입 제거 전 기록)

아래 가입 절차는 현재 화면에서 제공하지 않습니다. 기존 계정과 회원 정보를 유지하며, 운영 환경에서 공개 가입을 다시 활성화하지 마세요.

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql`을 **새 프로젝트에 한 번** 실행합니다.
3. Authentication의 이메일 가입 및 Confirm Email을 활성화합니다. 비밀번호 최소 길이를 12자로 설정합니다.
4. Site URL과 Redirect URLs에 `https://daniellee-lab.github.io/CDSCO_OLA_PUBLIC/`를 등록합니다. 실서비스 이메일 발송에는 프로젝트의 SMTP 설정과 발송 한도를 확인합니다.
5. `auth-config.js`에 프로젝트 URL과 **publishable key**(또는 legacy anon key)를 입력합니다. 공개 클라이언트 키만 사용하며 secret/service_role 키는 절대 넣지 않습니다.
6. 사이트를 열어 `daniellee@olacorporation.com`으로 일반 회원가입을 하고 이메일 인증을 완료합니다.
7. SQL Editor에서 `supabase/bootstrap-admin.sql`을 실행합니다 (아래 SQL과 동일). 사용자가 직접 선택하는 관리자 가입 기능은 없습니다.

```sql
update public.company_members m
set role = 'admin', status = 'approved', updated_at = now()
from auth.users u
where m.id = u.id
  and lower(u.email) = lower('daniellee@olacorporation.com')
  and u.email_confirmed_at is not null;
```

8. 관리자 계정으로 로그인해 업체의 정보와 가입 상태를 관리합니다.
9. `index.html`, `membership.css`, `membership.js`, `auth-config.js`를 커밋·푸시하면 Pages에서 제공됩니다.

## 구현 범위

- 기존 계정의 이메일·비밀번호 로그인
- 로그인, 로그아웃, 세션 복원
- 서버에서 고정하는 신규 계정의 `client / pending` 상태
- 승인 대기·반려·이용정지 화면, 승인된 업체의 내 정보 및 빈 프로젝트 화면
- 관리자 업체 검색/필터, 정보 수정, 승인·반려·정지, 서버 내 처리 이력 기록
- 업체는 자신의 프로필만 조회; 관리자만 전체 조회와 관리 RPC 호출 가능
- 관리자 역할/승인 상태 직접 업데이트는 클라이언트에서 불가능
- 30초마다 및 탭 복귀 시 승인 상태 재확인

**기존 프로젝트 화면은 브라우저에 저장되는 예시 데이터입니다.** 관리자에게만 데모 진입을 제공하지만 HTML 소스 자체는 공개됩니다. 실제 업체 서류/프로젝트 데이터는 넣지 마세요. 신규 가입업체에는 예시 프로젝트를 배정하지 않습니다. 실제 프로젝트 생성/배정, 기존 SKU·서류의 서버 이전 및 파일 저장소 연동은 아직 구현되지 않았습니다. 해당 기능을 추가할 때 각 테이블/스토리지 정책에서 승인 상태와 업체 소유권을 함께 검사해야 합니다. 회원 정보는 localStorage가 아닌 Supabase에 저장되며, 인증 세션은 Supabase SDK가 관리합니다.

## 검증

```sh
npm test
```

연결 후 서로 다른 브라우저에서 다음을 확인하세요.

- 가입 → 이메일 인증 → 로그인 → 승인 대기
- 관리자에서 업체 정보 확인 및 승인 → 업체 화면 새로고침 → 승인 완료
- 업체 A가 업체 B의 UUID로 조회 시 데이터 없음
- 대기/승인된 일반 계정으로 관리 RPC 호출 시 거부
- 일반 계정으로 role/status 직접 PATCH 시 거부
- 이용정지 후 업체 화면이 정지 안내로 변경됨
- 이메일 중복 가입, 틀린 비밀번호, 네트워크 오류 시 적절한 안내

구조 참고: [Supabase 사용자 테이블](https://supabase.com/docs/guides/auth/managing-user-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

CLI 참고: [공식 CLI 문서](https://supabase.com/docs/reference/cli/introduction).

## Distribution 및 Marketing 데모

사이드바에서 현지 재고 및 인플루언서 현황을 조회합니다. 월별 그래프·표는 동일한 고객사 필터를 사용합니다. 어드민은 전체/개별 고객사를 선택하고 고객사 미리보기는 SOME BY MI로 고정됩니다. 예시 데이터는 `operations.js`에 있으며 실제 운영 데이터가 아닙니다.

현재 로그인 없는 정적 데모의 필터는 접근 권한 통제가 아닙니다. 실제 고객사별 비공개 운영에는 인증과 서버의 고객사별 조회 권한(RLS)을 연결하고, 공개 JavaScript에서 실제 고객사 데이터를 제거해야 합니다.

## 재고 및 시딩 엑셀 업로드·수동 수정

어드민에서 각 표의 수정 버튼으로 행을 편집할 수 있습니다. 고객사·월은 행의 소속을 유지하며, 재고 월말수량과 그래프는 저장 즉시 재계산됩니다. 고객사 미리보기에서는 편집·업로드가 제공되지 않습니다.

엑셀 업로드는 먼저 고객사와 조회 월을 지정한 뒤 .xlsx 또는 .xls 파일(10MB 이하)을 드롭하거나 선택합니다. 양식 다운로드를 제공하며 첫 행에 표와 동일한 열 제목이 필요합니다. 단일 시트는 즉시 반영하고 여러 시트는 사용자가 반영할 시트를 선택합니다. 선택한 고객사·월 목록 전체를 교체하며 다른 고객사와 월은 유지합니다. 재고 월말수량은 빈칸이면 계산하고 값이 있으면 검증합니다. 마케팅 인게이지먼트는 4.8 또는 4.8%로, 발송일은 YYYY-MM-DD로 입력합니다. 중복·잘못된 수량·다른 고객사·다른 발송월은 반영하지 않습니다.

변경 데이터는 브라우저 localStorage에 저장됩니다. 다른 기기/브라우저 또는 실제 고객 계정으로 공유되지 않습니다. 운영용 인증·서버 데이터 저장은 별도 연결이 필요합니다.

Excel 파서는 [SheetJS 공식 배포](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)의 0.20.3을 assets/vendor에 보관합니다. 라이선스는 같은 디렉터리의 SheetJS-LICENSE.txt를 참조하세요.
