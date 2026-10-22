export function sameTenant(actorTenantId: string, resourceTenantId: string): boolean {
  return actorTenantId === resourceTenantId;
}
