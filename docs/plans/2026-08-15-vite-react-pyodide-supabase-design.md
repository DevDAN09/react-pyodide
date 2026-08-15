# Vite React Pyodide Supabase 테스트 프로젝트 설계

## 목적

브라우저의 Pyodide Web Worker에서 Python 코드를 실행하고, 실행 코드와 결과를 호스팅된 Supabase에 저장한 뒤 최신 기록을 다시 조회하는 통합 흐름을 검증한다.

이번 프로젝트는 인증 없는 단일 사용자 테스트 환경을 전제로 한다. Pyodide 기본 제공 패키지만 사용하며, 패키지 설치·사용자별 데이터 분리·기록 삭제·재실행은 범위에서 제외한다.

## 사용자 경험

화면은 코드 편집기, 실행 버튼, 현재 실행 결과, 최신 실행 기록 목록으로 구성한다.

앱은 Pyodide 준비 상태를 표시한다. 준비가 끝나면 사용자가 Python 코드를 한 번에 하나씩 실행할 수 있다. 현재 결과에는 표준 출력, 표준 오류, 최종 표현식 값, traceback, 실행 시간을 구분해 표시한다. 실행 기록은 최신 20건을 보여준다.

## 아키텍처

### React UI

- 코드 입력과 실행 동작을 제공한다.
- Pyodide Worker의 준비·실행 상태를 관리한다.
- Worker가 반환한 결과를 즉시 화면에 표시한다.
- 실행 기록을 Supabase에 저장하고 최신 기록을 조회한다.
- Python 실행 오류와 Supabase 오류를 서로 독립적으로 표시한다.

### Pyodide Web Worker

- module 타입 Worker에서 Pyodide를 한 번 초기화한다.
- Python 코드를 UI 스레드 밖에서 `runPythonAsync()`로 실행한다.
- 실행별 고유 요청 ID를 사용한다.
- `stdout`, `stderr`, 최종 표현식 값, traceback과 실행 시간을 구조화해 반환한다.
- 한 번에 하나의 실행만 처리한다.

Pyodide 공식 문서가 설명하듯 긴 동기 연산은 메인 스레드에서 UI를 멈출 수 있으므로 Web Worker를 사용한다.

### Supabase

- React 앱의 브라우저 클라이언트에서 직접 접근한다.
- publishable/anon 키만 Vite 환경 변수로 제공한다.
- 서비스 역할 키와 다른 비밀 값은 브라우저 번들에 넣지 않는다.
- 인증 없는 테스트 전용 RLS 정책으로 필요한 insert와 select만 허용한다.
- 공개 테스트 테이블에는 개인정보나 비밀 코드를 저장하지 않는다.

## 데이터 모델

`python_runs` 단일 테이블을 사용한다.

| 필드 | 타입 | 역할 |
| --- | --- | --- |
| `id` | `uuid` | 기본 키 |
| `code` | `text` | 실행한 Python 코드 |
| `stdout` | `text` | 표준 출력 |
| `stderr` | `text` | 표준 오류 |
| `result` | `text` | 최종 표현식 값을 문자열로 변환한 결과 |
| `error` | `text` | Python 예외 메시지와 traceback |
| `status` | `text` | `success` 또는 `error` |
| `duration_ms` | `integer` | Pyodide 실행 시간 |
| `created_at` | `timestamptz` | 실행 시각 |

`status`에는 허용 값 제약을 두고 `created_at desc` 조회에 적합한 인덱스를 둔다.

## 데이터 흐름

1. React가 앱 시작 시 Worker를 만들고 Pyodide 초기화를 요청한다.
2. Worker가 준비 완료 또는 초기화 오류를 반환한다.
3. 사용자가 코드를 실행하면 React가 고유 요청 ID와 코드를 Worker에 전달한다.
4. Worker가 출력 스트림을 초기화하고 Python 코드를 실행한다.
5. Worker가 구조화된 실행 결과를 React에 반환한다.
6. React가 실행 결과를 즉시 화면에 표시한다.
7. React가 같은 결과를 Supabase에 저장한다.
8. 저장에 성공하면 최신 20개 기록을 다시 조회한다.

Python 실행 결과와 Supabase 저장 결과는 별도 상태로 관리한다. Python 실행이 성공하고 저장이 실패해도 실행 결과는 화면에 유지한다.

## 오류 처리

### 초기화 실패

실행 버튼을 비활성화하고 오류와 재시도 버튼을 표시한다. 재시도는 기존 Worker를 정리하고 새 Worker를 만든다.

### Python 예외

traceback을 `error`에 기록하고 예외 이전의 표준 출력과 표준 오류도 보존한다. 실패 실행 역시 Supabase 저장 대상이다.

### timeout

기본 실행 제한은 10초다. 제한을 넘기면 현재 Worker를 종료하고 timeout 실패 결과를 만든 뒤 새 Worker를 초기화한다. 새 Worker가 준비될 때까지 다음 실행을 막는다.

### Supabase 저장 실패

현재 Python 결과를 유지하고 저장 실패 메시지와 다시 저장 버튼을 표시한다. 중복 레코드를 피하기 위해 자동 재시도는 하지 않는다.

### 기록 조회 실패

기록 영역에만 오류와 재조회 버튼을 표시한다. 편집기와 Python 실행은 계속 사용할 수 있다.

### 중복과 오래된 응답

실행 중에는 실행 버튼을 비활성화한다. 요청 ID가 현재 실행과 일치하는 응답만 적용해 오래된 응답이 화면을 덮지 못하게 한다.

## 테스트 전략

### 단위 테스트

- Worker 메시지 요청과 응답 연결
- 실행 결과 정규화
- Supabase 행 변환
- timeout 처리와 Worker 재생성

Vitest를 사용한다.

### React 통합 테스트

- 초기화, 실행, 저장, 조회 상태 전환
- 실행 성공 후 기록 갱신
- Python 실패와 저장 실패의 독립 표시
- 조회 실패가 실행 기능을 막지 않는지 확인

React Testing Library에서 Worker와 Supabase를 대체 구현으로 검증한다.

### 실브라우저 스모크 테스트

- 실제 Pyodide가 Worker에서 로드되는지 확인
- `print("hello")`와 `1 + 2`의 출력 및 결과 확인
- Python 예외와 10초 timeout 확인
- 호스팅된 Supabase에 저장 후 새로고침해 기록이 다시 조회되는지 확인

## 완료 기준

1. UI가 멈추지 않고 Python 코드가 실행된다.
2. 표준 출력, 최종 값, 오류와 실행 시간이 올바르게 구분된다.
3. 성공과 실패 기록이 Supabase에 저장된다.
4. 새로고침 후 최신 20개 기록이 다시 표시된다.
5. 10초 timeout 뒤 Worker가 복구되어 다음 코드를 실행할 수 있다.
6. 저장·조회 장애가 Python 실행 자체를 막지 않는다.
7. 타입 검사, 단위·통합 테스트와 프로덕션 빌드가 통과한다.

## 제외 범위

- 사용자 인증과 사용자별 데이터 격리
- `micropip` 또는 런타임 패키지 설치
- 기록 페이지네이션, 상세 화면, 삭제와 재실행
- Supabase Edge Function
- Python 파일 업로드와 브라우저 파일 시스템 연동

## 참고 자료

- [Using Pyodide in a web worker](https://pyodide.org/en/stable/usage/webworker.html)
- [Supabase JavaScript insert](https://supabase.com/docs/reference/javascript/insert)
- [Supabase JavaScript select](https://supabase.com/docs/reference/javascript/select)
- [Vite 환경 변수와 모드](https://vite.dev/guide/env-and-mode)
