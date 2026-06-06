# 본성뮤직 아카데미 인트라넷 MVP 제품 명세

## 목표

새로 개원하는 실용음악학원의 초기 운영을 빠르게 디지털화하는 내부 웹앱을 만든다. 1차 MVP는 학생, 보호자, 상담, 수강, 수업, 출결, 레슨노트, 연습실 예약, 수납 메모, 대시보드를 하나의 관리자/직원/강사용 업무 흐름으로 연결하는 것을 목표로 한다.

이번 단계에서는 UI 구현을 하지 않고, 프로젝트 구조와 데이터 모델을 먼저 정의한다.

## 기술 스택

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Auth.js with Prisma Adapter
- Vercel 배포

## 제안 프로젝트 구조

```text
.
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── guardians/
│   │   ├── consultations/
│   │   ├── enrollments/
│   │   ├── lessons/
│   │   ├── attendance/
│   │   ├── lesson-notes/
│   │   ├── practice-rooms/
│   │   └── payments/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── ui/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── validators/
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
│   └── product-spec.md
├── types/
└── tests/
```

### 구조 기준

- `app/(auth)`: 로그인 등 인증 전용 화면을 둔다.
- `app/(dashboard)`: 로그인 후 내부 운영 화면을 둔다. 각 업무 영역은 URL과 폴더를 일치시킨다.
- `app/api`: Auth.js 라우트와 서버 액션으로 처리하기 애매한 API 엔드포인트를 둔다.
- `components`: 재사용 가능한 레이아웃, 폼, 테이블, 공통 UI를 둔다.
- `lib/auth`: Auth.js 설정, 세션 확장, 서버 인증 헬퍼를 둔다.
- `lib/db`: Prisma Client 싱글턴과 DB 접근 유틸을 둔다.
- `lib/permissions`: `admin`, `staff`, `teacher` 권한 체크를 둔다.
- `lib/validators`: Zod 등 입력 검증 스키마를 둔다.
- `prisma`: DB 스키마, 마이그레이션, 시드 데이터를 둔다.

## 권한 모델

권한은 MVP에서 단순하게 시작한다.

- `admin`: 전체 데이터 접근, 사용자/권한 관리, 설정 관리
- `staff`: 학생, 보호자, 상담, 수강, 시간표, 출결, 연습실, 수납 메모 관리
- `teacher`: 본인 수업, 본인 학생 출결, 레슨노트 작성/조회 중심

초기에는 `User.role` 기반 RBAC로 처리한다. 세부 권한 테이블은 MVP 이후 필요할 때 추가한다.

## Prisma Schema 초안

스키마 파일은 [prisma/schema.prisma](../prisma/schema.prisma)에 작성한다. Auth.js 기본 모델과 학원 운영 도메인 모델을 함께 둔다.

핵심 모델은 다음과 같다.

- `User`: 내부 사용자. `admin`, `staff`, `teacher` 역할을 가진다.
- `Student`: 학생 또는 예비 학생. 상담 리드부터 재원생까지 같은 테이블에서 관리한다.
- `Guardian`: 보호자. 한 보호자가 여러 학생과 연결될 수 있다.
- `StudentGuardian`: 학생과 보호자의 다대다 연결 및 관계 정보.
- `Consultation`: 상담 기록. 학생, 보호자, 상담 담당자와 연결된다.
- `Course`: 수강 과목 또는 클래스 단위. 악기, 레벨, 담당 강사를 가진다.
- `Enrollment`: 학생의 수강 등록. 학생과 과목을 연결하고 수강 상태와 수강료를 가진다.
- `LessonSchedule`: 반복 시간표. 요일, 시작/종료 시간, 강의실을 가진다.
- `EnrollmentSchedule`: 수강 등록과 반복 시간표의 연결.
- `LessonSession`: 실제 수업 회차. 반복 시간표에서 생성되거나 보강/임시 수업으로 직접 생성될 수 있다.
- `Attendance`: 실제 수업 회차별 학생 출결.
- `LessonNote`: 실제 수업 회차별 학생 레슨노트.
- `PracticeRoom`: 연습실.
- `PracticeRoomReservation`: 연습실 예약.
- `PaymentMemo`: 수납, 환불, 할인 등 금전 관련 메모.

## 핵심 엔티티 관계

학생과 보호자는 다대다 관계다. 형제자매가 같은 보호자를 공유할 수 있고, 한 학생에게 여러 보호자가 있을 수 있으므로 `StudentGuardian` 조인 테이블을 둔다. 대표 보호자는 `isPrimary`로 표시한다.

