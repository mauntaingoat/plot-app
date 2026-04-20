const ADMIN_UIDS = ['nEiT2aIp0QPhzPoPJkeSNwPb6i33']

export function isAdmin(uid: string | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid)
}
