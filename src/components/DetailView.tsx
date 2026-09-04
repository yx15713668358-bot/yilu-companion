import { useEffect, useMemo, useRef, useState } from 'react';
import { assetUrl, type Comp, type ItemHolder, type TransitionStage, type UnitRef } from '../data';
import { Board } from './Board';
import { UnitCard } from './UnitCard';
import sourceRegistry from '../../data/source-registry.json';

type DetailTab = 'overview' | 'stage' | 'cap' | 'sources';

interface DetailViewProps {
  comp: Comp;
  returnFocus: HTMLButtonElement | null;
  onClose: () => void;
}

const stageNames = ['开局', '2阶段', '3-2', '4-1/4-2', '5阶段'];

function findUnit(comp: Comp, stage: TransitionStage, name: string): UnitRef | undefined {
  return stage.boardUnits.find((unit) => unit.name === name) ?? comp.units.find((unit) => unit.name === name);
}

function TransferCard({ comp, stage, holder }: { comp: Comp; stage: TransitionStage; holder: ItemHolder }) {
  const from = findUnit(comp, stage, holder.holder);
  const to = comp.units.find((unit) => unit.name === holder.target);
  if (!from || !to) return null;

  return (
    <article className="transfer-card-v7">
      <div className="transfer-person">
        <UnitCard unit={from} compact showRole={false} />
        <span>现在代持</span>
      </div>
      <div className="transfer-core">
        <div className="transfer-items-v7">
          {holder.items.map((item, index) => (
            <div key={`${item.asset}-${index}`}>
              <img src={assetUrl(item.asset)} alt={item.name} />
              <span>{index + 1}. {item.name}</span>
            </div>
          ))}
        </div>
        <span className="transfer-arrow" aria-hidden="true">→</span>
      </div>
      <div className="transfer-person target">
        <UnitCard unit={to} compact showRole={false} />
        <span>最终接装</span>
      </div>
      <p>{holder.transferAt}</p>
    </article>
  );
}

