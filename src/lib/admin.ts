const ADMIN_UIDS = ['nBJT2alp0QPtvPuMe3NwPb6J33']

export function isAdmin(uid: string | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid)
}
