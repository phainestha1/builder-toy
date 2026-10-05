// BC 경계 규칙 (.claude/rules/architecture.md, docs/decisions/0001-bounded-contexts.md)
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "bc-only-ports-and-events",
      comment: "다른 BC는 ports/와 shared/events/만 import한다. 다른 BC의 domain, application, infra는 금지",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/(domain|application|infra)/",
        pathNot: ["^src/modules/$1/", "^src/modules/shared/"],
      },
    },
    {
      name: "shared-not-to-bc",
      comment: "shared는 어떤 BC도 import하지 않는다",
      severity: "error",
      from: { path: "^src/modules/shared/" },
      to: { path: "^src/modules/", pathNot: "^src/modules/shared/" },
    },
    {
      name: "ports-only-contracts",
      comment: "ports는 계약(다른 ports, shared/events)만 import한다. 내부 엔티티를 노출하지 않는다",
      severity: "error",
      from: { path: "^src/modules/[^/]+/ports/" },
      to: {
        path: "^src/",
        pathNot: ["^src/modules/[^/]+/ports/", "^src/modules/shared/events/"],
      },
    },
    {
      name: "events-only-events",
      comment: "shared/events는 다른 모듈을 import하지 않는다",
      severity: "error",
      from: { path: "^src/modules/shared/events/" },
      to: { path: "^src/", pathNot: "^src/modules/shared/events/" },
    },
    {
      name: "domain-pure",
      comment: "domain은 application, infra, Next.js, React, Drizzle, DB 드라이버를 import하지 않는다",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: {
        path: [
          "^src/modules/[^/]+/(application|infra)/",
          "^src/modules/shared/infra/",
          "node_modules/(next|react|react-dom|drizzle-orm|better-sqlite3)/",
        ],
      },
    },
    {
      name: "application-no-infra",
      comment: "application(유스케이스)은 domain과 ports만 쓴다. infra, Drizzle, Next.js는 금지",
      severity: "error",
      from: { path: "^src/modules/[^/]+/application/" },
      to: {
        path: [
          "^src/modules/[^/]+/infra/",
          "node_modules/(next|react|react-dom|drizzle-orm|better-sqlite3)/",
        ],
      },
    },
    {
      name: "app-only-application",
      comment: "src/app(라우트)은 각 BC의 application만 호출한다. domain, infra, ports는 직접 부르지 않는다 (shared의 인증·세션은 허용)",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/(domain|infra|ports)/", pathNot: "^src/modules/shared/" },
    },
    {
      name: "modules-not-to-composition",
      comment: "src/composition은 조립 위치다. BC와 shared는 composition을 import하지 않는다",
      severity: "error",
      from: { path: "^src/modules/" },
      to: { path: "^src/composition/" },
    },
    {
      name: "app-not-to-modules-infra-via-lib",
      comment: "src/app, src/composition 밖의 src 폴더(src/lib 등)도 BC의 domain·infra를 직접 쓰지 않는다",
      severity: "error",
      from: { path: "^src/", pathNot: ["^src/modules/", "^src/app/", "^src/composition/"] },
      to: { path: "^src/modules/[^/]+/(domain|infra)/", pathNot: "^src/modules/shared/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.gitkeep$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".d.ts"],
    },
  },
};
