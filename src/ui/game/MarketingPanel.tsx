import { useState } from 'react';
import {
  ARTISTS,
  INFLUENCERS,
  PLATFORMS,
  POST_KINDS,
  VIBES,
  activeDrop,
  collabArtist,
  collabFee,
  hireInfluencer,
  influencerAvailable,
  influencerFee,
  postSocial,
  postsLeft,
  postsPerDay,
  signCollab,
  trendPop,
  viralChance,
  type PlatformId,
  type PostKind,
} from '../../engine';
import { count, money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';
import { ShowsCard } from './ShowsCard';

function heat(pop: number) {
  return pop > 0.75 ? 'hot right now' : pop > 0.5 ? 'warm' : 'cold';
}

function PostCard() {
  const { store, s } = useGame();
  const [platform, setPlatform] = useState<PlatformId>('loopz');
  const [kind, setKind] = useState<PostKind>('fit');
  const [designId, setDesignId] = useState<string | undefined>(s.designs[s.designs.length - 1]?.id);
  const [last, setLast] = useState<string | null>(null);
  const left = postsLeft(s);
  const odds = viralChance(s, { platform, kind, designId });
  const post = () => {
    const r = store.mutate((st) => postSocial(st, { platform, kind, designId }));
    if (!r) return;
    if (!r.ok) {
      sfx.play('error');
      store.toast(r.reason, undefined, 'bad');
      return;
    }
    setLast(`${r.text} +${r.followers.toLocaleString('en-US')} followers.`);
    if (r.viral) {
      sfx.play('viral');
      store.toast('You went viral!', `+${r.followers.toLocaleString('en-US')} followers`, 'good');
    } else sfx.play(r.backfired ? 'flop' : 'notify');
    store.pushFeed(`${PLATFORMS[platform].name} post: ${r.text}`, r.viral ? 'good' : r.backfired ? 'bad' : 'info');
  };
  return (
    <section className="card post-card" data-testid="post-card">
      <h3>Post something</h3>
      <div className="field">
        <label>Where</label>
        <div className="chips">
          {(Object.keys(PLATFORMS) as PlatformId[]).map((p) => (
            <button key={p} className={`chip ${platform === p ? 'on' : ''}`} onClick={() => (sfx.play('click'), setPlatform(p))} title={PLATFORMS[p].blurb} data-testid={`platform-${p}`}>
              {PLATFORMS[p].name}
            </button>
          ))}
        </div>
        <span className="muted small">{PLATFORMS[platform].blurb}</span>
      </div>
      <div className="field">
        <label>What</label>
        <div className="chips">
          {(Object.keys(POST_KINDS) as PostKind[]).map((k) => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => (sfx.play('click'), setKind(k))} data-testid={`post-${k}`} disabled={k === 'teaser' && !activeDrop(s)}>
              {POST_KINDS[k].name}
            </button>
          ))}
        </div>
        <span className="muted small">{POST_KINDS[kind].blurb}</span>
      </div>
      {kind === 'fit' && (
        <div className="field">
          <label>Piece to show</label>
          <select className="input" value={designId} onChange={(e) => setDesignId(e.target.value)}>
            {[...s.designs].reverse().map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="row spread">
        <span className="muted small">
          Viral odds about {Math.max(1, Math.round(odds * 100))}%. {left} of {postsPerDay(s)} posts left today.
        </span>
        <button className="btn btn-primary" onClick={post} disabled={left <= 0 || (kind === 'fit' && !designId)} data-testid="post-now">
          Post
        </button>
      </div>
      {last && <p className="post-result">{last}</p>}
    </section>
  );
}

export function MarketingPanel() {
  const { store, s } = useGame();
  const campaign = s.influencerCampaign && s.influencerCampaign.untilDay > s.day ? s.influencerCampaign : null;
  const collab = collabArtist(s);
  return (
    <div className="panel marketing" data-testid="panel-marketing">
      <h2 className="display">marketing</h2>
      <button className="link runway-jump" onClick={() => document.getElementById('runway')?.scrollIntoView({ block: 'start' })} data-testid="open-runway">
        Runway and fashion weeks ↓
      </button>
      <div className="mk-grid">
        <PostCard />
        <section className="card">
          <h3>Influencers</h3>
          {campaign && (
            <p className="active-line">
              {INFLUENCERS.find((i) => i.id === campaign.influencerId)?.name} is promoting you for {campaign.untilDay - s.day} more days.
            </p>
          )}
          <ul className="deal-list">
            {INFLUENCERS.map((inf) => {
              const blocked = influencerAvailable(s, inf);
              const fee = influencerFee(s, inf);
              return (
                <li key={inf.id} className={blocked ? 'locked' : ''}>
                  <div>
                    <strong>{inf.name}</strong> <span className="muted">{inf.handle}</span>
                    <div className="muted small">
                      {count(inf.audience)} followers, {VIBES[inf.vibe].name} crowd ({heat(trendPop(s, 'vibe', inf.vibe))})
                      {blocked ? `. ${blocked}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn"
                    disabled={!!blocked || !!campaign || s.cash < fee}
                    data-testid={`book-${inf.id}`}
                    onClick={() => {
                      const r = store.mutate((st) => hireInfluencer(st, inf.id));
                      if (r && r.ok) {
                        sfx.play('hire');
                        store.toast(`${inf.name} is on it`, `+${r.followers.toLocaleString('en-US')} followers, more webshop visitors for a week.`, 'good');
                        store.pushFeed(`Booked ${inf.name} for a week.`, 'good');
                      } else if (r) {
                        sfx.play('error');
                        store.toast(r.reason, undefined, 'bad');
                      }
                    }}
                  >
                    Book a week for {money(fee)}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card">
          <h3>Artist collabs</h3>
          {collab ? (
            <p className="active-line">
              {collab.name} × {s.brand.name} is signed. It powers up your next drop and takes 15% of that drop's revenue.
            </p>
          ) : (
            <p className="muted small">A collab supercharges your next drop with the artist's fans.</p>
          )}
          <ul className="deal-list">
            {ARTISTS.map((a) => {
              const fee = collabFee(s, a);
              const small = s.followers < a.minFollowers;
              return (
                <li key={a.id} className={small ? 'locked' : ''}>
                  <div>
                    <strong>{a.name}</strong> <span className="muted">{a.genre}</span>
                    <div className="muted small">
                      {count(a.fans)} fans, {VIBES[a.vibe].name} ({heat(trendPop(s, 'vibe', a.vibe))})
                      {small ? `. Wants ${count(a.minFollowers)} followers first.` : ''}
                      {s.flags[`favor_${a.id}`] ? '. Owes you one: 40% off.' : ''}
                    </div>
                  </div>
                  <button
                    className="btn"
                    disabled={small || !!collab || s.cash < fee}
                    data-testid={`collab-${a.id}`}
                    onClick={() => store.act((st) => signCollab(st, a.id), { sound: 'beat', toast: `${a.name} signed. Plan a drop.`, feed: `Collab signed with ${a.name}.` })}
                  >
                    Sign for {money(fee)}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <ShowsCard />
      </div>
    </div>
  );
}
