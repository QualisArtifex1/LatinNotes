// Coordinates are relative to the reading container. Each occupied lane reserves
// whitespace above its row; gutter lanes are reused for disjoint row ranges.
export function routeConnections(connections, width) {
  const lanes = [];
  const gutters = { left: [], right: [] };
  return [...connections].sort((a, b) => Math.abs(a.x2-a.x1)-Math.abs(b.x2-b.x1)).map(c => {
    const sameRow = Math.abs(c.row1-c.row2) < 2;
    const side = c.x1+c.x2 <= width ? 'left' : 'right';
    const lo = Math.min(c.row1,c.row2), hi = Math.max(c.row1,c.row2);
    let gutterLane = 0;
    if (!sameRow) {
      while ((gutters[side][gutterLane] || []).some(r => lo <= r[1] && hi >= r[0])) gutterLane++;
      (gutters[side][gutterLane] ||= []).push([lo,hi]);
    }
    const gx = side === 'left' ? 16+gutterLane*12 : width-16-gutterLane*12;
    const spans = sameRow
      ? [[c.row1, Math.min(c.x1,c.x2), Math.max(c.x1,c.x2)]]
      : [[c.row1,Math.min(c.x1,gx),Math.max(c.x1,gx)], [c.row2,Math.min(c.x2,gx),Math.max(c.x2,gx)]];
    let lane = 0;
    while ((lanes[lane] || []).some(a => spans.some(b => Math.abs(a[0]-b[0])<2 && a[1]-8<=b[2] && a[2]+8>=b[1]))) lane++;
    (lanes[lane] ||= []).push(...spans);
    const rise = 28 + lane*14;
    const y1 = c.y1-5, y2 = c.y2-5;
    let d;
    if (sameRow) {
      d = `M ${c.x1} ${y1} Q ${(c.x1+c.x2)/2} ${Math.min(y1,y2)-2*rise} ${c.x2} ${y2}`;
    } else {
      const a=y1-rise, b=y2-rise, dir=side==='left'?1:-1, v=b>a?1:-1;
      const radius=Math.min(8,Math.abs(b-a)/2);
      d=`M ${c.x1} ${y1} L ${c.x1} ${a+8} Q ${c.x1} ${a} ${c.x1-dir*8} ${a} L ${gx+dir*radius} ${a} Q ${gx} ${a} ${gx} ${a+v*radius} L ${gx} ${b-v*radius} Q ${gx} ${b} ${gx+dir*radius} ${b} L ${c.x2-dir*8} ${b} Q ${c.x2} ${b} ${c.x2} ${b+8} L ${c.x2} ${y2}`;
    }
    return {...c,y1,y2,d,lane,gutterLane,sameRow};
  });
}