function Overview({ comp }: { comp: Comp }) {
  const [mirror, setMirror] = useState(false);
  return (
    <div className="overview-layout">
      <section className="command-banner">
        <span>整局主线</span>
        <strong>{comp.prototype.headline}</strong>
        <p>{comp.updateNote}</p>
      </section>

      <section className="overview-decisions">
        <article className="decision-card positive"><span>满足这些再玩</span><p>{comp.suitable}</p></article>
        <article className="decision-card danger"><span>出现这些就停</span><p>{comp.avoid}</p></article>
        <article className="decision-card neutral"><span>安全转向</span><p>{comp.pivot}</p></article>
      </section>

      <div className="overview-grid">
        <section className="surface board-overview">
          <div className="section-heading">
            <div><span>最终站位</span><h3>{comp.units.length}名棋子完整显示</h3></div>
            <button type="button" onClick={() => setMirror((value) => !value)} aria-pressed={mirror}>镜像站位</button>
          </div>
          <Board units={comp.units} mirror={mirror} label={`${comp.name}最终站位`} />
          <p className="section-note">{comp.boardNote}</p>
        </section>

        <section className="surface loadout-overview">
          <div className="section-heading"><div><span>装备顺序</span><h3>先启动，再补输出和前排</h3></div></div>
          <ol className="priority-list">
            {comp.prototype.itemPriority.map((entry) => <li key={entry}>{entry}</li>)}
          </ol>
          <div className="item-advice"><span>可以灵活</span><p>{comp.prototype.flexibleItems}</p></div>
          <div className="item-advice danger"><span>不要乱合</span><p>{comp.prototype.avoidItem}</p></div>
        </section>
      </div>

      <section className="surface">
        <div className="section-heading"><div><span>最终编成</span><h3>职责放到头像外，不再裁字</h3></div></div>
        <div className="full-roster">{comp.units.map((unit) => <UnitCard key={unit.name} unit={unit} />)}</div>
      </section>

      <section className="loadout-grid-v7">
        {comp.loadouts.map((loadout) => (
          <article className="loadout-card-v7" key={loadout.label}>
            <h3>{loadout.label}</h3>
            <div>
              {loadout.items.map((item, index) => (
                <figure key={`${item.asset}-${index}`}>
                  <img src={assetUrl(item.asset)} alt={item.name} />
                  <figcaption><b>{index + 1}</b>{item.name}</figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="overview-grid reference-grid">
        <section className="surface">
          <div className="section-heading"><div><span>进入条件</span><h3>满足越多越稳</h3></div></div>
          <div className="condition-chips">{comp.requirements.map((entry) => <span key={entry}>{entry}</span>)}</div>
        </section>
        <section className="surface">
          <div className="section-heading"><div><span>强化优先级</span><h3>先看第一档</h3></div></div>
          <div className="augment-rows">{comp.augments.map((group) => <div key={group[0]}><b>{group[0]}</b><p>{group.slice(1).join(' · ')}</p></div>)}</div>
        </section>
      </div>
    </div>
  );
}

function StageView({ comp }: { comp: Comp }) {
  const [stageIndex, setStageIndex] = useState(2);
  const stage = comp.transitionStages[stageIndex];

  return (
    <div className="stage-view">
      <nav className="stage-nav" aria-label="对局阶段">
        {comp.transitionStages.map((entry, index) => (
          <button
            type="button"
            key={entry.stage}
            className={index === stageIndex ? 'active' : ''}
            aria-current={index === stageIndex ? 'step' : undefined}
            onClick={() => setStageIndex(index)}
          >
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{stageNames[index] ?? entry.stage}</span>
          </button>
        ))}
      </nav>

      <section className="stage-command">
        <div><span>人口</span><strong>{stage.level}</strong></div>
        <div><span>金币底线</span><strong>{stage.goldGoal}</strong></div>
        <div className="wide"><span>现在怎么D</span><strong>{stage.rollAction}</strong></div>
      </section>

      <div className="stage-layout">
        <section className="surface stage-board-panel">
          <div className="section-heading"><div><span>{stage.stage}</span><h3>照这张板上场</h3></div></div>
          <Board units={stage.boardUnits} holders={stage.itemHolders} label={`${comp.name}${stage.stage}过渡站位`} />
          <p className="section-note">装备图标表示当前代持；找到正式核心后再换装。</p>
        </section>

        <aside className="stage-actions">
          <section className="action-block must-buy">
            <span>商店看见就买</span>
            <div>{stage.mustHold.map((name) => <b key={name}>{name}</b>)}</div>
          </section>
          <section className="action-block sell-list">
            <span>临时牌与出售时点</span>
            <div>{stage.temporaryUnits.length ? stage.temporaryUnits.map((name) => <b key={name}>{name}</b>) : <em>当前都是体系牌</em>}</div>
            <p>{stage.sellWhen}</p>
          </section>
          <section className="action-block next-step"><span>下一步</span><p>{stage.nextTarget}</p></section>
          <section className="action-block danger"><span>不满足就转</span><p>{stage.pivotWarning}</p></section>
        </aside>
      </div>

      <section className="surface transfer-section">
        <div className="section-heading"><div><span>装备代持</span><h3>按左到右理解优先级</h3></div></div>
        <div className="transfer-grid-v7">
          {stage.itemHolders.map((entry) => <TransferCard key={`${stage.stage}-${entry.type}`} comp={comp} stage={stage} holder={entry} />)}
        </div>
      </section>

      <div className="stage-pager">
        <button type="button" disabled={stageIndex === 0} onClick={() => setStageIndex((value) => Math.max(0, value - 1))}>← 上一步</button>
        <span>{stageIndex + 1} / {comp.transitionStages.length}</span>
        <button type="button" disabled={stageIndex === comp.transitionStages.length - 1} onClick={() => setStageIndex((value) => Math.min(comp.transitionStages.length - 1, value + 1))}>下一步 →</button>
      </div>
    </div>
  );
}

function CapView({ comp }: { comp: Comp }) {
  const plan = comp.postCapPlan;
  return (
    <div className="cap-view">
      <section className="command-banner cap-banner"><span>先判断是否稳定</span><strong>{plan.stableAt}</strong></section>
      <div className="cap-decision-grid">
        <article><span>继续留当前等级D</span>{plan.stayAndRollWhen.map((entry) => <p key={entry}>{entry}</p>)}</article>
        <article className="go"><span>满足这些再升9</span>{plan.goNineWhen.map((entry) => <p key={entry}>{entry}</p>)}</article>
      </div>
      <div className="board-diff">
        <section className="surface"><div className="section-heading"><div><span>上场</span><h3>升人口优先加</h3></div></div><div className="post-unit-list">{plan.level9Adds.map((entry) => <article key={entry.name}><img src={assetUrl(entry.asset)} alt={entry.name} /><div><b>{entry.name}</b><p>{entry.reason}</p></div></article>)}</div></section>
        <section className="surface"><div className="section-heading"><div><span>下场</span><h3>腾位置先换</h3></div></div><div className="post-unit-list remove">{plan.removeFirst.map((entry) => <article key={entry.name}><img src={assetUrl(entry.asset)} alt={entry.name} /><div><b>{entry.name}</b><p>{entry.reason}</p></div></article>)}</div></section>
      </div>
      <section className="surface"><div className="section-heading"><div><span>执行顺序</span><h3>一次只做一件事</h3></div></div><ol className="cap-priority">{plan.priority.map((entry) => <li key={entry}>{entry}</li>)}</ol><div className="cannot-nine"><b>不能升9时</b><p>{plan.cannotNine}</p></div></section>
    </div>
  );
}

function SourceView({ comp }: { comp: Comp }) {
  const sourceUrl = (sourceName: string) => sourceRegistry.sources.find((source) => [source.id, source.name, ...source.aliases].includes(sourceName))?.url;
  return (
    <div className="source-view">
      <section className="command-banner"><span>数据口径</span><strong>各来源分别展示，不拼成一个“统一胜率”</strong><p>不同站点的地区、段位、阵容指纹和样本定义并不完全相同。</p></section>
      <div className="source-card-grid">
        {comp.sourceStats.map((entry, index) => (
          <article className="source-card-v7" key={`${entry.source}-${index}`}>
            <header><div><span>来源</span><h3>{sourceUrl(entry.source) ? <a href={sourceUrl(entry.source)} target="_blank" rel="noreferrer">{entry.source}</a> : entry.source}</h3></div><b>{entry.rating}</b></header>
            <dl>
              <div><dt>均次</dt><dd>{entry.avg ?? '—'}</dd></div>
              <div><dt>前四</dt><dd>{entry.top4 ?? '—'}</dd></div>
              <div><dt>吃鸡</dt><dd>{entry.win ?? '—'}</dd></div>
              <div><dt>样本</dt><dd>{entry.games?.toLocaleString('zh-CN') ?? '未提供'}</dd></div>
            </dl>
            <p>{entry.note}</p>
            <small>记录日期：{entry.updated}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DetailView({ comp, returnFocus, onClose }: DetailViewProps) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: '一页抄作业' },
    { id: 'stage' as const, label: '对局跟玩' },
    { id: 'cap' as const, label: '成型后提升' },
    { id: 'sources' as const, label: '数据来源' },
  ], []);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.classList.add('detail-open-v7');
    document.body.style.top = `-${scrollY}px`;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab' || !detailRef.current) return;
      const focusable = [...detailRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('detail-open-v7');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      returnFocus?.focus();
    };
  }, [returnFocus]);

  return (
    <div className="detail-screen" role="dialog" aria-modal="true" aria-labelledby="detail-title" ref={detailRef}>
      <header className="detail-header">
        <div className="detail-title">
          <span>{comp.currentTier}档 · {comp.style} · {comp.damage}</span>
          <h1 id="detail-title">{comp.name}</h1>
          <p>{comp.traits}</p>
        </div>
        <button ref={closeRef} type="button" className="detail-close" onClick={onClose} aria-label="关闭阵容详情">×</button>
        <nav className="detail-tabs" role="tablist" aria-label="阵容详情页签">
          {tabs.map((entry) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={tab === entry.id ? 'active' : ''}
              key={entry.id}
              onClick={() => setTab(entry.id)}
            >{entry.label}</button>
          ))}
        </nav>
      </header>
      <main className="detail-body">
        <section role="tabpanel" hidden={tab !== 'overview'}>{tab === 'overview' ? <Overview comp={comp} /> : null}</section>
        <section role="tabpanel" hidden={tab !== 'stage'}>{tab === 'stage' ? <StageView comp={comp} /> : null}</section>
        <section role="tabpanel" hidden={tab !== 'cap'}>{tab === 'cap' ? <CapView comp={comp} /> : null}</section>
        <section role="tabpanel" hidden={tab !== 'sources'}>{tab === 'sources' ? <SourceView comp={comp} /> : null}</section>
      </main>
    </div>
  );
}
