// A small baseline, intended as a starting point for AI-generated strategies.
// Return one action per decision. null pauses the runner.
export default function strategy(state, { signal }) {
  if (signal.aborted) return null;
  switch (state.phase) {
    case 'setup': return { type: 'new_run', seed: 'STRATEGY', deck: 'red_deck', stake: 0 };
    case 'blind_select': return { type: 'select_blind' };
    case 'cash_out': return { type: 'cash_out' };
    case 'shop': {
      const pack = state.packs.find(p => p.kind === 'buffoon');
      if (pack && state.money >= 8 && state.jokers.length < state.limits.jokers)
        return { type: 'open_pack', offerId: pack.id };
      return { type: 'next_round' };
    }
    case 'pack': {
      const joker = state.pack.options.find(o => o.joker);
      if (joker && state.jokers.length < state.limits.jokers)
        return { type: 'pick_pack', optionId: joker.id };
      return { type: 'skip_pack' };
    }
    case 'playing': {
      let best = [], bestScore = -1;
      function visit(start, cards) {
        if (cards.length && (!state.forcedCardId || cards.some(c => c.id === state.forcedCardId))) {
          const groups = Object.values(cards.reduce((r, c) => ((r[c.rank] ??= []).push(c), r), {})).sort((a,b) => b.length-a.length);
          const ranks = [...new Set(cards.map(c => c.rank))].sort((a,b) => a-b);
          const flush = cards.length === 5 && new Set(cards.map(c => c.suit)).size === 1;
          const straight = ranks.length === 5 && (ranks[4]-ranks[0] === 4 || ranks.join() === '2,3,4,5,14');
          const count = groups.map(g => g.length);
          const key = flush && straight ? 'straight_flush' : count[0] === 5 ? 'five' : count[0] === 4 ? 'four' : count[0] === 3 && count[1] === 2 ? 'full_house' : flush ? 'flush' : straight ? 'straight' : count[0] === 3 ? 'three' : count[0] === 2 && count[1] === 2 ? 'two_pair' : count[0] === 2 ? 'pair' : 'high';
          const bases = { high:[5,1,10,1], pair:[10,2,15,1], two_pair:[20,2,20,1], three:[30,3,20,2], straight:[30,4,30,3], flush:[35,4,15,2], full_house:[40,4,25,2], four:[60,7,30,3], straight_flush:[100,8,40,4], five:[120,12,35,3] };
          const [base, mult, chipStep, multStep] = bases[key], level = state.handLevels[key]-1;
          const scoring = key === 'high' ? [cards.reduce((a,b)=>a.rank>b.rank?a:b)] : ['pair','two_pair','three','four'].includes(key) ? groups.filter(g=>g.length>1).flat() : cards;
          const chips = scoring.reduce((sum,c)=>sum+(c.rank===14?11:Math.min(10,c.rank)),0);
          const score = (base + chipStep*level + chips)*(mult + multStep*level);
          if (score > bestScore) { bestScore=score; best=cards; }
        }
        if (cards.length === 5) return;
        for (let i=start;i<state.hand.length;i++) visit(i+1,[...cards,state.hand[i]]);
      }
      visit(0,[]);
      if (!best.length) return null;
      const spare=state.hand.filter(c=>!best.some(b=>b.id===c.id)).slice(0,5);
      if (state.discards > 0 && spare.length && bestScore < (state.target-state.total)/Math.max(1,state.hands))
        return { type:'discard', cardIds:spare.map(c=>c.id) };
      return { type:'play', cardIds:best.map(c=>c.id) };
    }
    default: return null;
  }
}
