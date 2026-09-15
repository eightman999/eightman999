import { useMemo, useState } from "react";
import { targets, work, type WorkItem } from "./data";
import { harnessLanes } from "./harness";

const stateLabel: Record<WorkItem["workState"], string> = {
  ready: "READY",
  "in-progress": "DOING",
  review: "REVIEW",
  blocked: "BLOCKED",
  done: "DONE"
};

function App() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filteredWork = useMemo(
    () =>
      work.filter((item) =>
        [item.project, item.title, item.nextAction, item.blocker ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      ),
    [normalized]
  );

  const filteredTargets = useMemo(
    () =>
      targets.filter((target) =>
        [target.project, target.name, target.kind, target.action, target.note ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      ),
    [normalized]
  );

  const filteredHarnesses = useMemo(
    () =>
      harnessLanes.filter((lane) =>
        [lane.name, lane.role, lane.mutation, lane.transport, lane.note]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      ),
    [normalized]
  );

  const counts = work.reduce<Record<string, number>>((acc, item) => {
    acc[item.workState] = (acc[item.workState] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">eightman Development</p>
          <h1>開発の現在地</h1>
          <p className="lede">進捗表ではなく、次の一手を決めるための開発再開装置。</p>
        </div>
        <div className="summary" aria-label="work summary">
          <span>{counts["in-progress"] ?? 0} doing</span>
          <span>{counts.blocked ?? 0} blocked</span>
          <span>{targets.filter((t) => t.verification === "available").length} testable</span>
          <span>{harnessLanes.length} harness lanes</span>
        </div>
      </header>

      <label className="search">
        <span>/</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タスク、実機、サーバー、Harness、次の一手を探す"
          autoComplete="off"
        />
      </label>

      <section>
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">Needs attention</p>
            <h2>いま触るもの</h2>
          </div>
          <p>状態ではなく、次の行動が主役。</p>
        </div>

        <div className="workGrid">
          {filteredWork.map((item) => (
            <article className={`card workCard state-${item.workState}`} key={item.id}>
              <div className="cardTop">
                <span className="project">{item.project}</span>
                <span className="badge">{stateLabel[item.workState]}</span>
              </div>
              <h3>{item.title}</h3>
              {item.blocker && <p className="blocker">Blocker — {item.blocker}</p>}
              <p className="next"><strong>Next</strong> {item.nextAction}</p>
              <div className="cardFoot">
                <span className={`verify verify-${item.verification}`}>{item.verification}</span>
                {item.href && <a href={item.href}>open ↗</a>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">Try / verify now</p>
            <h2>いま触れる実体</h2>
          </div>
          <p>Web、API、実機、サーバーを同じ「検証面」として扱う。</p>
        </div>

        <div className="targetList">
          {filteredTargets.map((target) => (
            <article className="target" key={target.id}>
              <div className="targetIdentity">
                <span className={`runtime runtime-${target.runtime}`} aria-hidden="true" />
                <div>
                  <span className="project">{target.project} · {target.kind}</span>
                  <h3>{target.name}</h3>
                </div>
              </div>
              <div className="targetAction">
                <p>{target.action}</p>
                {target.note && <small>{target.note}</small>}
              </div>
              <div className="targetMeta">
                <span>{target.runtime}</span>
                <span>{target.verification}</span>
                {target.href && <a href={target.href}>open ↗</a>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">Agent execution</p>
            <h2>Harness lanes</h2>
          </div>
          <p>モデル名ではなく、役割・実行環境・書き込み権限を分離する。</p>
        </div>

        <div className="harnessGrid">
          {filteredHarnesses.map((lane) => (
            <article className="card harnessCard" key={lane.id}>
              <div className="cardTop">
                <span className="project">{lane.transport}</span>
                <span className={`mutation mutation-${lane.mutation}`}>{lane.mutation}</span>
              </div>
              <h3>{lane.name}</h3>
              <p className="harnessRole">{lane.role}</p>
              <p className="harnessNote">{lane.note}</p>
            </article>
          ))}
        </div>
        <p className="harnessRule">
          Claim = temporary execution ownership. Issue = project truth. PR = implementation evidence.
        </p>
      </section>

      <section className="principle card">
        <p className="eyebrow">Rule</p>
        <h2>Project truth + harness truth + runtime truth → next executable action.</h2>
        <p>
          GitHub が作業の真実。Harness ledger が「いま誰が触っているか」の一時的な真実。
          実機とサービスが稼働の真実。この画面はそれらを複製せず、
          「今どうなっていて、次に何をすればいいか」だけへ圧縮する。
        </p>
      </section>

      <footer>
        Public view. Secrets, private endpoints, credentials and private harness state never belong here.
      </footer>
    </main>
  );
}

export default App;