상담은 학생이 아직 등록되지 않은 상태에서도 생성될 수 있다. 그래서 `Consultation.studentId`와 `guardianId`는 선택값이다. 상담이 등록으로 이어지면 기존 상담 기록을 학생과 연결한다.

수강은 `Student -> Enrollment -> Course` 흐름이다. 학생은 여러 과목을 들을 수 있고, 과목에는 여러 학생이 등록될 수 있다. 수강 상태는 `active`, `paused`, `completed`, `canceled`로 관리한다.

시간표는 반복 일정과 실제 수업 회차를 분리한다. `LessonSchedule`은 "매주 화요일 18:00 보컬 A룸" 같은 반복 규칙이고, `LessonSession`은 "2026-06-09 18:00 실제 수업"이다. 출결과 레슨노트는 반드시 실제 수업 회차인 `LessonSession`에 연결한다.

강사는 `User` 중 `role = teacher`인 사용자로 표현한다. `Course`, `LessonSchedule`, `LessonSession`, `LessonNote`가 강사와 연결된다. MVP에서는 별도 `TeacherProfile`을 만들지 않고, 강사용 추가 정보가 필요해질 때 확장한다.

연습실 예약은 `PracticeRoom -> PracticeRoomReservation` 관계다. 예약자는 내부 사용자일 수 있고, 실제 사용 학생도 연결할 수 있다.

수납은 회계 원장 수준이 아니라 운영 메모 수준으로 시작한다. `PaymentMemo`는 학생 기준으로 금액, 납부 예정일, 납부일, 메모를 기록한다. 결제 자동화나 청구서는 MVP 이후 별도 모델로 분리한다.

## MVP 개발 순서

1. 프로젝트 초기화
   - Next.js App Router, TypeScript, Tailwind CSS 설정
   - ESLint/Prettier 설정
   - Vercel 배포 환경 변수 기준 정리

2. 데이터베이스 기반 작업
   - PostgreSQL 연결
   - Prisma 설정
   - `schema.prisma` 반영
   - 초기 마이그레이션 생성
   - 관리자 계정과 샘플 데이터 seed 작성

3. 인증 및 권한
   - Auth.js Prisma Adapter 설정
   - 로그인/로그아웃 구현
   - 세션에 `user.id`, `user.role` 포함
   - 서버 컴포넌트/서버 액션용 권한 헬퍼 작성

4. 공통 운영 레이아웃
   - 로그인 후 공통 사이드바/상단바
   - 권한별 메뉴 노출
   - 목록, 상세, 생성, 수정 화면의 공통 패턴 정리

5. 학생/보호자 관리
   - 학생 목록, 등록, 수정, 상세
   - 보호자 목록, 등록, 수정
   - 학생-보호자 연결 및 대표 보호자 지정

6. 상담 관리
   - 상담 등록, 상태 변경, 다음 액션 관리
   - 학생/보호자 상세에서 상담 이력 조회
   - 상담에서 학생 등록으로 이어지는 흐름 구현

7. 수강 관리
   - 과목 생성 및 담당 강사 지정
   - 학생 수강 등록
   - 수강 상태 변경
   - 학생 상세에서 현재 수강 목록 조회

8. 수업/시간표
   - 반복 시간표 생성
   - 수강 등록과 시간표 연결
   - 실제 수업 회차 생성
   - 강사별/일자별 시간표 조회

9. 출결 관리
   - 수업 회차별 출결 체크
   - 학생별 출결 이력
   - 결석/지각 메모

10. 레슨노트
    - 강사가 수업 회차별 학생 레슨노트 작성
    - 학생 상세에서 레슨노트 이력 조회
    - 직원/관리자의 조회 권한 확인

11. 연습실 예약
    - 연습실 등록
    - 날짜/시간별 예약 생성
    - 예약 상태 변경
    - 중복 예약 방지 검증

12. 수납 메모
    - 학생별 수납 메모 작성
    - 납부 예정일/납부일 관리
    - 미납 또는 예정 메모 대시보드 노출

13. 대시보드
    - 재원생 수
    - 오늘 수업 수
    - 오늘 출결 현황
    - 예정 상담
    - 미납/수납 예정 메모
    - 오늘 연습실 예약

14. MVP 검수 및 배포
    - 핵심 플로우 E2E 점검
    - 권한별 접근 테스트
    - Prisma migration 검증
    - Vercel preview 배포
    - 운영용 환경 변수 점검

## MVP 이후 후보

- 문자/카카오 알림 연동
- 월별 청구서와 실제 결제 내역 관리
- 강사 급여 정산
- 학생/보호자 포털
- 보강권/휴강권 관리
- 파일 첨부
- 감사 로그
- 고급 권한 정책
