import { assetUrl, type Comp } from '../data';
import { UnitCard } from './UnitCard';

interface CompCardProps {
  comp: Comp;
  onOpen: (comp: Comp, trigger: HTMLButtonElement) => void;
}

export function CompCard({ comp, onOpen }: CompCardProps) {
  const keyUnits = comp.prototype.keyUnitNames
    .map((name) => comp.units.find((unit) => unit.name === name))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit));
  const remaining = Math.max(0, comp.units.length - keyUnits.length);
  const sourceCount = new Set(comp.sourceStats.map((entry) => entry.source)).size;
  const goalLabel = comp.goal === 'chicken' ? '冲击吃鸡' : comp.goal === 'conditional' ? '条件阵容' : '稳定吃分';

  return (
    <article className="comp-card">
      <div className="comp-card-rail" aria-hidden="true">
        <span className={`tier-block tier-${comp.currentTier.toLowerCase()}`}>{comp.currentTier}</span>
        <span className="trend-block">{comp.trend}</span>
      </div>

      <div className="comp-card-copy">
        <div className="comp-card-titleline">
          <div>
            <div className="name-and-goal"><h2>{comp.name}</h2><span>{goalLabel}</span></div>
            <p>{comp.prototype.brief}</p>
          </div>
          <span className="source-summary">{sourceCount}家来源已核对</span>
        </div>

        <div className="execution-line">{comp.prototype.headline}</div>

        <dl className="decision-pair">
          <div>
            <dt>适合玩</dt>
            <dd>{comp.suitable}</dd>
          </div>
          <div>
            <dt>立即转阵</dt>
            <dd>{comp.avoid}</dd>
          </div>
        </dl>

        <div className="item-direction" aria-label="核心装备方向">
          <span>装备方向</span>
          {comp.loadouts[0]?.items.slice(0, 3).map((item) => (
            <div className="mini-item" key={item.asset} title={item.name}>
              <img src={assetUrl(item.asset)} alt={item.name} />
              <small>{item.name}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="comp-card-roster">
        <div className="key-units">
          {keyUnits.map((unit) => <UnitCard key={unit.name} unit={unit} compact />)}
          {remaining ? <div className="more-units" aria-label={`另有${remaining}名棋子`}>+{remaining}</div> : null}
        </div>
        <button
          className="open-comp"
          type="button"
          onClick={(event) => onOpen(comp, event.currentTarget)}
          aria-label={`打开${comp.name}战术板`}
        >
          打开战术板 <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
