import { assetUrl, type ItemRef, type UnitRef } from '../data';

interface UnitCardProps {
  unit: UnitRef;
  items?: ItemRef[];
  compact?: boolean;
  showRole?: boolean;
}

function roleTone(role: string): string {
  if (role.includes('主C')) return 'carry';
  if (role.includes('主坦')) return 'tank';
  if (role.includes('副C')) return 'sub-carry';
  if (role.includes('副坦') || role.includes('前排')) return 'sub-tank';
  return 'utility';
}

export function UnitCard({ unit, items = [], compact = false, showRole = true }: UnitCardProps) {
  const image = assetUrl(unit.asset);
  const cost = unit.cost ?? 0;

  return (
    <figure className={`unit-card ${compact ? 'is-compact' : ''} cost-${cost}`}>
      <div className="unit-art">
        <img src={image} alt={unit.name} />
        {unit.slotCost === 2 ? <span className="slot-note">2人口</span> : null}
      </div>
      <figcaption>
        <strong title={unit.name}>{unit.name}</strong>
        {showRole ? <span className={`role-label role-${roleTone(unit.role)}`}>{unit.role}</span> : null}
      </figcaption>
      {items.length ? (
        <div className="unit-items" aria-label={`${unit.name}装备`}>
          {items.map((item, index) => (
            <img key={`${item.asset}-${index}`} src={assetUrl(item.asset)} alt={item.name} title={item.name} />
          ))}
        </div>
      ) : null}
    </figure>
  );
}
