import { ALL_RIVALS as RIVALS, collabWithRival, rivalCollabCost, COLORS, STAGE3, VIBES, dateInfo, dissRival, leaderboard, relationWord, rivalCooldown, shoutOutRival } from '../../engine';
import { EmblemIcon } from '../components/Emblem';
import { Wordmark } from '../components/Logo';
import { count, money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';

export function RivalsPanel() {
  const { store, s } = useGame();
  const board = leaderboard(s);
  const myRank = board.findIndex((r) => r.isPlayer) + 1;
  const prevMyRank = s.history.rank[s.history.rank.length - 2] ?? myRank;
  const endDay = STAGE3.campaignYears * 364;
  const year = dateInfo(s.day).year;

  const act = (fn: () => { ok: true; text: string } | { ok: false; reason: string }) => {
    const r = store.mutate(fn);
    if (!r) return;
    if (r.ok) {
      sfx.play('notify');
      store.toast(r.text, undefined, 'good');
      store.pushFeed(r.text, 'info');
    } else {
      sfx.play('error');
      store.toast(r.reason, undefined, 'bad');
    }
  };

  return (
    <div className="panel rivals" data-testid="panel-rivals">
      <div className="rivals-head">
        <h2 className="display">the chart</h2>
        <div className="goal card" data-testid="goal-card">
          {s.campaign.wonDay ? (
            <p>
              <strong>You took the crown</strong> in {dateInfo(s.campaign.wonDay).season}, year {dateInfo(s.campaign.wonDay).year}. Now keep it.
            </p>
          ) : s.day > endDay ? (
            <p>The five years are up. The chart goes on: take number one whenever you can.</p>
          ) : (
            <p>
              Goal: <strong>number one by the end of year {STAGE3.campaignYears}</strong>. You are in year {year}, ranked <strong>#{myRank}</strong>.
            </p>
          )}
        </div>
      </div>

      <section className="card chart" data-testid="leaderboard">
        <h3>This week's chart</h3>
        <ol className="board">
          {board.map((row, i) => {
            const r = s.rivals.find((x) => x.id === row.id);
            const prev = row.isPlayer ? prevMyRank : r?.prevRank || i + 1;
            const move = prev - (i + 1);
            return (
              <li key={row.id} className={row.isPlayer ? 'me' : ''}>
                <span className="pos">{i + 1}</span>
                <span className={`move ${move > 0 ? 'up' : move < 0 ? 'down' : ''}`}>{move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '•'}</span>
                <EmblemIcon id={row.glyph} color={row.isPlayer ? COLORS[s.brand.logo.color]?.hex ?? '#fff' : row.color} size={26} badge={row.isPlayer ? s.brand.logo.badge : undefined} />
                <span className="board-name">{row.isPlayer ? <Wordmark name={row.name} logo={s.brand.logo} /> : row.name}</span>
                <span className="muted small">{count(row.followers)} followers</span>
                <strong className="board-value">{money(row.value, true)}</strong>
              </li>
            );
          })}
        </ol>
        <p className="muted small">Brand value counts yearly sales, followers, reputation and a little of your cash.</p>
      </section>

      <div className="rival-grid">
        {s.rivals.map((r) => {
          const def = RIVALS.find((d) => d.id === r.id)!;
          const cd = rivalCooldown(s, r);
          const rel = relationWord(r.relation);
          return (
            <section key={r.id} className={`card rival rel-${rel.toLowerCase()}`} data-testid={`rival-${r.id}`}>
              <div className="rival-top">
                <EmblemIcon id={r.glyph} color={r.color} size={34} />
                <div>
                  <h3>{r.name}</h3>
                  <span className="muted small">{def.bio}</span>
                </div>
              </div>
              <ul className="facts small">
                <li>
                  {count(r.followers)} followers, about {money(r.weeklyRevenue, true)} a week
                </li>
                <li>
                  Style: {VIBES[r.vibe].name}
                  {r.focus ? `. Chasing ${r.focus.cat === 'vibe' ? VIBES[r.focus.id as keyof typeof VIBES]?.name : r.focus.cat === 'color' ? COLORS[r.focus.id]?.name : r.focus.id} right now` : ''}
                </li>
                <li>
                  Relationship: <strong className={`rel rel-${rel.toLowerCase()}`}>{rel}</strong>
                </li>
              </ul>
              <div className="row">
                <button className="btn btn-ghost danger" disabled={cd > 0} onClick={() => act(() => dissRival(s, r.id))} data-testid={`diss-${r.id}`}>
                  Diss them
                </button>
                <button className="btn btn-ghost" disabled={cd > 0} onClick={() => act(() => shoutOutRival(s, r.id))} data-testid={`shout-${r.id}`}>
                  Shout-out
                </button>
                {r.relation >= 50 && (
                  <button className="btn" disabled={!!s.rivalCollab || s.cash < rivalCollabCost(s)} onClick={() => store.act((st) => collabWithRival(st, r.id), { sound: 'hire', toast: `Joint drop with ${r.name} lined up. Plan a drop.` })} data-testid={`joint-${r.id}`}>
                    Joint drop ({money(rivalCollabCost(s), true)})
                  </button>
                )}
                {cd > 0 && <span className="muted small">again in {cd}d</span>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
