/**
 * 会话世代：login / logout 后递增。
 * 用于忽略登录前发出、登录后才返回的过期 401，避免把新会话清掉。
 */
let generation = 0;

export function getAuthGeneration(): number {
  return generation;
}

export function bumpAuthGeneration(): void {
  generation += 1;
}
