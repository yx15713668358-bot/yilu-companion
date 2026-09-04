import { assetUrl, type ItemHolder, type UnitRef } from '../data';

interface BoardProps {
  units: UnitRef[];
  holders?: ItemHolder[];
  mirror?: boolean;
  label?: string;
}

export function Board({ units, holders = [], mirror = false, label = '阵容站位棋盘' }: BoardProps) {
  const unitByCell = new Map(
    units.map((unit) => {
      const [row, column] = unit.pos;
      return [`${row}-${mirror ? 7 - column : column}`, unit] as const;
    }),
  );
  const holderByName = new Map(holders.map((entry) => [entry.holder, entry]));

  return (
    <div className="board-shell">
      <div className="board-direction" aria-hidden="true">
        <span>敌方</span>
        <i />
        <span>我方</span>
      </div>
      <div className="board-scroll" tabIndex={0} aria-label={`${label}，手机可左右滑动`}>
        <div className="battle-board" role="img" aria-label={label}>
          {Array.from({ length: 32 }, (_, index) => {
            const row = Math.floor(index / 8);
            const column = index % 8;
            const unit = unitByCell.get(`${row}-${column}`);
            const equipment = unit ? holderByName.get(unit.name)?.items ?? [] : [];
            return (
              <div className={`board-cell row-${row}`} key={`${row}-${column}`}>
                {unit ? (
                  <div className={`board-piece ${equipment.length ? 'is-holder' : ''}`}>
                    <img className="board-piece-art" src={assetUrl(unit.asset)} alt="" />
                    <span className="board-piece-name">{unit.name}</span>
                    {equipment.length ? (
                      <span className="board-equipment" aria-label={`${unit.name}当前代持装备`}>
                        {equipment.map((item, itemIndex) => (
                          <img key={`${item.asset}-${itemIndex}`} src={assetUrl(item.asset)} alt={item.name} title={item.name} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="board-mobile-hint">棋子名称和装备保持显示；窄屏可在棋盘区域左右滑动。</p>
    </div>
  );
}
