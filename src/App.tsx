import { useEffect, useMemo, useState } from 'react';
import yiluMark from './assets/brand/yilu-mark.svg';
import { CompCard } from './components/CompCard';
import { DetailView } from './components/DetailView';
import { DisplaySettings, type DisplayMode } from './components/DisplaySettings';
import { comps, type Comp } from './data';
import siteMeta from '../data/meta.json';

type Filter = 'all' | 'reroll' | 'fast8' | 'fast9' | 'ap' | 'ad';

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: '全部方向' },
  { id: 'reroll', label: '慢D' },
  { id: 'fast8', label: '速8' },
  { id: 'fast9', label: '速9' },
  { id: 'ap', label: '法系' },
  { id: 'ad', label: '物理' },
];

function initialMode(): DisplayMode {
  try {
    const saved = localStorage.getItem('yilu-display-mode');
    if (saved === 'standard' || saved === 'compact' || saved === 'large') return saved;
  } catch {
    // Local storage is optional in a file preview.
  }
  return 'standard';
}

export function App() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedComp, setSelectedComp] = useState<Comp | null>(null);
  const [returnFocus, setReturnFocus] = useState<HTMLButtonElement | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialMode);

  const visibleComps = useMemo(() => comps.filter((comp) => {
    if (filter === 'reroll') return comp.style.includes('慢D');
    if (filter === 'fast8') return comp.style.includes('速8');
    if (filter === 'fast9') return comp.style.includes('速9');
    if (filter === 'ap') return comp.damage.includes('法');
    if (filter === 'ad') return comp.damage.includes('物');
    return true;
  }).filter((comp) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [comp.name, comp.traits, comp.style, comp.damage, ...comp.units.map((unit) => unit.name)].join(' ').toLowerCase().includes(needle);
  }), [filter, query]);

  const groups = useMemo(() => [
    { id: 'climb', kicker: '稳定吃分', title: '优先保证前四', description: '执行门槛低、容错更高，默认先从这里选。' },
    { id: 'chicken', kicker: '冲击吃鸡', title: '条件够再抬上限', description: '需要健康血量、经济和完整装备，不等于稳定第一。' },
    { id: 'conditional', kicker: '条件阵容', title: '胡牌再玩', description: '来源冲突或进入条件较强，不能硬套。' },
  ] as const, []);

  useEffect(() => {
    const match = window.location.hash.match(/^#\/comp\/([^/]+)/);
    if (!match) return;
    const comp = comps.find((entry) => entry.id === decodeURIComponent(match[1]));
    if (comp) setSelectedComp(comp);
  }, []);

  function changeDisplayMode(mode: DisplayMode) {
    setDisplayMode(mode);
    try { localStorage.setItem('yilu-display-mode', mode); } catch { /* optional */ }
  }

  function openComp(comp: Comp, trigger: HTMLButtonElement) {
    setReturnFocus(trigger);
    setSelectedComp(comp);
    window.history.replaceState(null, '', `#/comp/${encodeURIComponent(comp.id)}`);
  }

  function closeComp() {
    setSelectedComp(null);
    window.history.replaceState(null, '', '#/comps');
  }

  return (
    <div className="site" data-display={displayMode}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="弈路助手首页">
          <img src={yiluMark} alt="" />
          <span><b>弈路助手</b><small>阵容学习与对局旁读</small></span>
        </a>
        <nav className="main-nav" aria-label="主导航">
          <a className="active" href="#comps">阵容快照</a>
          <a href="#opening">开局索引</a>
          <a href="#updates">核对信息</a>
        </nav>
        <div className="header-actions">
          <a className="repo-badge" href="https://github.com/yx15713668358-bot/yilu-companion" target="_blank" rel="noreferrer">GitHub</a>
          {!__SINGLE_FILE__ ? <a className="offline-link" href="./downloads/yilu-s18-offline.html" download>离线版</a> : null}
          <DisplaySettings mode={displayMode} onChange={changeDisplayMode} />
        </div>
      </header>

      <main id="top" className="page-shell">
        <section className="status-deck" id="updates">
          <div className="status-copy">
            <span className="status-kicker">SET 18 · {siteMeta.patchLabel}</span>
            <h1>静态阵容，照着阶段走</h1>
            <p>这是人工核对并提交的静态快照，核对日期为{siteMeta.contentVerifiedAt}。页面不会自动更新；维护者可按需运行官方Riot API私有校验，Personal或Development结果只留在本地。</p>
          </div>
          <div className="status-facts">
            <div><span className="health-dot" />手动维护 · 官方API按需校验</div>
            <dl><div><dt>最后核对</dt><dd>{siteMeta.contentVerifiedAt.slice(5)}</dd></div><div><dt>快照阵容</dt><dd>{comps.length}套</dd></div><div><dt>过渡阶段</dt><dd>{comps.reduce((sum, comp) => sum + comp.transitionStages.length, 0)}个</dd></div></dl>
          </div>
        </section>

        <section className="opening-index" id="opening">
          <div>
            <span>开局条件索引</span>
            <h2>按装备方向筛，不给假精确分数</h2>
          </div>
          <div className="filter-tools">
            <label className="search-box">
              <span>搜索</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="阵容、棋子或羁绊" />
            </label>
            <div className="filter-row" role="group" aria-label="阵容方向筛选">
              {filters.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={filter === entry.id ? 'active' : ''}
                  aria-pressed={filter === entry.id}
                  onClick={() => setFilter(entry.id)}
                >{entry.label}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="comp-section" id="comps" aria-live="polite">
          {visibleComps.length ? groups.map((group) => {
            const groupComps = visibleComps.filter((comp) => comp.goal === group.id);
            if (!groupComps.length) return null;
            return (
              <section className={`comp-group group-${group.id}`} key={group.id}>
                <div className="section-intro">
                  <div><span>{group.kicker}</span><h2>{group.title} · {groupComps.length}套</h2></div>
                  <p>{group.description}</p>
                </div>
                <div className="comp-stack">{groupComps.map((comp) => <CompCard key={comp.id} comp={comp} onOpen={openComp} />)}</div>
              </section>
            );
          }) : <div className="empty-state"><b>没有匹配的阵容</b><p>换一个关键词或清除筛选。</p></div>}
        </section>
      </main>

      <footer className="site-footer">
        <img src={yiluMark} alt="" />
        <div><p><b>非官方玩家工具。</b> 公开页面是人工审核的静态快照，不调用Riot API，也不读取客户端、实时对局或对手信息；来源数据分别展示，不合成虚假的统一胜率。 {!__SINGLE_FILE__ ? <><a href="./privacy.html">隐私说明</a> · <a href="./terms.html">使用条款</a></> : null}</p><p className="riot-notice">Yilu Companion isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p></div>
        <span>{siteMeta.product.release}</span>
      </footer>

      {selectedComp ? (
        <DetailView comp={selectedComp} returnFocus={returnFocus} onClose={closeComp} />
      ) : null}
    </div>
  );
}
