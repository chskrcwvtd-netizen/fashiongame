import {
  ROLES,
  TRAITS,
  bonusCost,
  fire,
  giveBonus,
  giveRaise,
  hire,
  marketRate,
  staffSlots,
  teamNight,
  teamNightCost,
  weeklySalaries,
  STAGE2,
  type Employee,
} from '../../engine';
import { money, useGame } from '../hooks';

const ROLE_COLOR: Record<string, string> = {
  designer: '#ff3ec8',
  marketer: '#d4ff3a',
  sourcer: '#6cf2ff',
  manager: '#ffc24a',
  analyst: '#a98bff',
};

function Avatar({ e }: { e: Employee }) {
  const initials = e.name
    .split(' ')
    .map((p) => p[0])
    .join('');
  return (
    <span className="avatar" style={{ background: ROLE_COLOR[e.role] }} aria-hidden="true">
      {initials}
    </span>
  );
}

function Skill({ n }: { n: number }) {
  return (
    <span className="skill" aria-label={`Skill ${n} of 10`} title={`Skill ${n}/10`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

function moodWord(m: number) {
  return m >= 75 ? 'Thriving' : m >= 55 ? 'Good' : m >= 35 ? 'Meh' : m >= 25 ? 'Unhappy' : 'About to quit';
}

function StaffCard({ e }: { e: Employee }) {
  const { store, s } = useGame();
  const rate = marketRate(s, e.role, e.skill);
  const pay = e.salary / rate;
  const first = e.name.split(' ')[0];
  return (
    <li className="staff" data-testid={`staff-${e.id}`}>
      <Avatar e={e} />
      <div className="staff-main">
        <strong>{e.name}</strong>
        <span className="muted small">
          {ROLES[e.role].name}, {TRAITS[e.trait].name}
        </span>
        <Skill n={e.skill} />
      </div>
      <div className="staff-mood">
        <span className={`mood-bar ${e.mood < 35 ? 'low' : ''}`}>
          <span style={{ width: `${e.mood}%` }} />
        </span>
        <span className="small">{moodWord(e.mood)}</span>
      </div>
      <div className="staff-pay">
        <strong>{money(e.salary)}</strong>
        <span className={`small ${pay < 0.95 ? 'neg' : 'muted'}`}>a week, market {money(rate)}</span>
      </div>
      <div className="staff-actions">
        <button className="btn btn-ghost" onClick={() => store.act((st) => giveRaise(st, e.id), { toast: `${first} got a 10% raise.` })}>
          Raise
        </button>
        <button className="btn btn-ghost" disabled={s.cash < bonusCost(e)} onClick={() => store.act((st) => giveBonus(st, e.id), { toast: `${first} got a bonus.` })}>
          Bonus {money(bonusCost(e))}
        </button>
        <button className="btn btn-ghost danger" onClick={() => store.act((st) => fire(st, e.id), { feed: `${e.name} was let go.`, sound: 'flop' })}>
          Let go
        </button>
      </div>
    </li>
  );
}

export function TeamPanel() {
  const { store, s } = useGame();
  const slots = staffSlots(s);
  const full = s.employees.length >= slots;
  const nightCost = teamNightCost(s);
  const nightReady = s.day - s.lastTeamNight >= STAGE2.teamNightCooldown;
  return (
    <div className="panel team" data-testid="panel-team">
      <div className="team-head">
        <h2 className="display">team</h2>
        <div className="team-meta">
          <span>
            <strong>
              {s.employees.length} / {slots}
            </strong>{' '}
            desks used
          </span>
          <span>
            <strong>{money(weeklySalaries(s))}</strong> payroll a week
          </span>
          <button className="btn" disabled={!s.employees.length || !nightReady || s.cash < nightCost} onClick={() => store.act(teamNight, { sound: 'cash', toast: 'Team night out. Everyone is happier.' })}>
            Team night out {s.employees.length ? `for ${money(nightCost)}` : ''}
          </button>
        </div>
      </div>

      {s.employees.length === 0 ? (
        <p className="muted">It is just you for now. Hire someone below; they start right away and are paid every Monday.</p>
      ) : (
        <ul className="staff-list">
          {s.employees.map((e) => (
            <StaffCard key={e.id} e={e} />
          ))}
        </ul>
      )}

      <section className="card">
        <div className="row spread">
          <h3>Looking for work</h3>
          <span className="muted small">New faces every Monday.{full ? ' No free desk: upgrade your HQ to grow the team.' : ''}</span>
        </div>
        <ul className="candidates">
          {s.candidates.map((c) => (
            <li key={c.id} className="candidate" data-testid={`candidate-${c.id}`}>
              <Avatar e={c} />
              <div className="staff-main">
                <strong>{c.name}</strong>
                <span className="muted small">
                  {ROLES[c.role].name}, {TRAITS[c.trait].name}
                </span>
                <Skill n={c.skill} />
                <span className="muted small">{ROLES[c.role].does}</span>
                <span className="muted small">{TRAITS[c.trait].blurb}</span>
              </div>
              <div className="candidate-hire">
                <strong>{money(c.salary)}</strong>
                <span className="muted small">a week</span>
                <button
                  className="btn btn-primary"
                  disabled={full || s.cash < c.salary}
                  data-testid={`hire-${c.id}`}
                  onClick={() => store.act((st) => hire(st, c.id), { sound: 'hire', toast: `${c.name} joined the team.`, feed: `Hired ${c.name} as ${ROLES[c.role].name}.` })}
                >
                  Hire
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
