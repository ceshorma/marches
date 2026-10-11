// A plain scripted player for tests and the balance script (scripts/sim.ts).
import { createMission } from "../src/tactics/campaign";
import { troopTypes } from "../src/tactics/combat";
import type { TroopType } from "../src/tactics/combat";
import {
  addReserveTroop,
  addSpecial,
  campSupported,
  deploymentError,
  placeTower,
} from "../src/tactics/outpost";
import { adjacent, order } from "../src/tactics/model";
import { specials } from "../src/tactics/units";
type B = ReturnType<typeof createMission>;
export type Player = (b: B) => void;
// Deploys whatever arrives (of the given kinds), builds every site and keeps
// one squad per post; spare squads go to the tower under attack.
export const plain =
  (kinds: TroopType[] = troopTypes): Player =>
  (b) => {
    const o = b.outpost!;
    // Towers in the tray go to the mission's suggested spots, in order.
    for (const id of o.suggested ?? [])
      if ((o.kits ?? 0) > 0 && !o.sites.some((s) => s.cell === id))
        placeTower(b, id);
    const posts = [
      ...o.sites.filter((s) => s.active).map((s) => s.cell),
      ...o.sites.filter((s) => !s.active).map((s) => s.cell),
    ];
    if (o.camp && !o.camp.taken && campSupported(b)) posts.unshift(o.camp.cell);
    for (const type of kinds)
      while (o.reserve[type] > 0) {
        const host = b.squads.find(
          (u) => u.members.length < 6 && !deploymentError(b, u.cell),
        );
        const free =
          b.squads.length <= posts.length
            ? adjacent(o.fort).find(
                (id) =>
                  !deploymentError(b, id) &&
                  !b.squads.some((u) => u.cell === id),
              )
            : undefined;
        const at = free ?? host?.cell;
        if (at === undefined || addReserveTroop(b, at, type)) break;
      }
    // Special units join a squad with room for them, or form a new one.
    for (const kind of [...(o.specials ?? [])]) {
      const size = specials[kind].size;
      const host = b.squads.find(
        (u) =>
          !u.special &&
          u.members.length + size <= 6 &&
          !u.path.length &&
          !u.engaged &&
          !u.routing,
      );
      const free = adjacent(o.fort).find(
        (id) => !deploymentError(b, id) && !b.squads.some((u) => u.cell === id),
      );
      const at = host?.cell ?? free;
      if (at === undefined || addSpecial(b, at, kind)) break;
    }
    const threatened = (b.raids ?? []).find(
      (r) => r.phase === "approach" && !r.guard,
    )?.target;
    // The strongest squads take the first posts (the camp, when it can be
    // taken); worn-down ones hold the rest.
    const order_ = b.squads
      .slice()
      .sort((a, c) => c.members.length - a.members.length);
    order_.forEach((u, i) => {
      if (u.path.length || u.engaged || u.routing) return;
      const post =
        i >= posts.length && threatened !== undefined
          ? threatened
          : posts[i % posts.length];
      // The camp must be stood on to be taken, and a site to be built;
      // standing towers are held from nearby.
      if (u.cell === post) return;
      const standing = o.sites.some((s) => s.active && s.cell === post);
      if (standing && adjacent(post).includes(u.cell)) return;
      if (order(b, u.id, post))
        for (const n of adjacent(post)) if (!order(b, u.id, n)) break;
    });
  };
